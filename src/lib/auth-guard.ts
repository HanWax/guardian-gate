import { redirect } from '@tanstack/react-router'
import { supabase } from './supabase'
import { extractRole, type Role } from './roles'

export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw redirect({ to: '/login' })
  return { session }
}

export async function requireRole(...roles: Role[]) {
  const { session } = await requireAuth()
  const userRole = extractRole(session.user.user_metadata as Record<string, unknown>)
  if (!roles.includes(userRole)) throw redirect({ to: '/' })
  return { session, role: userRole }
}
