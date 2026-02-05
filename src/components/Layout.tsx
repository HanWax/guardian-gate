import type { ReactNode } from 'react'
import Navigation from './Navigation'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-e border-gray-200 bg-gray-50 p-4">
        <h2 className="mb-4 text-lg font-semibold">GuardianGate</h2>
        <Navigation />
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
