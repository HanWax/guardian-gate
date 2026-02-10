import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAttendanceByDate, ensureTodayRecords, getTeacherAttendanceToday, confirmAttendance } from '../server/attendance'
import { getAccessToken } from './utils'

export const attendanceKeys = {
  all: ['attendance'] as const,
  byDate: (date: string) => [...attendanceKeys.all, 'byDate', date] as const,
  teacherToday: [...['attendance'], 'teacherToday'] as const,
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

export function useTeacherAttendanceToday() {
  return useQuery({
    queryKey: attendanceKeys.teacherToday,
    queryFn: async () => {
      const accessToken = await getAccessToken()
      return getTeacherAttendanceToday({ data: { accessToken } })
    },
  })
}

export function useConfirmAttendance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ attendanceId, confirmed }: { attendanceId: string; confirmed: boolean }) => {
      const accessToken = await getAccessToken()
      return confirmAttendance({ data: { accessToken, attendanceId, confirmed } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all })
    },
  })
}
