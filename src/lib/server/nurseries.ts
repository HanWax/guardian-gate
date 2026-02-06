import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createServiceClient } from './auth'

const err = {
  fetch_failed: 'שגיאה בטעינת גנים. אנא נסה שוב',
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
