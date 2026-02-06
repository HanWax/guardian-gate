import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getManagers,
  getManager,
  createManager,
  updateManager,
  deleteManager,
} from '../server/managers';
import { getAccessToken } from './utils';
import type { ManagerCreate, ManagerUpdate } from '../schemas/manager';

export const managerKeys = {
  all: ['managers'] as const,
  list: () => [...managerKeys.all, 'list'] as const,
  detail: (id: string) => [...managerKeys.all, 'detail', id] as const,
};

export function useManagers() {
  return useQuery({
    queryKey: managerKeys.list(),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return getManagers({ data: { accessToken } });
    },
  });
}

export function useManager(id: string) {
  return useQuery({
    queryKey: managerKeys.detail(id),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return getManager({ data: { accessToken, id } });
    },
    enabled: !!id,
  });
}

export function useCreateManager() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (manager: ManagerCreate) => {
      const accessToken = await getAccessToken();
      return createManager({ data: { accessToken, manager } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: managerKeys.all });
    },
  });
}

export function useUpdateManager() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, manager }: { id: string; manager: ManagerUpdate }) => {
      const accessToken = await getAccessToken();
      return updateManager({ data: { accessToken, id, manager } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: managerKeys.all });
    },
  });
}

export function useDeleteManager() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const accessToken = await getAccessToken();
      return deleteManager({ data: { accessToken, id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: managerKeys.all });
    },
  });
}
