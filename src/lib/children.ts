// Re-export schemas from canonical location for backward compatibility (tests)
export { childCreateSchema as createChildSchema, childUpdateSchema as updateChildSchema } from './schemas/child'
export type { ChildCreate as CreateChildInput, ChildUpdate as UpdateChildInput } from './schemas/child'

// Types

export interface Child {
  id: string
  nursery_id: string
  name: string
  created_at: string
}
