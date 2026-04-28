import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAdminRole, createServiceClient } from './auth'

const err = {
  fetch_failed: 'שגיאה בטעינת נתוני נוכחות. אנא נסה שוב',
} as const

const tokenSchema = z.object({ accessToken: z.string().min(1) })

export type MissingChild = {
  id: string
  childName: string
  parents: { name: string; phone: string }[]
  teachers: { name: string; phone: string }[]
  actionTaken: string
}

function deriveActionTaken(record: {
  inconsistency?: boolean | null
  inconsistency_type?: string | null
  nine_am_alert_sent?: boolean | null
}): string {
  if (record.inconsistency) {
    const typeLabels: Record<string, string> = {
      parent_said_dropping_off_teacher_not_confirmed: 'הורה דיווח מגיע - מורה לא אישרה',
      parent_said_not_coming_teacher_confirmed: 'הורה דיווח לא מגיע - מורה אישרה הגעה',
    }
    return typeLabels[record.inconsistency_type ?? ''] ?? 'חריגה זוהתה'
  }
  if (record.nine_am_alert_sent) return 'התראת 9:00 נשלחה'
  return 'ממתין לתגובה'
}

export const getMissingChildren = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ date: z.string().min(1) }))
  .handler(async ({ data }): Promise<MissingChild[]> => {
    const { nurseryId } = await requireAdminRole(data.accessToken)

    const supabase = createServiceClient()

    // Fetch unaccounted attendance records with child + parent info
    const { data: records, error } = await supabase
      .from('daily_attendance')
      .select(`
        id, child_id, parent_response, teacher_confirmed,
        inconsistency, inconsistency_type, inconsistency_resolved,
        nine_am_alert_sent, created_at,
        children!inner(id, name, nursery_id, children_parents(parents(id, name, phone)))
      `)
      .eq('date', data.date)
      .eq('children.nursery_id', nurseryId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(err.fetch_failed)

    // Filter to missing children only:
    // - no parent response yet
    // - parent said dropping_off but teacher hasn't confirmed
    // - unresolved inconsistency
    const missing = (records ?? []).filter((r) => {
      if (!r.children) return false
      const noResponse = r.parent_response === null
      const awaitingConfirmation = r.parent_response === 'dropping_off' && !r.teacher_confirmed
      const unresolvedInconsistency = r.inconsistency === true && !r.inconsistency_resolved
      return noResponse || awaitingConfirmation || unresolvedInconsistency
    })

    if (missing.length === 0) return []

    // Collect unique nursery IDs to fetch teachers
    const nurseryIds = [...new Set(
      missing.map((r) => r.children?.nursery_id).filter((id): id is string => !!id),
    )]

    // Fetch teachers for relevant nurseries
    const { data: teachers } = nurseryIds.length > 0
      ? await supabase
          .from('teachers')
          .select('name, phone, nursery_id')
          .in('nursery_id', nurseryIds)
      : { data: [] as { name: string; phone: string; nursery_id: string }[] }

    const teachersByNursery = new Map<string, { name: string; phone: string }[]>()
    for (const t of teachers ?? []) {
      const list = teachersByNursery.get(t.nursery_id) ?? []
      list.push({ name: t.name, phone: t.phone })
      teachersByNursery.set(t.nursery_id, list)
    }

    return missing.map((r) => {
      const child = r.children!
      const parentJoins = (child as unknown as { children_parents: { parents: { id: string; name: string; phone: string } }[] }).children_parents ?? []
      const parents = parentJoins.map((cp) => ({
        name: cp.parents.name,
        phone: cp.parents.phone,
      }))

      return {
        id: r.id,
        childName: child.name,
        parents,
        teachers: teachersByNursery.get(child.nursery_id) ?? [],
        actionTaken: deriveActionTaken(r),
      }
    })
  })
