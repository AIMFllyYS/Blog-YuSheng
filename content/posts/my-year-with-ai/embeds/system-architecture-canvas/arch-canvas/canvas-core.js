/**
 * DayDayOn Architecture Canvas — Canvas Core Engine (window.DDO_CORE)
 *
 * Milestone 2: Zone Pin / Lock & Canvas Interactivity Core
 *
 * Responsibilities:
 * 1. Viewport transformation: screenToWorld, worldToScreen, getPan, setPan, getScale, setScale, setZoom.
 * 2. Responsive viewport & fitView: Base all width/height calculations on viewport.clientWidth and viewport.clientHeight.
 *    Centers nodes in the available canvas viewport without being obscured when inspector is docked.
 *    Handles zero viewport dimensions (0x0) gracefully without throwing or setting NaN coordinates.
 * 3. Camera adjustments on resize via handleViewportResize().
 * 4. Obstacle-avoiding Manhattan orthogonal router, rounded corners (Q-curve), edge rendering, and node rect calculation.
 */

;(function (root, factory) {
  'use strict'
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root)
  } else {
    root.DDO_CORE = factory(root)
  }
})(
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this,
  function (root) {
    'use strict'

    const SVG_OFFSET = 3000
    const nodeSizeMap = new Map()

    let _panX = 640
    let _panY = 420
    let _scale = 0.72
    let _currentView = 'core'
    let _rafId = 0
    let _interactTimer = 0
    let _lastZoomPct = -1

    function getDoc() {
      return root.document || (typeof document !== 'undefined' ? document : null)
    }

    function getGlobalNodes() {
      if (root.DDO_DATA && Array.isArray(root.DDO_DATA.INITIAL_NODES)) {
        return root.DDO_DATA.INITIAL_NODES
      }
      if (Array.isArray(root.DDO_INITIAL_NODES)) {
        return root.DDO_INITIAL_NODES
      }
      if (Array.isArray(root.DDO_NODES)) {
        return root.DDO_NODES
      }
      return []
    }

    function getGlobalEdges() {
      if (root.DDO_DATA && Array.isArray(root.DDO_DATA.INITIAL_EDGES)) {
        return root.DDO_DATA.INITIAL_EDGES
      }
      if (Array.isArray(root.DDO_INITIAL_EDGES)) {
        return root.DDO_INITIAL_EDGES
      }
      if (Array.isArray(root.DDO_EDGES)) {
        return root.DDO_EDGES
      }
      return []
    }

    function ensureDomSkeleton(doc) {
      if (!doc || !doc.body) return
      let viewport = doc.getElementById('viewport')
      if (!viewport) {
        viewport = doc.createElement('main')
        viewport.id = 'viewport'
        viewport.className = 'viewport'
        doc.body.appendChild(viewport)
      }
      let world = doc.getElementById('world')
      if (!world) {
        world = doc.createElement('div')
        world.id = 'world'
        world.className = 'world'
        viewport.appendChild(world)
      }
      let zonesLayer = doc.getElementById('zonesLayer')
      if (!zonesLayer) {
        zonesLayer = doc.createElement('div')
        zonesLayer.id = 'zonesLayer'
        world.appendChild(zonesLayer)
      }
      let edgesSvg = doc.getElementById('edgesSvg')
      if (!edgesSvg) {
        edgesSvg = doc.createElement('svg')
        edgesSvg.id = 'edgesSvg'
        edgesSvg.className = 'edges-svg'
        world.appendChild(edgesSvg)
      }
      let edgesGroup = doc.getElementById('edgesGroup')
      if (!edgesGroup && edgesSvg) {
        edgesGroup = doc.createElement('g')
        edgesGroup.id = 'edgesGroup'
        edgesSvg.appendChild(edgesGroup)
      }
      let edgeLabelsLayer = doc.getElementById('edgeLabelsLayer')
      if (!edgeLabelsLayer) {
        edgeLabelsLayer = doc.createElement('div')
        edgeLabelsLayer.id = 'edgeLabelsLayer'
        world.appendChild(edgeLabelsLayer)
      }
      let nodesLayer = doc.getElementById('nodesLayer')
      if (!nodesLayer) {
        nodesLayer = doc.createElement('div')
        nodesLayer.id = 'nodesLayer'
        world.appendChild(nodesLayer)
      }
    }

    function isVisibleInView(itemViews) {
      if (_currentView === 'all') return true
      return !itemViews || itemViews.includes(_currentView)
    }

    function setView(viewName) {
      _currentView = viewName || 'core'
      renderEdges()
    }

    function getView() {
      return _currentView
    }

    function markInteracting() {
      const doc = getDoc()
      if (!doc) return
      const vp = doc.getElementById('viewport')
      if (!vp || !vp.classList) return
      vp.classList.add('is-interacting')
      if (_interactTimer) {
        clearTimeout(_interactTimer)
      }
      _interactTimer = setTimeout(() => {
        _interactTimer = 0
        if (vp.classList) {
          vp.classList.remove('is-interacting')
        }
      }, 140)
    }

    function applyTransform() {
      const doc = getDoc()
      if (!doc) return
      const world = doc.getElementById('world')
      if (world && world.style) {
        world.style.transform = `translate3d(${_panX}px, ${_panY}px, 0) scale(${_scale})`
      }
      const vp = doc.getElementById('viewport')
      if (vp && vp.classList) {
        vp.classList.toggle('is-zoomed-out', _scale < 0.55)
        vp.classList.toggle('is-far-zoom', _scale < 0.38)
      }
      const pct = Math.round(_scale * 100)
      if (pct !== _lastZoomPct) {
        _lastZoomPct = pct
        const zoomEl = doc.getElementById('zoomLabel')
        if (zoomEl) {
          zoomEl.textContent = `${pct}%`
        }
      }
    }

    function scheduleTransform() {
      if (typeof root.requestAnimationFrame === 'function') {
        if (_rafId) return
        _rafId = root.requestAnimationFrame(() => {
          _rafId = 0
          applyTransform()
        })
      } else {
        applyTransform()
      }
    }

    function screenToWorld(clientX, clientY) {
      const x = (Number(clientX) - _panX) / _scale
      const y = (Number(clientY) - _panY) / _scale
      return {
        x: isNaN(x) ? 0 : x,
        y: isNaN(y) ? 0 : y,
      }
    }

    function worldToScreen(worldX, worldY) {
      const x = Number(worldX) * _scale + _panX
      const y = Number(worldY) * _scale + _panY
      return {
        x: isNaN(x) ? 0 : x,
        y: isNaN(y) ? 0 : y,
      }
    }

    function getPan() {
      return { x: _panX, y: _panY }
    }

    function setPan(x, y, animate = false) {
      _panX = isNaN(Number(x)) ? _panX : Number(x)
      _panY = isNaN(Number(y)) ? _panY : Number(y)
      applyTransform(animate)
      return { x: _panX, y: _panY }
    }

    function getScale() {
      return _scale
    }

    function setScale(newScale, animate = false) {
      const num = Number(newScale)
      if (isNaN(num)) return _scale
      // B7-T1 & B7-T2: Clamp zoom scale to [0.05, 5.0] to prevent inversion, zero-division, and blowout
      const clamped = Math.max(0.05, Math.min(5.0, num))
      _scale = Number(clamped.toFixed(4))
      applyTransform(animate)
      return _scale
    }

    function setZoom(newZoom, animate = false) {
      return setScale(newZoom, animate)
    }

    function zoomAtPoint(targetScale, clientX, clientY, useRaf = false) {
      const num = Number(targetScale)
      if (isNaN(num)) return _scale
      const clamped = Math.max(0.18, Math.min(2.6, num))
      const doc = getDoc()
      const vp = doc ? doc.getElementById('viewport') : null
      const cx =
        typeof clientX === 'number' && !isNaN(clientX)
          ? clientX
          : vp && vp.clientWidth > 0
            ? vp.clientWidth / 2
            : 640
      const cy =
        typeof clientY === 'number' && !isNaN(clientY)
          ? clientY
          : vp && vp.clientHeight > 0
            ? vp.clientHeight / 2
            : 400
      const worldPos = screenToWorld(cx, cy)
      _scale = Number(clamped.toFixed(4))
      _panX = Math.round(cx - worldPos.x * _scale)
      _panY = Math.round(cy - worldPos.y * _scale)
      markInteracting()
      if (useRaf) {
        scheduleTransform()
      } else {
        applyTransform()
      }
      return _scale
    }

    function zoomByFactor(factor) {
      return zoomAtPoint(_scale * (Number(factor) || 1))
    }

    function measureNodeSizes() {
      const doc = getDoc()
      if (!doc) return
      const layer = doc.getElementById('nodesLayer')
      if (!layer || !layer.querySelectorAll) return
      layer.querySelectorAll('[data-node-id]').forEach((el) => {
        const id = el.dataset ? el.dataset.nodeId : el.getAttribute('data-node-id')
        if (id && el.offsetWidth > 0 && el.offsetHeight > 0) {
          nodeSizeMap.set(id, { w: el.offsetWidth, h: el.offsetHeight })
        }
      })
    }

    function getNodeRect(node) {
      if (!node) return { id: '', x: 0, y: 0, w: 256, h: 146, cx: 128, cy: 73 }
      const measured = nodeSizeMap.get(node.id)
      const hasNote = Boolean(
        (
          (node.moduleAnnotation !== undefined ? node.moduleAnnotation : node.annotation) || ''
        ).trim(),
      )
      const defaultH =
        node.kind === 'table'
          ? Math.max(180, 56 + (Array.isArray(node.columns) ? node.columns.length : 5) * 26) +
            (hasNote ? 34 : 0)
          : hasNote
            ? 168
            : 146
      const w = measured ? measured.w : node.w || (node.kind === 'table' ? 284 : 256)
      const h = measured ? measured.h : node.h || defaultH
      const nx = typeof node.x === 'number' ? node.x : 0
      const ny = typeof node.y === 'number' ? node.y : 0
      return {
        id: node.id,
        x: nx,
        y: ny,
        w,
        h,
        cx: nx + w / 2,
        cy: ny + h / 2,
      }
    }

    function fitView(animate = true) {
      const doc = getDoc()
      if (!doc) return

      ensureDomSkeleton(doc)
      const viewport = doc.getElementById('viewport')

      // F8-T6: Viewport fitView bases calculation on clientWidth rather than window.innerWidth!
      // When right inspector is docked, viewport.clientWidth is reduced by --inspector-width.
      const vpW =
        viewport && typeof viewport.clientWidth === 'number'
          ? viewport.clientWidth
          : root.innerWidth || 1200
      const vpH =
        viewport && typeof viewport.clientHeight === 'number'
          ? viewport.clientHeight
          : root.innerHeight || 800

      // B7-T3: Zero viewport dimensions (0x0) handled gracefully without NaN coordinates or throwing
      if (vpW <= 0 || vpH <= 0) {
        return
      }

      const availW = vpW - 60
      const availH = vpH - 90
      if (availW <= 0 || availH <= 0) {
        return
      }

      const allNodes = getGlobalNodes()
      const visibleNodes = allNodes.filter((n) => isVisibleInView(n.views))
      const targetNodes = visibleNodes.length > 0 ? visibleNodes : allNodes

      if (targetNodes.length === 0) return

      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity
      targetNodes.forEach((n) => {
        const r = getNodeRect(n)
        minX = Math.min(minX, r.x - 60)
        minY = Math.min(minY, r.y - 90)
        maxX = Math.max(maxX, r.x + r.w + 60)
        maxY = Math.max(maxY, r.y + r.h + 70)
      })

      const boxW = Math.max(600, maxX - minX)
      const boxH = Math.max(400, maxY - minY)

      const targetScale = Math.max(
        0.05,
        Math.min(1.02, Math.max(0.32, Math.min(availW / boxW, availH / boxH))),
      )
      const targetScaleNum = Number(targetScale.toFixed(2))

      // Calculate center relative to viewport.clientWidth so canvas is centered inside net available area
      const targetPanX = Math.round(vpW / 2 - ((minX + maxX) / 2) * targetScaleNum)
      const targetPanY = Math.round(vpH / 2 - ((minY + maxY) / 2) * targetScaleNum)

      if (isNaN(targetPanX) || isNaN(targetPanY) || isNaN(targetScaleNum)) {
        return
      }

      if (animate && root.gsap && typeof root.gsap.to === 'function') {
        try {
          const animState = { panX: _panX, panY: _panY, scale: _scale }
          root.gsap.killTweensOf(animState)
          root.gsap.to(animState, {
            panX: targetPanX,
            panY: targetPanY,
            scale: targetScaleNum,
            duration: 0.45,
            ease: 'power3.out',
            onUpdate: function () {
              _panX = animState.panX
              _panY = animState.panY
              _scale = animState.scale
              applyTransform()
            },
          })
          return
        } catch {
          // Fallback to synchronous update
        }
      }

      _panX = targetPanX
      _panY = targetPanY
      _scale = targetScaleNum
      applyTransform()
    }

    function handleViewportResize() {
      const doc = getDoc()
      if (!doc) return
      const viewport = doc.getElementById('viewport')
      applyTransform()

      try {
        const evt = new (root.CustomEvent || root.Event)('viewport:resize', {
          bubbles: true,
          detail: {
            clientWidth: viewport ? viewport.clientWidth : root.innerWidth || 1200,
            clientHeight: viewport ? viewport.clientHeight : root.innerHeight || 800,
          },
        })
        doc.dispatchEvent(evt)
      } catch {
        // ignore
      }
    }

    // =========================================================================
    // Manhattan Orthogonal Router & Connection Rendering
    // =========================================================================
    function chooseAutoSides(r1, r2) {
      const dx = r2.cx - r1.cx
      const dy = r2.cy - r1.cy
      if (Math.abs(dx) >= Math.abs(dy) * 0.75) {
        return dx >= 0
          ? { srcSide: 'right', tgtSide: 'left' }
          : { srcSide: 'left', tgtSide: 'right' }
      }
      return dy >= 0 ? { srcSide: 'bottom', tgtSide: 'top' } : { srcSide: 'top', tgtSide: 'bottom' }
    }

    function isSideNatural(fromRect, toRect, side, sameSidePair) {
      if (sameSidePair) return true
      const dx = toRect.cx - fromRect.cx
      const dy = toRect.cy - fromRect.cy
      if (side === 'right') return dx >= -60
      if (side === 'left') return dx <= 60
      if (side === 'bottom') return dy >= -60
      if (side === 'top') return dy <= 60
      return true
    }

    function resolveEdgeSides(r1, r2, edge) {
      const auto = chooseAutoSides(r1, r2)
      if (!edge.srcSide && !edge.tgtSide) return auto
      const sSide = edge.srcSide || auto.srcSide
      const tSide = edge.tgtSide || auto.tgtSide
      const sameSidePair =
        (sSide === 'left' && tSide === 'left') || (sSide === 'right' && tSide === 'right')
      const srcOk = isSideNatural(r1, r2, sSide, sameSidePair)
      const tgtOk = isSideNatural(r2, r1, tSide, sameSidePair)
      if (srcOk && tgtOk) {
        return { srcSide: sSide, tgtSide: tSide }
      }
      return auto
    }

    function getPortAnchor(rect, side, offset = 0) {
      const clampOff = (val, maxHalf) => Math.max(-maxHalf, Math.min(maxHalf, val))
      if (side === 'right')
        return { x: rect.x + rect.w, y: Math.round(rect.cy + clampOff(offset, rect.h * 0.36)) }
      if (side === 'left')
        return { x: rect.x, y: Math.round(rect.cy + clampOff(offset, rect.h * 0.36)) }
      if (side === 'bottom')
        return { x: Math.round(rect.cx + clampOff(offset, rect.w * 0.36)), y: rect.y + rect.h }
      return { x: Math.round(rect.cx + clampOff(offset, rect.w * 0.36)), y: rect.y }
    }

    function stepOutFromPort(pt, side, dist) {
      if (side === 'right') return { x: pt.x + dist, y: pt.y }
      if (side === 'left') return { x: pt.x - dist, y: pt.y }
      if (side === 'bottom') return { x: pt.x, y: pt.y + dist }
      return { x: pt.x, y: pt.y - dist }
    }

    function segHitsRect(p1, p2, r, pad = 10) {
      const minX = Math.min(p1.x, p2.x)
      const maxX = Math.max(p1.x, p2.x)
      const minY = Math.min(p1.y, p2.y)
      const maxY = Math.max(p1.y, p2.y)
      return !(
        maxX <= r.x - pad ||
        minX >= r.x + r.w + pad ||
        maxY <= r.y - pad ||
        minY >= r.y + r.h + pad
      )
    }

    function simplifyWaypoints(pts) {
      const out = []
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        if (out.length === 0) {
          out.push(p)
          continue
        }
        const prev = out[out.length - 1]
        if (Math.abs(p.x - prev.x) < 0.5 && Math.abs(p.y - prev.y) < 0.5) continue
        if (out.length >= 2) {
          const prev2 = out[out.length - 2]
          const sameX = Math.abs(prev2.x - prev.x) < 0.5 && Math.abs(prev.x - p.x) < 0.5
          const sameY = Math.abs(prev2.y - prev.y) < 0.5 && Math.abs(prev.y - p.y) < 0.5
          if (sameX || sameY) {
            out[out.length - 1] = p
            continue
          }
        }
        out.push(p)
      }
      return out
    }

    function scoreOrthogonalCandidate(rawPts, r1, r2, obstacles) {
      const pts = simplifyWaypoints(rawPts)
      let hits = 0
      let length = 0
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i]
        const b = pts[i + 1]
        length += Math.hypot(b.x - a.x, b.y - a.y)
        if (i > 0 && segHitsRect(a, b, r1, 4)) hits += 2
        if (i < pts.length - 2 && segHitsRect(a, b, r2, 4)) hits += 2
        for (let j = 0; j < obstacles.length; j++) {
          if (segHitsRect(a, b, obstacles[j], 10)) hits += 1
        }
      }
      const bends = Math.max(0, pts.length - 2)
      return { pts, hits, cost: hits * 100000 + length + bends * 35 }
    }

    function pointsToRoundedOrthogonalPath(clean, radius, pStart, pEnd) {
      if (clean.length < 2) return { d: '', midX: pStart.x, midY: pStart.y, pStart, pEnd }

      let d = `M ${clean[0].x + SVG_OFFSET} ${clean[0].y + SVG_OFFSET}`
      for (let i = 1; i < clean.length - 1; i++) {
        const p0 = clean[i - 1]
        const p1 = clean[i]
        const p2 = clean[i + 1]

        const v1x = p1.x - p0.x
        const v1y = p1.y - p0.y
        const len1 = Math.hypot(v1x, v1y)

        const v2x = p2.x - p1.x
        const v2y = p2.y - p1.y
        const len2 = Math.hypot(v2x, v2y)

        const r = Math.min(radius, len1 * 0.45, len2 * 0.45)
        if (r < 1.5) {
          d += ` L ${p1.x + SVG_OFFSET} ${p1.y + SVG_OFFSET}`
        } else {
          const startX = p1.x - (v1x / len1) * r
          const startY = p1.y - (v1y / len1) * r
          const endX = p1.x + (v2x / len2) * r
          const endY = p1.y + (v2y / len2) * r
          d += ` L ${startX + SVG_OFFSET} ${startY + SVG_OFFSET} Q ${p1.x + SVG_OFFSET} ${p1.y + SVG_OFFSET} ${endX + SVG_OFFSET} ${endY + SVG_OFFSET}`
        }
      }
      const last = clean[clean.length - 1]
      d += ` L ${last.x + SVG_OFFSET} ${last.y + SVG_OFFSET}`

      let bestLen = -1
      let midX = (clean[0].x + last.x) / 2
      let midY = (clean[0].y + last.y) / 2
      for (let i = 0; i < clean.length - 1; i++) {
        const segLen = Math.hypot(clean[i + 1].x - clean[i].x, clean[i + 1].y - clean[i].y)
        if (segLen > bestLen) {
          bestLen = segLen
          midX = (clean[i].x + clean[i + 1].x) / 2
          midY = (clean[i].y + clean[i + 1].y) / 2
        }
      }
      return { d, midX, midY, pStart, pEnd }
    }

    function buildOrthogonalRoute(r1, r2, edge, sides, portOffsets, obstacles) {
      const srcSide = sides.srcSide
      const tgtSide = sides.tgtSide
      const laneOffset = ((edge && edge.lane) || 0) * 14

      const pStart = getPortAnchor(r1, srcSide, portOffsets.srcOff)
      const pEnd = getPortAnchor(r2, tgtSide, portOffsets.tgtOff)
      const stub = 22 + Math.min(18, Math.abs(laneOffset))
      const s1 = stepOutFromPort(pStart, srcSide, stub)
      const e1 = stepOutFromPort(pEnd, tgtSide, stub)

      // Spatial cull: only check obstacles within expanded corridor between r1 and r2
      const boxMinX = Math.min(r1.x, r2.x, s1.x, e1.x) - 180
      const boxMaxX = Math.max(r1.x + r1.w, r2.x + r2.w, s1.x, e1.x) + 180
      const boxMinY = Math.min(r1.y, r2.y, s1.y, e1.y) - 180
      const boxMaxY = Math.max(r1.y + r1.h, r2.y + r2.h, s1.y, e1.y) + 180
      const localObstacles = obstacles.filter(
        (obs) =>
          obs.x + obs.w >= boxMinX &&
          obs.x <= boxMaxX &&
          obs.y + obs.h >= boxMinY &&
          obs.y <= boxMaxY,
      )

      const midX = Math.round((s1.x + e1.x) / 2) + laneOffset
      const midY = Math.round((s1.y + e1.y) / 2) + laneOffset

      const primaryCandidates = [
        [pStart, s1, { x: e1.x, y: s1.y }, e1, pEnd],
        [pStart, s1, { x: s1.x, y: e1.y }, e1, pEnd],
        [pStart, s1, { x: midX, y: s1.y }, { x: midX, y: e1.y }, e1, pEnd],
        [pStart, s1, { x: s1.x, y: midY }, { x: e1.x, y: midY }, e1, pEnd],
      ]

      let best = null
      for (let i = 0; i < primaryCandidates.length; i++) {
        const res = scoreOrthogonalCandidate(primaryCandidates[i], r1, r2, localObstacles)
        if (!best || res.cost < best.cost) best = res
      }

      // Fast-path early exit: if a direct L-route or midpoint Z-route is collision-free, skip obstacle detours
      if (best && best.hits === 0) {
        return pointsToRoundedOrthogonalPath(best.pts, 11, pStart, pEnd)
      }

      const candidates = []
      const xSet = new Set([
        Math.round(r1.x - 30 - Math.abs(laneOffset)),
        Math.round(r1.x + r1.w + 30 + Math.abs(laneOffset)),
        Math.round(r2.x - 30 - Math.abs(laneOffset)),
        Math.round(r2.x + r2.w + 30 + Math.abs(laneOffset)),
      ])
      ;[-60, 60, -120, 120].forEach((d) => {
        xSet.add(midX + d)
      })
      localObstacles.forEach((obs) => {
        xSet.add(obs.x - 24 + laneOffset)
        xSet.add(obs.x + obs.w + 24 + laneOffset)
      })
      xSet.forEach((x) => {
        candidates.push([pStart, s1, { x, y: s1.y }, { x, y: e1.y }, e1, pEnd])
      })

      const ySet = new Set([
        Math.round(r1.y - 30 - Math.abs(laneOffset)),
        Math.round(r1.y + r1.h + 30 + Math.abs(laneOffset)),
        Math.round(r2.y - 30 - Math.abs(laneOffset)),
        Math.round(r2.y + r2.h + 30 + Math.abs(laneOffset)),
      ])
      ;[-50, 50, -100, 100].forEach((d) => {
        ySet.add(midY + d)
      })
      localObstacles.forEach((obs) => {
        ySet.add(obs.y - 24 + laneOffset)
        ySet.add(obs.y + obs.h + 24 + laneOffset)
      })
      ySet.forEach((y) => {
        candidates.push([pStart, s1, { x: s1.x, y }, { x: e1.x, y }, e1, pEnd])
      })

      for (let i = 0; i < candidates.length; i++) {
        const res = scoreOrthogonalCandidate(candidates[i], r1, r2, localObstacles)
        if (!best || res.cost < best.cost) best = res
      }

      return pointsToRoundedOrthogonalPath(best.pts, 11, pStart, pEnd)
    }

    function renderEdges(edges) {
      const doc = getDoc()
      if (!doc) return

      const svgGroup = doc.getElementById('edgesGroup')
      const labelsLayer = doc.getElementById('edgeLabelsLayer')
      if (!svgGroup) return

      if (typeof svgGroup.replaceChildren === 'function') {
        svgGroup.replaceChildren()
      } else {
        svgGroup.innerHTML = ''
        if (Array.isArray(svgGroup.children)) svgGroup.children = []
      }
      if (labelsLayer) {
        if (typeof labelsLayer.replaceChildren === 'function') {
          labelsLayer.replaceChildren()
        } else {
          labelsLayer.innerHTML = ''
          if (Array.isArray(labelsLayer.children)) labelsLayer.children = []
        }
      }

      const allNodes = getGlobalNodes()
      const allEdges = Array.isArray(edges) ? edges : getGlobalEdges()
      const nodeMap = new Map(allNodes.map((n) => [n.id, n]))

      const visibleRectMap = new Map()
      allNodes.forEach((n) => {
        if (isVisibleInView(n.views)) {
          visibleRectMap.set(n.id, getNodeRect(n))
        }
      })
      const allVisibleRects = Array.from(visibleRectMap.values())

      const visibleEdges = []
      const sidesMap = new Map()
      const portSlots = new Map()

      const addPortSlot = (nodeId, side, edgeId, isSource, sortCoord) => {
        const key = `${nodeId}:${side}`
        if (!portSlots.has(key)) portSlots.set(key, [])
        portSlots.get(key).push({ edgeId, isSource, sortCoord })
      }

      allEdges.forEach((edge) => {
        const src = nodeMap.get(edge.source)
        const tgt = nodeMap.get(edge.target)
        if (!src || !tgt) return
        if (!isVisibleInView(src.views) || !isVisibleInView(tgt.views)) return

        const r1 = visibleRectMap.get(src.id) || getNodeRect(src)
        const r2 = visibleRectMap.get(tgt.id) || getNodeRect(tgt)
        const sides = resolveEdgeSides(r1, r2, edge)
        sidesMap.set(edge.id, sides)
        visibleEdges.push({ edge, src, tgt, r1, r2, sides })

        const srcSort = sides.srcSide === 'left' || sides.srcSide === 'right' ? r2.cy : r2.cx
        const tgtSort = sides.tgtSide === 'left' || sides.tgtSide === 'right' ? r1.cy : r1.cx
        addPortSlot(src.id, sides.srcSide, edge.id, true, srcSort)
        addPortSlot(tgt.id, sides.tgtSide, edge.id, false, tgtSort)
      })

      const portOffsetsMap = new Map()
      visibleEdges.forEach(({ edge }) => {
        portOffsetsMap.set(edge.id, { srcOff: 0, tgtOff: 0 })
      })
      portSlots.forEach((list) => {
        list.sort((a, b) => a.sortCoord - b.sortCoord)
        const count = list.length
        const step = count <= 3 ? 20 : 15
        list.forEach((item, idx) => {
          const off = Math.round((idx - (count - 1) / 2) * step)
          const rec = portOffsetsMap.get(item.edgeId)
          if (rec) {
            if (item.isSource) rec.srcOff = off
            else rec.tgtOff = off
          }
        })
      })

      const appState =
        root.DDO_APP && typeof root.DDO_APP.getState === 'function' ? root.DDO_APP.getState() : {}
      const focusNodeId = appState.draggingNodeId || appState.selectedNodeId || null
      const selectedEdgeId = appState.selectedEdgeId || null
      const showAllLabels = !!appState.showAllEdgeLabels

      const CIRCLED_NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫']
      let seqCounter = 0

      const svgFrag =
        typeof doc.createDocumentFragment === 'function' ? doc.createDocumentFragment() : svgGroup
      const lblFrag =
        labelsLayer && typeof doc.createDocumentFragment === 'function'
          ? doc.createDocumentFragment()
          : labelsLayer

      visibleEdges.forEach(({ edge, src, tgt, r1, r2, sides }) => {
        const obstacles = allVisibleRects.filter((r) => r.id !== src.id && r.id !== tgt.id)
        const portOffsets = portOffsetsMap.get(edge.id) || { srcOff: 0, tgtOff: 0 }
        const route = buildOrthogonalRoute(r1, r2, edge, sides, portOffsets, obstacles)

        const isConnectedToFocus =
          focusNodeId && (edge.source === focusNodeId || edge.target === focusNodeId)
        const isSelectedEdge = selectedEdgeId === edge.id
        const kind = edge.kind || 'flow'

        const g = doc.createElementNS
          ? doc.createElementNS('http://www.w3.org/2000/svg', 'g')
          : doc.createElement('g')
        g.setAttribute(
          'class',
          `edge-group ${isSelectedEdge ? 'selected' : ''} ${isConnectedToFocus ? 'lineage-active' : ''}`.trim(),
        )
        g.setAttribute('data-edge-id', edge.id)
        if (focusNodeId && !isConnectedToFocus) {
          g.style.opacity = '0.16'
        }

        const hit = doc.createElementNS
          ? doc.createElementNS('http://www.w3.org/2000/svg', 'path')
          : doc.createElement('path')
        hit.setAttribute('class', 'edge-hit')
        hit.setAttribute('d', route.d)

        const path = doc.createElementNS
          ? doc.createElementNS('http://www.w3.org/2000/svg', 'path')
          : doc.createElement('path')
        path.setAttribute('class', `edge-path edge-${kind}`)
        path.setAttribute('d', route.d)
        path.setAttribute('marker-end', `url(#arrow-${kind})`)
        if (kind === 'bi') {
          path.setAttribute('marker-start', 'url(#arrow-bi)')
        }

        const originDot = doc.createElementNS
          ? doc.createElementNS('http://www.w3.org/2000/svg', 'circle')
          : doc.createElement('circle')
        originDot.setAttribute('class', `edge-origin-dot dot-${kind}`)
        originDot.setAttribute('cx', String(route.pStart.x + SVG_OFFSET))
        originDot.setAttribute('cy', String(route.pStart.y + SVG_OFFSET))
        originDot.setAttribute('r', '3.2')

        const onEdgeClick = (ev) => {
          if (typeof ev.stopPropagation === 'function') ev.stopPropagation()
          if (root.DDO_APP && typeof root.DDO_APP.openEdgePopover === 'function') {
            root.DDO_APP.openEdgePopover(edge, ev.clientX || 400, ev.clientY || 300)
          }
        }
        g.addEventListener('click', onEdgeClick)
        g.addEventListener('pointerdown', (ev) => {
          if (typeof ev.stopPropagation === 'function') ev.stopPropagation()
        })

        g.appendChild(hit)
        g.appendChild(path)
        g.appendChild(originDot)
        svgFrag.appendChild(g)

        if (lblFrag && edge.label) {
          const lbl = doc.createElement('div')
          const showLabel =
            kind === 'broken' || showAllLabels || isConnectedToFocus || isSelectedEdge
          lbl.className =
            `edge-label-pill ${kind === 'broken' ? 'broken' : ''} ${showAllLabels ? 'always-show' : ''} ${isConnectedToFocus ? 'lineage-show' : ''} ${isSelectedEdge ? 'selected' : ''}`.trim()
          lbl.setAttribute('data-edge-id', edge.id)

          if (isConnectedToFocus) {
            const stepBadge =
              edge.timing && edge.timing > 0
                ? CIRCLED_NUMS[edge.timing - 1] || `(${edge.timing})`
                : CIRCLED_NUMS[seqCounter % CIRCLED_NUMS.length]
            seqCounter++
            lbl.textContent = `${stepBadge} ${edge.label}`
          } else {
            lbl.textContent = edge.label
          }

          lbl.style.left = `${route.midX}px`
          lbl.style.top = `${route.midY}px`
          if (!showLabel && focusNodeId) {
            lbl.style.opacity = '0'
          }
          lbl.addEventListener('click', onEdgeClick)
          lbl.addEventListener('pointerdown', (ev) => {
            if (typeof ev.stopPropagation === 'function') ev.stopPropagation()
          })
          lblFrag.appendChild(lbl)
        }
      })

      if (svgFrag !== svgGroup) {
        svgGroup.appendChild(svgFrag)
      }
      if (labelsLayer && lblFrag && lblFrag !== labelsLayer) {
        labelsLayer.appendChild(lblFrag)
      }
    }

    function initViewport(viewportEl) {
      const doc = getDoc()
      const vp = viewportEl || (doc ? doc.getElementById('viewport') : null)
      if (!vp || vp.__ddoViewportInited) return
      vp.__ddoViewportInited = true

      const evtTarget = root && typeof root.addEventListener === 'function' ? root : doc
      let isPanning = false
      let moved = false
      let startX = 0
      let startY = 0
      let initialPanX = 0
      let initialPanY = 0

      vp.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0 && ev.button !== undefined) return
        if (
          ev.target &&
          typeof ev.target.closest === 'function' &&
          ev.target.closest(
            '.wc-node, .er-table-node, .edge-group, .edge-label-pill, .zone-lock-btn',
          )
        ) {
          return
        }
        isPanning = true
        moved = false
        startX = ev.clientX || 0
        startY = ev.clientY || 0
        initialPanX = _panX
        initialPanY = _panY
        if (vp.classList) vp.classList.add('panning')

        const onMove = (moveEv) => {
          if (!isPanning) return
          const dx = (moveEv.clientX || 0) - startX
          const dy = (moveEv.clientY || 0) - startY
          if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
            moved = true
          }
          _panX = initialPanX + dx
          _panY = initialPanY + dy
          markInteracting()
          scheduleTransform()
        }

        const onUp = () => {
          isPanning = false
          if (vp.classList) vp.classList.remove('panning')
          if (evtTarget) {
            evtTarget.removeEventListener('pointermove', onMove)
            evtTarget.removeEventListener('pointerup', onUp)
          }

          if (!moved && root.DDO_APP && typeof root.DDO_APP.onBlankCanvasClick === 'function') {
            root.DDO_APP.onBlankCanvasClick()
          }
        }

        if (evtTarget) {
          evtTarget.addEventListener('pointermove', onMove)
          evtTarget.addEventListener('pointerup', onUp)
        }
      })

      vp.addEventListener(
        'wheel',
        (ev) => {
          if (typeof ev.preventDefault === 'function') ev.preventDefault()
          let rawDelta = ev.deltaY || 0
          if (ev.deltaMode === 1) rawDelta *= 18
          else if (ev.deltaMode === 2) rawDelta *= 240
          const clampedDelta = Math.max(-120, Math.min(120, rawDelta))
          const factor =
            clampedDelta === 0
              ? 1
              : Math.abs(clampedDelta) >= 80
                ? clampedDelta < 0
                  ? 1.1
                  : 0.91
                : Math.exp(-clampedDelta * 0.0018)

          const clientX =
            typeof ev.clientX === 'number' && ev.clientX > 0 ? ev.clientX : vp.clientWidth / 2
          const clientY =
            typeof ev.clientY === 'number' && ev.clientY > 0 ? ev.clientY : vp.clientHeight / 2

          zoomAtPoint(_scale * factor, clientX, clientY, true)
        },
        { passive: false },
      )
    }

    // Define DDO_CORE object
    const DDO_CORE = {
      SVG_OFFSET,
      screenToWorld,
      worldToScreen,
      getPan,
      setPan,
      getScale,
      setScale,
      setZoom,
      zoomAtPoint,
      zoomByFactor,
      fitView,
      handleViewportResize,
      buildOrthogonalRoute,
      pointsToRoundedOrthogonalPath,
      renderEdges,
      measureNodeSizes,
      getNodeRect,
      initViewport,
      setView,
      getView,
      applyTransform,
      scheduleTransform,
    }

    // Bind scale / panX / panY properties to DDO_CORE
    Object.defineProperty(DDO_CORE, 'scale', {
      get() {
        return _scale
      },
      set(v) {
        setScale(v)
      },
      configurable: true,
      enumerable: true,
    })

    Object.defineProperty(DDO_CORE, 'panX', {
      get() {
        return _panX
      },
      set(v) {
        _panX = isNaN(Number(v)) ? _panX : Number(v)
        applyTransform()
      },
      configurable: true,
      enumerable: true,
    })

    Object.defineProperty(DDO_CORE, 'panY', {
      get() {
        return _panY
      },
      set(v) {
        _panY = isNaN(Number(v)) ? _panY : Number(v)
        applyTransform()
      },
      configurable: true,
      enumerable: true,
    })

    // Auto-init DOM if available
    const doc = getDoc()
    if (doc) {
      ensureDomSkeleton(doc)
      applyTransform()
    }

    root.DDO_CORE = DDO_CORE
    return DDO_CORE
  },
)
