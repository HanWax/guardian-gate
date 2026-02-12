import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '~/lib/auth-guard'
import Layout from '~/components/Layout'
import DashboardCard from '~/components/DashboardCard'

export const Route = createFileRoute('/admin')({
  beforeLoad: () => requireAuth(),
  component: AdminDashboard,
})

function AdminDashboard() {
  return (
    <Layout>
      <div className="p-4 sm:p-6">
        <h1 className="text-2xl font-bold">לוח בקרה - מנהל מערכת</h1>
        <p className="mt-2 text-gray-600">ברוכים הבאים ללוח הבקרה של מנהל המערכת</p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DashboardCard
            title="ילדים חסרים"
            description="צפייה בילדים שלא זוהו היום"
            href="/attendance"
          />
          <DashboardCard
            title="משפחות"
            description="צפייה וניהול של הורים וילדים במערכת"
            href="/families"
          />
          <DashboardCard
            title="מורות"
            description="צפייה וניהול של כל המורות במערכת"
            href="/teachers"
          />
          <DashboardCard
            title="מנהלים"
            description="צפייה וניהול של כל המנהלים במערכת"
            href="/managers"
          />
        </div>
      </div>
    </Layout>
  )
}
