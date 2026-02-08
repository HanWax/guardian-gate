import { redirect } from '@tanstack/react-router'
import { supabase } from './supabase'
import { extractRole, type Role } from './roles'

export async function requireAuth() {
  // During SSR there is no localStorage, so getSession() always returns null.
  // Skip the redirect on the server; the client-side beforeLoad will handle it.
  if (typeof window === 'undefined') return { session: null! as Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw redirect({ to: '/login' })
  return { session }
}

export async function requireRole(...roles: Role[]) {
  if (typeof window === 'undefined') return { session: null! as Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'], role: 'teacher' as Role }

  const { session } = await requireAuth()
  const userRole = extractRole(session!.user.user_metadata as Record<string, unknown>)
  if (!roles.includes(userRole)) throw redirect({ to: '/' })
  return { session, role: userRole }
}
