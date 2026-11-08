/**
 * DayDayOn Architecture Canvas — Right Inspector Panel Engine (window.DDO_INSPECTOR)
 *
 * Milestone 3: 3-State Right Inspector Panel & 4-Tab Decomposition System
 *
 * Responsibilities:
 * 1. 3-State Right Inspector Panel:
 *    - Mode 1: Docked Split-Screen (`mode-docked`):
 *      Positioned on right side, separated by `#inspectorSplitter`.
 *      Dragging splitter resizes panel width clamped to [360px, window.innerWidth * 0.7].
 *      Sets `--inspector-width` on root/body, toggles `inspector-docked-active` on body.
 *      Calls `window.DDO_CORE.handleViewportResize()` so canvas adapts smoothly.
 *    - Mode 2: Floating Persistent Mode (`mode-floating`):
 *      Detached floating window with draggable header.
 *      Clicking blank canvas does NOT close panel and does NOT deselect active node.
 *      `isOpen()` returns true.
 *    - Mode 3: Collapsed Mode (`mode-collapsed`):
 *      Slides panel offscreen right (transform: translateX(100%)).
 *      Activates 16px right-edge hover hotspot (`#inspectorEdgeHotspot`) for auto-reveal.
 * 2. 4 Tabs Decomposition System:
 *    - Tab 1「工程定位与总思路」(Positioning):
 *      Layer badge (`#inspLayerBadge`), responsibilities list (`#inspResponsibilities`),
 *      forbidden boundaries list (`#inspBoundaries`), known diagnostics/bug box (`#inspBugSection`, `#inspBugText`),
 *      module-level annotation textarea (`#inspModuleNote`) with save.
 *    - Tab 2「内部逻辑层解剖 & 逐层批注」(Layers):
 *      Ordered breakdown (Layer 1..N) with stage name, codeRef, plain description, I/O contract.
 *      INDEPENDENT ANNOTATION TEXTAREA per layer (`.layer-note-input`, `[data-layer-id="..."]`),
 *      updates save into `node.layers[i].annotation` and mark store dirty.
 *    - Tab 3「上下游契约与 1-2-3-4 时序」(Contracts):
 *      Upstream input sequence and downstream output sequence with 1-2-3-4 timing badges.
 *      Database tables read/write matrix with blue `[READ]` / green `[WRITE]` pills.
 *    - Tab 4「场景运行与链路 Debug」(Scenario):
 *      Scenario selector dropdown (`#scenarioSelect`), playback controls (`#btnStepNext`, etc.),
 *      summary table container (`#scenarioSummaryTable`).
 * 3. Tab switching keeps all 4 panes alive in DOM so draft inputs are never lost.
 * 4. Zero-build native ES5/ES6 Universal Module pattern (UMD/IIFE).
 */

;(function (root, factory) {
  'use strict'
  const instance = factory(root)
  if (typeof module === 'object' && module.exports) {
    module.exports = instance
  }
  if (root) {
    root.DDO_INSPECTOR = instance
  }
})(
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this,
  function (root) {
    'use strict'

    let _mode = 'collapsed'
    let _lastNonCollapsedMode = 'docked'
    let _inspectorWidth = 460
    let _isOpen = false
    let _activeNodeId = null
    let _activeNode = null
    let _activeTab = 'positioning'
    let _isDraggingSplitter = false
    let _domInitialized = false

    const LAYER_NAMES = {
      L1: 'L1 前端交互与容器层',
      L2: 'L2 前后端共用纯领域层',
      L3: 'L3 AI 智能体编排层',
      L4: 'L4 服务端业务服务与收口层',
      L5: 'L5 数据持久层与真实数据表',
    }

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

    function findNode(nodeId) {
      if (!nodeId) return null
      const nodes = getGlobalNodes()
      return nodes.find((n) => n && n.id === nodeId) || null
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

    function showToast(msg) {
      const doc = getDoc()
      if (!doc) return
      const toast = doc.getElementById('toast')
      if (toast) {
        toast.textContent = msg
        if (root.gsap && typeof root.gsap.to === 'function') {
          try {
            root.gsap.killTweensOf(toast)
            root.gsap.fromTo(
              toast,
              { y: -8, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.2, ease: 'power2.out' },
            )
            root.gsap.to(toast, { opacity: 0, y: -6, duration: 0.2, delay: 2, ease: 'power2.in' })
            return
          } catch {
            // fallback
          }
        }
        toast.style.opacity = '1'
        setTimeout(() => {
          toast.style.opacity = '0'
        }, 2000)
      }
    }

    // =========================================================================
    // DOM Skeleton Construction
    // =========================================================================

    function ensureInspectorDomSkeleton(doc) {
      if (!doc || !doc.body) return

      let splitter = doc.getElementById('inspectorSplitter')
      if (!splitter) {
        splitter = doc.createElement('div')
        splitter.id = 'inspectorSplitter'
        splitter.className = 'inspector-splitter'
        const handle = doc.createElement('div')
        handle.className = 'splitter-handle'
        splitter.appendChild(handle)
        doc.body.appendChild(splitter)
      }

      let panel = doc.getElementById('inspectorPanel')
      if (!panel) {
        panel = doc.createElement('aside')
        panel.id = 'inspectorPanel'
        panel.className = 'inspector-panel mode-docked'
        panel.setAttribute('aria-label', '架构透视面板')

        // 1. Header
        const header = doc.createElement('header')
        header.className = 'insp-header'
        header.id = 'inspHeader'

        const headerLeft = doc.createElement('div')
        headerLeft.className = 'insp-header-left'
        const tag = doc.createElement('span')
        tag.id = 'inspTag'
        tag.className = 'insp-tag'
        tag.textContent = 'L1'
        const title = doc.createElement('h3')
        title.id = 'inspTitle'
        title.className = 'insp-title'
        title.textContent = '模块详情'
        headerLeft.appendChild(tag)
        headerLeft.appendChild(title)
        header.appendChild(headerLeft)

        const headerActions = doc.createElement('div')
        headerActions.className = 'insp-header-actions'

        const modeSwitch = doc.createElement('div')
        modeSwitch.className = 'insp-mode-switch'
        modeSwitch.setAttribute('role', 'group')
        modeSwitch.setAttribute('aria-label', '面板显示模式')

        const btnDocked = doc.createElement('button')
        btnDocked.id = 'btnModeDocked'
        btnDocked.className = 'insp-mode-btn active'
        btnDocked.setAttribute('data-mode', 'docked')
        btnDocked.setAttribute('title', '固定分屏')
        const iconDocked = doc.createElement('i')
        iconDocked.setAttribute('data-lucide', 'columns-2')
        btnDocked.appendChild(iconDocked)

        const btnFloating = doc.createElement('button')
        btnFloating.id = 'btnModeFloating'
        btnFloating.className = 'insp-mode-btn'
        btnFloating.setAttribute('data-mode', 'floating')
        btnFloating.setAttribute('title', '悬浮常驻')
        const iconFloating = doc.createElement('i')
        iconFloating.setAttribute('data-lucide', 'app-window')
        btnFloating.appendChild(iconFloating)

        const btnCollapsed = doc.createElement('button')
        btnCollapsed.id = 'btnModeCollapsed'
        btnCollapsed.className = 'insp-mode-btn'
        btnCollapsed.setAttribute('data-mode', 'collapsed')
        btnCollapsed.setAttribute('title', '收起面板')
        const iconCollapsed = doc.createElement('i')
        iconCollapsed.setAttribute('data-lucide', 'chevron-right')
        btnCollapsed.appendChild(iconCollapsed)

        modeSwitch.appendChild(btnDocked)
        modeSwitch.appendChild(btnFloating)
        modeSwitch.appendChild(btnCollapsed)
        headerActions.appendChild(modeSwitch)

        const closeBtn = doc.createElement('button')
        closeBtn.id = 'inspCloseBtn'
        closeBtn.className = 'insp-close-btn'
        closeBtn.setAttribute('title', '关闭面板')
        const iconClose = doc.createElement('i')
        iconClose.setAttribute('data-lucide', 'x')
        closeBtn.appendChild(iconClose)
        headerActions.appendChild(closeBtn)

        header.appendChild(headerActions)
        panel.appendChild(header)

        // 2. Tabs Navigation Bar
        const navTabs = doc.createElement('nav')
        navTabs.className = 'insp-tabs'
        navTabs.setAttribute('aria-label', '透视解剖视图切换')

        const tabsData = [
          {
            id: 'tabBtnPositioning',
            tab: 'tab-positioning',
            label: '工程定位与总思路',
            icon: 'compass',
          },
          { id: 'tabBtnLayers', tab: 'tab-layers', label: '逻辑层与逐层批注', icon: 'layers' },
          {
            id: 'tabBtnContracts',
            tab: 'tab-contracts',
            label: '上下游契约与时序',
            icon: 'git-merge',
          },
          {
            id: 'tabBtnScenario',
            tab: 'tab-scenario',
            label: '场景拓扑 Debug',
            icon: 'play-circle',
          },
        ]

        tabsData.forEach((td, idx) => {
          const tBtn = doc.createElement('button')
          tBtn.id = td.id
          tBtn.className = `insp-tab ${idx === 0 ? 'active' : ''}`
          tBtn.setAttribute('data-tab', td.tab)
          const tIcon = doc.createElement('i')
          tIcon.setAttribute('data-lucide', td.icon)
          const tSpan = doc.createElement('span')
          tSpan.textContent = td.label
          tBtn.appendChild(tIcon)
          tBtn.appendChild(tSpan)
          navTabs.appendChild(tBtn)
        })

        panel.appendChild(navTabs)

        // 3. Panes Body
        const body = doc.createElement('div')
        body.className = 'insp-body'

        // Pane 1: Tab Positioning
        const p1 = doc.createElement('section')
        p1.id = 'tabPositioning'
        p1.className = 'tab-pane active'
        p1.setAttribute('data-tab-pane', 'positioning')

        const p1SecLayer = doc.createElement('div')
        p1SecLayer.className = 'insp-section'
        const p1SecLayerTitle = doc.createElement('div')
        p1SecLayerTitle.className = 'insp-section-title'
        p1SecLayerTitle.textContent = '所属工程架构层'
        const badge = doc.createElement('div')
        badge.id = 'inspLayerBadge'
        badge.className = 'insp-layer-badge inspector-badge'
        badge.textContent = 'L1 前端交互与容器层'
        p1SecLayer.appendChild(p1SecLayerTitle)
        p1SecLayer.appendChild(badge)
        p1.appendChild(p1SecLayer)

        const p1SecResp = doc.createElement('div')
        p1SecResp.className = 'insp-section'
        const p1SecRespTitle = doc.createElement('div')
        p1SecRespTitle.className = 'insp-section-title'
        p1SecRespTitle.textContent = '高内聚核心职责'
        const ulResp = doc.createElement('ul')
        ulResp.id = 'inspResponsibilities'
        ulResp.className = 'insp-list'
        p1SecResp.appendChild(p1SecRespTitle)
        p1SecResp.appendChild(ulResp)
        p1.appendChild(p1SecResp)

        const p1SecBound = doc.createElement('div')
        p1SecBound.className = 'insp-section'
        const p1SecBoundTitle = doc.createElement('div')
        p1SecBoundTitle.className = 'insp-section-title forbidden'
        p1SecBoundTitle.textContent = '低耦合严禁越界'
        const ulBound = doc.createElement('ul')
        ulBound.id = 'inspBoundaries'
        ulBound.className = 'insp-list forbidden'
        p1SecBound.appendChild(p1SecBoundTitle)
        p1SecBound.appendChild(ulBound)
        p1.appendChild(p1SecBound)

        const p1SecBug = doc.createElement('div')
        p1SecBug.id = 'inspBugSection'
        p1SecBug.className = 'insp-section insp-bug-section'
        p1SecBug.style.display = 'none'
        const p1SecBugTitle = doc.createElement('div')
        p1SecBugTitle.className = 'insp-section-title bug'
        p1SecBugTitle.textContent = '现状缺陷与断链诊断'
        const bugText = doc.createElement('div')
        bugText.id = 'inspBugText'
        bugText.className = 'insp-bug-box'
        p1SecBug.appendChild(p1SecBugTitle)
        p1SecBug.appendChild(bugText)
        p1.appendChild(p1SecBug)

        const p1SecCode = doc.createElement('div')
        p1SecCode.id = 'inspCodeSection'
        p1SecCode.className = 'insp-section'
        const p1SecCodeTitle = doc.createElement('div')
        p1SecCodeTitle.className = 'insp-section-title'
        p1SecCodeTitle.textContent = '真实项目源码入口'
        const codePath = doc.createElement('div')
        codePath.id = 'inspCodePath'
        codePath.className = 'insp-code-path'
        p1SecCode.appendChild(p1SecCodeTitle)
        p1SecCode.appendChild(codePath)
        p1.appendChild(p1SecCode)

        const p1SecNote = doc.createElement('div')
        p1SecNote.className = 'insp-section'
        const p1SecNoteTitle = doc.createElement('div')
        p1SecNoteTitle.className = 'insp-section-title'
        p1SecNoteTitle.textContent = '模块级总思路批注'
        const moduleNote = doc.createElement('textarea')
        moduleNote.id = 'inspModuleNote'
        moduleNote.className = 'insp-textarea'
        moduleNote.setAttribute('placeholder', '填写此模块的设计思路、重构计划或功能批注...')
        const btnSaveNote = doc.createElement('button')
        btnSaveNote.id = 'inspSaveNoteBtn'
        btnSaveNote.className = 'btn btn-primary btn-sm'
        const saveIcon = doc.createElement('i')
        saveIcon.setAttribute('data-lucide', 'check')
        const saveSpan = doc.createElement('span')
        saveSpan.textContent = '保存模块批注'
        btnSaveNote.appendChild(saveIcon)
        btnSaveNote.appendChild(saveSpan)
        p1SecNote.appendChild(p1SecNoteTitle)
        p1SecNote.appendChild(moduleNote)
        p1SecNote.appendChild(btnSaveNote)
        p1.appendChild(p1SecNote)

        body.appendChild(p1)

        // Pane 2: Tab Layers
        const p2 = doc.createElement('section')
        p2.id = 'tabLayers'
        p2.className = 'tab-pane'
        p2.setAttribute('data-tab-pane', 'layers')
        const layersList = doc.createElement('div')
        layersList.id = 'inspLayersList'
        layersList.className = 'layers-container'
        p2.appendChild(layersList)
        body.appendChild(p2)

        // Pane 3: Tab Contracts
        const p3 = doc.createElement('section')
        p3.id = 'tabContracts'
        p3.className = 'tab-pane'
        p3.setAttribute('data-tab-pane', 'contracts')

        const p3SecUp = doc.createElement('div')
        p3SecUp.className = 'insp-section'
        const p3SecUpTitle = doc.createElement('div')
        p3SecUpTitle.className = 'insp-section-title'
        p3SecUpTitle.textContent = '上游输入链路 (Upstream Sequence)'
        const upList = doc.createElement('div')
        upList.id = 'inspUpstreamList'
        upList.className = 'contract-chain'
        p3SecUp.appendChild(p3SecUpTitle)
        p3SecUp.appendChild(upList)
        p3.appendChild(p3SecUp)

        const p3SecDown = doc.createElement('div')
        p3SecDown.className = 'insp-section'
        const p3SecDownTitle = doc.createElement('div')
        p3SecDownTitle.className = 'insp-section-title'
        p3SecDownTitle.textContent = '下游输出链路 (Downstream Sequence)'
        const downList = doc.createElement('div')
        downList.id = 'inspDownstreamList'
        downList.className = 'contract-chain'
        p3SecDown.appendChild(p3SecDownTitle)
        p3SecDown.appendChild(downList)
        p3.appendChild(p3SecDown)

        const p3SecDb = doc.createElement('div')
        p3SecDb.className = 'insp-section'
        const p3SecDbTitle = doc.createElement('div')
        p3SecDbTitle.className = 'insp-section-title'
        p3SecDbTitle.textContent = '关联真实数据库表读写矩阵'
        const dbMatrix = doc.createElement('div')
        dbMatrix.id = 'inspDbMatrix'
        dbMatrix.className = 'db-matrix-grid'
        p3SecDb.appendChild(p3SecDbTitle)
        p3SecDb.appendChild(dbMatrix)
        p3.appendChild(p3SecDb)

        body.appendChild(p3)

        // Pane 4: Tab Scenario
        const p4 = doc.createElement('section')
        p4.id = 'tabScenario'
        p4.className = 'tab-pane'
        p4.setAttribute('data-tab-pane', 'scenario')

        const scRow = doc.createElement('div')
        scRow.className = 'scenario-ctrl-row'
        const scLabel = doc.createElement('label')
        scLabel.textContent = '选择业务打卡场景：'
        const scSelect = doc.createElement('select')
        scSelect.id = 'scenarioSelect'
        scSelect.className = 'scenario-select'
        scRow.appendChild(scLabel)
        scRow.appendChild(scSelect)
        p4.appendChild(scRow)

        const scBtns = doc.createElement('div')
        scBtns.className = 'scenario-buttons-row'

        const btnPlay = doc.createElement('button')
        btnPlay.id = 'btnPlayScenario'
        btnPlay.className = 'btn btn-sm'
        btnPlay.setAttribute('data-action', 'play')
        btnPlay.textContent = '播放'

        const btnPause = doc.createElement('button')
        btnPause.id = 'btnPauseScenario'
        btnPause.className = 'btn btn-sm'
        btnPause.setAttribute('data-action', 'pause')
        btnPause.style.display = 'none'
        btnPause.textContent = '暂停'

        const btnPrev = doc.createElement('button')
        btnPrev.id = 'btnStepPrev'
        btnPrev.className = 'btn btn-sm'
        btnPrev.setAttribute('data-action', 'step-prev')
        btnPrev.textContent = '上一步'

        const btnNext = doc.createElement('button')
        btnNext.id = 'btnStepNext'
        btnNext.className = 'btn btn-sm btn-primary'
        btnNext.setAttribute('data-action', 'step-next')
        btnNext.textContent = '单步下一步'

        const btnReset = doc.createElement('button')
        btnReset.id = 'btnResetScenario'
        btnReset.className = 'btn btn-sm btn-danger'
        btnReset.setAttribute('data-action', 'reset')
        btnReset.textContent = '重置'

        scBtns.appendChild(btnPlay)
        scBtns.appendChild(btnPause)
        scBtns.appendChild(btnPrev)
        scBtns.appendChild(btnNext)
        scBtns.appendChild(btnReset)
        p4.appendChild(scBtns)

        const scStepDesc = doc.createElement('div')
        scStepDesc.id = 'scenarioStepDesc'
        scStepDesc.className = 'scenario-step-desc'
        p4.appendChild(scStepDesc)

        const scSummaryTable = doc.createElement('div')
        scSummaryTable.id = 'scenarioSummaryTable'
        scSummaryTable.className = 'scenario-summary-table'
        p4.appendChild(scSummaryTable)

        body.appendChild(p4)

        panel.appendChild(body)
        doc.body.appendChild(panel)
      }

      let hotspot = doc.getElementById('inspectorEdgeHotspot')
      if (!hotspot) {
        hotspot = doc.createElement('div')
        hotspot.id = 'inspectorEdgeHotspot'
        hotspot.className = 'inspector-edge-hotspot'
        hotspot.setAttribute('title', '鼠标移至边缘唤出面板')
        doc.body.appendChild(hotspot)
      }

      bindInspectorEvents(doc)
    }

    // =========================================================================
    // Inspector Modes & Splitter Clamping
    // =========================================================================

    function setInspectorMode(mode) {
      if (mode !== 'docked' && mode !== 'floating' && mode !== 'collapsed') {
        // B2-T5: Setting invalid inspector mode defaults gracefully or throws predictable error
        return _mode
      }

      if (mode !== 'collapsed') {
        _lastNonCollapsedMode = mode
      }
      _mode = mode

      const doc = getDoc()
      if (!doc) return _mode

      ensureInspectorDomSkeleton(doc)

      const panel = doc.getElementById('inspectorPanel')
      const splitter = doc.getElementById('inspectorSplitter')

      if (panel) {
        panel.classList.remove('mode-docked', 'mode-floating', 'mode-collapsed')
        panel.classList.add(`mode-${mode}`)

        const modeBtns = panel.querySelectorAll('.insp-mode-btn')
        modeBtns.forEach((btn) => {
          const btnMode = btn.getAttribute('data-mode')
          if (btnMode === mode) {
            btn.classList.add('active')
          } else {
            btn.classList.remove('active')
          }
        })
      }

      if (doc.body) {
        if (mode === 'docked') {
          doc.body.classList.add('inspector-docked-active')
          doc.body.classList.remove('inspector-floating-active', 'inspector-collapsed-active')
          if (doc.body.style) {
            doc.body.style.setProperty('--inspector-width', `${_inspectorWidth}px`)
          }
          if (splitter) {
            splitter.style.display = 'flex'
            splitter.style.right = `${_inspectorWidth}px`
          }
          if (panel) {
            panel.style.width = `${_inspectorWidth}px`
            panel.style.transform = ''
            panel.style.left = ''
            panel.style.top = ''
            panel.style.bottom = '0'
            panel.style.right = '0'
          }
        } else if (mode === 'floating') {
          doc.body.classList.remove('inspector-docked-active', 'inspector-collapsed-active')
          doc.body.classList.add('inspector-floating-active')
          if (splitter) {
            splitter.style.display = 'none'
          }
          if (panel) {
            panel.style.transform = ''
          }
        } else if (mode === 'collapsed') {
          doc.body.classList.remove('inspector-docked-active', 'inspector-floating-active')
          doc.body.classList.add('inspector-collapsed-active')
          if (splitter) {
            splitter.style.display = 'none'
          }
          if (panel) {
            panel.style.transform = 'translateX(100%)'
          }
        }
      }

      // Adapt canvas viewport
      if (root.DDO_CORE && typeof root.DDO_CORE.handleViewportResize === 'function') {
        try {
          root.DDO_CORE.handleViewportResize()
        } catch {
          // ignore
        }
      }

      return _mode
    }

    function getInspectorMode() {
      return _mode
    }

    function handleSplitterDrag(desiredWidth, winWidth) {
      const wWidth =
        typeof winWidth === 'number' && winWidth > 0 ? winWidth : root.innerWidth || 1440
      const minW = 360
      const maxW = Math.floor(wWidth * 0.7)
      const clamped = Math.max(minW, Math.min(maxW, Math.round(desiredWidth)))
      _inspectorWidth = clamped

      const doc = getDoc()
      if (doc) {
        if (doc.documentElement && doc.documentElement.style) {
          doc.documentElement.style.setProperty('--inspector-width', `${clamped}px`)
        }
        if (doc.body && doc.body.style) {
          doc.body.style.setProperty('--inspector-width', `${clamped}px`)
        }
        const panel = doc.getElementById('inspectorPanel')
        if (panel && _mode === 'docked') {
          panel.style.width = `${clamped}px`
        }
        const splitter = doc.getElementById('inspectorSplitter')
        if (splitter && _mode === 'docked') {
          splitter.style.right = `${clamped}px`
        }
      }

      if (root.DDO_CORE && typeof root.DDO_CORE.handleViewportResize === 'function') {
        try {
          root.DDO_CORE.handleViewportResize()
        } catch {
          // ignore
        }
      }

      return clamped
    }

    function isOpen() {
      return !!_isOpen
    }

    function closeInspector(force = false) {
      _isOpen = false
      const doc = getDoc()
      if (doc) {
        if (force) {
          _activeNodeId = null
          _activeNode = null
          if (root.DDO_APP && typeof root.DDO_APP.applyLineageHighlight === 'function') {
            root.DDO_APP.applyLineageHighlight(null)
          }
        }
        setInspectorMode('collapsed')
      }
    }

    function getActiveNode() {
      return _activeNode
    }

    function getActiveNodeId() {
      return _activeNodeId
    }

    // =========================================================================
    // Tabs Navigation
    // =========================================================================

    function setActiveTab(targetTabKey) {
      const key = String(targetTabKey || 'positioning')
        .replace(/^tab-?/, '')
        .toLowerCase()
      _activeTab = key

      const doc = getDoc()
      if (!doc) return

      const tabBtns = doc.querySelectorAll('.insp-tab')
      tabBtns.forEach((btn, idx) => {
        const rawAttr =
          btn.getAttribute('data-tab') || ['positioning', 'layers', 'contracts', 'scenario'][idx]
        const tabAttr = rawAttr.replace(/^tab-?/, '').toLowerCase()
        if (tabAttr === key) {
          btn.classList.add('active')
        } else {
          btn.classList.remove('active')
        }
      })

      const panes = doc.querySelectorAll('.tab-pane')
      panes.forEach((pane) => {
        const rawAttr = pane.getAttribute('data-tab-pane') || pane.id.replace(/^tab-?/, '')
        const paneAttr = rawAttr.replace(/^tab-?/, '').toLowerCase()
        if (paneAttr === key) {
          pane.classList.add('active')
          pane.style.display = 'block'
        } else {
          pane.classList.remove('active')
          pane.style.display = 'none'
        }
      })
    }

    function getActiveTab() {
      return _activeTab
    }

    // =========================================================================
    // Data Rendering
    // =========================================================================

    function renderHeader(node) {
      const doc = getDoc()
      if (!doc) return

      const titleEl = doc.getElementById('inspTitle')
      if (titleEl) {
        titleEl.textContent = node.title || node.id || '未命名模块'
      }

      const tagEl = doc.getElementById('inspTag')
      if (tagEl) {
        tagEl.textContent = node.layer || node.tag || 'L1'
      }
    }

    function renderTab1(node) {
      const doc = getDoc()
      if (!doc) return

      // Layer badge
      const badge = doc.getElementById('inspLayerBadge')
      if (badge) {
        badge.textContent = LAYER_NAMES[node.layer] || `${node.layer || 'L1'} 架构层`
      }

      // Responsibilities
      const ulResp = doc.getElementById('inspResponsibilities')
      if (ulResp) {
        ulResp.innerHTML = ''
        const list = Array.isArray(node.responsibilities) ? node.responsibilities : []
        if (list.length === 0) {
          const li = doc.createElement('li')
          li.className = 'empty-hint'
          li.textContent = '暂无明确核心职责约束'
          ulResp.appendChild(li)
        } else {
          list.forEach((r) => {
            const li = doc.createElement('li')
            const icon = doc.createElement('i')
            icon.setAttribute('data-lucide', 'check-circle-2')
            const span = doc.createElement('span')
            span.textContent = r
            li.appendChild(icon)
            li.appendChild(span)
            ulResp.appendChild(li)
          })
        }
      }

      // Forbidden Boundaries
      const ulBound = doc.getElementById('inspBoundaries')
      if (ulBound) {
        ulBound.innerHTML = ''
        const list = Array.isArray(node.forbiddenBoundaries) ? node.forbiddenBoundaries : []
        if (list.length === 0) {
          const li = doc.createElement('li')
          li.className = 'empty-hint'
          li.textContent = '暂无越界限制定义'
          ulBound.appendChild(li)
        } else {
          list.forEach((b) => {
            const li = doc.createElement('li')
            const icon = doc.createElement('i')
            icon.setAttribute('data-lucide', 'ban')
            const span = doc.createElement('span')
            span.textContent = b
            li.appendChild(icon)
            li.appendChild(span)
            ulBound.appendChild(li)
          })
        }
      }

      // Known Bug / Diagnostics
      const bugSec = doc.getElementById('inspBugSection')
      const bugText = doc.getElementById('inspBugText')
      if (bugSec && bugText) {
        if (node.bug) {
          bugSec.style.display = 'block'
          bugText.textContent = node.bug
        } else {
          bugSec.style.display = 'none'
          bugText.textContent = ''
        }
      }

      // Source Code Ref
      const codePath = doc.getElementById('inspCodePath')
      if (codePath) {
        codePath.textContent = node.code || 'src/...'
      }

      // Module Note
      const moduleNote = doc.getElementById('inspModuleNote')
      if (moduleNote) {
        moduleNote.value =
          node.moduleAnnotation !== undefined ? node.moduleAnnotation : node.annotation || ''
      }
    }

    function renderTab2(node) {
      const doc = getDoc()
      if (!doc) return

      const layersList = doc.getElementById('inspLayersList')
      if (!layersList) return

      layersList.innerHTML = ''
      const layers = Array.isArray(node.layers) ? node.layers : []

      if (layers.length === 0) {
        const banner = doc.createElement('div')
        banner.className = 'empty-state-banner'
        const icon = doc.createElement('i')
        icon.setAttribute('data-lucide', 'info')
        const span = doc.createElement('span')
        span.textContent = '该模块暂无细分逻辑层定义 (0 Layers)'
        banner.appendChild(icon)
        banner.appendChild(span)
        layersList.appendChild(banner)
        return
      }

      layers.forEach((layer, idx) => {
        const card = doc.createElement('div')
        card.className = 'layer-card'
        const layerId = layer.id || `layer-${idx + 1}`
        card.setAttribute('data-layer-id', layerId)
        card.setAttribute('data-layer-idx', String(idx))

        // Header
        const head = doc.createElement('div')
        head.className = 'layer-head'
        const badge = doc.createElement('span')
        badge.className = 'layer-stage-badge'
        badge.textContent = `Layer ${idx + 1}`
        const name = doc.createElement('span')
        name.className = 'layer-name'
        name.textContent = layer.name || `Stage ${idx + 1}`
        head.appendChild(badge)
        head.appendChild(name)
        card.appendChild(head)

        // Code ref
        if (layer.codeRef) {
          const codeRefEl = doc.createElement('div')
          codeRefEl.className = 'layer-code-ref'
          const codeIcon = doc.createElement('i')
          codeIcon.setAttribute('data-lucide', 'code-2')
          const codeSpan = doc.createElement('span')
          codeSpan.textContent = layer.codeRef
          codeRefEl.appendChild(codeIcon)
          codeRefEl.appendChild(codeSpan)
          card.appendChild(codeRefEl)
        }

        // Plain explanation
        if (layer.plain) {
          const plainEl = doc.createElement('div')
          plainEl.className = 'layer-plain'
          plainEl.textContent = layer.plain
          card.appendChild(plainEl)
        }

        // Contract
        if (layer.contract) {
          const cBox = doc.createElement('div')
          cBox.className = 'layer-contract-box'

          const inRow = doc.createElement('div')
          inRow.className = 'contract-row'
          const inStrong = doc.createElement('strong')
          inStrong.textContent = 'IN: '
          const inCode = doc.createElement('code')
          inCode.textContent = layer.contract.input || '-'
          inRow.appendChild(inStrong)
          inRow.appendChild(inCode)
          cBox.appendChild(inRow)

          const procRow = doc.createElement('div')
          procRow.className = 'contract-row'
          const procStrong = doc.createElement('strong')
          procStrong.textContent = 'PROC: '
          const procSpan = doc.createElement('span')
          procSpan.textContent = layer.contract.process || '-'
          procRow.appendChild(procStrong)
          procRow.appendChild(procSpan)
          cBox.appendChild(procRow)

          const outRow = doc.createElement('div')
          outRow.className = 'contract-row'
          const outStrong = doc.createElement('strong')
          outStrong.textContent = 'OUT: '
          const outCode = doc.createElement('code')
          outCode.textContent = layer.contract.output || '-'
          outRow.appendChild(outStrong)
          outRow.appendChild(outCode)
          cBox.appendChild(outRow)

          card.appendChild(cBox)
        }

        // Independent Layer Annotation Textarea
        const noteWrap = doc.createElement('div')
        noteWrap.className = 'layer-annotation-wrap'

        const noteLabel = doc.createElement('div')
        noteLabel.className = 'layer-annotation-label'
        const noteIcon = doc.createElement('i')
        noteIcon.setAttribute('data-lucide', 'pen-tool')
        const noteSpan = doc.createElement('span')
        noteSpan.textContent = `Layer ${idx + 1} 独立批注与改动期望`
        noteLabel.appendChild(noteIcon)
        noteLabel.appendChild(noteSpan)
        noteWrap.appendChild(noteLabel)

        const textarea = doc.createElement('textarea')
        textarea.className = 'layer-note-input'
        textarea.setAttribute('data-layer-id', layerId)
        textarea.setAttribute('data-layer-idx', String(idx))
        textarea.setAttribute('placeholder', `针对 Layer ${idx + 1} 单独输入功能期望与优化批注...`)
        textarea.value = layer.annotation || ''

        textarea.addEventListener('input', (ev) => {
          layer.annotation = ev.target.value
          if (root.DDO_STORE && typeof root.DDO_STORE.markDirty === 'function') {
            try {
              root.DDO_STORE.markDirty()
            } catch {
              // ignore
            }
          }
        })

        noteWrap.appendChild(textarea)
        card.appendChild(noteWrap)

        layersList.appendChild(card)
      })
    }

    function renderTab3(node) {
      const doc = getDoc()
      if (!doc) return

      const contracts = node.contracts || {}

      // Upstream
      const upList = doc.getElementById('inspUpstreamList')
      if (upList) {
        upList.innerHTML = ''
        const upstreams = Array.isArray(contracts.upstreams) ? contracts.upstreams : []
        if (upstreams.length === 0) {
          const hint = doc.createElement('div')
          hint.className = 'empty-hint'
          hint.textContent = '暂无明确上游输入依赖'
          upList.appendChild(hint)
        } else {
          upstreams.forEach((item, i) => {
            const row = doc.createElement('div')
            row.className = 'chain-step'
            const badge = doc.createElement('span')
            badge.className = 'step-badge-num'
            badge.textContent = String(i + 1)
            const nameSpan = doc.createElement('span')
            const matched = findNode(item)
            nameSpan.textContent = matched ? matched.title : item
            row.appendChild(badge)
            row.appendChild(nameSpan)
            upList.appendChild(row)
          })
        }
      }

      // Downstream
      const downList = doc.getElementById('inspDownstreamList')
      if (downList) {
        downList.innerHTML = ''
        const downstreams = Array.isArray(contracts.downstreams) ? contracts.downstreams : []
        if (downstreams.length === 0) {
          const hint = doc.createElement('div')
          hint.className = 'empty-hint'
          hint.textContent = '暂无明确下游派发目标'
          downList.appendChild(hint)
        } else {
          downstreams.forEach((item, i) => {
            const row = doc.createElement('div')
            row.className = 'chain-step'
            const badge = doc.createElement('span')
            badge.className = 'step-badge-num'
            badge.textContent = String(i + 1)
            const nameSpan = doc.createElement('span')
            const matched = findNode(item)
            nameSpan.textContent = matched ? matched.title : item
            row.appendChild(badge)
            row.appendChild(nameSpan)
            downList.appendChild(row)
          })
        }
      }

      // Database Tables Matrix
      const dbMatrix = doc.getElementById('inspDbMatrix')
      if (dbMatrix) {
        dbMatrix.innerHTML = ''
        const dbTables = Array.isArray(contracts.dbTables) ? contracts.dbTables : []
        if (dbTables.length === 0) {
          const hint = doc.createElement('div')
          hint.className = 'empty-hint'
          hint.textContent = '此模块无直接数据库表读写契约'
          dbMatrix.appendChild(hint)
        } else {
          dbTables.forEach((entry) => {
            const card = doc.createElement('div')
            card.className = 'db-contract-card'
            card.setAttribute('data-table', entry.tableName || '')

            const head = doc.createElement('div')
            head.className = 'db-card-head'
            const tableName = doc.createElement('span')
            tableName.className = 'db-table-name'
            tableName.textContent = entry.tableName || 'table'

            const isWrite = String(entry.op || '').toUpperCase() === 'WRITE'
            const pill = doc.createElement('span')
            pill.className = `pill-badge ${isWrite ? 'pill-write' : 'pill-read'}`
            pill.textContent = isWrite ? '[WRITE]' : '[READ]'

            head.appendChild(tableName)
            head.appendChild(pill)
            card.appendChild(head)

            if (Array.isArray(entry.fields) && entry.fields.length > 0) {
              const fWrap = doc.createElement('div')
              fWrap.className = 'db-fields-wrap'
              entry.fields.forEach((f) => {
                const fp = doc.createElement('span')
                fp.className = 'field-pill'
                fp.textContent = f
                fWrap.appendChild(fp)
              })
              card.appendChild(fWrap)
            }

            if (entry.condition) {
              const cRow = doc.createElement('div')
              cRow.className = 'condition-row'
              const cCode = doc.createElement('code')
              cCode.textContent = entry.condition
              cRow.appendChild(cCode)
              card.appendChild(cRow)
            }

            dbMatrix.appendChild(card)
          })
        }
      }
    }

    function renderTab4() {
      const doc = getDoc()
      if (!doc) return

      const scSelect = doc.getElementById('scenarioSelect')
      if (scSelect && (!scSelect.children || scSelect.children.length === 0)) {
        scSelect.innerHTML = ''
        const scenarios =
          root.DDO_DATA && Array.isArray(root.DDO_DATA.SCENARIOS) ? root.DDO_DATA.SCENARIOS : []
        scenarios.forEach((sc) => {
          const opt = doc.createElement('option')
          opt.value = sc.id
          opt.textContent = `${sc.id} · ${sc.title || ''}`
          scSelect.appendChild(opt)
        })
      }
    }

    function highlightCanvasNode(nodeId) {
      if (root.DDO_APP && typeof root.DDO_APP.applyLineageHighlight === 'function') {
        root.DDO_APP.applyLineageHighlight(nodeId)
        return
      }
      const doc = getDoc()
      if (!doc) return
      const prevSelected = doc.querySelectorAll('.wc-node.selected, .er-table-node.selected')
      prevSelected.forEach((el) => {
        if (el.dataset.nodeId !== nodeId) {
          el.classList.remove('selected')
        }
      })
      const activeEl = doc.querySelector(`[data-node-id="${nodeId}"]`)
      if (activeEl) {
        activeEl.classList.add('selected')
      }
    }

    function openNode(nodeOrId) {
      const doc = getDoc()
      if (!doc) return

      ensureInspectorDomSkeleton(doc)

      const nodeId =
        typeof nodeOrId === 'object' && nodeOrId !== null ? nodeOrId.id : String(nodeOrId || '')
      let node = findNode(nodeId)

      if (!node) {
        // Graceful fallback for mock/sparse nodes (B3-T5)
        node = {
          id: nodeId,
          title: nodeId,
          layer: 'L1',
          tag: 'Custom',
          plain: '未找到该节点详细描述',
          responsibilities: [],
          forbiddenBoundaries: [],
          layers: [],
          contracts: { upstreams: [], downstreams: [], dbTables: [] },
        }
      }

      _activeNodeId = node.id
      _activeNode = node
      _isOpen = true

      if (_mode === 'collapsed') {
        setInspectorMode(_lastNonCollapsedMode || 'docked')
      }

      renderHeader(node)
      renderTab1(node)
      renderTab2(node)
      renderTab3(node)
      renderTab4(node)

      highlightCanvasNode(node.id)
      refreshIcons()
    }

    function refresh() {
      if (_activeNodeId) {
        openNode(_activeNodeId)
      }
    }

    // =========================================================================
    // Event Bindings
    // =========================================================================

    function bindInspectorEvents(doc) {
      if (_domInitialized || !doc) return
      _domInitialized = true

      // 1. Splitter Dragging
      const splitter = doc.getElementById('inspectorSplitter')
      if (splitter) {
        const onSplitterPointerUp = (upEv) => {
          _isDraggingSplitter = false
          splitter.classList.remove('active')
          if (
            typeof splitter.releasePointerCapture === 'function' &&
            upEv &&
            upEv.pointerId !== undefined
          ) {
            try {
              splitter.releasePointerCapture(upEv.pointerId)
            } catch {}
          }
        }

        splitter.addEventListener('pointerdown', (ev) => {
          if (ev.button !== 0) return
          if (typeof ev.preventDefault === 'function') ev.preventDefault()
          _isDraggingSplitter = true
          splitter.classList.add('active')
          if (typeof splitter.setPointerCapture === 'function' && ev.pointerId !== undefined) {
            try {
              splitter.setPointerCapture(ev.pointerId)
            } catch {}
          }

          const onMove = (moveEv) => {
            if (!_isDraggingSplitter) return
            const winW = root.innerWidth || 1440
            const desired = winW - (moveEv.clientX || 0)
            handleSplitterDrag(desired, winW)
          }

          const onUp = (upEv) => {
            onSplitterPointerUp(upEv)
            root.removeEventListener('pointermove', onMove)
            root.removeEventListener('pointerup', onUp)
            if (doc) {
              doc.removeEventListener('pointermove', onMove)
              doc.removeEventListener('pointerup', onUp)
            }
          }

          root.addEventListener('pointermove', onMove)
          root.addEventListener('pointerup', onUp)
          if (doc) {
            doc.addEventListener('pointermove', onMove)
            doc.addEventListener('pointerup', onUp)
          }
        })

        splitter.addEventListener('pointerup', onSplitterPointerUp)
        splitter.addEventListener('pointercancel', onSplitterPointerUp)
      }

      // 2. 16px Edge Hotspot Auto-Reveal
      const hotspot = doc.getElementById('inspectorEdgeHotspot')
      if (hotspot) {
        const onHotspotReveal = () => {
          if (_mode === 'collapsed') {
            if (!_activeNode) {
              const defaultNode = findNode('ui-checkin-flow') || getGlobalNodes()[0]
              if (defaultNode) {
                _activeNodeId = defaultNode.id
                _activeNode = defaultNode
                renderHeader(defaultNode)
                renderTab1(defaultNode)
                renderTab2(defaultNode)
                renderTab3(defaultNode)
                renderTab4(defaultNode)
              }
            }
            _isOpen = true
            setInspectorMode(_lastNonCollapsedMode || 'docked')
            refreshIcons()
          }
        }
        hotspot.addEventListener('pointerenter', onHotspotReveal)
        hotspot.addEventListener('mouseenter', onHotspotReveal)
        hotspot.addEventListener('click', onHotspotReveal)
      }

      // 3. Panel Mode Switcher
      const panel = doc.getElementById('inspectorPanel')
      if (panel) {
        const modeBtns = panel.querySelectorAll('.insp-mode-btn')
        modeBtns.forEach((btn) => {
          btn.addEventListener('click', (ev) => {
            if (typeof ev.stopPropagation === 'function') ev.stopPropagation()
            const targetMode = btn.getAttribute('data-mode')
            if (targetMode) {
              setInspectorMode(targetMode)
            }
          })
        })

        // 4. Close Button
        const closeBtn = doc.getElementById('inspCloseBtn')
        if (closeBtn) {
          closeBtn.addEventListener('click', (ev) => {
            if (typeof ev.stopPropagation === 'function') ev.stopPropagation()
            closeInspector(true)
          })
        }

        // 5. Tabs Navigation
        const tabBtns = panel.querySelectorAll('.insp-tab')
        tabBtns.forEach((tabBtn, idx) => {
          tabBtn.addEventListener('click', (ev) => {
            if (typeof ev.stopPropagation === 'function') ev.stopPropagation()
            const targetTab =
              tabBtn.getAttribute('data-tab') ||
              ['positioning', 'layers', 'contracts', 'scenario'][idx]
            setActiveTab(targetTab)
          })
        })

        // 6. Floating Mode Header Drag
        const header = doc.getElementById('inspHeader')
        if (header) {
          header.addEventListener('pointerdown', (ev) => {
            if (ev.button !== 0) return
            if (ev.target && ev.target.closest && ev.target.closest('button')) return
            if (_mode !== 'floating') return

            if (typeof ev.preventDefault === 'function') ev.preventDefault()
            const startX = ev.clientX || 0
            const startY = ev.clientY || 0
            const rect = panel.getBoundingClientRect()
            const origLeft = rect.left || 0
            const origTop = rect.top || 0

            if (typeof header.setPointerCapture === 'function' && ev.pointerId !== undefined) {
              try {
                header.setPointerCapture(ev.pointerId)
              } catch {}
            }

            const onMove = (moveEv) => {
              const dx = (moveEv.clientX || 0) - startX
              const dy = (moveEv.clientY || 0) - startY
              panel.style.left = `${Math.max(10, origLeft + dx)}px`
              panel.style.top = `${Math.max(10, origTop + dy)}px`
              panel.style.right = 'auto'
              panel.style.bottom = 'auto'
            }

            const onUp = (upEv) => {
              if (
                typeof header.releasePointerCapture === 'function' &&
                upEv &&
                upEv.pointerId !== undefined
              ) {
                try {
                  header.releasePointerCapture(upEv.pointerId)
                } catch {}
              }
              root.removeEventListener('pointermove', onMove)
              root.removeEventListener('pointerup', onUp)
              if (doc) {
                doc.removeEventListener('pointermove', onMove)
                doc.removeEventListener('pointerup', onUp)
              }
            }

            root.addEventListener('pointermove', onMove)
            root.addEventListener('pointerup', onUp)
            if (doc) {
              doc.addEventListener('pointermove', onMove)
              doc.addEventListener('pointerup', onUp)
            }
          })
        }

        // 7. Module Note Input & Save Button
        const moduleNote = doc.getElementById('inspModuleNote')
        if (moduleNote) {
          moduleNote.addEventListener('input', (ev) => {
            if (_activeNode) {
              _activeNode.moduleAnnotation = ev.target.value
              _activeNode.annotation = ev.target.value
              if (root.DDO_STORE && typeof root.DDO_STORE.markDirty === 'function') {
                try {
                  root.DDO_STORE.markDirty()
                } catch {}
              }
            }
          })
        }

        const saveNoteBtn = doc.getElementById('inspSaveNoteBtn')
        if (saveNoteBtn) {
          saveNoteBtn.addEventListener('click', () => {
            if (_activeNode && moduleNote) {
              _activeNode.moduleAnnotation = moduleNote.value
              _activeNode.annotation = moduleNote.value
              if (root.DDO_STORE && typeof root.DDO_STORE.markDirty === 'function') {
                try {
                  root.DDO_STORE.markDirty()
                } catch {}
              }
              if (root.DDO_APP && typeof root.DDO_APP.renderNodes === 'function') {
                root.DDO_APP.renderNodes()
                if (typeof root.DDO_APP.applyLineageHighlight === 'function') {
                  root.DDO_APP.applyLineageHighlight(_activeNode.id)
                }
              }
              showToast('模块批注已保存并同步至画布角标')
            }
          })
        }
      }
    }

    function init(customDoc) {
      const doc = customDoc || getDoc()
      if (doc) {
        ensureInspectorDomSkeleton(doc)
        const defaultNode = findNode('ui-checkin-flow') || getGlobalNodes()[0]
        if (defaultNode && !_activeNode) {
          _activeNode = defaultNode
          renderHeader(defaultNode)
          renderTab1(defaultNode)
          renderTab2(defaultNode)
          renderTab3(defaultNode)
          renderTab4(defaultNode)
        }
        setInspectorMode(_mode)
      }
    }

    // Auto-init if DOM is available
    const initialDoc = getDoc()
    if (initialDoc) {
      init(initialDoc)
    }

    return {
      setInspectorMode,
      getInspectorMode,
      handleSplitterDrag,
      openNode,
      closeInspector,
      isOpen,
      getActiveNode,
      getActiveNodeId,
      setActiveTab,
      getActiveTab,
      refresh,
      init,
    }
  },
)
