import { createFileRoute, Link } from '@tanstack/react-router';
import React, { useState } from 'react';
import { requireRole } from '~/lib/auth-guard';
import { useTeachers, useDeleteTeacher } from '~/lib/queries/teachers';
import type { Teacher } from '~/lib/database.types';

export const Route = createFileRoute('/teachers/')({
  beforeLoad: () => requireRole('admin', 'manager'),
  component: TeachersPage,
});

function TeachersPage() {
  const { data: teachers, isLoading, error } = useTeachers();
  const deleteMutation = useDeleteTeacher();
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
      {!teachers || teachers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">אין מורים במערכת עדיין</p>
          <Link
            to="/teachers/new"
            className="mt-4 inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            הוספת מורה ראשון/ה
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
                <th className="px-6 py-3 text-end text-xs font-medium text-gray-500 uppercase tracking-wider">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teachers.map((teacher) => (
                <TeacherRow
                  key={teacher.id}
                  teacher={teacher}
                  isConfirming={confirmId === teacher.id}
                  onDeleteClick={() => setConfirmId(teacher.id)}
                  onDeleteConfirm={() => {
                    deleteMutation.mutate(teacher.id);
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
          <h1 className="text-2xl font-bold text-gray-900">ניהול צוות</h1>
          <p className="mt-1 text-sm text-gray-500">ניהול מורים וצוות הגן</p>
        </div>
        <Link
          to="/teachers/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium"
        >
          + הוספת מורה
        </Link>
      </div>
      {children}
    </div>
  );
}

function TeacherRow({
  teacher,
  isConfirming,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
  isDeleting,
}: {
  teacher: Teacher;
  isConfirming: boolean;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {teacher.name}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" dir="ltr">
        {teacher.phone}
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
              to="/teachers/$teacherId/edit"
              params={{ teacherId: teacher.id }}
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
