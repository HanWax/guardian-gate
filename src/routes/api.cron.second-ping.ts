/**
 * Cron endpoint for sending second-ping reminder WhatsApp messages.
 *
 * POST /api/cron/second-ping
 * Auth: Bearer token matching CRON_SECRET env var.
 */
import { createFileRoute } from '@tanstack/react-router'
import { runSecondPing } from '~/lib/server/second-ping'

export const Route = createFileRoute('/api/cron/second-ping')({
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
          const result = await runSecondPing()
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (err) {
          console.error('[Cron Second Ping] Error:', err)
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
