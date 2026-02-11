/**
 * Cron endpoint for sending morning check-in WhatsApp messages.
 *
 * POST /api/cron/morning-messages
 * Auth: Bearer token matching CRON_SECRET env var.
 * Designed to be called every ~5 minutes during morning hours.
 */
import { createFileRoute } from '@tanstack/react-router'
import { runMorningMessages } from '~/lib/server/morning-messages'

export const Route = createFileRoute('/api/cron/morning-messages')({
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
          const result = await runMorningMessages()
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (err) {
          console.error('[Cron Morning Messages] Error:', err)
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
