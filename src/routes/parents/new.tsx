import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { requireAuth } from '~/lib/auth-guard'
import { createParent } from '~/lib/parents'
import { ParentForm } from '~/components/ParentForm'
import Layout from '~/components/Layout'

export const Route = createFileRoute('/parents/new')({
  beforeLoad: () => requireAuth(),
  component: NewParent,
})

function NewParent() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(data: { name: string; phone: string }) {
    setIsLoading(true)
    setError('')
    try {
      await createParent({ name: data.name, phone: data.phone })
      navigate({ to: '/parents' })
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('duplicate') || message.includes('unique')) {
        setError('מספר הטלפון כבר קיים במערכת')
      } else {
        setError('שגיאה ביצירת רשומת הורה')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Layout>
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link to="/parents" className="text-indigo-600 hover:text-indigo-900 text-sm">
          ← חזרה לרשימת ההורים
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">הוספת הורה</h1>

      <ParentForm onSubmit={handleSubmit} isLoading={isLoading} serverError={error} />
    </div>
    </Layout>
  )
}
