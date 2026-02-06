import { supabase } from './supabase'

export interface Child {
  id: string
  name: string
}

export async function getAssignedChildren(parentId: string): Promise<Child[]> {
  const { data, error } = await supabase
    .from('children_parents')
    .select('children(id, name)')
    .eq('parent_id', parentId)

  if (error) {
    throw new Error(`Failed to fetch assigned children: ${error.message}`)
  }

  // Transform the nested data structure to flat array
  return (data || [])
    .map((row) => {
      const child = row.children as { id: string; name: string } | null
      return child ? { id: child.id, name: child.name } : null
    })
    .filter((child): child is Child => child !== null)
}

export async function assignChildToParent(parentId: string, childId: string): Promise<void> {
  const { error } = await supabase.from('children_parents').insert({
    parent_id: parentId,
    child_id: childId,
  })

  if (error) {
    // Postgres unique constraint violation code is '23505'
    if (error.code === '23505') {
      throw new Error('Child is already assigned to this parent')
    }
    throw new Error(`Failed to assign child to parent: ${error.message}`)
  }
}

export async function removeChildFromParent(parentId: string, childId: string): Promise<void> {
  const { error } = await supabase
    .from('children_parents')
    .delete()
    .eq('parent_id', parentId)
    .eq('child_id', childId)

  if (error) {
    throw new Error(`Failed to remove child from parent: ${error.message}`)
  }
}
