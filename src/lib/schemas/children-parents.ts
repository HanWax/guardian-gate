import { z } from 'zod';

// Schema for creating/assigning a parent to a child
export const CreateChildrenParentsSchema = z.object({
  child_id: z.string().uuid(),
  parent_id: z.string().uuid(),
});

// Schema for deleting/unassigning a parent from a child
export const DeleteChildrenParentsSchema = z.object({
  child_id: z.string().uuid(),
  parent_id: z.string().uuid(),
});

export type CreateChildrenParents = z.infer<typeof CreateChildrenParentsSchema>;
export type DeleteChildrenParents = z.infer<typeof DeleteChildrenParentsSchema>;
