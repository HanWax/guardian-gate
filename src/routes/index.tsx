import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '~/lib/auth-guard'

export const Route = createFileRoute('/')({
  beforeLoad: () => requireAuth(),
  component: Home,
})

function Home() {
  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold">GuardianGate</h1>
      <p className="mt-2 text-lg">שלום עולם</p>
    </div>
  )
}
