import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { requireAuth } from '~/lib/auth-guard';
import { useCreateParent } from '~/lib/queries/parents';
import { ParentForm } from '~/components/ParentForm';
import Layout from '~/components/Layout';

export const Route = createFileRoute('/parents/new')({
  beforeLoad: () => requireAuth(),
  component: NewParent,
});

function NewParent() {
  const navigate = useNavigate();
  const createMutation = useCreateParent();

  const serverError = createMutation.error
    ? createMutation.error instanceof Error
      ? createMutation.error.message.includes('duplicate') || createMutation.error.message.includes('unique')
        ? 'מספר הטלפון כבר קיים במערכת'
        : createMutation.error.message
      : 'שגיאה ביצירת רשומת הורה'
    : undefined;

  return (
    <Layout>
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link to="/parents" className="text-indigo-600 hover:text-indigo-900 text-sm">
          {'\u2190'} חזרה לרשימת ההורים
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">הוספת הורה</h1>

      <ParentForm
        onSubmit={(data) => {
          createMutation.mutate(data, {
            onSuccess: () => {
              navigate({ to: '/parents' });
            },
          });
        }}
        isPending={createMutation.isPending}
        serverError={serverError}
      />
    </div>
    </Layout>
  );
}
