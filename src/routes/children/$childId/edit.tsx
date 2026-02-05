import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { requireAuth } from '~/lib/auth-guard'
import { getChild, updateChild } from '~/lib/children'
import type { Child } from '~/lib/children'
import { ChildForm } from '~/components/ChildForm'
import Layout from '~/components/Layout'

export const Route = createFileRoute('/children/$childId/edit')({
  beforeLoad: () => requireAuth(),
  component: EditChild,
})

function EditChild() {
  const { childId } = Route.useParams()
  const navigate = useNavigate()
  const [child, setChild] = useState<Child | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await getChild(childId)
        setChild(data)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [childId])

  async function handleSubmit(data: { name: string }) {
    setIsSubmitting(true)
    setError('')
    try {
      await updateChild(childId, { name: data.name })
      navigate({ to: '/children' })
    } catch {
      setError('שגיאה בעדכון פרטי הילד/ה')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <p className="text-gray-500">טוען...</p>
      </Layout>
    )
  }

  if (notFound) {
    return (
      <Layout>
        <h1 className="text-2xl font-bold mb-4">ילד/ה לא נמצא/א</h1>
        <Link to="/children" className="text-indigo-600 hover:text-indigo-900">
          → חזרה לרשימת הילדים
        </Link>
      </Layout>
    )
  }

  return (
    <Layout>
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link to="/children" className="text-indigo-600 hover:text-indigo-900 text-sm">
          → חזרה לרשימת הילדים
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">עריכת פרטי ילד/ה</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {child && (
        <ChildForm initialData={child} onSubmit={handleSubmit} isLoading={isSubmitting} />
      )}
    </div>
    </Layout>
  )
}
