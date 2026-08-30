import { createDesignRenderer } from '../design/create-design-renderer'
import { TEXT_MARK_SCHEMA } from './schema'

export const TEXT_MARK_RENDERER_DEFINITION = createDesignRenderer({
  name: 'text-mark',
  schema: TEXT_MARK_SCHEMA,
  selectable: 'text-range',
})
