import { useQuery } from '@tanstack/react-query';
import { getNurseries } from '../server/nurseries';
import { getAccessToken } from './utils';

export const nurseryKeys = {
  all: ['nurseries'] as const,
  list: () => [...nurseryKeys.all, 'list'] as const,
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
