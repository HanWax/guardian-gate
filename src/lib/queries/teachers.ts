import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTeachers,
  getTeacher,
  createTeacher,
  updateTeacher,
  deleteTeacher,
} from '../server/teachers';
import { supabase } from '../supabase';
import type { Teacher } from '../database.types';
import type { TeacherCreate, TeacherUpdate } from '../schemas/teacher';

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('לא מחובר/ת למערכת');
  }
  return session.access_token;
}

export const teacherKeys = {
  all: ['teachers'] as const,
  list: (filters?: { nursery_id?: string }) =>
    [...teacherKeys.all, 'list', filters] as const,
  detail: (id: string) => [...teacherKeys.all, 'detail', id] as const,
};

export function useTeachers(filters?: { nursery_id?: string }) {
  return useQuery<Teacher[]>({
    queryKey: teacherKeys.list(filters),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return getTeachers({ data: { accessToken, nursery_id: filters?.nursery_id } }) as Promise<Teacher[]>;
    },
  });
}

export function useTeacher(id: string) {
  return useQuery<Teacher>({
    queryKey: teacherKeys.detail(id),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return getTeacher({ data: { accessToken, id } }) as Promise<Teacher>;
    },
    enabled: !!id,
  });
}

export function useCreateTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (teacher: TeacherCreate) => {
      const accessToken = await getAccessToken();
      return createTeacher({ data: { accessToken, teacher } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.all });
    },
  });
}

export function useUpdateTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, teacher }: { id: string; teacher: TeacherUpdate }) => {
      const accessToken = await getAccessToken();
      return updateTeacher({ data: { accessToken, id, teacher } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.all });
    },
  });
}

export function useDeleteTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const accessToken = await getAccessToken();
      return deleteTeacher({ data: { accessToken, id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.all });
    },
  });
}
