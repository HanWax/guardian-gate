import { Link } from '@tanstack/react-router'

export default function Navigation() {
  return (
    <nav className="flex flex-col gap-2">
      <Link to="/admin" className="rounded px-3 py-2 hover:bg-gray-200">ניהול</Link>
      <Link to="/attendance" className="rounded px-3 py-2 hover:bg-gray-200">ילדים חסרים</Link>
      <Link to="/families" className="rounded px-3 py-2 hover:bg-gray-200">משפחות</Link>
      <Link to="/teachers" className="rounded px-3 py-2 hover:bg-gray-200">מורות</Link>
      <Link to="/settings" className="rounded px-3 py-2 hover:bg-gray-200">הגדרות גן</Link>
    </nav>
  )
}
