import { createFileRoute } from '@tanstack/react-router';
import { requireRole } from '~/lib/auth-guard';

export const Route = createFileRoute('/managers/new')({
  beforeLoad: () => requireRole('admin'),
  component: NewManagerPage,
});

function NewManagerPage() {
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">הוספת מנהל</h1>
      <p className="text-gray-600">טופס הוספת מנהל יוצג כאן</p>
    </div>
  );
}
