import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createServiceClient, requireAuth, resolveNurseryId } from './auth'

const err = {
  fetch_failed: 'שגיאה בטעינת נתוני משפחות. אנא נסה שוב',
} as const

const tokenSchema = z.object({ accessToken: z.string().min(1) })

export const getFamilies = createServerFn({ method: 'GET' })
  .inputValidator(tokenSchema.extend({ teacherId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const { user, role } = await requireAuth(data.accessToken)
    const nurseryId = await resolveNurseryId(user, role)
    const supabase = createServiceClient()

    let query = supabase
      .from('parents')
      .select('id, name, phone, children_parents(children(id, name, teacher_id, teachers(id, name)))')
      .order('name', { ascending: true })

    if (nurseryId) {
      query = query.eq('children_parents.children.nursery_id', nurseryId)
    }

    const { data: parents, error } = await query
    if (error) throw new Error(err.fetch_failed)

    type RawParent = {
      id: string
      name: string
      phone: string
      children_parents: Array<{
        children: {
          id: string
          name: string
          teacher_id: string
          teachers: { id: string; name: string } | null
        } | null
      }>
    }

    const families = (parents as RawParent[]).map((parent) => {
      const children = parent.children_parents
        .map((cp) => cp.children)
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .map((c) => ({
          id: c.id,
          name: c.name,
          teacher_name: c.teachers?.name ?? null,
          teacher_id: c.teacher_id,
        }))

      return {
        id: parent.id,
        name: parent.name,
        phone: parent.phone,
        children,
      }
    })

    // Filter by teacher if requested
    if (data.teacherId) {
      return families.filter((f) =>
        f.children.some((c) => c.teacher_id === data.teacherId)
      )
    }

    return families
  })
