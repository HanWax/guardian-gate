import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { requireRole } from '~/lib/auth-guard';
import { useCreateTeacher } from '~/lib/queries/teachers';
import { TeacherForm } from '~/components/TeacherForm';

const DEFAULT_NURSERY_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export const Route = createFileRoute('/teachers/new')({
  beforeLoad: () => requireRole('admin', 'manager'),
  component: NewTeacherPage,
});

function NewTeacherPage() {
  const navigate = useNavigate();
  const createMutation = useCreateTeacher();

  return (
    <TeacherForm
      nurseryId={DEFAULT_NURSERY_ID}
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
  );
}
