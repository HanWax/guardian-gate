import { createClient, type User } from '@supabase/supabase-js'
import type { Database } from '../database.types'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export type UserRole = 'admin' | 'teacher'

export type AuthContext = {
  user: User
  role: UserRole
  nurseryId: string
}

export function createServiceClient() {
  return createClient<Database>(supabaseUrl, supabaseServiceKey)
}

async function resolveUserContext(userId: string): Promise<Pick<AuthContext, 'role' | 'nurseryId'>> {
  const supabase = createServiceClient()

  const { data: adminRow, error: adminError } = await supabase
    .from('admins')
    .select('nursery_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (adminError) throw new Error('לא נמצא גן משויך למשתמש')
  if (adminRow?.nursery_id) {
    return { role: 'admin', nurseryId: adminRow.nursery_id }
  }

  const { data: teacherRow, error: teacherError } = await supabase
    .from('teachers')
    .select('nursery_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (teacherError) throw new Error('לא נמצא גן משויך למשתמש')
  if (teacherRow?.nursery_id) {
    return { role: 'teacher', nurseryId: teacherRow.nursery_id }
  }

  throw new Error('לא נמצא גן משויך למשתמש')
}

export async function requireAuth(accessToken: string) {
  const supabase = createServiceClient()
  const { data: { user }, error } = await supabase.auth.getUser(accessToken)
  if (error || !user) throw new Error('אין לך הרשאה לבצע פעולה זו')
  const { role, nurseryId } = await resolveUserContext(user.id)
  return { user, role, nurseryId } as AuthContext
}

export async function requireAdminRole(accessToken: string) {
  const auth = await requireAuth(accessToken)
  const { role } = auth
  if (role !== 'admin') throw new Error('אין לך הרשאה לבצע פעולה זו')
  return auth
}

export async function resolveNurseryId(user: { id: string }): Promise<string> {
  const { nurseryId } = await resolveUserContext(user.id)
  return nurseryId
}
