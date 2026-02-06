import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { requireAuth } from '~/lib/auth-guard';
import { useCreateChild } from '~/lib/queries/children';
import { ChildForm } from '~/components/ChildForm';
import Layout from '~/components/Layout';

export const Route = createFileRoute('/children/new')({
  beforeLoad: () => requireAuth(),
  component: NewChild,
});

function NewChild() {
  const navigate = useNavigate();
  const createMutation = useCreateChild();

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
          createMutation.mutate(data, {
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
      />
    </div>
    </Layout>
  );
}
