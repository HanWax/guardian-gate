import { redirect } from '@tanstack/react-router';
import { supabase } from './supabase';

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
