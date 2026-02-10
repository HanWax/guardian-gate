import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { requireRole } from '~/lib/auth-guard'
import { useAttendanceByDate, useEnsureTodayRecords } from '~/lib/queries/attendance'
import Layout from '~/components/Layout'

export const Route = createFileRoute('/attendance')({
  beforeLoad: () => requireRole('admin', 'manager'),
  component: AttendanceDashboard,
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
  inconsistency: boolean | null
  inconsistency_type: string | null
  children: { name: string; nursery_id: string } | null
}

type StatusGroup = {
  label: string
  color: string
  bgColor: string
  records: AttendanceRecord[]
}

function groupByStatus(records: AttendanceRecord[]): StatusGroup[] {
  const arrived: AttendanceRecord[] = []
  const onTheWay: AttendanceRecord[] = []
  const notComing: AttendanceRecord[] = []
  const noResponse: AttendanceRecord[] = []
  const inconsistencies: AttendanceRecord[] = []

  for (const r of records) {
    if (r.inconsistency) {
      inconsistencies.push(r)
    } else if (r.parent_response === 'dropping_off' && r.teacher_confirmed) {
      arrived.push(r)
    } else if (r.parent_response === 'dropping_off' && !r.teacher_confirmed) {
      onTheWay.push(r)
    } else if (r.parent_response === 'not_today') {
      notComing.push(r)
    } else {
      noResponse.push(r)
    }
  }

  return [
    { label: 'הגיעו', color: 'text-green-800', bgColor: 'bg-green-50', records: arrived },
    { label: 'בדרך', color: 'text-blue-800', bgColor: 'bg-blue-50', records: onTheWay },
    { label: 'לא מגיעים', color: 'text-gray-800', bgColor: 'bg-gray-100', records: notComing },
    { label: 'ללא תגובה', color: 'text-yellow-800', bgColor: 'bg-yellow-50', records: noResponse },
    { label: 'חריגות', color: 'text-red-800', bgColor: 'bg-red-50', records: inconsistencies },
  ]
}

function formatTime(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

function parentResponseLabel(response: string | null): string {
  if (response === 'dropping_off') return 'מגיע/ה'
  if (response === 'not_today') return 'לא מגיע/ה'
  return 'טרם הגיב/ה'
}

function AttendanceDashboard() {
  const today = new Date().toISOString().split('T')[0]
  const { data: records, isLoading, error } = useAttendanceByDate(today)
  const ensureMutation = useEnsureTodayRecords()
  const ensuredRef = useRef(false)

  useEffect(() => {
    if (!ensuredRef.current) {
      ensuredRef.current = true
      ensureMutation.mutate()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
  const groups = groupByStatus(allRecords)
  const todayFormatted = new Date().toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Layout>
      <div className="max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">נוכחות יומית</h1>
          <p className="mt-1 text-gray-600">{todayFormatted}</p>
        </div>

        {/* Summary bar */}
        <div className="mb-6 flex flex-wrap gap-3">
          {groups.map((g) => (
            <div
              key={g.label}
              className={`rounded-lg px-4 py-2 ${g.bgColor}`}
            >
              <span className={`text-sm font-medium ${g.color}`}>
                {g.label}: {g.records.length}
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
            {groups.map((g) =>
              g.records.length === 0 ? null : (
                <section key={g.label}>
                  <h2 className={`text-lg font-semibold mb-3 ${g.color}`}>
                    {g.label} ({g.records.length})
                  </h2>
                  <div className="overflow-hidden shadow ring-1 ring-black/5 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="py-3 ps-4 pe-3 text-start text-sm font-semibold text-gray-900">
                            שם
                          </th>
                          <th scope="col" className="px-3 py-3 text-start text-sm font-semibold text-gray-900">
                            תגובת הורה
                          </th>
                          <th scope="col" className="px-3 py-3 text-start text-sm font-semibold text-gray-900">
                            אישור מורה
                          </th>
                          <th scope="col" className="px-3 py-3 text-start text-sm font-semibold text-gray-900">
                            זמן תגובה
                          </th>
                          <th scope="col" className="px-3 py-3 text-start text-sm font-semibold text-gray-900">
                            זמן אישור
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {g.records.map((r) => (
                          <tr key={r.id}>
                            <td className="whitespace-nowrap py-3 ps-4 pe-3 text-sm font-medium text-gray-900">
                              {r.children?.name ?? '-'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">
                              {parentResponseLabel(r.parent_response)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">
                              {r.teacher_confirmed ? 'אושר' : '-'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">
                              {formatTime(r.parent_response_time)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">
                              {formatTime(r.teacher_confirmed_time)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
