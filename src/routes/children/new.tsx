import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { requireAuth } from '~/lib/auth-guard'
import { createChild } from '~/lib/children'
import { ChildForm } from '~/components/ChildForm'
import Layout from '~/components/Layout'

const DEFAULT_NURSERY_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

export const Route = createFileRoute('/children/new')({
  beforeLoad: () => requireAuth(),
  component: NewChild,
})

function NewChild() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(data: { name: string }) {
    setIsLoading(true)
    setError('')
    try {
      await createChild({ name: data.name, nursery_id: DEFAULT_NURSERY_ID })
      navigate({ to: '/children' })
    } catch {
      setError('שגיאה ביצירת רשומת ילד/ה')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Layout>
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link to="/children" className="text-indigo-600 hover:text-indigo-900 text-sm">
          → חזרה לרשימת הילדים
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">הוספת ילד/ה</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <ChildForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
    </Layout>
  )
}
