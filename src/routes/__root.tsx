/// <reference types="vite/client" />
import { HeadContent, Link, Outlet, Scripts, createRootRoute, useMatchRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { DefaultCatchBoundary } from '~/components/DefaultCatchBoundary'
import { NotFound } from '~/components/NotFound'
import { AuthProvider, useAuth } from '~/lib/auth-context'
import appCss from '~/styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'GuardianGate' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
  shellComponent: RootDocument,
})

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
})

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppNav />
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  )
}

function AppNav() {
  const { user, role, loading, signOut } = useAuth()
  const matchRoute = useMatchRoute()

  if (loading || !user) return null

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-bold text-gray-900">GuardianGate</Link>
            {(role === 'admin' || role === 'manager') && (
              <Link to="/teachers"
                className={`text-sm font-medium px-3 py-1.5 rounded-md ${
                  matchRoute({ to: '/teachers', fuzzy: true })
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}>
                ניהול צוות
              </Link>
            )}
          </div>
          <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-700">
            התנתקות
          </button>
        </div>
      </div>
    </nav>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html dir="rtl" lang="he">
      <head><HeadContent /></head>
      <body>
        {children}
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  )
}
