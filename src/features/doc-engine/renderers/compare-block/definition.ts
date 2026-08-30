import { createDesignRenderer } from '../design/create-design-renderer'
import { COMPARE_BLOCK_SCHEMA, COMPARE_SIDE_SCHEMA } from './schema'

export const COMPARE_BLOCK_RENDERER_DEFINITION = createDesignRenderer({
  name: 'compare-block',
  schema: COMPARE_BLOCK_SCHEMA,
})

export const COMPARE_SIDE_RENDERER_DEFINITION = createDesignRenderer({
  name: 'compare-side',
  schema: COMPARE_SIDE_SCHEMA,
})
