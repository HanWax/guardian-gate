import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { requireRole } from '~/lib/auth-guard';
import { useTeacher, useUpdateTeacher } from '~/lib/queries/teachers';
import { TeacherForm } from '~/components/TeacherForm';

const DEFAULT_NURSERY_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export const Route = createFileRoute('/teachers/$teacherId/edit')({
  beforeLoad: () => requireRole('admin', 'manager'),
  component: EditTeacherPage,
});

function EditTeacherPage() {
  const { teacherId } = Route.useParams();
  const navigate = useNavigate();
  const { data: teacher, isLoading, error: fetchError } = useTeacher(teacherId);
  const updateMutation = useUpdateTeacher();

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto p-4 sm:p-6">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="space-y-5">
          {[1, 2].map((i) => (
            <div key={i}>
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-10 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (fetchError || !teacher) {
    return (
      <div className="max-w-lg mx-auto p-4 sm:p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-sm text-red-700">
            {fetchError instanceof Error ? fetchError.message : 'מורה לא נמצא/ה'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <TeacherForm
      teacher={teacher}
      nurseryId={teacher.nursery_id ?? DEFAULT_NURSERY_ID}
      onSubmit={(data) => {
        updateMutation.mutate(
          { id: teacherId, teacher: data },
          {
            onSuccess: () => {
              navigate({ to: '/teachers' });
            },
          },
        );
      }}
      isPending={updateMutation.isPending}
      serverError={
        updateMutation.error instanceof Error
          ? updateMutation.error.message
          : updateMutation.error
            ? 'שגיאה בעדכון מורה'
            : null
      }
    />
  );
}
