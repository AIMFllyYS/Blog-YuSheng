/**
 * DayDayOn Architecture Canvas — Zone Manager (window.DDO_ZONE_MGR)
 *
 * Milestone 2: Zone Pin / Lock & Canvas Interactivity Core
 *
 * Responsibilities:
 * 1. Render zone elements into #zonesLayer with watercolor styled headers, title group, and lock button.
 * 2. Zone Pin/Lock toggling (isPinned / locked), persistent state in localStorage, event emission (zone:lock-change).
 * 3. Drag interception & canvas panning pass-through: when locked, pointerdown bubbles to #viewport/body.
 * 4. Bounding box protection: recomputeZoneBoundsFromNodes skips locked zones to prevent altering coordinates.
 */

;(function (root, factory) {
  'use strict'
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root)
  } else {
    root.DDO_ZONE_MGR = factory(root)
  }
})(
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this,
  function (root) {
    'use strict'

    const STORAGE_KEY = 'ddo:arch-canvas:zone-locks:v6'
    const _lockMap = new Map()
    let _zones = []

    function getDoc() {
      return root.document || (typeof document !== 'undefined' ? document : null)
    }

    function getStorage() {
      return root.localStorage || (typeof localStorage !== 'undefined' ? localStorage : null)
    }

    function refreshIcons(rootEl) {
      if (root.lucide && typeof root.lucide.createIcons === 'function') {
        try {
          root.lucide.createIcons(rootEl ? { root: rootEl } : undefined)
        } catch {
          // ignore icon error in simulated DOM
        }
      }
    }

    function getGlobalZones() {
      if (root.DDO_DATA && Array.isArray(root.DDO_DATA.INITIAL_ZONES)) {
        return root.DDO_DATA.INITIAL_ZONES
      }
      if (Array.isArray(root.DDO_INITIAL_ZONES)) {
        return root.DDO_INITIAL_ZONES
      }
      if (Array.isArray(root.DDO_ZONES)) {
        return root.DDO_ZONES
      }
      return []
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

    function getZone(zoneId) {
      if (!zoneId) return null
      let found = _zones.find((z) => z && z.id === zoneId)
      if (found) return found
      const globalZones = getGlobalZones()
      found = globalZones.find((z) => z && z.id === zoneId)
      return found || null
    }

    function getZones() {
      if (_zones && _zones.length > 0) return _zones
      return getGlobalZones()
    }

    function setZones(newZones) {
      if (Array.isArray(newZones)) {
        _zones = newZones
        _zones.forEach((z) => {
          if (z && z.id) {
            if (typeof z.isPinned === 'boolean') {
              _lockMap.set(z.id, z.isPinned)
              z.locked = z.isPinned
            } else if (typeof z.locked === 'boolean') {
              _lockMap.set(z.id, z.locked)
              z.isPinned = z.locked
            } else if (_lockMap.has(z.id)) {
              z.isPinned = _lockMap.get(z.id)
              z.locked = z.isPinned
            } else {
              z.isPinned = false
              z.locked = false
            }
          }
        })
      }
    }

    function loadLockStates() {
      try {
        const storage = getStorage()
        if (!storage) return
        const raw = storage.getItem(STORAGE_KEY)
        if (!raw) return
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          Object.keys(parsed).forEach((k) => {
            const val = !!parsed[k]
            _lockMap.set(k, val)
            const z = getZone(k)
            if (z) {
              z.isPinned = val
              z.locked = val
            }
          })
        }
      } catch {
        // ignore
      }
    }

    function persistLockStates() {
      try {
        const storage = getStorage()
        if (!storage) return
        const obj = {}
        _lockMap.forEach((v, k) => {
          obj[k] = v
        })
        storage.setItem(STORAGE_KEY, JSON.stringify(obj))
      } catch {
        // ignore quota errors
      }
    }

    function isZonePinned(zoneId) {
      if (!zoneId || typeof zoneId !== 'string') return false
      if (_lockMap.has(zoneId)) {
        return !!_lockMap.get(zoneId)
      }
      const zone = getZone(zoneId)
      if (zone) {
        const pinned = !!(zone.isPinned || zone.locked)
        _lockMap.set(zoneId, pinned)
        return pinned
      }
      const doc = getDoc()
      if (doc && doc.querySelector) {
        const el = doc.querySelector(`[data-zone-id="${zoneId}"]`)
        if (el && el.classList && el.classList.contains('is-locked')) {
          return true
        }
      }
      return false
    }

    function toggleZoneLock(zoneId) {
      if (!zoneId || typeof zoneId !== 'string') return false
      const current = isZonePinned(zoneId)
      const next = !current
      _lockMap.set(zoneId, next)

      const zone = getZone(zoneId)
      if (zone) {
        zone.isPinned = next
        zone.locked = next
      }

      persistLockStates()

      const doc = getDoc()
      if (doc) {
        const zoneEl = doc.querySelector ? doc.querySelector(`[data-zone-id="${zoneId}"]`) : null
        if (zoneEl) {
          if (next) {
            zoneEl.classList.add('is-locked')
          } else {
            zoneEl.classList.remove('is-locked')
          }

          const lockBtn = zoneEl.querySelector
            ? zoneEl.querySelector('[data-action="toggle-zone-lock"]') ||
              zoneEl.querySelector('.zone-lock-btn')
            : null
          if (lockBtn) {
            if (next) {
              lockBtn.classList.add('active')
            } else {
              lockBtn.classList.remove('active')
            }
            lockBtn.setAttribute('title', next ? '点击解锁大框' : '点击锁定大框')

            const icon = lockBtn.querySelector
              ? lockBtn.querySelector('i, svg, [data-lucide]')
              : null
            if (icon) {
              icon.setAttribute('data-lucide', next ? 'lock' : 'unlock')
            }
            const textSpan = lockBtn.querySelector ? lockBtn.querySelector('span') : null
            if (textSpan) {
              textSpan.textContent = next ? '已锁定' : '锁定'
            }
          }

          const dragHint = zoneEl.querySelector ? zoneEl.querySelector('.zone-drag-hint') : null
          if (dragHint) {
            dragHint.textContent = next ? '[已锁定]' : '[按住整体拖动]'
          }

          const header = zoneEl.querySelector ? zoneEl.querySelector('.zone-box-header') : null
          if (header) {
            header.setAttribute(
              'title',
              next ? '大模块框已锁定，点击右侧按钮解锁' : '按住可整体拖动此分区及框内所有节点',
            )
          }

          refreshIcons(zoneEl)
        }

        // Emit custom event
        try {
          const evt = new (root.CustomEvent || root.Event)('zone:lock-change', {
            bubbles: true,
            detail: { zoneId, isPinned: next, locked: next, zone },
          })
          doc.dispatchEvent(evt)
        } catch {
          // ignore
        }
      }

      if (root.DDO_STORE && typeof root.DDO_STORE.markDirty === 'function') {
        root.DDO_STORE.markDirty()
      }

      return next
    }

    function setZonePin(zoneId, pinned) {
      if (!zoneId || typeof zoneId !== 'string') return
      const current = isZonePinned(zoneId)
      if (current !== !!pinned) {
        toggleZoneLock(zoneId)
      }
    }

    function bindZoneDrag(zoneEl, zoneObj) {
      if (!zoneEl || !zoneObj) return

      zoneEl.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0 && ev.button !== undefined) return

        // Click on lock button handled by button
        if (
          ev.target &&
          typeof ev.target.closest === 'function' &&
          ev.target.closest('[data-action="toggle-zone-lock"]')
        ) {
          return
        }

        // CRITICAL REQUIREMENT: If zone is locked/pinned, DO NOT initiate drag and DO NOT stop propagation!
        // Event bubbles to #viewport / body so user can pan canvas starting inside a locked zone.
        if (isZonePinned(zoneObj.id)) {
          return
        }

        // Unlocked zone dragging
        if (typeof ev.stopPropagation === 'function') {
          ev.stopPropagation()
        }

        const doc = getDoc()
        const startX = ev.clientX || 0
        const startY = ev.clientY || 0
        const origZoneX = zoneObj.x || 0
        const origZoneY = zoneObj.y || 0

        const scale =
          root.DDO_CORE && typeof root.DDO_CORE.getScale === 'function'
            ? root.DDO_CORE.getScale()
            : root.DDO_CORE && typeof root.DDO_CORE.scale === 'number'
              ? root.DDO_CORE.scale
              : 0.72

        const allNodes = getGlobalNodes()
        const childNodes = allNodes.filter((n) => n && n.zone === zoneObj.id)
        const childOrigPositions = childNodes.map((n) => ({
          node: n,
          x: n.x || 0,
          y: n.y || 0,
          el: doc && doc.querySelector ? doc.querySelector(`[data-node-id="${n.id}"]`) : null,
        }))

        zoneEl.classList.add('dragging')
        if (typeof zoneEl.setPointerCapture === 'function' && ev.pointerId !== undefined) {
          try {
            zoneEl.setPointerCapture(ev.pointerId)
          } catch {
            // ignore
          }
        }

        const evtTarget = root && typeof root.addEventListener === 'function' ? root : doc
        let zoneRaf = 0

        const flushZoneEdges = () => {
          zoneRaf = 0
          if (root.DDO_CORE && typeof root.DDO_CORE.renderEdges === 'function') {
            root.DDO_CORE.renderEdges()
          }
        }

        const onMove = (moveEv) => {
          const dx = Math.round(((moveEv.clientX || 0) - startX) / (scale || 1))
          const dy = Math.round(((moveEv.clientY || 0) - startY) / (scale || 1))

          const nextX = origZoneX + dx
          const nextY = origZoneY + dy
          if (nextX === zoneObj.x && nextY === zoneObj.y) return

          zoneObj.x = nextX
          zoneObj.y = nextY
          zoneEl.style.left = `${zoneObj.x}px`
          zoneEl.style.top = `${zoneObj.y}px`

          childOrigPositions.forEach((item) => {
            item.node.x = item.x + dx
            item.node.y = item.y + dy
            if (item.el) {
              item.el.style.left = `${item.node.x}px`
              item.el.style.top = `${item.node.y}px`
            }
          })

          if (typeof root.requestAnimationFrame === 'function') {
            if (!zoneRaf) {
              zoneRaf = root.requestAnimationFrame(flushZoneEdges)
            }
          } else {
            flushZoneEdges()
          }
        }

        const onUp = () => {
          if (zoneRaf && typeof root.cancelAnimationFrame === 'function') {
            root.cancelAnimationFrame(zoneRaf)
            zoneRaf = 0
          }
          zoneEl.classList.remove('dragging')
          if (typeof zoneEl.releasePointerCapture === 'function' && ev.pointerId !== undefined) {
            try {
              zoneEl.releasePointerCapture(ev.pointerId)
            } catch {
              // ignore
            }
          }
          if (evtTarget) {
            evtTarget.removeEventListener('pointermove', onMove)
            evtTarget.removeEventListener('pointerup', onUp)
          }

          if (root.DDO_CORE && typeof root.DDO_CORE.renderEdges === 'function') {
            root.DDO_CORE.renderEdges()
          }
          if (root.DDO_STORE && typeof root.DDO_STORE.markDirty === 'function') {
            root.DDO_STORE.markDirty()
          }
        }

        if (evtTarget) {
          evtTarget.addEventListener('pointermove', onMove)
          evtTarget.addEventListener('pointerup', onUp)
        }
      })
    }

    function isVisibleInActiveView(itemViews) {
      const view =
        root.DDO_CORE && typeof root.DDO_CORE.getView === 'function'
          ? root.DDO_CORE.getView()
          : root.DDO_APP && typeof root.DDO_APP.getCurrentView === 'function'
            ? root.DDO_APP.getCurrentView()
            : 'core'
      if (view === 'all') return true
      return !itemViews || itemViews.includes(view)
    }

    function recomputeZoneBoundsFromNodes(zones, nodes) {
      const targetZones = Array.isArray(zones) ? zones : getZones()
      const allNodes = Array.isArray(nodes) ? nodes : getGlobalNodes()
      const doc = getDoc()

      targetZones.forEach((z) => {
        if (!z) return

        const visibleChildren = allNodes.filter(
          (n) => n && n.zone === z.id && isVisibleInActiveView(n.views),
        )
        const el = doc && doc.querySelector ? doc.querySelector(`[data-zone-id="${z.id}"]`) : null

        if (visibleChildren.length === 0) {
          if (el && el.style) {
            el.style.display = 'none'
          }
          return
        }

        if (el && el.style) {
          el.style.display = 'block'
        }

        // Bounding box protection: skip locked / pinned zones from resizing
        if (z.isPinned || z.locked || isZonePinned(z.id)) {
          return
        }

        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity
        visibleChildren.forEach((n) => {
          const rect =
            root.DDO_CORE && typeof root.DDO_CORE.getNodeRect === 'function'
              ? root.DDO_CORE.getNodeRect(n)
              : null
          const hasNote = Boolean(
            ((n.moduleAnnotation !== undefined ? n.moduleAnnotation : n.annotation) || '').trim(),
          )
          const w = rect ? rect.w : n.w && n.w > 0 ? n.w : n.kind === 'table' ? 284 : 256
          const h = rect
            ? rect.h
            : n.h && n.h > 0
              ? n.h
              : n.kind === 'table'
                ? 260 + (hasNote ? 34 : 0)
                : hasNote
                  ? 168
                  : 146
          const nx = typeof n.x === 'number' ? n.x : 0
          const ny = typeof n.y === 'number' ? n.y : 0
          minX = Math.min(minX, nx)
          minY = Math.min(minY, ny)
          maxX = Math.max(maxX, nx + w)
          maxY = Math.max(maxY, ny + h)
        })

        z.x = Math.round(minX - 36)
        z.y = Math.round(minY - 82)
        z.w = Math.round(maxX - minX + 72)
        z.h = Math.round(maxY - minY + 114)

        if (el && el.style) {
          el.style.left = `${z.x}px`
          el.style.top = `${z.y}px`
          el.style.width = `${z.w}px`
          el.style.height = `${z.h}px`
        }
      })

      return targetZones
    }

    function renderZones(zonesLayer, zones) {
      const doc = getDoc()
      ensureDomSkeleton(doc)

      const layer = zonesLayer || (doc ? doc.getElementById('zonesLayer') : null)
      const targetZones = Array.isArray(zones) ? zones : getZones()
      setZones(targetZones)

      if (!layer || !doc) return

      layer.innerHTML = ''

      _zones.forEach((z) => {
        const pinned = isZonePinned(z.id)
        const div = doc.createElement('div')
        div.className = `zone-box ${pinned ? 'is-locked' : ''}`
        div.setAttribute('data-zone-id', z.id)
        div.style.left = `${z.x || 0}px`
        div.style.top = `${z.y || 0}px`
        div.style.width = `${z.w || 600}px`
        div.style.height = `${z.h || 400}px`
        div.style.background = z.bg || 'rgba(246, 234, 238, 0.45)'
        div.style.display = 'block'

        // Header container
        const header = doc.createElement('div')
        header.className = 'zone-box-header'
        header.setAttribute(
          'title',
          pinned ? '大模块框已锁定，点击右侧按钮解锁' : '按住可整体拖动此分区及框内所有节点',
        )

        // Title group (icon + title text + drag hint)
        const titleGroup = doc.createElement('div')
        titleGroup.className = 'zone-title-group'

        const icon = doc.createElement('i')
        icon.setAttribute('data-lucide', z.icon || 'layers')
        titleGroup.appendChild(icon)

        const titleSpan = doc.createElement('span')
        titleSpan.textContent = z.title || ''
        titleGroup.appendChild(titleSpan)

        const dragHint = doc.createElement('span')
        dragHint.className = 'zone-drag-hint'
        dragHint.textContent = pinned ? '[已锁定]' : '[按住整体拖动]'
        titleGroup.appendChild(dragHint)

        header.appendChild(titleGroup)

        // Lock toggle button
        const lockBtn = doc.createElement('button')
        lockBtn.className = `zone-lock-btn ${pinned ? 'active' : ''}`
        lockBtn.setAttribute('data-action', 'toggle-zone-lock')
        lockBtn.setAttribute('data-zone-id', z.id)
        lockBtn.setAttribute('title', pinned ? '点击解锁大框' : '点击锁定大框')

        const lockIcon = doc.createElement('i')
        lockIcon.setAttribute('data-lucide', pinned ? 'lock' : 'unlock')
        lockBtn.appendChild(lockIcon)

        const lockText = doc.createElement('span')
        lockText.textContent = pinned ? '已锁定' : '锁定'
        lockBtn.appendChild(lockText)

        lockBtn.addEventListener('click', (ev) => {
          ev.stopPropagation()
          if (typeof ev.preventDefault === 'function') ev.preventDefault()
          toggleZoneLock(z.id)
        })

        lockBtn.addEventListener('pointerdown', (ev) => {
          ev.stopPropagation()
        })

        header.appendChild(lockBtn)
        div.appendChild(header)

        // Sub description
        const subEl = doc.createElement('div')
        subEl.className = 'zone-box-sub'
        subEl.textContent = z.sub || ''
        div.appendChild(subEl)

        bindZoneDrag(div, z)
        layer.appendChild(div)
      })

      refreshIcons(layer)
    }

    function init() {
      loadLockStates()
      const doc = getDoc()
      if (doc) {
        ensureDomSkeleton(doc)
        const zones = getZones()
        setZones(zones)
        renderZones()
      }
    }

    // Auto-initialize
    init()

    const DDO_ZONE_MGR = {
      renderZones,
      toggleZoneLock,
      isZonePinned,
      setZonePin,
      bindZoneDrag,
      recomputeZoneBoundsFromNodes,
      getZones,
      getZone,
      setZones,
      loadLockStates,
      persistLockStates,
      init,
    }

    root.DDO_ZONE_MGR = DDO_ZONE_MGR
    return DDO_ZONE_MGR
  },
)
