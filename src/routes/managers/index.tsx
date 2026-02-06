import { createFileRoute } from '@tanstack/react-router';
import { requireRole } from '~/lib/auth-guard';

export const Route = createFileRoute('/managers/')({
  beforeLoad: () => requireRole('admin'),
  component: ManagersPage,
});

function ManagersPage() {
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ניהול מנהלים</h1>
          <p className="mt-1 text-sm text-gray-500">ניהול מנהלי הגנים</p>
        </div>
      </div>
      <p className="text-gray-600">רשימת מנהלים תוצג כאן</p>
    </div>
  );
}
