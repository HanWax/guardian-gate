import { useQuery } from '@tanstack/react-query'
import { getMissingChildren } from '../server/attendance'
import { getAccessToken } from './utils'

export const attendanceKeys = {
  all: ['attendance'] as const,
  missing: (date: string) => [...attendanceKeys.all, 'missing', date] as const,
}

export function useMissingChildren(date: string) {
  return useQuery({
    queryKey: attendanceKeys.missing(date),
    queryFn: async () => {
      const accessToken = await getAccessToken()
      return getMissingChildren({ data: { accessToken, date } })
    },
  })
}
