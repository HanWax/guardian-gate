import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createServiceClient, requireAuth } from './auth'

const err = {
  fetch_failed: 'שגיאה בטעינת נתוני משפחות. אנא נסה שוב',
} as const

const tokenSchema = z.object({ accessToken: z.string().min(1) })

export const getFamilies = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({ teacherId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const { nurseryId } = await requireAuth(data.accessToken)
    const supabase = createServiceClient()

    let query = supabase
      .from('parents')
      .select('id, name, phone, children_parents(children(id, name, nursery_id, children_teachers(teachers(id, name))))')
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
          nursery_id: string
          children_teachers: Array<{
            teachers: { id: string; name: string } | null
          }>
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
          teacher_names: c.children_teachers
            .map((ct) => ct.teachers?.name)
            .filter((name): name is string => name !== null && name !== undefined),
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
        f.children.some((c) =>
          c.teacher_names.some((tn) => tn === data.teacherId)
        )
      )
    }

    return families
  })
