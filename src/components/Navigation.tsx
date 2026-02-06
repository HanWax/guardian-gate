import { Link } from '@tanstack/react-router'
import { useAuth } from '~/lib/auth-context'

export default function Navigation() {
  const { role } = useAuth()
  const canManage = role === 'admin' || role === 'manager'

  return (
    <nav className="flex flex-col gap-2">
      {role === 'admin' && (
        <Link to="/admin" className="rounded px-3 py-2 hover:bg-gray-200">ניהול</Link>
      )}
      {canManage && (
        <Link to="/manager" className="rounded px-3 py-2 hover:bg-gray-200">מנהל</Link>
      )}
      <Link to="/teacher" className="rounded px-3 py-2 hover:bg-gray-200">מורה</Link>
      {canManage && (
        <>
          <Link to="/children" className="rounded px-3 py-2 hover:bg-gray-200">ילדים</Link>
          <Link to="/parents" className="rounded px-3 py-2 hover:bg-gray-200">הורים</Link>
        </>
      )}
    </nav>
  )
}
