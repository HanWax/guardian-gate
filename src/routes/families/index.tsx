import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { requireAuth } from '~/lib/auth-guard'
import { useFamilies, type Family } from '~/lib/queries/families'
import { useTeachers } from '~/lib/queries/teachers'
import { useDeleteParent } from '~/lib/queries/parents'
import { formatPhoneDisplay } from '~/lib/parents'
import Layout from '~/components/Layout'

export const Route = createFileRoute('/families/')({
  beforeLoad: () => requireAuth(),
  component: FamiliesList,
})

function FamiliesList() {
  const [teacherFilter, setTeacherFilter] = useState('')
  const [search, setSearch] = useState('')

  const { data: teachers, isLoading: isLoadingTeachers } = useTeachers()
  const { data: families, isLoading, error } = useFamilies(
    teacherFilter ? { teacherId: teacherFilter } : undefined,
  )
  const deleteMutation = useDeleteParent()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!families) return []
    if (!search.trim()) return families
    const term = search.trim().toLowerCase()
    return families.filter((f: Family) => {
      const displayPhone = formatPhoneDisplay(f.phone)
      return (
        f.name.toLowerCase().includes(term) ||
        displayPhone.includes(term) ||
        f.phone.includes(term) ||
        f.children.some((c) => c.name.toLowerCase().includes(term))
      )
    })
  }, [families, search])

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">{"טוען..."}</p>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-sm text-red-700">
            {error instanceof Error ? error.message : 'שגיאה בטעינת נתוני משפחות'}
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{"משפחות"}</h1>
          <div className="flex gap-2">
            <Link
              to="/families/children/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {"הוספת ילד/ה"}
            </Link>
            <Link
              to="/families/parents/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {"הוספת הורה"}
            </Link>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם הורה, טלפון או שם ילד/ה"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          <select
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
            disabled={isLoadingTeachers}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">{"כל המורות"}</option>
            {teachers?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {deleteMutation.error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
            <p className="text-sm text-red-700">
              {deleteMutation.error instanceof Error ? deleteMutation.error.message : 'שגיאה במחיקת ההורה'}
            </p>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">
              {search.trim() || teacherFilter ? 'לא נמצאו תוצאות' : 'אין משפחות רשומות'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden shadow ring-1 ring-black/5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 ps-4 pe-3 text-start text-sm font-semibold text-gray-900">
                    {"שם הורה"}
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-start text-sm font-semibold text-gray-900">
                    {"טלפון"}
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-start text-sm font-semibold text-gray-900">
                    {"ילדים"}
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-start text-sm font-semibold text-gray-900">
                    {"מורה"}
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-start text-sm font-semibold text-gray-900">
                    {"פעולות"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filtered.map((family: Family) => (
                  <tr key={family.id}>
                    <td className="whitespace-nowrap py-4 ps-4 pe-3 text-sm font-medium text-gray-900">
                      {family.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500" dir="ltr">
                      {formatPhoneDisplay(family.phone)}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      {family.children.length > 0
                        ? family.children.map((c) => c.name).join(', ')
                        : <span className="text-gray-400">{"ללא ילדים"}</span>
                      }
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      {(() => {
                        const teacherNames = [...new Set(
                          family.children
                            .flatMap((c) => c.teacher_names ?? [])
                        )]
                        return teacherNames.length > 0
                          ? teacherNames.join(', ')
                          : <span className="text-gray-400">{"-"}</span>
                      })()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      {confirmId === family.id ? (
                        <span className="inline-flex gap-2">
                          <button
                            onClick={() => {
                              deleteMutation.mutate(family.id)
                              setConfirmId(null)
                            }}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                          >
                            {deleteMutation.isPending ? 'מוחק...' : 'אישור'}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            {"ביטול"}
                          </button>
                        </span>
                      ) : (
                        <span className="inline-flex gap-3">
                          <Link
                            to="/families/parents/$parentId/edit"
                            params={{ parentId: family.id }}
                            className="text-indigo-600 hover:text-indigo-900 me-4"
                          >
                            {"עריכה"}
                          </Link>
                          <button
                            type="button"
                            onClick={() => setConfirmId(family.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            {"מחיקה"}
                          </button>
                        </span>
                      )}
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
