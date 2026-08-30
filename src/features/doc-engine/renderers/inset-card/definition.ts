import { createDesignRenderer } from '../design/create-design-renderer'
import { INSET_CARD_SCHEMA } from './schema'

export const INSET_CARD_RENDERER_DEFINITION = createDesignRenderer({
  name: 'inset-card',
  schema: INSET_CARD_SCHEMA,
})
