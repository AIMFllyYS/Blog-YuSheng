export const KATEX_SECURITY_POLICY = Object.freeze({
  trust: false,
  strict: 'error',
  maxExpand: 1_000,
  maxNestingDepth: 64,
  maxSize: 20,
  maxSourceLength: 2_000,
  allowUserMacros: false,
  clientLoadTimeoutMs: 2_000,
} as const)
