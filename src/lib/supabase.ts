import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

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
}

export function getHebrewErrorMessage(errorCode: string): string {
  return authErrorMessages[errorCode] || authErrorMessages.unknown_error
}
