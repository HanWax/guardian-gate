import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { requireRole } from '~/lib/auth-guard';
import { useCreateManager } from '~/lib/queries/managers';
import { ManagerForm } from '~/components/ManagerForm';

const DEFAULT_NURSERY_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export const Route = createFileRoute('/managers/new')({
  beforeLoad: () => requireRole('admin'),
  component: NewManagerPage,
});

function NewManagerPage() {
  const navigate = useNavigate();
  const createMutation = useCreateManager();

  return (
    <ManagerForm
      nurseryId={DEFAULT_NURSERY_ID}
      onSubmit={(data) => {
        createMutation.mutate(data, {
          onSuccess: () => {
            navigate({ to: '/managers' });
          },
        });
      }}
      isPending={createMutation.isPending}
      serverError={
        createMutation.error instanceof Error
          ? createMutation.error.message
          : createMutation.error
            ? 'שגיאה ביצירת מנהל'
            : null
      }
    />
  );
}
