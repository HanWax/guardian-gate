import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { updateNurserySettingsSchema } from '../schemas/nursery'
import { createServiceClient, requireManagerRole } from './auth'

const err = {
  fetch_failed: 'שגיאה בטעינת גנים. אנא נסה שוב',
  update_failed: 'שגיאה בעדכון הגדרות הגן. אנא נסה שוב',
  not_found: 'גן לא נמצא',
} as const

const tokenSchema = z.object({ accessToken: z.string().min(1) })

export const getNurseries = createServerFn({ method: 'GET' })
  .inputValidator(tokenSchema)
  .handler(async () => {
    const supabase = createServiceClient()
    const { data: nurseries, error } = await supabase
      .from('nurseries')
      .select('id, name')
      .order('name', { ascending: true })
    if (error) throw new Error(err.fetch_failed)
    return nurseries
  })

export const updateNurserySettings = createServerFn({ method: 'POST' })
  .inputValidator(tokenSchema.extend({
    nurseryId: z.string().uuid(),
    settings: updateNurserySettingsSchema
  }))
  .handler(async ({ data }) => {
    await requireManagerRole(data.accessToken)
    const supabase = createServiceClient()
    const { data: nursery, error } = await supabase
      .from('nurseries')
      .update(data.settings)
      .eq('id', data.nurseryId)
      .select()
      .single()
    if (error) throw new Error(err.update_failed)
    if (!nursery) throw new Error(err.not_found)
    return nursery
  })
