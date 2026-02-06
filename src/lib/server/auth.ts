import { createClient } from '@supabase/supabase-js'
import type { Database } from '../database.types'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export function createServiceClient() {
  return createClient<Database>(supabaseUrl, supabaseServiceKey)
}

export async function requireAuth(accessToken: string) {
  const supabase = createServiceClient()
  const { data: { user }, error } = await supabase.auth.getUser(accessToken)
  if (error || !user) throw new Error('אין לך הרשאה לבצע פעולה זו')
  return { user, role: user.user_metadata?.role as string | undefined }
}

export async function requireManagerRole(accessToken: string) {
  const { user, role } = await requireAuth(accessToken)
  if (role !== 'admin' && role !== 'manager') throw new Error('אין לך הרשאה לבצע פעולה זו')
  return user
}

export async function resolveNurseryId(user: { id: string }, role: string | undefined): Promise<string | null> {
  if (role === 'admin') return null

  const table = role === 'manager' ? 'managers' : role === 'teacher' ? 'teachers' : null
  if (!table) throw new Error('לא נמצא גן משויך למשתמש')

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from(table)
    .select('nursery_id')
    .eq('user_id', user.id)
    .single()

  if (error || !data) throw new Error('לא נמצא גן משויך למשתמש')
  return data.nursery_id
}
