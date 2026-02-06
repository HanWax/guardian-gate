import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getChildren,
  getChild,
  createChild,
  updateChild,
  deleteChild,
} from '../server/children';
import { getAccessToken } from './utils';
import type { ChildCreate, ChildUpdate } from '../schemas/child';
import type { Database } from '../database.types';

type Child = Database['public']['Tables']['children']['Row'];

export const childKeys = {
  all: ['children'] as const,
  list: () => [...childKeys.all, 'list'] as const,
  detail: (id: string) => [...childKeys.all, 'detail', id] as const,
};

export function useChildren() {
  return useQuery<Child[]>({
    queryKey: childKeys.list(),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return getChildren({ data: { accessToken } }) as Promise<Child[]>;
    },
  });
}

export function useChild(id: string) {
  return useQuery<Child>({
    queryKey: childKeys.detail(id),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return getChild({ data: { accessToken, id } }) as Promise<Child>;
    },
    enabled: !!id,
  });
}

export function useCreateChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (child: ChildCreate) => {
      const accessToken = await getAccessToken();
      return createChild({ data: { accessToken, child } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: childKeys.all });
    },
  });
}

export function useUpdateChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, child }: { id: string; child: ChildUpdate }) => {
      const accessToken = await getAccessToken();
      return updateChild({ data: { accessToken, id, child } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: childKeys.all });
    },
  });
}

export function useDeleteChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const accessToken = await getAccessToken();
      return deleteChild({ data: { accessToken, id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: childKeys.all });
    },
  });
}
