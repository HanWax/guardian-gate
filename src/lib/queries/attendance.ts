import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAttendanceByDate, ensureTodayRecords } from '../server/attendance'
import { getAccessToken } from './utils'

export const attendanceKeys = {
  all: ['attendance'] as const,
  byDate: (date: string) => [...attendanceKeys.all, 'byDate', date] as const,
}

export function useAttendanceByDate(date: string) {
  return useQuery({
    queryKey: attendanceKeys.byDate(date),
    queryFn: async () => {
      const accessToken = await getAccessToken()
      return getAttendanceByDate({ data: { accessToken, date } })
    },
  })
}

export function useEnsureTodayRecords() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const accessToken = await getAccessToken()
      return ensureTodayRecords({ data: { accessToken } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all })
    },
  })
}
