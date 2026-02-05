import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { requireAuth } from '~/lib/auth-guard'
import { getChildren, deleteChild } from '~/lib/children'
import type { Child } from '~/lib/children'
import Layout from '~/components/Layout'

const DEFAULT_NURSERY_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

export const Route = createFileRoute('/children/')({
  beforeLoad: () => requireAuth(),
  component: ChildrenList,
})

function ChildrenList() {
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    fetchChildren()
  }, [])

  async function fetchChildren() {
    setLoading(true)
    setError('')
    try {
      const data = await getChildren(DEFAULT_NURSERY_ID)
      setChildren(data)
    } catch {
      setError('שגיאה בטעינת רשימת הילדים')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(child: Child) {
    const confirmed = window.confirm(`האם למחוק את הילד/ה ${child.name}?`)
    if (!confirmed) return

    setDeleteError('')
    try {
      await deleteChild(child.id)
      setChildren((prev) => prev.filter((c) => c.id !== child.id))
    } catch {
      setDeleteError('שגיאה במחיקת הילד/ה')
    }
  }

  return (
    <Layout>
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">ילדים</h1>
        <Link
          to="/children/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          הוספת ילד/ה
        </Link>
      </div>

      {deleteError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-sm text-red-700">{deleteError}</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">טוען...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && children.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">אין ילדים רשומים</p>
        </div>
      )}

      {!loading && !error && children.length > 0 && (
        <div className="overflow-hidden shadow ring-1 ring-black/5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 ps-4 pe-3 text-start text-sm font-semibold text-gray-900">
                  שם
                </th>
                <th scope="col" className="px-3 py-3.5 text-start text-sm font-semibold text-gray-900">
                  תאריך הוספה
                </th>
                <th scope="col" className="px-3 py-3.5 text-start text-sm font-semibold text-gray-900">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {children.map((child) => (
                <tr key={child.id}>
                  <td className="whitespace-nowrap py-4 ps-4 pe-3 text-sm font-medium text-gray-900">
                    {child.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {new Date(child.created_at).toLocaleDateString('he-IL')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <Link
                      to="/children/$childId/edit"
                      params={{ childId: child.id }}
                      className="text-indigo-600 hover:text-indigo-900 me-4"
                    >
                      עריכה
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(child)}
                      className="text-red-600 hover:text-red-900"
                    >
                      מחיקה
                    </button>
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
