import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getParents,
  getParent,
  createParent,
  updateParent,
  deleteParent,
} from '../server/parents';
import { getAccessToken } from './utils';
import type { ParentCreate, ParentUpdate } from '../schemas/parent';
import type { Database } from '../database.types';

type Parent = Database['public']['Tables']['parents']['Row'];

export const parentKeys = {
  all: ['parents'] as const,
  list: () => [...parentKeys.all, 'list'] as const,
  detail: (id: string) => [...parentKeys.all, 'detail', id] as const,
};

export function useParents() {
  return useQuery<Parent[]>({
    queryKey: parentKeys.list(),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return getParents({ data: { accessToken } }) as Promise<Parent[]>;
    },
  });
}

export function useParent(id: string) {
  return useQuery<Parent>({
    queryKey: parentKeys.detail(id),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return getParent({ data: { accessToken, id } }) as Promise<Parent>;
    },
    enabled: !!id,
  });
}

export function useCreateParent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (parent: ParentCreate) => {
      const accessToken = await getAccessToken();
      return createParent({ data: { accessToken, parent } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parentKeys.all });
    },
  });
}

export function useUpdateParent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, parent }: { id: string; parent: ParentUpdate }) => {
      const accessToken = await getAccessToken();
      return updateParent({ data: { accessToken, id, parent } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parentKeys.all });
    },
  });
}

export function useDeleteParent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const accessToken = await getAccessToken();
      return deleteParent({ data: { accessToken, id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: parentKeys.all });
    },
  });
}
