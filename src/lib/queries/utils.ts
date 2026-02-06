import { supabase } from '../supabase';

export async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('לא מחובר/ת למערכת');
  }
  return session.access_token;
}
