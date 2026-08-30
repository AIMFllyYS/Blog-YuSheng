import { createDesignRenderer } from '../design/create-design-renderer'
import { ASIDE_NOTE_SCHEMA } from './schema'

export const ASIDE_NOTE_RENDERER_DEFINITION = createDesignRenderer({
  name: 'aside-note',
  schema: ASIDE_NOTE_SCHEMA,
})
