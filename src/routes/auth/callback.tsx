import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase, getHebrewErrorMessage } from '~/lib/supabase';

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    async function handleCallback() {
      // Extract hash params from URL (Supabase magic link puts tokens in hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (!accessToken || !refreshToken) {
        // If no tokens in hash, try letting Supabase detect the session from URL
        const { error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          setError(getHebrewErrorMessage('otp_expired'));
          return;
        }

        // Check if we now have a valid session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate({ to: '/' });
          return;
        }

        setError(getHebrewErrorMessage('otp_expired'));
        return;
      }

      // Exchange tokens for session
      if (type === 'magiclink' || type === 'signup') {
        const { error: verifyError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (verifyError) {
          const errorCode = verifyError.message?.toLowerCase().replace(/\s+/g, '_') || 'unknown_error';
          setError(getHebrewErrorMessage(errorCode));
          return;
        }

        navigate({ to: '/' });
        return;
      }

      setError(getHebrewErrorMessage('unknown_error'));
    }

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-lg shadow text-center">
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <p className="text-sm text-gray-600">
            {"אנא נסה לבקש קישור התחברות חדש"}
          </p>
          <button
            onClick={() => navigate({ to: '/login' })}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            חזרה לדף התחברות
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow text-center">
        <p className="text-gray-600">{"מאמת את ההתחברות..."}</p>
      </div>
    </div>
  );
}
