import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { teacherCreateSchema, teacherUpdateSchema } from '../schemas/teacher';
import type { Database } from '../database.types';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createServiceClient() {
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

/** Hebrew error messages for teacher operations */
const errorMessages = {
  unauthorized: 'אין לך הרשאה לבצע פעולה זו',
  not_found: 'מורה לא נמצא/ה',
  create_failed: 'שגיאה ביצירת מורה. אנא נסה שוב',
  update_failed: 'שגיאה בעדכון מורה. אנא נסה שוב',
  delete_failed: 'שגיאה במחיקת מורה. אנא נסה שוב',
  fetch_failed: 'שגיאה בטעינת נתונים. אנא נסה שוב',
} as const;

/**
 * Verifies the user's access token and checks they have admin or manager role.
 * Throws if unauthorized.
 */
async function requireManagerRole(accessToken: string) {
  const supabase = createServiceClient();
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    throw new Error(errorMessages.unauthorized);
  }

  const role = user.user_metadata?.role;
  if (role !== 'admin' && role !== 'manager') {
    throw new Error(errorMessages.unauthorized);
  }

  return user;
}

const accessTokenSchema = z.object({
  accessToken: z.string().min(1),
});

export const getTeachers = createServerFn({ method: 'GET' })
  .inputValidator(
    accessTokenSchema.extend({
      nursery_id: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireManagerRole(data.accessToken);

    const supabase = createServiceClient();
    let query = supabase
      .from('teachers')
      .select('*')
      .order('name', { ascending: true });

    if (data.nursery_id) {
      query = query.eq('nursery_id', data.nursery_id);
    }

    const { data: teachers, error } = await query;

    if (error) {
      throw new Error(errorMessages.fetch_failed);
    }

    return teachers;
  });

export const getTeacher = createServerFn({ method: 'GET' })
  .inputValidator(
    accessTokenSchema.extend({
      id: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    await requireManagerRole(data.accessToken);

    const supabase = createServiceClient();
    const { data: teacher, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('id', data.id)
      .single();

    if (error || !teacher) {
      throw new Error(errorMessages.not_found);
    }

    return teacher;
  });

export const createTeacher = createServerFn({ method: 'POST' })
  .inputValidator(
    accessTokenSchema.extend({
      teacher: teacherCreateSchema,
    }),
  )
  .handler(async ({ data }) => {
    await requireManagerRole(data.accessToken);

    const supabase = createServiceClient();
    const { data: teacher, error } = await supabase
      .from('teachers')
      .insert({
        name: data.teacher.name,
        phone: data.teacher.phone,
        nursery_id: data.teacher.nursery_id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(errorMessages.create_failed);
    }

    return teacher;
  });

export const updateTeacher = createServerFn({ method: 'POST' })
  .inputValidator(
    accessTokenSchema.extend({
      id: z.string().uuid(),
      teacher: teacherUpdateSchema,
    }),
  )
  .handler(async ({ data }) => {
    await requireManagerRole(data.accessToken);

    const supabase = createServiceClient();
    const { data: teacher, error } = await supabase
      .from('teachers')
      .update(data.teacher)
      .eq('id', data.id)
      .select()
      .single();

    if (error) {
      throw new Error(errorMessages.update_failed);
    }

    if (!teacher) {
      throw new Error(errorMessages.not_found);
    }

    return teacher;
  });

export const deleteTeacher = createServerFn({ method: 'POST' })
  .inputValidator(
    accessTokenSchema.extend({
      id: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    await requireManagerRole(data.accessToken);

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('teachers')
      .delete()
      .eq('id', data.id);

    if (error) {
      throw new Error(errorMessages.delete_failed);
    }

    return { success: true };
  });
