import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { requireRole } from '~/lib/auth-guard';
import { useCreateChild } from '~/lib/queries/children';
import { useParents } from '~/lib/queries/parents';
import { ChildForm } from '~/components/ChildForm';
import Layout from '~/components/Layout';
import type { ChildCreate } from '~/lib/schemas/child';

export const Route = createFileRoute('/children/new')({
  beforeLoad: () => requireRole('admin'),
  component: NewChild,
});

function NewChild() {
  const navigate = useNavigate();
  const createMutation = useCreateChild();
  const { data: parents, isLoading: isLoadingParents } = useParents();

  return (
    <Layout>
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link to="/children" className="text-indigo-600 hover:text-indigo-900 text-sm">
          {'\u2192'} חזרה לרשימת הילדים
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">הוספת ילד/ה</h1>

      <ChildForm
        onSubmit={(data) => {
          createMutation.mutate(data as ChildCreate, {
            onSuccess: () => {
              navigate({ to: '/children' });
            },
          });
        }}
        isPending={createMutation.isPending}
        serverError={
          createMutation.error instanceof Error
            ? createMutation.error.message
            : createMutation.error
              ? 'שגיאה ביצירת רשומת ילד/ה'
              : null
        }
        availableParents={parents}
        isLoadingParents={isLoadingParents}
      />
    </div>
    </Layout>
  );
}
