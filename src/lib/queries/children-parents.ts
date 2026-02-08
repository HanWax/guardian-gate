import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getParentsForChild,
  getChildrenForParent,
  assignParentToChild,
  unassignParentFromChild,
} from '../server/children-parents'
import { getAccessToken } from './utils'
import { childKeys } from './children'
import { parentKeys } from './parents'
import type { Database } from '../database.types'

type Parent = Database['public']['Tables']['parents']['Row']
type Child = Database['public']['Tables']['children']['Row']

export const childrenParentsKeys = {
  all: ['childrenParents'] as const,
  parentsForChild: (childId: string) =>
    [...childrenParentsKeys.all, 'parentsForChild', childId] as const,
  childrenForParent: (parentId: string) =>
    [...childrenParentsKeys.all, 'childrenForParent', parentId] as const,
}

export function useParentsForChild(childId: string) {
  return useQuery<Parent[]>({
    queryKey: childrenParentsKeys.parentsForChild(childId),
    queryFn: async () => {
      const accessToken = await getAccessToken()
      return getParentsForChild({ data: { accessToken, childId } }) as Promise<Parent[]>
    },
    enabled: !!childId,
  })
}

export function useChildrenForParent(parentId: string) {
  return useQuery<Child[]>({
    queryKey: childrenParentsKeys.childrenForParent(parentId),
    queryFn: async () => {
      const accessToken = await getAccessToken()
      return getChildrenForParent({ data: { accessToken, parentId } }) as Promise<Child[]>
    },
    enabled: !!parentId,
  })
}

export function useAssignParent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ childId, parentId }: { childId: string; parentId: string }) => {
      const accessToken = await getAccessToken()
      return assignParentToChild({
        data: { accessToken, assignment: { child_id: childId, parent_id: parentId } },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: childrenParentsKeys.all })
      queryClient.invalidateQueries({ queryKey: childKeys.all })
      queryClient.invalidateQueries({ queryKey: parentKeys.all })
    },
  })
}

export function useUnassignParent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ childId, parentId }: { childId: string; parentId: string }) => {
      const accessToken = await getAccessToken()
      return unassignParentFromChild({
        data: { accessToken, assignment: { child_id: childId, parent_id: parentId } },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: childrenParentsKeys.all })
      queryClient.invalidateQueries({ queryKey: childKeys.all })
      queryClient.invalidateQueries({ queryKey: parentKeys.all })
    },
  })
}
