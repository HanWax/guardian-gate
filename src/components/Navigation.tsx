import { Link } from '@tanstack/react-router'
import { useAuth } from '~/lib/auth-context'
import { extractRole } from '~/lib/roles'

export default function Navigation() {
  const { user } = useAuth()
  const role = extractRole(user?.user_metadata)

  console.log('Navigation: extracted role =', role)

  return (
    <nav className="flex flex-col gap-2">
      {role === 'admin' && (
        <>
          <Link to="/admin" className="rounded px-3 py-2 hover:bg-gray-200">
            ניהול
          </Link>
          <Link to="/manager" className="rounded px-3 py-2 hover:bg-gray-200">
            מנהל
          </Link>
          <Link to="/teacher" className="rounded px-3 py-2 hover:bg-gray-200">
            מורה
          </Link>
        </>
      )}
      {role === 'manager' && (
        <>
          <Link to="/manager" className="rounded px-3 py-2 hover:bg-gray-200">
            מנהל
          </Link>
          <Link to="/teacher" className="rounded px-3 py-2 hover:bg-gray-200">
            מורה
          </Link>
        </>
      )}
      {role === 'teacher' && (
        <Link to="/teacher" className="rounded px-3 py-2 hover:bg-gray-200">
          מורה
        </Link>
      )}
    </nav>
  )
}
