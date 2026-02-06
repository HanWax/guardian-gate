import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { requireAuth } from '~/lib/auth-guard';
import { useChildren, useDeleteChild } from '~/lib/queries/children';
import type { Database } from '~/lib/database.types';
import Layout from '~/components/Layout';

type Child = Database['public']['Tables']['children']['Row'];

export const Route = createFileRoute('/children/')({
  beforeLoad: () => requireAuth(),
  component: ChildrenList,
});

function ChildrenList() {
  const { data: children, isLoading, error } = useChildren();
  const deleteMutation = useDeleteChild();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">טוען...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-sm text-red-700">
            {error instanceof Error ? error.message : 'שגיאה בטעינת רשימת הילדים'}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">ילדים</h1>
        <Link
          to="/children/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          הוספת ילד/ה
        </Link>
      </div>

      {deleteMutation.error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-sm text-red-700">
            {deleteMutation.error instanceof Error ? deleteMutation.error.message : 'שגיאה במחיקת הילד/ה'}
          </p>
        </div>
      )}

      {!children || children.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">אין ילדים רשומים</p>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black/5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 ps-4 pe-3 text-start text-sm font-semibold text-gray-900">
                  שם
                </th>
                <th scope="col" className="px-3 py-3.5 text-start text-sm font-semibold text-gray-900">
                  תאריך הוספה
                </th>
                <th scope="col" className="px-3 py-3.5 text-start text-sm font-semibold text-gray-900">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {children.map((child: Child) => (
                <tr key={child.id}>
                  <td className="whitespace-nowrap py-4 ps-4 pe-3 text-sm font-medium text-gray-900">
                    {child.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {child.created_at ? new Date(child.created_at).toLocaleDateString('he-IL') : ''}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    {confirmId === child.id ? (
                      <span className="inline-flex gap-2">
                        <button
                          onClick={() => {
                            deleteMutation.mutate(child.id);
                            setConfirmId(null);
                          }}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                        >
                          {deleteMutation.isPending ? 'מוחק...' : 'אישור'}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ביטול
                        </button>
                      </span>
                    ) : (
                      <span className="inline-flex gap-3">
                        <Link
                          to="/children/$childId/edit"
                          params={{ childId: child.id }}
                          className="text-indigo-600 hover:text-indigo-900 me-4"
                        >
                          עריכה
                        </Link>
                        <button
                          type="button"
                          onClick={() => setConfirmId(child.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          מחיקה
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </Layout>
  );
}
