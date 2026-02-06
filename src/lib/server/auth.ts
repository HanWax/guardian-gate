import { createClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function createServiceClient() {
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

/**
 * Verifies the user's access token and returns the user.
 * Throws if unauthorized.
 */
export async function requireAuth(accessToken: string) {
  const supabase = createServiceClient();
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    throw new Error('אין לך הרשאה לבצע פעולה זו');
  }

  const role = user.user_metadata?.role as string | undefined;
  return { user, role };
}

/**
 * Verifies the user's access token and checks they have admin or manager role.
 * Throws if unauthorized.
 */
export async function requireManagerRole(accessToken: string) {
  const { user, role } = await requireAuth(accessToken);

  if (role !== 'admin' && role !== 'manager') {
    throw new Error('אין לך הרשאה לבצע פעולה זו');
  }

  return user;
}

/**
 * Resolves the nursery_id for the current user based on their role.
 * - admin → null (sees all nurseries)
 * - manager → queries managers table by user_id
 * - teacher → queries teachers table by user_id
 */
export async function resolveNurseryId(user: { id: string }, role: string | undefined): Promise<string | null> {
  if (role === 'admin') {
    return null;
  }

  const supabase = createServiceClient();

  if (role === 'manager') {
    const { data, error } = await supabase
      .from('managers')
      .select('nursery_id')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      throw new Error('לא נמצא גן משויך למשתמש');
    }

    return data.nursery_id;
  }

  if (role === 'teacher') {
    const { data, error } = await supabase
      .from('teachers')
      .select('nursery_id')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      throw new Error('לא נמצא גן משויך למשתמש');
    }

    return data.nursery_id;
  }

  throw new Error('לא נמצא גן משויך למשתמש');
}
