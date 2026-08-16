(() => {
  'use strict'

  const MESSAGE_RENDER = 'blog-yusheng:mermaid-render'
  const MESSAGE_READY = 'blog-yusheng:mermaid-ready'
  const MESSAGE_RESULT = 'blog-yusheng:mermaid-result'
  const MAX_SOURCE_LENGTH = 5_000
  const MAX_OUTPUT_BYTES = 500_000
  const MAX_OUTPUT_NODES = 2_000
  const THEME_KEYS = ['background', 'primaryColor', 'primaryTextColor', 'primaryBorderColor', 'lineColor', 'secondaryColor', 'tertiaryColor']
  const PRESENTATION = [
    ['fill', 'fill'],
    ['fill-opacity', 'fillOpacity'],
    ['stroke', 'stroke'],
    ['stroke-width', 'strokeWidth'],
    ['stroke-opacity', 'strokeOpacity'],
    ['stroke-linecap', 'strokeLinecap'],
    ['stroke-linejoin', 'strokeLinejoin'],
    ['stroke-dasharray', 'strokeDasharray'],
    ['opacity', 'opacity'],
    ['font-family', 'fontFamily'],
    ['font-size', 'fontSize'],
    ['font-style', 'fontStyle'],
    ['font-weight', 'fontWeight'],
    ['letter-spacing', 'letterSpacing'],
    ['text-decoration', 'textDecoration'],
    ['text-anchor', 'textAnchor'],
  ]

  let accepted = false

  window.addEventListener('message', async (event) => {
    if (accepted || event.source !== window.parent || !isRequest(event.data)) return
    accepted = true
    const { nonce, source, theme } = event.data
    try {
      if (!window.mermaid || typeof window.mermaid.render !== 'function') {
        throw new Error('runtime unavailable')
      }
      window.mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        suppressErrorRendering: true,
        htmlLabels: false,
        maxTextSize: MAX_SOURCE_LENGTH,
        theme: 'base',
        themeVariables: theme,
        flowchart: { htmlLabels: false },
      })
      const id = `mermaid-${nonce.replace(/[^A-Za-z0-9_-]/g, '')}`
      const result = await window.mermaid.render(id, source)
      const svg = bakePresentationAttributes(result.svg)
      if (new TextEncoder().encode(svg).byteLength > MAX_OUTPUT_BYTES) {
        throw new Error('output too large')
      }
      const nodeCount = (svg.match(/<[A-Za-z][^>]*>/g) || []).length
      if (nodeCount > MAX_OUTPUT_NODES) throw new Error('too many output nodes')
      window.parent.postMessage({ type: MESSAGE_RESULT, nonce, ok: true, svg }, '*')
    } catch {
      window.parent.postMessage({
        type: MESSAGE_RESULT,
        nonce,
        ok: false,
        error: 'Mermaid 源码无法安全渲染。',
      }, '*')
    }
  })

  window.parent.postMessage({ type: MESSAGE_READY }, '*')

  function isRequest(value) {
    if (!value || typeof value !== 'object') return false
    if (Object.keys(value).sort().join(',') !== 'nonce,source,theme,type') return false
    if (value.type !== MESSAGE_RENDER) return false
    if (typeof value.nonce !== 'string' || !/^[A-Za-z0-9-]{16,80}$/.test(value.nonce)) return false
    if (typeof value.source !== 'string' || value.source.length > MAX_SOURCE_LENGTH) return false
    return isTheme(value.theme)
  }

  function isTheme(value) {
    if (!value || typeof value !== 'object') return false
    if (Object.keys(value).sort().join(',') !== [...THEME_KEYS].sort().join(',')) return false
    return THEME_KEYS.every((key) => {
      const color = value[key]
      return typeof color === 'string' && color.length <= 80 &&
        !/[\u0000-\u001f\u007f]|url\s*\(|@import|expression/i.test(color) &&
        CSS.supports('color', color)
    })
  }

  function bakePresentationAttributes(svgSource) {
    const host = document.createElement('div')
    host.innerHTML = svgSource
    document.body.append(host)
    const root = host.querySelector(':scope > svg')
    if (!root) {
      host.remove()
      throw new Error('missing svg')
    }
    const baked = []
    for (const element of root.querySelectorAll('*')) {
      const computed = getComputedStyle(element)
      const attributes = []
      for (const [attribute, property] of PRESENTATION) {
        const value = computed[property]
        if (value && value !== 'none' && value !== 'normal') {
          attributes.push([attribute, value])
        }
      }
      baked.push([element, attributes])
    }
    for (const [element, attributes] of baked) {
      for (const [attribute, value] of attributes) {
        element.setAttribute(attribute, value)
      }
      element.removeAttribute('class')
      element.removeAttribute('style')
      element.removeAttribute('filter')
      for (const attribute of [...element.attributes]) {
        if (/^(?:on|aria-)|^(?:role|tabindex)$/i.test(attribute.name)) {
          element.removeAttribute(attribute.name)
        }
      }
    }
    root.querySelectorAll('style,script,foreignObject,a,image,iframe,object,embed,filter').forEach((node) => node.remove())
    root.removeAttribute('class')
    root.removeAttribute('style')
    for (const attribute of [...root.attributes]) {
      if (/^(?:on|aria-)|^(?:role|tabindex)$/i.test(attribute.name)) {
        root.removeAttribute(attribute.name)
      }
    }
    const serialized = new XMLSerializer().serializeToString(root)
    host.remove()
    return serialized
  }
})()
