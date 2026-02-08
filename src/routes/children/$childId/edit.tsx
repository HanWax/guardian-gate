import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { requireAuth } from '~/lib/auth-guard';
import { useChild, useUpdateChild } from '~/lib/queries/children';
import { useParentsForChild, useUnassignParent } from '~/lib/queries/children-parents';
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
  const { data: assignedParents, isLoading: isLoadingParents } = useParentsForChild(childId);
  const updateMutation = useUpdateChild();
  const unassignMutation = useUnassignParent();
  const [parentToRemove, setParentToRemove] = useState<string | null>(null);

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

      {/* Parent assignment section */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <h2 className="text-xl font-semibold mb-4">{"הורים שהוקצו"}</h2>

        {isLoadingParents ? (
          <p className="text-gray-500">{"טוען..."}</p>
        ) : assignedParents && assignedParents.length > 0 ? (
          <ul className="space-y-2">
            {assignedParents.map((parent) => (
              <li key={parent.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                <span>{parent.name}</span>
                <button
                  type="button"
                  onClick={() => setParentToRemove(parent.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  {"הסר"}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">{"אין הורים שהוקצו"}</p>
        )}
      </div>

      {/* Confirmation dialog */}
      {parentToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{"בטוח שברצונך להסיר?"}</h3>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setParentToRemove(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
              >
                {"ביטול"}
              </button>
              <button
                type="button"
                onClick={() => {
                  unassignMutation.mutate(
                    { childId, parentId: parentToRemove },
                    {
                      onSuccess: () => {
                        setParentToRemove(null);
                      },
                    }
                  );
                }}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded"
              >
                {"אישור"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
}
