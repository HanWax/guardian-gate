import { useQuery } from '@tanstack/react-query'
import { getFamilies } from '../server/families'
import { getAccessToken } from './utils'

type FamilyChild = {
  id: string
  name: string
  teacher_names: string[]
}

export type Family = {
  id: string
  name: string
  phone: string
  children: FamilyChild[]
}

export const familyKeys = {
  all: ['families'] as const,
  list: (filters?: { teacherId?: string }) =>
    [...familyKeys.all, 'list', filters] as const,
}

export function useFamilies(filters?: { teacherId?: string }) {
  return useQuery<Family[]>({
    queryKey: familyKeys.list(filters),
    queryFn: async () => {
      const accessToken = await getAccessToken()
      return getFamilies({ data: { accessToken, teacherId: filters?.teacherId } }) as Promise<Family[]>
    },
  })
}
