import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '~/lib/auth-guard'
import Layout from '~/components/Layout'
import DashboardCard from '~/components/DashboardCard'

export const Route = createFileRoute('/manager')({
  beforeLoad: () => requireAuth(),
  component: ManagerDashboard,
})

function ManagerDashboard() {
  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <h1 className="text-2xl font-bold">לוח בקרה - מנהל</h1>
        <p className="mt-2 text-gray-600">ברוכים הבאים ללוח הבקרה של המנהל</p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DashboardCard
            title="ילדים"
            description="צפייה וניהול של ילדי הגן"
            href="/children"
          />
          <DashboardCard
            title="הורים"
            description="צפייה וניהול של הורי הילדים בגן"
            href="/parents"
          />
          <DashboardCard
            title="מורות"
            description="צפייה וניהול של המורות בגן"
            href="/teachers"
          />
        </div>
      </div>
    </Layout>
  )
}
