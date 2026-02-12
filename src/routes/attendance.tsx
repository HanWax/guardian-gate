import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '~/lib/auth-guard'
import { useMissingChildren } from '~/lib/queries/attendance'
import { formatPhoneDisplay } from '~/lib/parents'
import Layout from '~/components/Layout'

export const Route = createFileRoute('/attendance')({
  beforeLoad: () => requireRole('admin'),
  component: MissingChildrenReport,
})

function MissingChildrenReport() {
  const today = new Date().toISOString().split('T')[0]
  const { data: missing, isLoading, error } = useMissingChildren(today)

  const todayFormatted = new Date().toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">{"טוען נתונים..."}</p>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-sm text-red-700">
            {error instanceof Error ? error.message : 'שגיאה בטעינת נתונים'}
          </p>
        </div>
      </Layout>
    )
  }

  const records = missing ?? []

  return (
    <Layout>
      <div className="max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{"ילדים חסרים"}</h1>
          <p className="mt-1 text-gray-600">{todayFormatted}</p>
        </div>

        <div className="mb-6">
          <span className="rounded-lg px-4 py-2 bg-red-50 text-sm font-medium text-red-800">
            {records.length} {"ילדים לא מזוהים"}
          </span>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-12 bg-green-50 rounded-lg">
            <p className="text-green-700 font-medium">{"כל הילדים מזוהים"}</p>
          </div>
        ) : (
          <div className="overflow-hidden shadow ring-1 ring-black/5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3 ps-4 pe-3 text-start text-sm font-semibold text-gray-900">
                    {"שם ילד/ה"}
                  </th>
                  <th scope="col" className="px-3 py-3 text-start text-sm font-semibold text-gray-900">
                    {"הורה"}
                  </th>
                  <th scope="col" className="px-3 py-3 text-start text-sm font-semibold text-gray-900">
                    {"טלפון הורה"}
                  </th>
                  <th scope="col" className="px-3 py-3 text-start text-sm font-semibold text-gray-900">
                    {"מורה"}
                  </th>
                  <th scope="col" className="px-3 py-3 text-start text-sm font-semibold text-gray-900">
                    {"טלפון מורה"}
                  </th>
                  <th scope="col" className="px-3 py-3 text-start text-sm font-semibold text-gray-900">
                    {"פעולה שננקטה"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap py-3 ps-4 pe-3 text-sm font-medium text-gray-900">
                      {r.childName}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700">
                      {r.parents.length === 0
                        ? '-'
                        : r.parents.map((p) => p.name).join(', ')}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700" dir="ltr">
                      {r.parents.length === 0
                        ? '-'
                        : r.parents.map((p, i) => (
                            <div key={i}>{formatPhoneDisplay(p.phone)}</div>
                          ))}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700">
                      {r.teachers.length === 0
                        ? '-'
                        : r.teachers.map((t) => t.name).join(', ')}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700" dir="ltr">
                      {r.teachers.length === 0
                        ? '-'
                        : r.teachers.map((t, i) => (
                            <div key={i}>{formatPhoneDisplay(t.phone)}</div>
                          ))}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">
                      {r.actionTaken}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
