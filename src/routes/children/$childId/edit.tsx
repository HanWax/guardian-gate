import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { requireAuth } from '~/lib/auth-guard';
import { useChild, useUpdateChild } from '~/lib/queries/children';
import { ChildForm } from '~/components/ChildForm';
import Layout from '~/components/Layout';

export const Route = createFileRoute('/children/$childId/edit')({
  beforeLoad: () => requireAuth(),
  component: EditChild,
});

function EditChild() {
  const { childId } = Route.useParams();
  const navigate = useNavigate();
  const { data: child, isLoading, error } = useChild(childId);
  const updateMutation = useUpdateChild();

  if (isLoading) {
    return (
      <Layout>
        <p className="text-gray-500">טוען...</p>
      </Layout>
    );
  }

  if (error || !child) {
    return (
      <Layout>
        <h1 className="text-2xl font-bold mb-4">ילד/ה לא נמצא/א</h1>
        <Link to="/children" className="text-indigo-600 hover:text-indigo-900">
          {'\u2192'} חזרה לרשימת הילדים
        </Link>
      </Layout>
    );
  }

  return (
    <Layout>
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link to="/children" className="text-indigo-600 hover:text-indigo-900 text-sm">
          {'\u2192'} חזרה לרשימת הילדים
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">עריכת פרטי ילד/ה</h1>

      <ChildForm
        initialData={child}
        onSubmit={(data) => {
          updateMutation.mutate({ id: childId, child: data }, {
            onSuccess: () => {
              navigate({ to: '/children' });
            },
          });
        }}
        isPending={updateMutation.isPending}
        serverError={
          updateMutation.error instanceof Error
            ? updateMutation.error.message
            : updateMutation.error
              ? 'שגיאה בעדכון פרטי הילד/ה'
              : null
        }
      />
    </div>
    </Layout>
  );
}
