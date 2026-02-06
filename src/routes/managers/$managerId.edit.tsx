import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { requireRole } from '~/lib/auth-guard';
import { useManager, useUpdateManager } from '~/lib/queries/managers';
import { ManagerForm } from '~/components/ManagerForm';

export const Route = createFileRoute('/managers/$managerId/edit')({
  beforeLoad: () => requireRole('admin'),
  component: EditManagerPage,
});

function EditManagerPage() {
  const { managerId } = Route.useParams();
  const navigate = useNavigate();
  const { data: manager, isLoading, error: fetchError } = useManager(managerId);
  const updateMutation = useUpdateManager();

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto p-4 sm:p-6">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="space-y-5">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-10 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (fetchError || !manager) {
    return (
      <div className="max-w-lg mx-auto p-4 sm:p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-sm text-red-700">
            {fetchError instanceof Error ? fetchError.message : 'מנהל לא נמצא/ה'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ManagerForm
      manager={manager}
      onSubmit={(data) => {
        updateMutation.mutate(
          { id: managerId, manager: data },
          {
            onSuccess: () => {
              navigate({ to: '/managers' });
            },
          },
        );
      }}
      isPending={updateMutation.isPending}
      serverError={
        updateMutation.error instanceof Error
          ? updateMutation.error.message
          : updateMutation.error
            ? 'שגיאה בעדכון מנהל'
            : null
      }
    />
  );
}
