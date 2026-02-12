import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { supabase } from '~/lib/supabase'
import { extractRole } from '~/lib/roles'

export const Route = createFileRoute('/')({
  component: IndexRedirect,
})

function IndexRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate({ to: '/login' })
        return
      }
      const role = extractRole(session.user.user_metadata as Record<string, unknown>)
      if (role !== 'admin') {
        supabase.auth.signOut()
        navigate({ to: '/login' })
        return
      }
      navigate({ to: '/admin' })
    })
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">{"טוען..."}</p>
    </div>
  )
}
