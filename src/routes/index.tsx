import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '~/lib/supabase'
import { extractRole } from '~/lib/roles'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    // During SSR, skip — the client will handle the redirect
    if (typeof window === 'undefined') return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw redirect({ to: '/login' })

    const role = extractRole(session.user.user_metadata as Record<string, unknown>)
    if (role === 'admin') throw redirect({ to: '/admin' })
    if (role === 'manager') throw redirect({ to: '/manager' })
    throw redirect({ to: '/teacher' })
  },
  component: IndexRedirect,
})

function IndexRedirect() {
  // This renders briefly during SSR before the client-side redirect kicks in
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">{"טוען..."}</p>
    </div>
  )
}
