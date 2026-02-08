import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNurseries, getNurserySettings, updateNurserySettings } from '../server/nurseries';
import { getAccessToken } from './utils';
import type { updateNurserySettingsSchema } from '../schemas/nursery';
import type { z } from 'zod';

export const nurseryKeys = {
  all: ['nurseries'] as const,
  list: () => [...nurseryKeys.all, 'list'] as const,
  detail: (id: string) => [...nurseryKeys.all, 'detail', id] as const,
};

export function useNurseries() {
  return useQuery({
    queryKey: nurseryKeys.list(),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return getNurseries({ data: { accessToken } });
    },
  });
}

export function useNurserySettings(nurseryId: string) {
  return useQuery({
    queryKey: nurseryKeys.detail(nurseryId),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return getNurserySettings({ data: { accessToken, nurseryId } });
    },
    enabled: !!nurseryId,
  });
}

export function useUpdateNurserySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ nurseryId, settings }: { nurseryId: string; settings: z.infer<typeof updateNurserySettingsSchema> }) => {
      const accessToken = await getAccessToken();
      return updateNurserySettings({ data: { accessToken, nurseryId, settings } });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: nurseryKeys.detail(variables.nurseryId) });
    },
  });
}
