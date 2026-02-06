import { createFileRoute } from '@tanstack/react-router';
import { requireRole } from '~/lib/auth-guard';

export const Route = createFileRoute('/managers/$managerId/edit')({
  beforeLoad: () => requireRole('admin'),
  component: EditManagerPage,
});

function EditManagerPage() {
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">עריכת מנהל</h1>
      <p className="text-gray-600">טופס עריכת מנהל יוצג כאן</p>
    </div>
  );
}
