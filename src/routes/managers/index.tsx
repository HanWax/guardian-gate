import { createFileRoute, Link } from '@tanstack/react-router';
import React, { useState } from 'react';
import { requireRole } from '~/lib/auth-guard';
import { useManagers, useDeleteManager } from '~/lib/queries/managers';

export const Route = createFileRoute('/managers/')({
  beforeLoad: () => requireRole('admin'),
  component: ManagersPage,
});

type ManagerWithNursery = {
  id: string;
  name: string;
  phone: string;
  nursery_id: string;
  nurseries: { id: string; name: string } | null;
};

function ManagersPage() {
  const { data: managers, isLoading, error } = useManagers();
  const deleteMutation = useDeleteManager();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <PageShell>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-sm text-red-700">
            {error instanceof Error ? error.message : 'שגיאה בטעינת נתונים'}
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {!managers || managers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">אין מנהלים במערכת עדיין</p>
          <Link
            to="/managers/new"
            className="mt-4 inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            הוספת מנהל ראשון/ה
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                  שם
                </th>
                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                  טלפון
                </th>
                <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                  גן
                </th>
                <th className="px-6 py-3 text-end text-xs font-medium text-gray-500 uppercase tracking-wider">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {managers.map((manager) => (
                <ManagerRow
                  key={manager.id}
                  manager={manager as ManagerWithNursery}
                  isConfirming={confirmId === manager.id}
                  onDeleteClick={() => setConfirmId(manager.id)}
                  onDeleteConfirm={() => {
                    deleteMutation.mutate(manager.id);
                    setConfirmId(null);
                  }}
                  onDeleteCancel={() => setConfirmId(null)}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ניהול מנהלים</h1>
          <p className="mt-1 text-sm text-gray-500">ניהול מנהלי הגנים</p>
        </div>
        <Link
          to="/managers/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
        >
          + הוספת מנהל
        </Link>
      </div>
      {children}
    </div>
  );
}

function ManagerRow({
  manager,
  isConfirming,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
  isDeleting,
}: {
  manager: ManagerWithNursery;
  isConfirming: boolean;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {manager.name}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" dir="ltr">
        {manager.phone}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {manager.nurseries?.name || 'לא משויך'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-end text-sm">
        {isConfirming ? (
          <span className="inline-flex gap-2">
            <button
              onClick={onDeleteConfirm}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
            >
              {isDeleting ? 'מוחק...' : 'אישור'}
            </button>
            <button
              onClick={onDeleteCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              ביטול
            </button>
          </span>
        ) : (
          <span className="inline-flex gap-3">
            <Link
              to="/managers/$managerId/edit"
              params={{ managerId: manager.id }}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              עריכה
            </Link>
            <button
              onClick={onDeleteClick}
              className="text-red-600 hover:text-red-800 font-medium"
            >
              מחיקה
            </button>
          </span>
        )}
      </td>
    </tr>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="mt-2 h-4 w-48 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-10 w-28 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
