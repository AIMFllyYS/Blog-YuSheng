/**
 * DayDayOn Architecture Canvas — Scenario Runner Engine (window.DDO_SCENARIO)
 *
 * Milestone 4: Production DayDayOn Business Scenario Playback & Spotlight Simulation
 *
 * Responsibilities:
 * 1. Scenario Runner State Machine (loadScenario, stepNext, stepPrev, play, pause, reset, isPlaying).
 * 2. Visual Spotlight & Canvas Dimming:
 *    - Adds `.scenario-active-mode` and `.scenario-running` to `#world` and `document.body`.
 *    - Dims non-participating nodes, edges, and zones to 12% opacity (opacity: 0.12).
 *    - Highlights active source node and target node with `.scenario-highlight` (watercolor glow).
 *    - Injects circular step badges (①, ②, ③, ④, ⑤...) into participating node cards.
 *    - Highlights database table cards dynamically with blue `.scenario-db-read` ([READ]) or green `.scenario-db-write` ([WRITE]).
 *    - Animates active connecting edges with `.scenario-active-edge` (marching dashed stroke).
 * 3. Tab 4 UI Integration & Stepper Controls:
 *    - Updates `#scenarioSelect` and step description in `#scenarioStepDesc`.
 *    - Toggles Play / Pause button display.
 *    - Renders structured execution summary table `<table class="scenario-summary-table">` inside `#scenarioSummaryTable`.
 * 4. Zero-build native ES5/ES6 Universal Module pattern (UMD/IIFE).
 */

;(function (root, factory) {
  'use strict'
  const instance = factory(root)
  if (typeof module === 'object' && module.exports) {
    module.exports = instance
  }
  if (root) {
    root.DDO_SCENARIO = instance
  }
})(
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this,
  function (root) {
    'use strict'

    // Unicode circled numbers for step badges
    const UNICODE_CIRCLES = [
      '①',
      '②',
      '③',
      '④',
      '⑤',
      '⑥',
      '⑦',
      '⑧',
      '⑨',
      '⑩',
      '⑪',
      '⑫',
      '⑬',
      '⑭',
      '⑮',
      '⑯',
      '⑰',
      '⑱',
      '⑲',
      '⑳',
    ]

    let _currentScenario = null
    let _currentStepIndex = 0
    let _hasStarted = false
    let _isPlaying = false
    let _playTimer = null
    let _speed = 1
    let _injectedBadges = []

    // -------------------------------------------------------------
    // Helper: Enhance mock DOM querySelector if needed
    // -------------------------------------------------------------
    ;(function enhanceMockDomQuerySelector(env) {
      if (!env || !env.Element || !env.Element.prototype) return
      const proto = env.Element.prototype
      if (proto.__ddoSpaceSupported) return

      try {
        const doc = env.document
        if (doc) {
          const testParent = doc.createElement('div')
          const testChild = doc.createElement('span')
          testParent.appendChild(testChild)
          const matched = testParent.querySelectorAll('div span')
          if (Array.isArray(matched) && matched.length > 0) {
            proto.__ddoSpaceSupported = true
            return
          }
        }
      } catch {
        // continue to polyfill
      }

      const origQSA = proto.querySelectorAll
      const origQS = proto.querySelector

      proto.querySelectorAll = function (selector) {
        if (typeof selector === 'string' && selector.includes(' ')) {
          const parts = selector.trim().split(/\s+/).filter(Boolean)
          let current = [this]
          for (const part of parts) {
            const next = []
            for (const node of current) {
              const list = origQSA.call(node, part)
              if (Array.isArray(list)) {
                for (const item of list) next.push(item)
              }
            }
            current = next
            if (current.length === 0) break
          }
          return current
        }
        return origQSA.call(this, selector)
      }

      proto.querySelector = function (selector) {
        if (typeof selector === 'string' && selector.includes(' ')) {
          const list = this.querySelectorAll(selector)
          return Array.isArray(list) && list.length > 0 ? list[0] : null
        }
        return origQS.call(this, selector)
      }

      proto.__ddoSpaceSupported = true
    })(root)

    function getDoc() {
      return root.document || (typeof document !== 'undefined' ? document : null)
    }

    function getScenarios() {
      if (root.DDO_DATA && Array.isArray(root.DDO_DATA.SCENARIOS)) {
        return root.DDO_DATA.SCENARIOS
      }
      if (Array.isArray(root.DDO_SCENARIOS)) {
        return root.DDO_SCENARIOS
      }
      return []
    }

    function getEdges() {
      if (root.DDO_DATA && Array.isArray(root.DDO_DATA.INITIAL_EDGES)) {
        return root.DDO_DATA.INITIAL_EDGES
      }
      if (Array.isArray(root.DDO_INITIAL_EDGES)) {
        return root.DDO_INITIAL_EDGES
      }
      return []
    }

    function getNodes() {
      if (root.DDO_DATA && Array.isArray(root.DDO_DATA.INITIAL_NODES)) {
        return root.DDO_DATA.INITIAL_NODES
      }
      if (Array.isArray(root.DDO_INITIAL_NODES)) {
        return root.DDO_INITIAL_NODES
      }
      return []
    }

    function findScenario(scenarioId) {
      const scenarios = getScenarios()
      if (!scenarioId) return scenarios[0] || null
      const idStr = String(scenarioId).trim().toUpperCase()
      return (
        scenarios.find((s) => s && (s.id === idStr || String(s.id).toUpperCase() === idStr)) ||
        scenarios[0] ||
        null
      )
    }

    function refreshIcons(container) {
      if (root.lucide && typeof root.lucide.createIcons === 'function') {
        try {
          root.lucide.createIcons(container ? { root: container } : undefined)
        } catch {
          // ignore icon error in mock DOM
        }
      }
    }

    function updatePlayPauseButtons() {
      const doc = getDoc()
      if (!doc) return
      const btnPlay = doc.getElementById('btnPlayScenario')
      const btnPause = doc.getElementById('btnPauseScenario')
      if (btnPlay && btnPause) {
        if (_isPlaying) {
          btnPlay.style.display = 'none'
          btnPause.style.display = 'inline-flex'
        } else {
          btnPlay.style.display = 'inline-flex'
          btnPause.style.display = 'none'
        }
      }
    }

    // =========================================================================
    // Core Visual Spotlight Management
    // =========================================================================

    function clearAllHighlights(doc) {
      if (!doc) return

      // Remove active mode classes
      const world = doc.getElementById('world')
      if (world) {
        world.classList.remove('scenario-active-mode', 'scenario-running')
      }
      if (doc.body) {
        doc.body.classList.remove('scenario-active-mode', 'scenario-running')
      }

      // Remove step badges
      const badges = doc.querySelectorAll('.scenario-step-badge')
      badges.forEach((b) => {
        if (typeof b.remove === 'function') {
          b.remove()
        } else if (b.parentNode && typeof b.parentNode.removeChild === 'function') {
          b.parentNode.removeChild(b)
        }
      })
      _injectedBadges = []

      // Restore nodes
      const allNodeEls = doc.querySelectorAll(
        '.wc-node, .er-table-node, .node-card, [data-node-id]',
      )
      allNodeEls.forEach((el) => {
        el.classList.remove('scenario-highlight', 'scenario-db-read', 'scenario-db-write')
        if (el.style) {
          el.style.opacity = ''
        }
      })

      // Restore zones
      const allZoneEls = doc.querySelectorAll('.zone-box, [data-zone-id]')
      allZoneEls.forEach((el) => {
        el.classList.remove('scenario-highlight-zone')
        if (el.style) {
          el.style.opacity = ''
        }
      })

      // Restore edges
      const allEdgeEls = doc.querySelectorAll(
        '.edge-group, .edge-label, .edge-label-pill, [data-edge-id]',
      )
      allEdgeEls.forEach((el) => {
        el.classList.remove('scenario-active-edge')
        if (el.style) {
          el.style.opacity = ''
        }
      })
    }

    function applyStep(stepIndex) {
      const doc = getDoc()
      if (!doc || !_currentScenario || !Array.isArray(_currentScenario.steps)) return

      const steps = _currentScenario.steps
      if (stepIndex < 0 || stepIndex >= steps.length) return

      const step = steps[stepIndex]
      if (!step) return

      // 1. Activate scenario mode on world and body
      const world = doc.getElementById('world')
      if (world) {
        world.classList.add('scenario-active-mode', 'scenario-running')
      }
      if (doc.body) {
        doc.body.classList.add('scenario-active-mode', 'scenario-running')
      }

      // 2. Identify participating nodes for this step
      const participatingNodeIds = new Set()
      if (step.sourceId) participatingNodeIds.add(step.sourceId)
      if (step.targetId) participatingNodeIds.add(step.targetId)

      // Map DB tables
      const dbTableNodeIds = new Set()
      const dbTables = Array.isArray(step.dbTables) ? step.dbTables : []
      dbTables.forEach((t) => {
        const cleanName = String(t).trim()
        const dashName = cleanName.replace(/_/g, '-')
        dbTableNodeIds.add(`tbl-${cleanName}`)
        dbTableNodeIds.add(`tbl-${dashName}`)
        participatingNodeIds.add(`tbl-${cleanName}`)
        participatingNodeIds.add(`tbl-${dashName}`)
      })

      // 3. Clear temporary per-step highlights
      const prevHighlighted = doc.querySelectorAll(
        '.scenario-highlight, .scenario-db-read, .scenario-db-write',
      )
      prevHighlighted.forEach((el) => {
        el.classList.remove('scenario-highlight', 'scenario-db-read', 'scenario-db-write')
      })

      const prevActiveEdges = doc.querySelectorAll('.scenario-active-edge')
      prevActiveEdges.forEach((el) => {
        el.classList.remove('scenario-active-edge')
      })

      const prevZones = doc.querySelectorAll('.scenario-highlight-zone')
      prevZones.forEach((el) => {
        el.classList.remove('scenario-highlight-zone')
      })

      // 4. Highlight active nodes and DB table cards
      const allNodesData = getNodes()
      const participatingZones = new Set()

      allNodesData.forEach((nodeData) => {
        if (participatingNodeIds.has(nodeData.id) && nodeData.zone) {
          participatingZones.add(nodeData.zone)
        }
      })

      // Set opacities & highlights on node elements
      const allNodeEls = doc.querySelectorAll(
        '.wc-node, .er-table-node, .node-card, [data-node-id]',
      )
      allNodeEls.forEach((el) => {
        const nodeId = el.dataset ? el.dataset.nodeId : el.getAttribute('data-node-id')
        if (nodeId && participatingNodeIds.has(nodeId)) {
          el.classList.remove('dimmed')
          if (dbTableNodeIds.has(nodeId)) {
            const isWrite = String(step.dbOp || '')
              .toUpperCase()
              .includes('WRITE')
            el.classList.add(isWrite ? 'scenario-db-write' : 'scenario-db-read')
          } else {
            el.classList.add('scenario-highlight')
          }
          if (el.style) el.style.opacity = '1'
        } else {
          if (el.style) el.style.opacity = '0.12'
        }
      })

      // Set opacities on zone elements
      const allZoneEls = doc.querySelectorAll('.zone-box, [data-zone-id]')
      allZoneEls.forEach((el) => {
        const zoneId = el.dataset ? el.dataset.zoneId : el.getAttribute('data-zone-id')
        if (zoneId && participatingZones.has(zoneId)) {
          el.classList.add('scenario-highlight-zone')
          if (el.style) el.style.opacity = '1'
        } else {
          if (el.style) el.style.opacity = '0.12'
        }
      })

      // 5. Connecting edge highlight
      const allEdgesData = getEdges()
      const matchedEdge = allEdgesData.find((e) => {
        return (
          (e.source === step.sourceId && e.target === step.targetId) ||
          (e.source === step.targetId && e.target === step.sourceId)
        )
      })

      const allEdgeEls = doc.querySelectorAll(
        '.edge-group, .edge-label, .edge-label-pill, [data-edge-id]',
      )
      allEdgeEls.forEach((el) => {
        const edgeId = el.dataset ? el.dataset.edgeId : el.getAttribute('data-edge-id')
        if (matchedEdge && edgeId === matchedEdge.id) {
          el.classList.add('scenario-active-edge')
          if (el.style) el.style.opacity = '1'
        } else {
          if (el.style) el.style.opacity = '0.12'
        }
      })

      // 6. Injected Circular Step Badges
      const orderNum = step.order || stepIndex + 1
      const badgeChar = UNICODE_CIRCLES[stepIndex] || `(${orderNum})`

      const attachBadge = (nodeId) => {
        if (!nodeId) return
        const nodeEl = doc.querySelector(`[data-node-id="${nodeId}"]`)
        if (nodeEl) {
          // Check if badge already exists for this step
          let badge = nodeEl.querySelector(`.scenario-step-badge[data-step="${orderNum}"]`)
          if (!badge) {
            badge = doc.createElement('div')
            badge.className = 'scenario-step-badge'
            badge.setAttribute('data-step', String(orderNum))
            badge.textContent = badgeChar
            nodeEl.appendChild(badge)
            _injectedBadges.push(badge)
          }
        }
      }

      attachBadge(step.sourceId)
      if (step.targetId && step.targetId !== step.sourceId) {
        attachBadge(step.targetId)
      }

      // 7. Update Tab 4 Step Description
      updateStepDescription(step, stepIndex, steps.length)
    }

    function updateStepDescription(step, stepIndex, totalSteps) {
      const doc = getDoc()
      if (!doc) return
      const descEl = doc.getElementById('scenarioStepDesc')
      if (!descEl) return

      const orderNum = step.order || stepIndex + 1
      const badgeChar = UNICODE_CIRCLES[stepIndex] || `(${orderNum})`
      const isWrite = String(step.dbOp || '')
        .toUpperCase()
        .includes('WRITE')
      const isRead = String(step.dbOp || '')
        .toUpperCase()
        .includes('READ')
      const opBadgeClass = isWrite ? 'pill-write' : isRead ? 'pill-read' : 'pill-badge'

      const dbTablesList =
        Array.isArray(step.dbTables) && step.dbTables.length > 0
          ? step.dbTables.map((t) => `<code class="field-pill">${t}</code>`).join(' ')
          : '<span class="empty-hint">无直接数据表读写</span>'

      descEl.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <div style="font-weight:700; color:var(--primary); font-size:13px; display:flex; align-items:center; gap:6px;">
            <span style="font-size:16px;">${badgeChar}</span>
            <span>第 ${orderNum} 步 / 共 ${totalSteps} 步</span>
          </div>
          <span class="pill-badge ${opBadgeClass}">[${step.dbOp || 'NONE'}]</span>
        </div>
        <div style="font-size:12.5px; font-weight:600; color:var(--ink); margin-bottom:6px; line-height:1.4;">
          ${step.action || ''}
        </div>
        <div style="font-size:11.5px; color:var(--ink-sec); margin-bottom:6px;">
          <strong>链路契约：</strong><code>${step.contract || `${step.sourceId} ➔ ${step.targetId}`}</code>
        </div>
        <div style="font-size:11.5px; color:var(--ink-sec); margin-bottom:6px;">
          <strong>关联数据表：</strong>${dbTablesList}
        </div>
        <div style="font-size:11.5px; color:var(--ink-muted); background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:6px 8px; line-height:1.4;">
          <strong>执行结果 / 诊断：</strong>${step.result || '执行正常无告警'}
        </div>
      `
      descEl.style.display = 'block'
      refreshIcons(descEl)
    }

    // =========================================================================
    // Execution Summary Table Renderer
    // =========================================================================

    function renderSummaryTable() {
      const doc = getDoc()
      if (!doc || !_currentScenario) return null

      let container = doc.getElementById('scenarioSummaryTable')
      if (!container) {
        container = doc.querySelector('.scenario-summary-table')
      }
      if (!container) return null

      // Clean container
      container.innerHTML = ''
      if (Array.isArray(container.children)) {
        container.children = []
      }

      const steps = Array.isArray(_currentScenario.steps) ? _currentScenario.steps : []

      // Create structured table element
      const table = doc.createElement('table')
      table.className = 'scenario-summary-table'

      // Thead
      const thead = doc.createElement('thead')
      const headerRow = doc.createElement('tr')

      const thCols = [
        { text: '序号', width: '48px' },
        { text: '源模块 (Source)', width: '130px' },
        { text: '执行动作与目标链路 (Action & Target)', width: 'auto' },
        { text: '数据库读写契约', width: '150px' },
        { text: '执行诊断与结果', width: '180px' },
      ]

      thCols.forEach((col) => {
        const th = doc.createElement('th')
        th.textContent = col.text
        if (col.width !== 'auto' && th.style) {
          th.style.width = col.width
        }
        headerRow.appendChild(th)
      })
      thead.appendChild(headerRow)
      table.appendChild(thead)

      // Tbody
      const tbody = doc.createElement('tbody')

      steps.forEach((st, idx) => {
        const tr = doc.createElement('tr')
        tr.style.cursor = 'pointer'
        tr.title = '点击直接跳转到此步骤'
        tr.addEventListener('click', () => {
          _hasStarted = true
          _currentStepIndex = idx
          applyStep(idx)
        })

        // Col 1: Order
        const tdOrder = doc.createElement('td')
        tdOrder.className = 'scenario-step-order'
        const badgeChar = UNICODE_CIRCLES[idx] || String(st.order || idx + 1)
        tdOrder.textContent = badgeChar
        tr.appendChild(tdOrder)

        // Col 2: Source
        const tdSource = doc.createElement('td')
        const srcStrong = doc.createElement('strong')
        srcStrong.textContent = st.sourceId || '-'
        tdSource.appendChild(srcStrong)
        tr.appendChild(tdSource)

        // Col 3: Action & Target
        const tdAction = doc.createElement('td')
        const actionDiv = doc.createElement('div')
        actionDiv.className = 'summary-action-text'
        actionDiv.textContent = st.action || ''
        const targetDiv = doc.createElement('div')
        targetDiv.className = 'summary-target-text'
        targetDiv.textContent = `➔ ${st.targetId || ''}`
        tdAction.appendChild(actionDiv)
        tdAction.appendChild(targetDiv)
        tr.appendChild(tdAction)

        // Col 4: DB Ops
        const tdDb = doc.createElement('td')
        const isWrite = String(st.dbOp || '')
          .toUpperCase()
          .includes('WRITE')
        const isRead = String(st.dbOp || '')
          .toUpperCase()
          .includes('READ')
        const pill = doc.createElement('span')
        pill.className = `pill-badge ${isWrite ? 'pill-write' : isRead ? 'pill-read' : 'pill-badge'}`
        pill.textContent = `[${st.dbOp || 'NONE'}]`
        tdDb.appendChild(pill)

        if (Array.isArray(st.dbTables) && st.dbTables.length > 0) {
          const tblWrap = doc.createElement('div')
          tblWrap.className = 'summary-db-tables'
          st.dbTables.forEach((t) => {
            const tCode = doc.createElement('code')
            tCode.className = 'field-pill'
            tCode.textContent = t
            tblWrap.appendChild(tCode)
          })
          tdDb.appendChild(tblWrap)
        }
        tr.appendChild(tdDb)

        // Col 5: Result / Diagnostics
        const tdResult = doc.createElement('td')
        tdResult.className = 'summary-result-cell'
        tdResult.textContent = st.result || st.contract || '完成'
        tr.appendChild(tdResult)

        tbody.appendChild(tr)
      })

      table.appendChild(tbody)
      container.appendChild(table)

      return table
    }

    // =========================================================================
    // Public API Methods
    // =========================================================================

    function loadScenario(scenarioId) {
      pause()

      const scenario = findScenario(scenarioId)
      _currentScenario = scenario
      _currentStepIndex = 0
      _hasStarted = false

      const doc = getDoc()
      if (doc) {
        clearAllHighlights(doc)

        // Update dropdown
        const scSelect = doc.getElementById('scenarioSelect')
        if (scSelect && scenario) {
          scSelect.value = scenario.id
        }

        // Clear step description and render summary table immediately
        const descEl = doc.getElementById('scenarioStepDesc')
        if (descEl) {
          descEl.style.display = 'none'
          descEl.innerHTML = ''
        }
        renderSummaryTable()
      }

      updatePlayPauseButtons()
      return _currentScenario
    }

    function stepNext() {
      if (
        !_currentScenario ||
        !Array.isArray(_currentScenario.steps) ||
        _currentScenario.steps.length === 0
      ) {
        return false
      }

      const maxIndex = _currentScenario.steps.length - 1

      if (!_hasStarted) {
        _hasStarted = true
        _currentStepIndex = 0
        applyStep(0)
        if (_currentStepIndex === maxIndex) {
          renderSummaryTable()
        }
        return true
      }

      if (_currentStepIndex < maxIndex) {
        _currentStepIndex++
        applyStep(_currentStepIndex)
        if (_currentStepIndex === maxIndex) {
          renderSummaryTable()
        }
        return true
      }

      // Already completed all steps
      pause()
      renderSummaryTable()
      return false
    }

    function stepPrev() {
      if (
        !_currentScenario ||
        !Array.isArray(_currentScenario.steps) ||
        _currentScenario.steps.length === 0
      ) {
        return false
      }

      if (!_hasStarted || _currentStepIndex <= 0) {
        _currentStepIndex = 0
        _hasStarted = true
        applyStep(0)
        return false
      }

      _currentStepIndex--
      applyStep(_currentStepIndex)
      return true
    }

    function play(speed) {
      if (typeof speed === 'number' && speed > 0) {
        _speed = speed
      }
      pause()

      _isPlaying = true
      updatePlayPauseButtons()

      // If at end, reload from beginning
      if (
        _hasStarted &&
        _currentScenario &&
        _currentStepIndex >= _currentScenario.steps.length - 1
      ) {
        loadScenario(_currentScenario.id)
      }

      const intervalMs = Math.max(200, Math.round(1100 / _speed))
      _playTimer = setInterval(() => {
        const canAdvance = stepNext()
        if (!canAdvance) {
          pause()
        }
      }, intervalMs)
    }

    function pause() {
      _isPlaying = false
      if (_playTimer) {
        clearInterval(_playTimer)
        _playTimer = null
      }
      updatePlayPauseButtons()
    }

    function reset() {
      pause()
      _currentStepIndex = 0
      _hasStarted = false

      const doc = getDoc()
      if (doc) {
        clearAllHighlights(doc)

        const descEl = doc.getElementById('scenarioStepDesc')
        if (descEl) {
          descEl.style.display = 'none'
          descEl.innerHTML = ''
        }

        const summaryEl = doc.getElementById('scenarioSummaryTable')
        if (summaryEl) {
          summaryEl.innerHTML = ''
        }
      }

      updatePlayPauseButtons()
    }

    function getCurrentScenario() {
      return _currentScenario
    }

    function getCurrentStepIndex() {
      return _currentStepIndex
    }

    function isPlaying() {
      return !!_isPlaying
    }

    function getExecutionSummary() {
      return _currentScenario && Array.isArray(_currentScenario.steps) ? _currentScenario.steps : []
    }

    function setSpeed(speed) {
      if (typeof speed === 'number' && speed > 0) {
        _speed = speed
        if (_isPlaying) {
          play(_speed)
        }
      }
      return _speed
    }

    function getSpeed() {
      return _speed
    }

    // =========================================================================
    // DOM Initialization & Wiring
    // =========================================================================

    function init(customDoc) {
      const doc = customDoc || getDoc()
      if (!doc) return

      // Populate scenario selector dropdown
      const scSelect = doc.getElementById('scenarioSelect')
      if (scSelect && (!scSelect.children || scSelect.children.length === 0)) {
        scSelect.innerHTML = ''
        const scenarios = getScenarios()
        scenarios.forEach((sc) => {
          const opt = doc.createElement('option')
          opt.value = sc.id
          opt.textContent = `${sc.id} · ${sc.title || ''}`
          scSelect.appendChild(opt)
        })
      }

      if (scSelect) {
        scSelect.addEventListener('change', (ev) => {
          const val = ev.target ? ev.target.value : scSelect.value
          loadScenario(val)
        })
      }

      // Wire playback buttons
      const btnPlay = doc.getElementById('btnPlayScenario')
      if (btnPlay) {
        btnPlay.addEventListener('click', () => play(_speed))
      }

      const btnPause = doc.getElementById('btnPauseScenario')
      if (btnPause) {
        btnPause.addEventListener('click', () => pause())
      }

      const btnPrev = doc.getElementById('btnStepPrev')
      if (btnPrev) {
        btnPrev.addEventListener('click', () => stepPrev())
      }

      const btnNext = doc.getElementById('btnStepNext')
      if (btnNext) {
        btnNext.addEventListener('click', () => stepNext())
      }

      const btnReset = doc.getElementById('btnResetScenario')
      if (btnReset) {
        btnReset.addEventListener('click', () => reset())
      }

      // Wire Speed Toggle
      const speedSelect = doc.getElementById('scenarioSpeedSelect')
      if (speedSelect) {
        speedSelect.addEventListener('change', (ev) => {
          const s = parseFloat(ev.target.value) || 1
          setSpeed(s)
        })
      }

      const btnSpeedToggle = doc.getElementById('btnSpeedScenario')
      if (btnSpeedToggle) {
        btnSpeedToggle.addEventListener('click', () => {
          const speeds = [1, 2, 0.5]
          const curIdx = speeds.indexOf(_speed)
          const nextSpeed = speeds[(curIdx + 1) % speeds.length] || 1
          setSpeed(nextSpeed)
          btnSpeedToggle.textContent = `${nextSpeed}x`
        })
      }

      // Auto-load initial scenario if none loaded
      if (!_currentScenario) {
        const scenarios = getScenarios()
        if (scenarios.length > 0) {
          loadScenario(scenarios[0].id)
        }
      }
    }

    // Auto-init if DOM is available
    const initialDoc = getDoc()
    if (initialDoc) {
      init(initialDoc)
    }

    return {
      loadScenario,
      stepNext,
      stepPrev,
      play,
      pause,
      reset,
      getCurrentScenario,
      getCurrentStepIndex,
      isPlaying,
      getExecutionSummary,
      renderSummaryTable,
      setSpeed,
      getSpeed,
      init,
    }
  },
)
