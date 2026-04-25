import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { requireRole } from '~/lib/auth-guard';
import { useCreateTeacher } from '~/lib/queries/teachers';
import { useMyNursery } from '~/lib/queries/nurseries';
import { TeacherForm } from '~/components/TeacherForm';
import Layout from '~/components/Layout';

export const Route = createFileRoute('/teachers/new')({
  beforeLoad: () => requireRole('admin'),
  component: NewTeacherPage,
});

function NewTeacherPage() {
  const navigate = useNavigate();
  const createMutation = useCreateTeacher();
  const { data: nursery, isLoading: isNurseryLoading, error: nurseryError } = useMyNursery();

  if (isNurseryLoading) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto p-4 sm:p-6">
          <p className="text-gray-500">טוען...</p>
        </div>
      </Layout>
    );
  }

  if (nurseryError || !nursery) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto p-4 sm:p-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
            <p className="text-sm text-red-700">
              {nurseryError instanceof Error ? nurseryError.message : 'לא נמצא גן משויך למשתמש'}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <TeacherForm
        nurseryId={nursery.id}
        onSubmit={(data) => {
          createMutation.mutate(data, {
            onSuccess: () => {
              navigate({ to: '/teachers' });
            },
          });
        }}
        isPending={createMutation.isPending}
        serverError={
          createMutation.error instanceof Error
            ? createMutation.error.message
            : createMutation.error
              ? 'שגיאה ביצירת מורה'
              : null
        }
      />
    </Layout>
  );
}
