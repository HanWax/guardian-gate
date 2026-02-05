import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '~/lib/auth-guard'
import Layout from '~/components/Layout'

export const Route = createFileRoute('/manager')({
  beforeLoad: () => requireAuth(),
  component: ManagerDashboard,
})

function ManagerDashboard() {
  return (
    <Layout>
      <div className="p-4">
        <h1 className="text-2xl font-bold">לוח בקרה - מנהל</h1>
        <p className="mt-2 text-gray-600">ברוכים הבאים ללוח הבקרה של המנהל</p>
      </div>
    </Layout>
  )
}
