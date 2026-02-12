import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '~/lib/auth-guard'
import { useMyNursery } from '~/lib/queries/nurseries'
import Layout from '~/components/Layout'
import DashboardCard from '~/components/DashboardCard'

export const Route = createFileRoute('/manager')({
  beforeLoad: () => requireAuth(),
  component: ManagerDashboard,
})

function ManagerDashboard() {
  const { data: nursery } = useMyNursery()

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <h1 className="text-2xl font-bold">
          {nursery ? `לוח בקרה - ${nursery.name}` : 'לוח בקרה - מנהל'}
        </h1>
        <p className="mt-2 text-gray-600">ברוכים הבאים ללוח הבקרה של המנהל</p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DashboardCard
            title="נוכחות יומית"
            description="מעקב נוכחות ילדים בזמן אמת"
            href="/attendance"
          />
          <DashboardCard
            title="משפחות"
            description="צפייה וניהול של הורים וילדים בגן"
            href="/families"
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
