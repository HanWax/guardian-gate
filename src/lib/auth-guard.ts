import { redirect } from '@tanstack/react-router';
import { supabase } from './supabase';
import { extractRole, type Role } from './roles';

/**
 * Route guard that checks for a valid Supabase session.
 * Use as `beforeLoad` on protected routes.
 * Public routes (/login, /auth/callback) should NOT use this.
 */
export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw redirect({ to: '/login' });
  }

  return { session };
}

/**
 * Route guard that checks for a valid session AND requires one of the specified roles.
 * Redirects to /login if no session, or to / if the user lacks the required role.
 */
export async function requireRole(...roles: Role[]) {
  const { session } = await requireAuth();
  const userRole = extractRole(session.user.user_metadata as Record<string, unknown>);

  if (!roles.includes(userRole)) {
    throw redirect({ to: '/' });
  }

  return { session, role: userRole };
}
