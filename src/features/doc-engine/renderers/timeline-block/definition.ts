import { createDesignRenderer } from '../design/create-design-renderer'
import { TIMELINE_BLOCK_SCHEMA } from './schema'

export const TIMELINE_BLOCK_RENDERER_DEFINITION = createDesignRenderer({
  name: 'timeline-block',
  schema: TIMELINE_BLOCK_SCHEMA,
})
