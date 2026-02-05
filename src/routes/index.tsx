import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
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
