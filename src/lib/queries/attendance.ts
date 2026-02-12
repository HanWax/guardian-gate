import { useQuery } from '@tanstack/react-query'
import { getAttendanceByDate, getTeacherAttendanceToday } from '../server/attendance'
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

export function useTeacherAttendanceToday() {
  return useQuery({
    queryKey: attendanceKeys.teacherToday,
    queryFn: async () => {
      const accessToken = await getAccessToken()
      return getTeacherAttendanceToday({ data: { accessToken } })
    },
  })
}
