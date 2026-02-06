import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { requireAuth } from '~/lib/auth-guard';
import { useParent, useUpdateParent } from '~/lib/queries/parents';
import { ParentForm } from '~/components/ParentForm';
import Layout from '~/components/Layout';

export const Route = createFileRoute('/parents/$parentId/edit')({
  beforeLoad: () => requireAuth(),
  component: EditParent,
});

function EditParent() {
  const { parentId } = Route.useParams();
  const navigate = useNavigate();
  const { data: parent, isLoading, error } = useParent(parentId);
  const updateMutation = useUpdateParent();

  if (isLoading) {
    return (
      <Layout>
        <p className="text-gray-500">טוען...</p>
      </Layout>
    );
  }

  if (error || !parent) {
    return (
      <Layout>
        <h1 className="text-2xl font-bold mb-4">הורה לא נמצא</h1>
        <Link to="/parents" className="text-indigo-600 hover:text-indigo-900">
          {'\u2190'} חזרה לרשימת ההורים
        </Link>
      </Layout>
    );
  }

  const serverError = updateMutation.error
    ? updateMutation.error instanceof Error
      ? updateMutation.error.message.includes('duplicate') || updateMutation.error.message.includes('unique')
        ? 'מספר הטלפון כבר קיים במערכת'
        : updateMutation.error.message
      : 'שגיאה בעדכון פרטי ההורה'
    : undefined;

  return (
    <Layout>
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link to="/parents" className="text-indigo-600 hover:text-indigo-900 text-sm">
          {'\u2190'} חזרה לרשימת ההורים
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">עריכת הורה</h1>

      <ParentForm
        initialData={parent}
        onSubmit={(data) => {
          updateMutation.mutate({ id: parentId, parent: data }, {
            onSuccess: () => {
              navigate({ to: '/parents' });
            },
          });
        }}
        isPending={updateMutation.isPending}
        serverError={serverError}
      />
    </div>
    </Layout>
  );
}
