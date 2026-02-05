import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '~/lib/auth-guard'
import Layout from '~/components/Layout'

export const Route = createFileRoute('/teacher')({
  beforeLoad: () => requireAuth(),
  component: TeacherDashboard,
})

function TeacherDashboard() {
  return (
    <Layout>
      <div className="p-4">
        <h1 className="text-2xl font-bold">לוח בקרה - מורה</h1>
        <p className="mt-2 text-gray-600">ברוכים הבאים ללוח הבקרה של המורה</p>
      </div>
    </Layout>
  )
}
