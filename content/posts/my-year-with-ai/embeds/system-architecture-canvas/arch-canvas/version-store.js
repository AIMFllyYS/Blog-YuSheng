/**
 * DayDayOn Architecture Canvas — Version Store Engine (window.DDO_STORE)
 *
 * Milestone 5: Version Control, JSON Import/Export & Zero-Build Integration
 *
 * Responsibilities:
 * 1. Unified JSON Schema v5 Serialization & Deserialization:
 *    - Captures all 5 zones (with isPinned synced from DDO_ZONE_MGR).
 *    - Captures all 71 nodes (with x, y, moduleAnnotation, and layers[i].annotation).
 *    - Captures 64 edges and activeScenarioId.
 *    - Full version history array.
 * 2. Git-like Version Snapshot Management:
 *    - saveNewVersion(name, isAutoArchive): saves immutable commit snapshot.
 *    - loadVersion(versionId): restores complete canvas state.
 *    - resetWithAutoArchive(): auto-archives dirty working state before reverting to v0 baseline.
 *    - If already clean, does not create redundant auto-archive commits (B6-T5).
 * 3. JSON Import/Export & One-Click Copy:
 *    - buildExportJson(): clean JSON string without temporary scenario highlight artifacts (C5).
 *    - exportJsonFile(): native browser download.
 *    - importJsonContent(jsonStr): validates schema, migrates legacy v3/v4 annotations (B6-T4), restores pinned zones (C6).
 *    - copyJsonToClipboard(): native clipboard copy with fallback and toast.
 * 4. Resilient LocalStorage Persistence:
 *    - Safely catches quota overflow without throwing (B7-T5).
 * 5. Universal Module Definition (UMD/IIFE):
 *    - Exposes window.DDO_STORE in browser and module.exports in Node.js.
 */

;(function (root, factory) {
  'use strict'
  const instance = factory(root)
  if (typeof module === 'object' && module.exports) {
    module.exports = instance
  }
  if (root) {
    root.DDO_STORE = instance
  }
})(
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this,
  function (root) {
    'use strict'

    const STORAGE_KEY = 'ddo:arch-canvas:versions:v7'

    let _versions = []
    let _activeVersionId = 'v0'
    let _isDirty = false

    let _canonicalZones = null
    let _canonicalNodes = null
    let _canonicalEdges = null

    function syncLiveWorkingArrays(zones, nodes, edges) {
      if (root.DDO_DATA) {
        if (Array.isArray(zones) && Array.isArray(root.DDO_DATA.INITIAL_ZONES)) {
          root.DDO_DATA.INITIAL_ZONES.splice(0, root.DDO_DATA.INITIAL_ZONES.length, ...clone(zones))
        }
        if (Array.isArray(nodes) && Array.isArray(root.DDO_DATA.INITIAL_NODES)) {
          root.DDO_DATA.INITIAL_NODES.splice(0, root.DDO_DATA.INITIAL_NODES.length, ...clone(nodes))
        }
        if (Array.isArray(edges) && Array.isArray(root.DDO_DATA.INITIAL_EDGES)) {
          root.DDO_DATA.INITIAL_EDGES.splice(0, root.DDO_DATA.INITIAL_EDGES.length, ...clone(edges))
        }
      }
    }

    function clone(obj) {
      if (obj == null) return obj
      try {
        return JSON.parse(JSON.stringify(obj))
      } catch {
        return obj
      }
    }

    function getDoc() {
      return root.document || (typeof document !== 'undefined' ? document : null)
    }

    function getStorage() {
      return root.localStorage || (typeof localStorage !== 'undefined' ? localStorage : null)
    }

    function formatTime(ts) {
      const d = new Date(ts)
      const pad = (n) => String(n).padStart(2, '0')
      return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
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

    function getInitialZones() {
      if (_canonicalZones && _canonicalZones.length > 0) {
        return clone(_canonicalZones)
      }
      if (root.DDO_DATA && Array.isArray(root.DDO_DATA.INITIAL_ZONES)) {
        return clone(root.DDO_DATA.INITIAL_ZONES)
      }
      if (Array.isArray(root.DDO_INITIAL_ZONES)) {
        return clone(root.DDO_INITIAL_ZONES)
      }
      if (Array.isArray(root.DDO_ZONES)) {
        return clone(root.DDO_ZONES)
      }
      return []
    }

    function getInitialNodes() {
      if (_canonicalNodes && _canonicalNodes.length > 0) {
        return clone(_canonicalNodes)
      }
      if (root.DDO_DATA && Array.isArray(root.DDO_DATA.INITIAL_NODES)) {
        return clone(root.DDO_DATA.INITIAL_NODES)
      }
      if (Array.isArray(root.DDO_INITIAL_NODES)) {
        return clone(root.DDO_INITIAL_NODES)
      }
      if (Array.isArray(root.DDO_NODES)) {
        return clone(root.DDO_NODES)
      }
      return []
    }

    function getInitialEdges() {
      if (_canonicalEdges && _canonicalEdges.length > 0) {
        return clone(_canonicalEdges)
      }
      if (root.DDO_DATA && Array.isArray(root.DDO_DATA.INITIAL_EDGES)) {
        return clone(root.DDO_DATA.INITIAL_EDGES)
      }
      if (Array.isArray(root.DDO_INITIAL_EDGES)) {
        return clone(root.DDO_INITIAL_EDGES)
      }
      if (Array.isArray(root.DDO_EDGES)) {
        return clone(root.DDO_EDGES)
      }
      return []
    }

    function ensureCanonicalBaselines() {
      if (!_canonicalZones) {
        const z = getInitialZones()
        if (z.length > 0) _canonicalZones = clone(z)
      }
      if (!_canonicalNodes) {
        const n = getInitialNodes()
        if (n.length > 0) _canonicalNodes = clone(n)
      }
      if (!_canonicalEdges) {
        const e = getInitialEdges()
        if (e.length > 0) _canonicalEdges = clone(e)
      }
    }

    function createV0Baseline() {
      ensureCanonicalBaselines()
      const initialZones = getInitialZones()
      const initialNodes = getInitialNodes()
      const initialEdges = getInitialEdges()

      return {
        id: 'v0',
        name: 'v0 · 项目真实基线 (初始状态)',
        createdAt: 1730894400000,
        isAutoArchive: false,
        zones: clone(initialZones),
        nodes: clone(initialNodes),
        edges: clone(initialEdges),
      }
    }

    function getWorkingZones() {
      const sourceZones =
        root.DDO_DATA &&
        Array.isArray(root.DDO_DATA.INITIAL_ZONES) &&
        root.DDO_DATA.INITIAL_ZONES.length > 0
          ? root.DDO_DATA.INITIAL_ZONES
          : getInitialZones()

      return sourceZones.map((z) => {
        const cloned = clone(z)
        if (root.DDO_ZONE_MGR && typeof root.DDO_ZONE_MGR.isZonePinned === 'function') {
          cloned.isPinned = root.DDO_ZONE_MGR.isZonePinned(z.id)
        } else {
          cloned.isPinned = !!z.isPinned
        }
        return cloned
      })
    }

    function getWorkingNodes() {
      const sourceNodes =
        root.DDO_DATA &&
        Array.isArray(root.DDO_DATA.INITIAL_NODES) &&
        root.DDO_DATA.INITIAL_NODES.length > 0
          ? root.DDO_DATA.INITIAL_NODES
          : getInitialNodes()

      return sourceNodes.map((n) => {
        const cloned = clone(n)
        if (cloned.moduleAnnotation === undefined) {
          cloned.moduleAnnotation = cloned.annotation !== undefined ? cloned.annotation : ''
        }
        if (Array.isArray(cloned.layers)) {
          cloned.layers.forEach((layer) => {
            if (layer && layer.annotation === undefined) {
              layer.annotation = ''
            }
          })
        }
        delete cloned._tempHighlight
        delete cloned._scenarioActive
        delete cloned._activeBadge
        delete cloned._tempOpacity
        return cloned
      })
    }

    function getWorkingEdges() {
      const sourceEdges =
        root.DDO_DATA &&
        Array.isArray(root.DDO_DATA.INITIAL_EDGES) &&
        root.DDO_DATA.INITIAL_EDGES.length > 0
          ? root.DDO_DATA.INITIAL_EDGES
          : getInitialEdges()
      return sourceEdges.map((e) => clone(e))
    }

    function getActiveScenarioId() {
      if (root.DDO_SCENARIO && typeof root.DDO_SCENARIO.getCurrentScenario === 'function') {
        const cur = root.DDO_SCENARIO.getCurrentScenario()
        if (cur && cur.id) return cur.id
      }
      const doc = getDoc()
      if (doc) {
        const sel = doc.getElementById('scenarioSelect')
        if (sel && sel.value) return sel.value
      }
      return null
    }

    function renderVersionSelect() {
      const doc = getDoc()
      if (!doc) return
      const sel = doc.getElementById('versionSelect')
      if (!sel) return
      sel.innerHTML = ''
      _versions.forEach((v) => {
        const opt = doc.createElement('option')
        opt.value = v.id
        opt.textContent = v.name
        if (v.id === _activeVersionId) {
          opt.selected = true
        }
        sel.appendChild(opt)
      })
    }

    function persistToLocalStorage() {
      const storage = getStorage()
      if (!storage) return
      try {
        const payload = {
          schema: 'daydayon-arch-canvas/v5',
          activeVersionId: _activeVersionId,
          versions: _versions.filter((v) => v && v.id !== 'v0'),
        }
        storage.setItem(STORAGE_KEY, JSON.stringify(payload))
      } catch (err) {
        // Storage quota overflow or private mode — catch without throwing (test B7-T5)
        console.warn('LocalStorage persist failed (quota exceeded or disabled):', err)
      }
    }

    function loadVersionsFromLocalStorage() {
      ensureCanonicalBaselines()
      const v0 = createV0Baseline()
      _versions = [v0]
      const storage = getStorage()
      if (!storage) return
      try {
        const raw = storage.getItem(STORAGE_KEY)
        if (!raw) return
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed.versions)) {
          const customVers = parsed.versions.filter((v) => v && v.id !== 'v0')
          _versions = [v0, ...customVers]
        }
        if (parsed.activeVersionId && _versions.some((v) => v.id === parsed.activeVersionId)) {
          _activeVersionId = parsed.activeVersionId
          if (_activeVersionId !== 'v0') {
            const activeVer = _versions.find((v) => v.id === _activeVersionId)
            if (activeVer) {
              syncLiveWorkingArrays(
                activeVer.zones || getInitialZones(),
                activeVer.nodes || getInitialNodes(),
                activeVer.edges || getInitialEdges(),
              )
            }
          }
        }
      } catch {
        _versions = [v0]
        _activeVersionId = 'v0'
      }
    }

    // =========================================================================
    // Public Store APIs
    // =========================================================================

    function getSnapshotPayload() {
      ensureCanonicalBaselines()
      return {
        schema: 'daydayon-arch-canvas/v5',
        exportedAt: new Date().toISOString(),
        activeVersionId: _activeVersionId || 'v0',
        activeScenarioId: getActiveScenarioId(),
        zones: getWorkingZones(),
        nodes: getWorkingNodes(),
        edges: getWorkingEdges(),
        versions: _versions.map((v) => clone(v)),
      }
    }

    function saveNewVersion(name, isAutoArchive = false) {
      ensureCanonicalBaselines()
      const idx = _versions.length
      const vId =
        (isAutoArchive ? 'v_auto_' : 'v_') +
        Date.now().toString(36) +
        '_' +
        Math.random().toString(36).slice(2, 6)
      const defaultLabel = isAutoArchive
        ? `v${idx} · 重置前自动归档 (${formatTime(Date.now())})`
        : `v${idx} · 手动快照 (${formatTime(Date.now())})`

      const label = name && String(name).trim() ? String(name).trim() : defaultLabel

      const snap = {
        id: vId,
        name: label,
        createdAt: Date.now(),
        isAutoArchive: !!isAutoArchive,
        zones: clone(getWorkingZones()),
        nodes: clone(getWorkingNodes()),
        edges: clone(getWorkingEdges()),
      }

      _versions.push(snap)
      if (!isAutoArchive) {
        _activeVersionId = vId
      }
      _isDirty = false
      persistToLocalStorage()
      renderVersionSelect()

      if (!isAutoArchive) {
        showToast(`已保存版本：${label}`)
      }
      return vId
    }

    function loadVersion(versionId) {
      ensureCanonicalBaselines()
      if (!versionId) return null

      let targetVer = _versions.find((v) => v.id === versionId)
      if (!targetVer && versionId === 'v0') {
        targetVer = createV0Baseline()
      }
      if (!targetVer) {
        showToast('未找到指定版本')
        return null
      }

      const nextZones = clone(targetVer.zones || getInitialZones())
      const nextNodes = clone(targetVer.nodes || getInitialNodes())
      const nextEdges = clone(targetVer.edges || getInitialEdges())
      syncLiveWorkingArrays(nextZones, nextNodes, nextEdges)

      // Restore zone pins
      if (root.DDO_ZONE_MGR && typeof root.DDO_ZONE_MGR.setZonePin === 'function') {
        nextZones.forEach((z) => {
          root.DDO_ZONE_MGR.setZonePin(z.id, !!z.isPinned)
        })
      }

      if (root.DDO_APP && typeof root.DDO_APP.renderAll === 'function') {
        root.DDO_APP.renderAll()
      }

      if (root.DDO_INSPECTOR && typeof root.DDO_INSPECTOR.refresh === 'function') {
        root.DDO_INSPECTOR.refresh()
      }

      _activeVersionId = versionId
      _isDirty = false
      persistToLocalStorage()
      renderVersionSelect()
      showToast(`已切换至版本：${targetVer.name}`)
      return targetVer
    }

    function resetWithAutoArchive() {
      ensureCanonicalBaselines()

      // Only create auto-archive if state is dirty (B6-T5)
      if (isDirty()) {
        saveNewVersion('自动归档 · 重置前快照', true)
      }

      const initialZones = getInitialZones()
      const initialNodes = getInitialNodes()
      const initialEdges = getInitialEdges()

      syncLiveWorkingArrays(initialZones, initialNodes, initialEdges)

      if (root.DDO_ZONE_MGR && typeof root.DDO_ZONE_MGR.setZonePin === 'function') {
        initialZones.forEach((z) => {
          root.DDO_ZONE_MGR.setZonePin(z.id, !!z.isPinned)
        })
      }

      if (root.DDO_APP && typeof root.DDO_APP.renderAll === 'function') {
        root.DDO_APP.renderAll()
      }

      if (root.DDO_INSPECTOR && typeof root.DDO_INSPECTOR.refresh === 'function') {
        root.DDO_INSPECTOR.refresh()
      }

      if (root.DDO_SCENARIO && typeof root.DDO_SCENARIO.reset === 'function') {
        root.DDO_SCENARIO.reset()
      }

      if (root.DDO_CORE && typeof root.DDO_CORE.fitView === 'function') {
        root.DDO_CORE.fitView(true)
      }

      _activeVersionId = 'v0'
      _isDirty = false
      persistToLocalStorage()
      renderVersionSelect()
      showToast('已恢复初始基线 (v0)')
    }

    function markDirty() {
      _isDirty = true
    }

    function isDirty() {
      return !!_isDirty
    }

    function buildExportJson() {
      return JSON.stringify(getSnapshotPayload(), null, 2)
    }

    function exportJsonFile() {
      const jsonStr = buildExportJson()
      const doc = getDoc()
      if (
        doc &&
        typeof root.Blob === 'function' &&
        root.URL &&
        typeof root.URL.createObjectURL === 'function'
      ) {
        try {
          const blob = new root.Blob([jsonStr], { type: 'application/json' })
          const url = root.URL.createObjectURL(blob)
          const a = doc.createElement('a')
          a.href = url
          a.download = `daydayon-architecture-v5-${_activeVersionId || 'v0'}-${Date.now().toString(36)}.json`
          if (doc.body) doc.body.appendChild(a)
          a.click()
          if (a.parentNode) a.parentNode.removeChild(a)
          root.URL.revokeObjectURL(url)
          showToast('已导出画布快照 JSON 文件 (v5)')
        } catch (err) {
          console.warn('exportJsonFile download error:', err)
        }
      }
      return jsonStr
    }

    function importJsonContent(jsonStr) {
      if (!jsonStr || typeof jsonStr !== 'string' || !jsonStr.trim()) {
        throw new Error('导入失败：JSON 内容为空')
      }

      let parsed
      try {
        parsed = JSON.parse(jsonStr)
      } catch (err) {
        throw new Error('导入失败：JSON 解析错误 - ' + err.message)
      }

      if (
        !parsed ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed) ||
        Object.keys(parsed).length === 0
      ) {
        throw new Error('导入失败：无效的 JSON 架构对象')
      }

      if (!Array.isArray(parsed.zones) || !Array.isArray(parsed.nodes)) {
        throw new Error('导入失败：架构快照必须包含 zones 和 nodes 数组')
      }

      // Backward compatibility migration: migrate legacy v3/v4 node.annotation -> moduleAnnotation (B6-T4)
      parsed.nodes.forEach((node) => {
        if (node.annotation !== undefined && !node.moduleAnnotation) {
          node.moduleAnnotation = node.annotation
        }
        if (Array.isArray(node.layers)) {
          node.layers.forEach((layer) => {
            if (layer && layer.annotation === undefined) {
              layer.annotation = ''
            }
          })
        }
      })

      const nextZones = clone(parsed.zones)
      const nextNodes = clone(parsed.nodes)
      const nextEdges = Array.isArray(parsed.edges) ? clone(parsed.edges) : clone(getInitialEdges())
      syncLiveWorkingArrays(nextZones, nextNodes, nextEdges)

      // Restore zone pins (C6)
      if (root.DDO_ZONE_MGR && typeof root.DDO_ZONE_MGR.setZonePin === 'function') {
        parsed.zones.forEach((z) => {
          root.DDO_ZONE_MGR.setZonePin(z.id, !!z.isPinned)
        })
      }

      if (Array.isArray(parsed.versions)) {
        const v0 = _versions.find((v) => v.id === 'v0') || createV0Baseline()
        const customVers = parsed.versions.filter((v) => v && v.id !== 'v0')
        _versions = [v0, ...customVers]
      }

      _activeVersionId = parsed.activeVersionId || 'v_imported_' + Date.now().toString(36)
      _isDirty = false

      if (root.DDO_APP && typeof root.DDO_APP.renderAll === 'function') {
        root.DDO_APP.renderAll()
      }

      if (root.DDO_INSPECTOR && typeof root.DDO_INSPECTOR.refresh === 'function') {
        root.DDO_INSPECTOR.refresh()
      }

      persistToLocalStorage()
      renderVersionSelect()
      showToast('已成功导入架构画布快照')
      return parsed
    }

    function importJsonFile(fileOrContent) {
      if (typeof fileOrContent === 'string') {
        return importJsonContent(fileOrContent)
      }
      if (
        fileOrContent &&
        typeof fileOrContent === 'object' &&
        typeof root.FileReader === 'function'
      ) {
        return new Promise((resolve, reject) => {
          try {
            const reader = new root.FileReader()
            reader.onload = () => {
              try {
                const res = importJsonContent(String(reader.result))
                resolve(res)
              } catch (err) {
                reject(err)
              }
            }
            reader.onerror = () => reject(reader.error || new Error('读取文件失败'))
            reader.readAsText(fileOrContent)
          } catch (err) {
            reject(err)
          }
        })
      }
      throw new Error('不支持的导入来源：必须为 JSON 字符串或 File/Blob 对象')
    }

    async function copyJsonToClipboard() {
      const jsonStr = buildExportJson()
      const nav = root.navigator || (typeof navigator !== 'undefined' ? navigator : null)
      if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
        try {
          await nav.clipboard.writeText(jsonStr)
          showToast('已复制架构快照 JSON（含批注与连线），可直接粘贴发给 AI')
          return true
        } catch {
          // Fallback to execCommand below
        }
      }
      const doc = getDoc()
      if (doc && typeof doc.createElement === 'function' && doc.body) {
        try {
          const ta = doc.createElement('textarea')
          ta.value = jsonStr
          ta.style.position = 'fixed'
          ta.style.left = '-9999px'
          doc.body.appendChild(ta)
          ta.select()
          if (typeof doc.execCommand === 'function') {
            doc.execCommand('copy')
          }
          if (ta.parentNode) ta.parentNode.removeChild(ta)
          showToast('已复制架构快照 JSON 到剪贴板')
          return true
        } catch {
          showToast('复制失败，请使用菜单中的「导出 JSON 文件」')
          return false
        }
      }
      return false
    }

    function getVersionList() {
      return _versions.map((v) => clone(v))
    }

    function init() {
      loadVersionsFromLocalStorage()
      renderVersionSelect()
    }

    // Initialize
    init()

    const DDO_STORE = {
      getSnapshotPayload,
      saveNewVersion,
      loadVersion,
      resetWithAutoArchive,
      markDirty,
      isDirty,
      buildExportJson,
      exportJsonFile,
      importJsonContent,
      importJsonFile,
      copyJsonToClipboard,
      getVersionList,
      persistToLocalStorage,
      loadVersionsFromLocalStorage,
      renderVersionSelect,
      init,
    }

    root.DDO_STORE = DDO_STORE
    return DDO_STORE
  },
)
