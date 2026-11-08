/**
 * DayDayOn Architecture Canvas — Application Coordinator (window.DDO_APP)
 *
 * Responsibilities:
 * 1. Global Lifecycle Coordinator:
 *    - Connects and synchronizes DDO_STORE, DDO_CORE, DDO_ZONE_MGR, DDO_INSPECTOR, DDO_SCENARIO.
 * 2. Toolbar, Bottom Dock & Popover Wiring:
 *    - Scenario Runner quick launch (#btnRunScenarioDock).
 *    - Add Node menu (#btnToggleAddMenu, #addNodeMenu).
 *    - Interactive Port Drag & Connect Mode (#btnToggleConnectMode, #tempConnectLine).
 *    - Edge Label toggle (#btnToggleEdgeLabels) & Edge Popover editor (#edgePopover).
 *    - Compact Mode & Spacing scaling (#btnToggleCompactMode, #btnShrinkSpacing, #btnExpandSpacing).
 *    - Version select dropdown (#versionSelect), Save (#btnSaveVersion), Reset (#btnResetInitial).
 *    - JSON export/import/copy (#btnExportJson, #btnImportJson, #btnCopyJson).
 * 3. Topological Lineage Highlight & 1-2-3-4 Sequence Badges:
 *    - Clicking a node highlights its upstream/downstream neighbors with ① ② ③ sequence badges
 *      and dims unrelated nodes (.lineage-dim).
 */

;(function (root, factory) {
  'use strict'
  const instance = factory(root)
  if (typeof module === 'object' && module.exports) {
    module.exports = instance
  }
  if (root) {
    root.DDO_APP = instance
  }
})(
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this,
  function (root) {
    'use strict'

    const CIRCLED_NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫']

    function getDoc() {
      return root.document || (typeof document !== 'undefined' ? document : null)
    }

    function getNodes() {
      if (
        root.DDO_DATA &&
        Array.isArray(root.DDO_DATA.INITIAL_NODES) &&
        root.DDO_DATA.INITIAL_NODES.length > 0
      ) {
        return root.DDO_DATA.INITIAL_NODES
      }
      if (Array.isArray(root.DDO_INITIAL_NODES) && root.DDO_INITIAL_NODES.length > 0) {
        return root.DDO_INITIAL_NODES
      }
      return []
    }

    function getZones() {
      if (
        root.DDO_DATA &&
        Array.isArray(root.DDO_DATA.INITIAL_ZONES) &&
        root.DDO_DATA.INITIAL_ZONES.length > 0
      ) {
        return root.DDO_DATA.INITIAL_ZONES
      }
      if (Array.isArray(root.DDO_INITIAL_ZONES) && root.DDO_INITIAL_ZONES.length > 0) {
        return root.DDO_INITIAL_ZONES
      }
      return []
    }

    function getEdges() {
      if (
        root.DDO_DATA &&
        Array.isArray(root.DDO_DATA.INITIAL_EDGES) &&
        root.DDO_DATA.INITIAL_EDGES.length > 0
      ) {
        return root.DDO_DATA.INITIAL_EDGES
      }
      if (Array.isArray(root.DDO_INITIAL_EDGES) && root.DDO_INITIAL_EDGES.length > 0) {
        return root.DDO_INITIAL_EDGES
      }
      return []
    }

    const state = {
      currentView: 'core',
      connectMode: false,
      connectSourceId: null,
      showAllEdgeLabels: false,
      compactMode: false,
      selectedNodeId: null,
      selectedEdgeId: null,
      draggingNodeId: null,
      editingEdgeKind: 'flow',
    }

    function refreshIcons(rootEl) {
      if (root.lucide && typeof root.lucide.createIcons === 'function') {
        try {
          root.lucide.createIcons(rootEl ? { root: rootEl } : undefined)
        } catch {
          // ignore in headless DOM
        }
      }
    }

    function showToast(msg) {
      const doc = getDoc()
      if (!doc) return
      const el = doc.getElementById('toast')
      if (!el) return
      el.textContent = msg
      if (root.gsap) {
        try {
          root.gsap.killTweensOf(el)
          root.gsap.fromTo(
            el,
            { y: -8, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.22, ease: 'power2.out' },
          )
          root.gsap.to(el, { opacity: 0, y: -6, duration: 0.22, delay: 2.2, ease: 'power2.in' })
        } catch {
          el.style.opacity = '1'
          setTimeout(() => {
            if (el.style) el.style.opacity = '0'
          }, 2200)
        }
      } else {
        el.style.opacity = '1'
        setTimeout(() => {
          if (el.style) el.style.opacity = '0'
        }, 2200)
      }
    }

    function isVisibleInView(itemViews) {
      if (state.currentView === 'all') return true
      return !itemViews || itemViews.includes(state.currentView)
    }

    function animateTabIndicator(activeBtn) {
      const doc = getDoc()
      if (!doc || !activeBtn) return
      const pill = doc.getElementById('tabPillBg')
      if (!pill) return
      const nav = activeBtn.parentElement
      if (!nav) return
      const navRect = nav.getBoundingClientRect ? nav.getBoundingClientRect() : { left: 0, top: 0 }
      const btnRect = activeBtn.getBoundingClientRect
        ? activeBtn.getBoundingClientRect()
        : { left: 0, top: 0, width: 80, height: 32 }
      const left = (btnRect.left || 0) - (navRect.left || 0)
      const width = btnRect.width || 80

      if (root.gsap && width > 0) {
        try {
          root.gsap.to(pill, { x: left, width: width, duration: 0.25, ease: 'power2.out' })
          return
        } catch {}
      }
      pill.style.transform = `translateX(${left}px)`
      pill.style.width = `${width}px`
    }

    function closeAllPopovers() {
      const doc = getDoc()
      if (!doc) return
      doc.querySelectorAll('.dropdown-panel.open').forEach((p) => p.classList.remove('open'))
      const edgePop = doc.getElementById('edgePopover')
      if (edgePop) {
        edgePop.style.visibility = 'hidden'
        edgePop.style.opacity = '0'
      }
      state.selectedEdgeId = null
    }

    function onBlankCanvasClick() {
      closeAllPopovers()
      const inspMode =
        root.DDO_INSPECTOR && typeof root.DDO_INSPECTOR.getInspectorMode === 'function'
          ? root.DDO_INSPECTOR.getInspectorMode()
          : 'collapsed'
      // In Floating mode, clicking blank canvas keeps the panel & highlight intact
      if (inspMode === 'floating') {
        return
      }
      if (state.selectedNodeId) {
        applyLineageHighlight(null)
      }
    }

    function syncVersionSelect() {
      if (root.DDO_STORE && typeof root.DDO_STORE.renderVersionSelect === 'function') {
        root.DDO_STORE.renderVersionSelect()
      }
    }

    // =========================================================================
    // Topological Lineage Highlight & 1-2-3-4 Sequence Badges
    // =========================================================================

    function applyLineageHighlight(nodeId) {
      const doc = getDoc()
      state.selectedNodeId = nodeId || null
      if (!doc) return

      // Clear any previous lineage step badges on cards
      doc.querySelectorAll('.lineage-step-badge').forEach((b) => {
        if (typeof b.remove === 'function') b.remove()
        else if (b.parentNode) b.parentNode.removeChild(b)
      })

      const allNodeEls = doc.querySelectorAll('.wc-node, .er-table-node')
      if (!nodeId) {
        allNodeEls.forEach((el) => {
          el.classList.remove('selected', 'lineage-dim', 'lineage-neighbor')
        })
        renderEdges()
        return
      }

      const edges = getEdges()
      const connectedMap = new Map() // neighborNodeId -> stepOrder
      let seq = 1
      edges.forEach((e) => {
        if (e.source === nodeId && !connectedMap.has(e.target)) {
          connectedMap.set(e.target, e.timing && e.timing > 0 ? e.timing : seq++)
        } else if (e.target === nodeId && !connectedMap.has(e.source)) {
          connectedMap.set(e.source, e.timing && e.timing > 0 ? e.timing : seq++)
        }
      })

      allNodeEls.forEach((el) => {
        const id = el.dataset ? el.dataset.nodeId : el.getAttribute('data-node-id')
        el.classList.remove('selected', 'lineage-dim', 'lineage-neighbor')
        if (id === nodeId) {
          el.classList.add('selected')
        } else if (connectedMap.has(id)) {
          el.classList.add('lineage-neighbor')
          const stepNum = connectedMap.get(id)
          const badge = doc.createElement('div')
          badge.className = 'scenario-step-badge lineage-step-badge'
          badge.textContent = CIRCLED_NUMS[(stepNum - 1) % CIRCLED_NUMS.length] || String(stepNum)
          badge.title = `关联拓扑时序 #${stepNum}`
          el.appendChild(badge)
        } else {
          el.classList.add('lineage-dim')
        }
      })

      renderEdges()
    }

    // =========================================================================
    // Edge Popover Editor (Click Edge to Edit / Cut)
    // =========================================================================

    function openEdgePopover(edge, clientX, clientY) {
      const doc = getDoc()
      if (!doc || !edge) return
      closeAllPopovers()
      state.selectedEdgeId = edge.id
      state.editingEdgeKind = edge.kind || 'flow'

      const pop = doc.getElementById('edgePopover')
      if (!pop) return

      const nodes = getNodes()
      const src = nodes.find((n) => n.id === edge.source)
      const tgt = nodes.find((n) => n.id === edge.target)

      const pairEl = doc.getElementById('edgePopPair')
      if (pairEl) {
        pairEl.textContent = `${src ? src.title : edge.source} ➔ ${tgt ? tgt.title : edge.target}`
      }
      const inputEl = doc.getElementById('edgePopLabelInput')
      if (inputEl) {
        inputEl.value = edge.label || ''
      }

      pop.querySelectorAll('[data-edge-kind]').forEach((btn) => {
        const k = btn.getAttribute('data-edge-kind')
        btn.classList.toggle('btn-primary', k === state.editingEdgeKind)
      })

      const winW = root.innerWidth || 1280
      const winH = root.innerHeight || 800
      const left = Math.max(16, Math.min(winW - 330, clientX + 12))
      const top = Math.max(56, Math.min(winH - 280, clientY - 20))
      pop.style.left = `${left}px`
      pop.style.top = `${top}px`
      pop.style.visibility = 'visible'
      pop.style.opacity = '1'
      renderEdges()
    }

    // =========================================================================
    // Port Drag Connection & Node Event Binding
    // =========================================================================

    function startPortConnectionDrag(ev, sourceNode, portSide) {
      const doc = getDoc()
      if (!doc) return
      ev.stopPropagation()
      if (typeof ev.preventDefault === 'function') ev.preventDefault()

      const tempLine = doc.getElementById('tempConnectLine')
      const rect =
        root.DDO_CORE && typeof root.DDO_CORE.getNodeRect === 'function'
          ? root.DDO_CORE.getNodeRect(sourceNode)
          : {
              x: sourceNode.x,
              y: sourceNode.y,
              w: 240,
              h: 120,
              cx: sourceNode.x + 120,
              cy: sourceNode.y + 60,
            }

      const SVG_OFFSET = (root.DDO_CORE && root.DDO_CORE.SVG_OFFSET) || 3000
      const evtTarget = root && typeof root.addEventListener === 'function' ? root : doc
      const startPt = {
        x: portSide === 'left' ? rect.x : portSide === 'right' ? rect.x + rect.w : rect.cx,
        y: portSide === 'top' ? rect.y : portSide === 'bottom' ? rect.y + rect.h : rect.cy,
      }

      if (tempLine) {
        tempLine.style.display = 'block'
      }

      const onMove = (moveEv) => {
        if (!tempLine || !root.DDO_CORE) return
        const worldPt = root.DDO_CORE.screenToWorld(moveEv.clientX || 0, moveEv.clientY || 0)
        const midX = Math.round((startPt.x + worldPt.x) / 2)
        const d = `M ${startPt.x + SVG_OFFSET} ${startPt.y + SVG_OFFSET} L ${midX + SVG_OFFSET} ${startPt.y + SVG_OFFSET} L ${midX + SVG_OFFSET} ${worldPt.y + SVG_OFFSET} L ${worldPt.x + SVG_OFFSET} ${worldPt.y + SVG_OFFSET}`
        tempLine.setAttribute('d', d)
      }

      const onUp = (upEv) => {
        if (tempLine) {
          tempLine.style.display = 'none'
          tempLine.setAttribute('d', '')
        }
        if (evtTarget) {
          evtTarget.removeEventListener('pointermove', onMove)
          evtTarget.removeEventListener('pointerup', onUp)
        }

        const hitEl =
          doc.elementFromPoint && upEv.clientX !== undefined
            ? doc.elementFromPoint(upEv.clientX, upEv.clientY)
            : null
        const targetCard =
          hitEl && typeof hitEl.closest === 'function' ? hitEl.closest('[data-node-id]') : null
        const targetId = targetCard
          ? targetCard.dataset
            ? targetCard.dataset.nodeId
            : targetCard.getAttribute('data-node-id')
          : null

        if (targetId && targetId !== sourceNode.id) {
          const edges = getEdges()
          edges.push({
            id: `edge-${Date.now().toString(36)}`,
            source: sourceNode.id,
            target: targetId,
            label: '新增关联调用',
            kind: 'flow',
            timing: 1,
            views: ['core', 'diet', 'agent', 'render', 'social', 'db', 'all'],
          })
          if (root.DDO_STORE && typeof root.DDO_STORE.markDirty === 'function') {
            root.DDO_STORE.markDirty()
          }
          renderEdges()
          showToast('已创建正交连线（点击连线可修改类型或说明）')
        }
      }

      if (evtTarget) {
        evtTarget.addEventListener('pointermove', onMove)
        evtTarget.addEventListener('pointerup', onUp)
      }
    }

    function bindNodeEvents(card, node) {
      const doc = getDoc()
      if (!doc) return

      card.addEventListener('contextmenu', (ev) => {
        if (typeof ev.preventDefault === 'function') ev.preventDefault()
        if (typeof ev.stopPropagation === 'function') ev.stopPropagation()
        applyLineageHighlight(node.id)
        if (root.DDO_INSPECTOR && typeof root.DDO_INSPECTOR.openNode === 'function') {
          root.DDO_INSPECTOR.openNode(node.id)
          root.DDO_INSPECTOR.setActiveTab('positioning')
          const noteInput = doc.getElementById('inspModuleNote')
          if (noteInput && typeof noteInput.focus === 'function') {
            setTimeout(() => noteInput.focus(), 60)
          }
        }
      })

      card.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0 && ev.button !== undefined) return
        if (typeof ev.stopPropagation === 'function') ev.stopPropagation()

        // Check if dragging from a connection port dot
        const portEl =
          ev.target && typeof ev.target.closest === 'function' ? ev.target.closest('.port') : null
        if (portEl) {
          const portSide = portEl.getAttribute('data-port') || 'right'
          startPortConnectionDrag(ev, node, portSide)
          return
        }

        if (state.connectMode) {
          if (!state.connectSourceId) {
            state.connectSourceId = node.id
            showToast(`已选起点「${node.title || node.tableName}」，请再点击终点节点`)
          } else if (state.connectSourceId !== node.id) {
            const edges = getEdges()
            edges.push({
              id: `edge-${Date.now().toString(36)}`,
              source: state.connectSourceId,
              target: node.id,
              label: '关联调用',
              kind: 'flow',
              timing: 1,
              views: ['core', 'diet', 'agent', 'render', 'social', 'db', 'all'],
            })
            state.connectSourceId = null
            if (root.DDO_STORE && typeof root.DDO_STORE.markDirty === 'function') {
              root.DDO_STORE.markDirty()
            }
            renderEdges()
            showToast('已创建新连线')
          }
          return
        }

        const startX = ev.clientX || 0
        const startY = ev.clientY || 0
        const origX = node.x || 0
        const origY = node.y || 0
        let moved = false

        const scale =
          root.DDO_CORE && typeof root.DDO_CORE.getScale === 'function'
            ? root.DDO_CORE.getScale()
            : 1

        card.classList.add('dragging')
        if (typeof card.setPointerCapture === 'function' && ev.pointerId !== undefined) {
          try {
            card.setPointerCapture(ev.pointerId)
          } catch {}
        }

        const evtTarget = root && typeof root.addEventListener === 'function' ? root : doc
        let dragRaf = 0

        const flushDragLayout = () => {
          dragRaf = 0
          if (
            root.DDO_ZONE_MGR &&
            typeof root.DDO_ZONE_MGR.recomputeZoneBoundsFromNodes === 'function'
          ) {
            root.DDO_ZONE_MGR.recomputeZoneBoundsFromNodes(getZones(), getNodes())
          }
          renderEdges()
        }

        const onMove = (moveEv) => {
          const dx = ((moveEv.clientX || 0) - startX) / (scale || 1)
          const dy = ((moveEv.clientY || 0) - startY) / (scale || 1)
          if (
            Math.abs((moveEv.clientX || 0) - startX) > 4 ||
            Math.abs((moveEv.clientY || 0) - startY) > 4
          ) {
            moved = true
            state.draggingNodeId = node.id
          }

          if (!moved) return

          const nextX = Math.round((origX + dx) / 10) * 10
          const nextY = Math.round((origY + dy) / 10) * 10
          if (nextX === node.x && nextY === node.y) return
          node.x = nextX
          node.y = nextY
          card.style.left = `${node.x}px`
          card.style.top = `${node.y}px`

          if (typeof root.requestAnimationFrame === 'function') {
            if (!dragRaf) {
              dragRaf = root.requestAnimationFrame(flushDragLayout)
            }
          } else {
            flushDragLayout()
          }
        }

        const onUp = () => {
          if (dragRaf && typeof root.cancelAnimationFrame === 'function') {
            root.cancelAnimationFrame(dragRaf)
            dragRaf = 0
          }
          card.classList.remove('dragging')
          if (typeof card.releasePointerCapture === 'function' && ev.pointerId !== undefined) {
            try {
              card.releasePointerCapture(ev.pointerId)
            } catch {}
          }
          if (evtTarget) {
            evtTarget.removeEventListener('pointermove', onMove)
            evtTarget.removeEventListener('pointerup', onUp)
          }

          state.draggingNodeId = null

          if (moved) {
            if (
              root.DDO_ZONE_MGR &&
              typeof root.DDO_ZONE_MGR.recomputeZoneBoundsFromNodes === 'function'
            ) {
              root.DDO_ZONE_MGR.recomputeZoneBoundsFromNodes(getZones(), getNodes())
            }
            if (root.DDO_STORE && typeof root.DDO_STORE.markDirty === 'function') {
              root.DDO_STORE.markDirty()
            }
            renderEdges()
          } else {
            applyLineageHighlight(node.id)
            if (root.DDO_INSPECTOR && typeof root.DDO_INSPECTOR.openNode === 'function') {
              root.DDO_INSPECTOR.openNode(node.id)
            }
          }
        }

        if (evtTarget) {
          evtTarget.addEventListener('pointermove', onMove)
          evtTarget.addEventListener('pointerup', onUp)
        }
      })
    }

    function renderNodes() {
      const doc = getDoc()
      if (!doc) return

      let layer = doc.getElementById('nodesLayer')
      if (!layer) {
        const world = doc.getElementById('world') || doc.body
        layer = doc.createElement('div')
        layer.id = 'nodesLayer'
        world.appendChild(layer)
      }

      layer.innerHTML = ''
      const nodes = getNodes()

      nodes.forEach((node) => {
        const visible = isVisibleInView(node.views)
        const isTable = node.kind === 'table' && Array.isArray(node.columns)

        const card = doc.createElement('div')
        card.setAttribute('data-node-id', node.id)
        if (card.dataset) card.dataset.nodeId = node.id
        card.style.left = `${node.x || 0}px`
        card.style.top = `${node.y || 0}px`

        const noteText =
          (node.moduleAnnotation !== undefined ? node.moduleAnnotation : node.annotation) || ''
        const noteHtml = noteText.trim()
          ? `<div class="node-note-badge" title="${noteText.replace(/"/g, '&quot;')}"><i data-lucide="pin"></i><span>${noteText}</span></div>`
          : ''
        const tagText = (node.tag || '').trim()
        const tagHtml = tagText
          ? `<span class="node-tag" title="${tagText.replace(/"/g, '&quot;')}">${tagText}</span>`
          : ''
        const subBarHtml = tagHtml ? `<div class="node-sub-bar">${tagHtml}</div>` : ''

        const portsHtml = `
        <div class="port port-top" data-port="top" title="按住拖拽拉出正交连线"></div>
        <div class="port port-right" data-port="right" title="按住拖拽拉出正交连线"></div>
        <div class="port port-bottom" data-port="bottom" title="按住拖拽拉出正交连线"></div>
        <div class="port port-left" data-port="left" title="按住拖拽拉出正交连线"></div>
      `

        if (isTable) {
          card.className = `er-table-node ${visible ? '' : 'dimmed'} ${state.selectedNodeId === node.id ? 'selected' : ''}`
          const colsHtml = (node.columns || [])
            .map((c) => {
              const keyClass = c.key ? c.key.toLowerCase() : ''
              const badge = c.key
                ? `<span class="er-key-badge ${keyClass}">${c.key}</span>`
                : `<span></span>`
              return `
              <div class="er-col-row">
                ${badge}
                <span class="er-col-name">${c.name}</span>
                <span class="er-col-meta">
                  <span>${c.type}</span>
                  ${c.note ? `<span class="er-col-note">· ${c.note}</span>` : ''}
                </span>
              </div>
            `
            })
            .join('')

          card.innerHTML = `
          ${noteHtml}
          ${portsHtml}
          <div class="er-table-header">
            <span class="er-table-name"><i data-lucide="table-2"></i><span>${node.tableName || node.title}</span></span>
            <span class="er-table-cn">${node.tableCn || ''}</span>
          </div>
          <div class="er-cols">${colsHtml}</div>
        `
        } else {
          card.className = `wc-node ${visible ? '' : 'dimmed'} ${state.selectedNodeId === node.id ? 'selected' : ''}`
          if (card.dataset) card.dataset.tone = node.tone || 'agent'
          card.setAttribute('data-tone', node.tone || 'agent')
          card.innerHTML = `
          ${noteHtml}
          ${portsHtml}
          <div class="node-head-band">
            <div class="node-title-wrap" title="${(node.title || '').replace(/"/g, '&quot;')}">
              <i data-lucide="${node.icon || 'box'}"></i>
              <span class="node-title">${node.title}</span>
            </div>
          </div>
          ${subBarHtml}
          <div class="node-body">
            <div class="node-summary">${node.summary || ''}</div>
            <div class="node-code-foot">${node.code || ''}</div>
          </div>
        `
        }

        bindNodeEvents(card, node)
        layer.appendChild(card)
      })

      if (root.DDO_CORE && typeof root.DDO_CORE.measureNodeSizes === 'function') {
        root.DDO_CORE.measureNodeSizes()
      }
      refreshIcons(layer)
    }

    function renderEdges() {
      if (root.DDO_CORE && typeof root.DDO_CORE.renderEdges === 'function') {
        root.DDO_CORE.renderEdges(getEdges())
      }
    }

    function renderAll() {
      if (root.DDO_ZONE_MGR && typeof root.DDO_ZONE_MGR.renderZones === 'function') {
        root.DDO_ZONE_MGR.renderZones()
      }
      renderNodes()
      if (
        root.DDO_ZONE_MGR &&
        typeof root.DDO_ZONE_MGR.recomputeZoneBoundsFromNodes === 'function'
      ) {
        root.DDO_ZONE_MGR.recomputeZoneBoundsFromNodes(getZones(), getNodes())
      }
      renderEdges()
    }

    function setView(viewId) {
      state.currentView = viewId || 'core'
      if (root.DDO_SCENARIO && typeof root.DDO_SCENARIO.reset === 'function') {
        root.DDO_SCENARIO.reset()
      }
      if (root.DDO_CORE && typeof root.DDO_CORE.setView === 'function') {
        root.DDO_CORE.setView(state.currentView)
      }
      renderAll()
      if (root.DDO_CORE && typeof root.DDO_CORE.fitView === 'function') {
        root.DDO_CORE.fitView(true)
      }
    }

    function getCurrentView() {
      return state.currentView
    }

    function scaleCanvasSpacing(factor, msg) {
      const nodes = getNodes()
      const zones = getZones()
      if (nodes.length === 0) return

      let avgX = 0,
        avgY = 0
      nodes.forEach((n) => {
        avgX += n.x
        avgY += n.y
      })
      avgX /= nodes.length
      avgY /= nodes.length

      nodes.forEach((n) => {
        n.x = Math.round((avgX + (n.x - avgX) * factor) / 10) * 10
        n.y = Math.round((avgY + (n.y - avgY) * factor) / 10) * 10
      })

      zones.forEach((z) => {
        z.x = Math.round(avgX + (z.x - avgX) * factor)
        z.y = Math.round(avgY + (z.y - avgY) * factor)
        z.w = Math.round(z.w * factor)
        z.h = Math.round(z.h * factor)
      })

      if (root.DDO_STORE && typeof root.DDO_STORE.markDirty === 'function') {
        root.DDO_STORE.markDirty()
      }
      renderAll()
      if (msg) showToast(msg)
    }

    // =========================================================================
    // Toolbar, Menus & Popover Initializer
    // =========================================================================

    function initTopbarAutoHide() {
      const doc = getDoc()
      if (!doc) return

      const trigger = doc.getElementById('topHoverTrigger')
      const wrapper = doc.getElementById('topbarWrapper')
      const hintPill = doc.getElementById('topHoverPill')
      if (!trigger || !wrapper) return

      let hideTimer = null

      const showTopbar = () => {
        if (hideTimer) clearTimeout(hideTimer)
        wrapper.classList.add('visible')
        if (hintPill) hintPill.style.opacity = '0'
        const activeBtn = doc.querySelector('#viewTabs .view-tab.active')
        if (activeBtn) animateTabIndicator(activeBtn)
        if (root.gsap) {
          try {
            root.gsap.to(wrapper, { y: 0, opacity: 1, duration: 0.25, ease: 'power2.out' })
          } catch {
            wrapper.style.transform = 'translate(-50%, 0)'
            wrapper.style.opacity = '1'
          }
        } else {
          wrapper.style.transform = 'translate(-50%, 0)'
          wrapper.style.opacity = '1'
        }
      }

      const scheduleHideTopbar = () => {
        if (hideTimer) clearTimeout(hideTimer)
        hideTimer = setTimeout(() => {
          if (doc.querySelector('.dropdown-panel.open')) return
          wrapper.classList.remove('visible')
          if (hintPill) hintPill.style.opacity = '1'
          if (root.gsap) {
            try {
              root.gsap.to(wrapper, { y: '-130%', opacity: 0, duration: 0.22, ease: 'power2.in' })
            } catch {
              wrapper.style.transform = 'translate(-50%, -130%)'
              wrapper.style.opacity = '0'
            }
          } else {
            wrapper.style.transform = 'translate(-50%, -130%)'
            wrapper.style.opacity = '0'
          }
        }, 280)
      }

      trigger.addEventListener('pointerenter', showTopbar)
      wrapper.addEventListener('pointerenter', showTopbar)
      trigger.addEventListener('pointerleave', scheduleHideTopbar)
      wrapper.addEventListener('pointerleave', scheduleHideTopbar)
    }

    function initEvents() {
      const doc = getDoc()
      if (!doc) return

      initTopbarAutoHide()

      // 1. View Tabs
      doc.querySelectorAll('#viewTabs .view-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          doc.querySelectorAll('#viewTabs .view-tab').forEach((b) => b.classList.remove('active'))
          btn.classList.add('active')
          animateTabIndicator(btn)
          setView(btn.dataset ? btn.dataset.view : btn.getAttribute('data-view'))
        })
      })

      // 2. Dropdown Menus
      doc.querySelectorAll('[data-dropdown-btn]').forEach((btn) => {
        btn.addEventListener('click', (ev) => {
          if (typeof ev.stopPropagation === 'function') ev.stopPropagation()
          const targetId = btn.dataset
            ? btn.dataset.dropdownBtn
            : btn.getAttribute('data-dropdown-btn')
          const panel = doc.getElementById(targetId)
          if (!panel) return
          const isOpen = panel.classList.contains('open')
          doc.querySelectorAll('.dropdown-panel.open').forEach((p) => p.classList.remove('open'))
          if (!isOpen) panel.classList.add('open')
        })
      })

      doc.addEventListener('click', (ev) => {
        if (!ev.target || !ev.target.closest) return
        if (!ev.target.closest('.dropdown-wrap')) {
          doc.querySelectorAll('.dropdown-panel.open').forEach((p) => p.classList.remove('open'))
        }
      })

      // 3. Version Controls
      const verSelect = doc.getElementById('versionSelect')
      if (verSelect) {
        verSelect.addEventListener('change', (ev) => {
          const verId = ev.target.value
          if (root.DDO_STORE && typeof root.DDO_STORE.loadVersion === 'function') {
            root.DDO_STORE.loadVersion(verId)
          }
        })
      }

      const btnSaveVer = doc.getElementById('btnSaveVersion')
      if (btnSaveVer) {
        btnSaveVer.addEventListener('click', () => {
          const name = root.prompt
            ? root.prompt('给当前版本起个名字（留空则自动按时间命名）：', '')
            : ''
          if (name === null) return
          if (root.DDO_STORE && typeof root.DDO_STORE.saveNewVersion === 'function') {
            root.DDO_STORE.saveNewVersion(name && name.trim() ? name.trim() : undefined)
          }
        })
      }

      const btnResetInitial = doc.getElementById('btnResetInitial')
      if (btnResetInitial) {
        btnResetInitial.addEventListener('click', () => {
          if (root.DDO_STORE && typeof root.DDO_STORE.resetWithAutoArchive === 'function') {
            root.DDO_STORE.resetWithAutoArchive()
          }
        })
      }

      // 4. JSON Export / Import / Copy
      const btnExportJson = doc.getElementById('btnExportJson')
      if (btnExportJson) {
        btnExportJson.addEventListener('click', () => {
          if (root.DDO_STORE && typeof root.DDO_STORE.exportJsonFile === 'function') {
            root.DDO_STORE.exportJsonFile()
          }
        })
      }

      const fileInput = doc.getElementById('fileImportInput')
      const btnImportJson = doc.getElementById('btnImportJson')
      if (btnImportJson && fileInput) {
        btnImportJson.addEventListener('click', () => fileInput.click())
        fileInput.addEventListener('change', (ev) => {
          const file = ev.target.files && ev.target.files[0]
          if (!file) return
          if (root.DDO_STORE && typeof root.DDO_STORE.importJsonFile === 'function') {
            root.DDO_STORE.importJsonFile(file)
          }
          fileInput.value = ''
        })
      }

      const copyBtns = doc.querySelectorAll(
        '#btnCopyJson, #btnMenuCopyJson, [data-action="copy-json"]',
      )
      copyBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          if (root.DDO_STORE && typeof root.DDO_STORE.copyJsonToClipboard === 'function') {
            root.DDO_STORE.copyJsonToClipboard()
          }
        })
      })

      // 5. Run Scenario Debug Dropdown Menu (#menuScenarioDock)
      const dockScenarioList = doc.getElementById('dockScenarioList')
      if (
        dockScenarioList &&
        root.DDO_DATA &&
        Array.isArray(root.DDO_DATA.SCENARIOS) &&
        root.DDO_DATA.SCENARIOS.length > 0
      ) {
        const existingItems = dockScenarioList.querySelectorAll('.dock-scenario-item')
        if (existingItems.length === 0) {
          dockScenarioList.innerHTML = root.DDO_DATA.SCENARIOS.map(
            (scn) => `
            <button class="dropdown-item dock-scenario-item" data-scenario-id="${scn.id}">
              <span class="dropdown-item-left">
                <i data-lucide="play-circle"></i>
                <span>${scn.name || scn.title || scn.id}</span>
              </span>
            </button>
          `,
          ).join('')
          refreshIcons(dockScenarioList)
        }
      }

      doc.querySelectorAll('.dock-scenario-item[data-scenario-id]').forEach((item) => {
        item.addEventListener('click', () => {
          const scnId = item.getAttribute('data-scenario-id') || 'S1'
          doc
            .querySelectorAll('.dock-scenario-item')
            .forEach((b) => b.classList.toggle('active', b === item))
          closeAllPopovers()
          if (root.DDO_SCENARIO) {
            root.DDO_SCENARIO.loadScenario(scnId)
            root.DDO_SCENARIO.stepNext()
          }
          if (
            root.DDO_INSPECTOR &&
            typeof root.DDO_INSPECTOR.getInspectorMode === 'function' &&
            root.DDO_INSPECTOR.getInspectorMode() !== 'collapsed'
          ) {
            root.DDO_INSPECTOR.setActiveTab('scenario')
          }
          showToast(`已启动场景 ${scnId} 拓扑 Debug：已高亮首步链路与数据表读写`)
        })
      })

      const btnDockStepNext = doc.getElementById('btnDockStepNext')
      if (btnDockStepNext) {
        btnDockStepNext.addEventListener('click', () => {
          if (root.DDO_SCENARIO) {
            if (!root.DDO_SCENARIO.getCurrentScenario()) {
              root.DDO_SCENARIO.loadScenario('S1')
            }
            root.DDO_SCENARIO.stepNext()
          }
        })
      }

      const btnDockPlayToggle = doc.getElementById('btnDockPlayToggle')
      if (btnDockPlayToggle) {
        btnDockPlayToggle.addEventListener('click', () => {
          closeAllPopovers()
          if (root.DDO_INSPECTOR) {
            if (root.DDO_INSPECTOR.getInspectorMode() === 'collapsed') {
              root.DDO_INSPECTOR.setInspectorMode('docked')
            }
            root.DDO_INSPECTOR.setActiveTab('scenario')
          }
          if (root.DDO_SCENARIO) {
            if (!root.DDO_SCENARIO.getCurrentScenario()) {
              root.DDO_SCENARIO.loadScenario('S1')
            }
            root.DDO_SCENARIO.play()
          }
        })
      }

      const btnDockResetScenario = doc.getElementById('btnDockResetScenario')
      if (btnDockResetScenario) {
        btnDockResetScenario.addEventListener('click', () => {
          closeAllPopovers()
          doc.querySelectorAll('.dock-scenario-item').forEach((b) => b.classList.remove('active'))
          if (root.DDO_SCENARIO && typeof root.DDO_SCENARIO.reset === 'function') {
            root.DDO_SCENARIO.reset()
          }
          showToast('已退出场景 Debug，全图节点已恢复正常显示')
        })
      }

      // 6. Add Node Menu (#addNodeMenu)
      const addMenu = doc.getElementById('addNodeMenu')
      if (addMenu) {
        addMenu.querySelectorAll('.add-menu-item').forEach((item) => {
          item.addEventListener('click', () => {
            const tone = item.getAttribute('data-add-tone') || 'agent'
            const zoneId = item.getAttribute('data-add-zone') || 'zone-l1-interactive'
            const layerCode = item.getAttribute('data-add-layer') || 'L1'
            const icon = item.getAttribute('data-add-icon') || 'box'

            const title = root.prompt
              ? root.prompt('请输入新模块/表名称：', '新增业务模块')
              : '新增业务模块'
            if (!title) return

            const vp = doc.getElementById('viewport')
            const cx = vp ? vp.clientWidth / 2 : 640
            const cy = vp ? vp.clientHeight / 2 : 400
            const worldCenter =
              root.DDO_CORE && typeof root.DDO_CORE.screenToWorld === 'function'
                ? root.DDO_CORE.screenToWorld(cx, cy)
                : { x: 0, y: 0 }

            const newId = `custom-${Date.now().toString(36)}`
            const isTable = tone === 'db-table'
            const newNode = isTable
              ? {
                  id: newId,
                  zone: zoneId,
                  layer: 'L5',
                  kind: 'table',
                  tableName: title.toLowerCase().replace(/\s+/g, '_'),
                  tableCn: title,
                  x: Math.round((worldCenter.x - 140) / 10) * 10,
                  y: Math.round((worldCenter.y - 90) / 10) * 10,
                  views: ['core', 'diet', 'agent', 'render', 'social', 'db', 'all'],
                  columns: [
                    { key: 'PK', name: 'id', type: 'uuid', note: '主键' },
                    { key: 'FK', name: 'user_id', type: 'text', note: '关联用户' },
                    { key: '', name: 'created_at', type: 'timestamptz', note: '创建时间' },
                  ],
                  plain: '自定义新增数据表卡片',
                  responsibilities: ['持久化领域数据'],
                  forbiddenBoundaries: ['禁止跨层裸写'],
                  moduleAnnotation: '',
                  layers: [
                    {
                      id: `${newId}-l1`,
                      name: 'Layer 1: 表结构与索引约束',
                      plain: '定义主键、外键与唯一索引约束。',
                      contract: {
                        input: 'Drizzle InsertModel',
                        process: 'SQL 约束校验',
                        output: 'Row',
                      },
                      codeRef: 'src/server/db/schema/index.ts',
                      annotation: '',
                    },
                  ],
                  contracts: { upstreams: [], downstreams: [], dbTables: [] },
                }
              : {
                  id: newId,
                  zone: zoneId,
                  layer: layerCode,
                  tone: tone,
                  icon: icon,
                  title: title,
                  tag: `${layerCode} Custom`,
                  summary: '双击或打开右侧透视面板填写职责与逐层批注',
                  code: 'src/...',
                  x: Math.round((worldCenter.x - 120) / 10) * 10,
                  y: Math.round((worldCenter.y - 60) / 10) * 10,
                  views: ['core', 'diet', 'agent', 'render', 'social', 'db', 'all'],
                  plain: '自定义新增架构节点，可在右侧面板补充职责与逻辑层批注。',
                  responsibilities: ['待补充核心高内聚职责'],
                  forbiddenBoundaries: ['待补充严禁越界红线'],
                  moduleAnnotation: '',
                  layers: [
                    {
                      id: `${newId}-l1`,
                      name: 'Layer 1: 输入校验与预处理',
                      plain: '接收上游输入并执行结构校验。',
                      contract: { input: 'InputDTO', process: 'Zod 校验', output: 'ValidatedData' },
                      codeRef: 'src/...',
                      annotation: '',
                    },
                    {
                      id: `${newId}-l2`,
                      name: 'Layer 2: 核心业务处理与输出',
                      plain: '执行核心领域逻辑并返回结果。',
                      contract: {
                        input: 'ValidatedData',
                        process: '业务规则',
                        output: 'ResultDTO',
                      },
                      codeRef: 'src/...',
                      annotation: '',
                    },
                  ],
                  contracts: { upstreams: [], downstreams: [], dbTables: [] },
                }

            getNodes().push(newNode)
            if (root.DDO_STORE && typeof root.DDO_STORE.markDirty === 'function') {
              root.DDO_STORE.markDirty()
            }
            closeAllPopovers()
            renderAll()
            applyLineageHighlight(newId)
            if (root.DDO_INSPECTOR && typeof root.DDO_INSPECTOR.openNode === 'function') {
              root.DDO_INSPECTOR.openNode(newId)
            }
            showToast(`已添加节点「${title}」`)
          })
        })
      }

      // 7. Edge Popover Editor Events
      const edgePopClose = doc.getElementById('edgePopClose')
      if (edgePopClose) {
        edgePopClose.addEventListener('click', () => {
          closeAllPopovers()
          renderEdges()
        })
      }

      doc.querySelectorAll('#edgePopover [data-edge-kind]').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.editingEdgeKind = btn.getAttribute('data-edge-kind') || 'flow'
          doc.querySelectorAll('#edgePopover [data-edge-kind]').forEach((b) => {
            b.classList.toggle(
              'btn-primary',
              b.getAttribute('data-edge-kind') === state.editingEdgeKind,
            )
          })
        })
      })

      const btnSaveEdge = doc.getElementById('btnSaveEdge')
      if (btnSaveEdge) {
        btnSaveEdge.addEventListener('click', () => {
          if (!state.selectedEdgeId) return
          const edge = getEdges().find((e) => e.id === state.selectedEdgeId)
          if (edge) {
            const inputEl = doc.getElementById('edgePopLabelInput')
            if (inputEl) edge.label = inputEl.value.trim()
            edge.kind = state.editingEdgeKind
            if (root.DDO_STORE && typeof root.DDO_STORE.markDirty === 'function') {
              root.DDO_STORE.markDirty()
            }
          }
          closeAllPopovers()
          renderEdges()
          showToast('连线修改已保存')
        })
      }

      const btnCutEdge = doc.getElementById('btnCutEdge')
      if (btnCutEdge) {
        btnCutEdge.addEventListener('click', () => {
          if (!state.selectedEdgeId) return
          const edges = getEdges()
          const idx = edges.findIndex((e) => e.id === state.selectedEdgeId)
          if (idx !== -1) {
            edges.splice(idx, 1)
            if (root.DDO_STORE && typeof root.DDO_STORE.markDirty === 'function') {
              root.DDO_STORE.markDirty()
            }
          }
          closeAllPopovers()
          renderEdges()
          showToast('已剪断并删除该连线')
        })
      }

      // 8. Dock Zoom & Spacing Buttons
      const btnFitView = doc.getElementById('btnFitView')
      if (btnFitView) {
        btnFitView.addEventListener('click', () => {
          if (root.DDO_CORE && typeof root.DDO_CORE.fitView === 'function') {
            root.DDO_CORE.fitView(true)
          }
        })
      }

      const btnZoomIn = doc.getElementById('btnZoomIn')
      if (btnZoomIn) {
        btnZoomIn.addEventListener('click', () => {
          if (root.DDO_CORE && typeof root.DDO_CORE.zoomByFactor === 'function') {
            root.DDO_CORE.zoomByFactor(1.15)
          } else if (root.DDO_CORE && typeof root.DDO_CORE.setZoom === 'function') {
            root.DDO_CORE.setZoom((root.DDO_CORE.scale || 1) * 1.15)
          }
        })
      }

      const btnZoomOut = doc.getElementById('btnZoomOut')
      if (btnZoomOut) {
        btnZoomOut.addEventListener('click', () => {
          if (root.DDO_CORE && typeof root.DDO_CORE.zoomByFactor === 'function') {
            root.DDO_CORE.zoomByFactor(1 / 1.15)
          } else if (root.DDO_CORE && typeof root.DDO_CORE.setZoom === 'function') {
            root.DDO_CORE.setZoom((root.DDO_CORE.scale || 1) / 1.15)
          }
        })
      }

      const btnCompact = doc.getElementById('btnToggleCompactMode')
      if (btnCompact) {
        btnCompact.addEventListener('click', () => {
          state.compactMode = !state.compactMode
          const txt = doc.getElementById('compactModeText')
          if (txt) txt.textContent = state.compactMode ? '松散间距' : '紧凑间距'
          scaleCanvasSpacing(
            state.compactMode ? 0.85 : 1.18,
            state.compactMode ? '已切换至紧凑间距' : '已切换至松散间距',
          )
        })
      }

      const btnShrink = doc.getElementById('btnShrinkSpacing')
      if (btnShrink) {
        btnShrink.addEventListener('click', () => scaleCanvasSpacing(0.86, '已相对收拢节点间距'))
      }

      const btnExpand = doc.getElementById('btnExpandSpacing')
      if (btnExpand) {
        btnExpand.addEventListener('click', () => scaleCanvasSpacing(1.16, '已相对拉开节点间距'))
      }

      const btnToggleLabels = doc.getElementById('btnToggleEdgeLabels')
      if (btnToggleLabels) {
        btnToggleLabels.addEventListener('click', () => {
          state.showAllEdgeLabels = !state.showAllEdgeLabels
          const textSpan = doc.getElementById('edgeLabelsText')
          if (textSpan) {
            textSpan.textContent = state.showAllEdgeLabels ? '线标：全部' : '线标：精简'
          }
          renderEdges()
        })
      }

      const btnConnectMode = doc.getElementById('btnToggleConnectMode')
      if (btnConnectMode) {
        btnConnectMode.addEventListener('click', () => {
          state.connectMode = !state.connectMode
          state.connectSourceId = null
          const textSpan = doc.getElementById('connectModeText')
          if (textSpan) {
            textSpan.textContent = state.connectMode ? '连线：开' : '连线：关'
          }
          const vp = doc.getElementById('viewport')
          if (vp && vp.classList) {
            vp.classList.toggle('connecting', state.connectMode)
          }
          if (state.connectMode) {
            showToast('已开启连线模式：点击起点卡片，再点击终点卡片（或直接拖拽节点四周圆点）')
          }
        })
      }

      // Keyboard Esc to clear selection / close popovers
      doc.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') {
          closeAllPopovers()
          if (state.connectMode) {
            state.connectMode = false
            state.connectSourceId = null
            const textSpan = doc.getElementById('connectModeText')
            if (textSpan) textSpan.textContent = '连线：关'
          }
          if (root.DDO_SCENARIO && typeof root.DDO_SCENARIO.reset === 'function') {
            root.DDO_SCENARIO.reset()
          }
          applyLineageHighlight(null)
        }
      })
    }

    function init() {
      const doc = getDoc()
      if (doc && root.DDO_CORE && typeof root.DDO_CORE.initViewport === 'function') {
        root.DDO_CORE.initViewport(doc.getElementById('viewport'))
      }
      renderAll()
      initEvents()
      syncVersionSelect()
      refreshIcons()

      if (root.DDO_CORE && typeof root.DDO_CORE.fitView === 'function') {
        root.DDO_CORE.fitView(false)
        if (typeof root.requestAnimationFrame === 'function') {
          root.requestAnimationFrame(() => {
            if (root.DDO_CORE && typeof root.DDO_CORE.measureNodeSizes === 'function') {
              root.DDO_CORE.measureNodeSizes()
            }
            if (
              root.DDO_ZONE_MGR &&
              typeof root.DDO_ZONE_MGR.recomputeZoneBoundsFromNodes === 'function'
            ) {
              root.DDO_ZONE_MGR.recomputeZoneBoundsFromNodes(getZones(), getNodes())
            }
            renderEdges()
            root.DDO_CORE.fitView(false)
          })
        }
      }
    }

    // Auto-init if DOM is available
    const initialDoc = getDoc()
    if (initialDoc) {
      init()
    }

    const DDO_APP = {
      init,
      renderAll,
      renderNodes,
      renderEdges,
      getState: () => state,
      showToast,
      refreshIcons,
      setView,
      getCurrentView,
      scaleCanvasSpacing,
      syncVersionSelect,
      applyLineageHighlight,
      openEdgePopover,
      onBlankCanvasClick,
      closeAllPopovers,
    }

    root.DDO_APP = DDO_APP
    return DDO_APP
  },
)
