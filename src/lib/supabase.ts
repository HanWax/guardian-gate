import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Get Supabase URL and Anon Key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
  );
}

/**
 * Creates and returns a configured Supabase client instance
 */
export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

// Export a singleton instance for convenience
export const supabase = createClient();

/**
 * Hebrew translations for common authentication error messages
 */
export const authErrorMessages: Record<string, string> = {
  invalid_credentials: 'פרטי ההתחברות שגויים',
  otp_expired: 'הקוד פג תוקף. אנא בקש קוד חדש',
  user_not_found: 'משתמש לא נמצא במערכת',
  network_error: 'שגיאת רשת. אנא בדוק את החיבור לאינטרנט',
  invalid_email: 'כתובת דוא"ל לא תקינה',
  email_not_confirmed: 'כתובת הדוא"ל טרם אושרה',
  too_many_requests: 'יותר מדי ניסיונות. אנא נסה שוב מאוחר יותר',
  unauthorized: 'אין לך הרשאה לבצע פעולה זו',
  session_expired: 'פג תוקף ההתחברות. אנא התחבר מחדש',
  unknown_error: 'אירעה שגיאה לא צפויה. אנא נסה שוב',
};

/**
 * Returns a Hebrew error message for a given error code
 * Falls back to unknown_error message if code is not recognized
 */
export function getHebrewErrorMessage(errorCode: string): string {
  return authErrorMessages[errorCode] || authErrorMessages.unknown_error;
}
