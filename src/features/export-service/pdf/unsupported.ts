import type { AssembleExportFailure } from '../export-document'

export function assembleUnsupportedPdf(): AssembleExportFailure {
  return Object.freeze({
    ok: false,
    reason: 'unsupported-format',
    message: 'PDF 导出随后续版本开放',
  })
}
