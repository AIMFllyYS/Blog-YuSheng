import type { AssembleExportFailure } from '../export-document'

export function assembleUnsupportedDocx(): AssembleExportFailure {
  return Object.freeze({
    ok: false,
    reason: 'unsupported-format',
    message: 'DOCX 导出随后续版本开放',
  })
}
