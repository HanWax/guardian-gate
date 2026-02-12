/**
 * Cron endpoint for 9am teacher summary + unconfirmed arrival alerts.
 *
 * POST /api/cron/nine-am-check
 * Auth: Bearer token matching CRON_SECRET env var.
 */
import { createFileRoute } from '@tanstack/react-router'
import { runNineAmCheck } from '~/lib/server/nine-am-check'

export const Route = createFileRoute('/api/cron/nine-am-check')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = process.env.CRON_SECRET
        if (!cronSecret) {
          return new Response('CRON_SECRET not configured', {
            status: 500,
            headers: { 'Content-Type': 'text/plain' },
          })
        }

        const authHeader = request.headers.get('authorization')
        if (authHeader !== `Bearer ${cronSecret}`) {
          return new Response('Unauthorized', {
            status: 401,
            headers: { 'Content-Type': 'text/plain' },
          })
        }

        try {
          const result = await runNineAmCheck()
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (err) {
          console.error('[Cron 9am Check] Error:', err)
          return new Response(
            JSON.stringify({
              error: err instanceof Error ? err.message : 'Unknown error',
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
      },
    },
  },
})
