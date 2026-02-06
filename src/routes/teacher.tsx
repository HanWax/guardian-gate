import { createFileRoute, Link } from '@tanstack/react-router'
import { requireAuth } from '~/lib/auth-guard'
import Layout from '~/components/Layout'

export const Route = createFileRoute('/teacher')({
  beforeLoad: () => requireAuth(),
  component: TeacherDashboard,
})

function TeacherDashboard() {
  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <h1 className="text-2xl font-bold">לוח בקרה - מורה</h1>
        <p className="mt-4 text-gray-600">שלום! ברוכים הבאים ללוח הבקרה שלך</p>
        <p className="mt-2 text-gray-600">כאן תוכלי לצפות במידע על ילדי הגן והוריהם</p>

        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">גישה מהירה</h2>
          <div className="flex flex-col gap-3">
            <Link
              to="/children"
              className="block rounded-lg border border-gray-200 p-4 hover:border-indigo-500 hover:shadow-md transition-all"
            >
              <span className="text-base font-medium">ילדים</span>
              <p className="text-sm text-gray-600 mt-1">צפייה ברשימת הילדים בגן</p>
            </Link>
            <Link
              to="/parents"
              className="block rounded-lg border border-gray-200 p-4 hover:border-indigo-500 hover:shadow-md transition-all"
            >
              <span className="text-base font-medium">הורים</span>
              <p className="text-sm text-gray-600 mt-1">צפייה ברשימת ההורים</p>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}
