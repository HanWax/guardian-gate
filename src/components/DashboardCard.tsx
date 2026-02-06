import { Link } from '@tanstack/react-router'

interface DashboardCardProps {
  title: string
  description: string
  href: string
}

export default function DashboardCard({ title, description, href }: DashboardCardProps) {
  return (
    <Link
      to={href}
      className="block rounded-lg border border-gray-200 p-6 hover:border-indigo-500 hover:shadow-md transition-all"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </Link>
  )
}
