import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '~/lib/auth-guard'
import { useTeacherAttendanceToday } from '~/lib/queries/attendance'
import Layout from '~/components/Layout'

export const Route = createFileRoute('/teacher/attendance')({
  beforeLoad: () => requireRole('teacher', 'admin', 'manager'),
  component: TeacherAttendance,
})

type AttendanceRecord = {
  id: string
  child_id: string
  date: string
  parent_response: string | null
  parent_response_time: string | null
  parent_explanation: string | null
  teacher_confirmed: boolean | null
  teacher_confirmed_time: string | null
  children: { name: string; nursery_id: string } | null
}

type Section = {
  key: string
  label: string
  color: string
  bgColor: string
  records: AttendanceRecord[]
}

function groupRecords(records: AttendanceRecord[]): Section[] {
  const awaiting: AttendanceRecord[] = []
  const confirmed: AttendanceRecord[] = []
  const notComing: AttendanceRecord[] = []
  const noResponse: AttendanceRecord[] = []

  for (const r of records) {
    if (r.parent_response === 'dropping_off' && r.teacher_confirmed) {
      confirmed.push(r)
    } else if (r.parent_response === 'dropping_off' && !r.teacher_confirmed) {
      awaiting.push(r)
    } else if (r.parent_response === 'not_today') {
      notComing.push(r)
    } else {
      noResponse.push(r)
    }
  }

  return [
    { key: 'awaiting', label: 'ממתינים לאישור', color: 'text-orange-800', bgColor: 'bg-orange-50', records: awaiting },
    { key: 'confirmed', label: 'אושרו', color: 'text-green-800', bgColor: 'bg-green-50', records: confirmed },
    { key: 'not_coming', label: 'לא מגיעים', color: 'text-gray-800', bgColor: 'bg-gray-100', records: notComing },
    { key: 'no_response', label: 'ללא תגובה', color: 'text-yellow-800', bgColor: 'bg-yellow-50', records: noResponse },
  ]
}

function TeacherAttendance() {
  const { data: records, isLoading, error } = useTeacherAttendanceToday()

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">טוען נתוני נוכחות...</p>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-sm text-red-700">
            {error instanceof Error ? error.message : 'שגיאה בטעינת נתוני נוכחות'}
          </p>
        </div>
      </Layout>
    )
  }

  const allRecords = (records ?? []) as AttendanceRecord[]
  const sections = groupRecords(allRecords)
  const todayFormatted = new Date().toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Layout>
      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">סטטוס נוכחות</h1>
          <p className="mt-1 text-gray-600">{todayFormatted}</p>
        </div>

        {/* Summary bar */}
        <div className="mb-6 flex flex-wrap gap-3">
          {sections.map((s) => (
            <div key={s.key} className={`rounded-lg px-4 py-2 ${s.bgColor}`}>
              <span className={`text-sm font-medium ${s.color}`}>
                {s.label}: {s.records.length}
              </span>
            </div>
          ))}
        </div>

        {allRecords.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">אין רשומות נוכחות להיום</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map((s) =>
              s.records.length === 0 ? null : (
                <section key={s.key}>
                  <h2 className={`text-lg font-semibold mb-3 ${s.color}`}>
                    {s.label} ({s.records.length})
                  </h2>
                  <div className="grid gap-3">
                    {s.records.map((r) => (
                      <div
                        key={r.id}
                        className={`rounded-lg border p-4 ${s.bgColor} border-gray-200`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {r.children?.name ?? '-'}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {r.parent_response === 'dropping_off'
                                ? 'הורה דיווח: מגיע/ה'
                                : r.parent_response === 'not_today'
                                  ? 'הורה דיווח: לא מגיע/ה'
                                  : 'טרם התקבלה תגובה מההורה'}
                            </p>
                          </div>
                          {s.key === 'confirmed' ? (
                            <span className="rounded-lg bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                              אושר
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ),
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
