import { createFileRoute, redirect } from '@tanstack/react-router';
import React, { useState } from 'react';
import { supabase, getHebrewErrorMessage } from '~/lib/supabase';
import { isValidEmail } from '~/lib/validation';

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    if (typeof window === 'undefined') return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session) throw redirect({ to: '/' });
  },
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const isDev = import.meta.env.DEV;

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    if (value && !isValidEmail(value)) {
      setEmailError('כתובת דוא"ל לא תקינה');
    } else {
      setEmailError('');
    }

    // Clear auth-level messages when user edits email
    setAuthError('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      setEmailError('כתובת דוא"ל לא תקינה');
      return;
    }

    setLoading(true);
    setAuthError('');
    setSuccessMessage('');

    if (isDev && usePassword) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        const errorCode = error.message?.toLowerCase().replace(/\s+/g, '_') || 'unknown_error';
        setAuthError(getHebrewErrorMessage(errorCode));
        return;
      }
      window.location.href = '/';
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      const errorCode = error.message?.toLowerCase().replace(/\s+/g, '_') || 'unknown_error';
      setAuthError(getHebrewErrorMessage(errorCode));
      return;
    }

    setSuccessMessage('קישור התחברות נשלח! בדוק את תיבת הדוא"ל שלך');
    setEmail('');
  };

  const isSubmitDisabled = !email || !isValidEmail(email) || loading || (isDev && usePassword && !password);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h1 className="text-3xl font-bold text-center">התחברות</h1>
          <p className="mt-2 text-center text-gray-600">
            {"הזן את כתובת הדוא\"ל שלך לקבלת קישור התחברות"}
          </p>
        </div>

        {successMessage && (
          <div
            className="p-4 bg-green-50 border border-green-200 rounded-md"
            role="status"
            data-testid="success-message"
          >
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        )}

        {authError && (
          <div
            className="p-4 bg-red-50 border border-red-200 rounded-md flex items-start justify-between"
            role="alert"
            data-testid="auth-error"
          >
            <p className="text-sm text-red-700">{authError}</p>
            <button
              type="button"
              onClick={() => setAuthError('')}
              className="text-red-500 hover:text-red-700 ms-2"
              aria-label="סגור"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              {"דוא\"ל"}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={handleEmailChange}
              disabled={loading}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                emailError ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="example@domain.com"
              data-testid="email-input"
            />
            {emailError && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {emailError}
              </p>
            )}
          </div>

          {isDev && usePassword && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                סיסמה
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                data-testid="password-input"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              isSubmitDisabled
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {loading ? 'שולח...' : (isDev && usePassword ? 'התחבר עם סיסמה' : 'שלח קישור התחברות')}
          </button>

          {isDev && (
            <button
              type="button"
              onClick={() => setUsePassword(!usePassword)}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700 underline"
            >
              {usePassword ? 'שלח קישור התחברות במקום' : 'התחבר עם סיסמה (dev)'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
