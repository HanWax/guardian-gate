import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { requireAuth } from '~/lib/auth-guard'
import { getParent, updateParent } from '~/lib/parents'
import type { Parent } from '~/lib/parents'
import { ParentForm } from '~/components/ParentForm'
import Layout from '~/components/Layout'

export const Route = createFileRoute('/parents/$parentId/edit')({
  beforeLoad: () => requireAuth(),
  component: EditParent,
})

function EditParent() {
  const { parentId } = Route.useParams()
  const navigate = useNavigate()
  const [parent, setParent] = useState<Parent | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await getParent(parentId)
        setParent(data)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [parentId])

  async function handleSubmit(data: { name: string; phone: string }) {
    setIsSubmitting(true)
    setError('')
    try {
      await updateParent(parentId, { name: data.name, phone: data.phone })
      navigate({ to: '/parents' })
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('duplicate') || message.includes('unique')) {
        setError('מספר הטלפון כבר קיים במערכת')
      } else {
        setError('שגיאה בעדכון פרטי ההורה')
      }
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
        <h1 className="text-2xl font-bold mb-4">הורה לא נמצא</h1>
        <Link to="/parents" className="text-indigo-600 hover:text-indigo-900">
          ← חזרה לרשימת ההורים
        </Link>
      </Layout>
    )
  }

  return (
    <Layout>
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link to="/parents" className="text-indigo-600 hover:text-indigo-900 text-sm">
          ← חזרה לרשימת ההורים
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">עריכת הורה</h1>

      {parent && (
        <ParentForm initialData={parent} onSubmit={handleSubmit} isLoading={isSubmitting} serverError={error} />
      )}
    </div>
    </Layout>
  )
}
