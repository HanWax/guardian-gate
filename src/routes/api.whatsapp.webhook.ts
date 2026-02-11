/**
 * WhatsApp webhook API route.
 *
 * Handles both GET (verification) and POST (message receiving) requests from Meta.
 * Endpoint: /api/whatsapp/webhook
 */
import { createFileRoute } from '@tanstack/react-router'
import {
  verifyWebhook,
  handleIncomingMessage,
  verifyWebhookSignature,
} from '~/lib/server/whatsapp-webhook'

export const Route = createFileRoute('/api/whatsapp/webhook')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const result = verifyWebhook({
          'hub.mode': url.searchParams.get('hub.mode') ?? undefined,
          'hub.verify_token':
            url.searchParams.get('hub.verify_token') ?? undefined,
          'hub.challenge': url.searchParams.get('hub.challenge') ?? undefined,
        })

        if (result.success && result.challenge) {
          return new Response(result.challenge, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          })
        }

        return new Response(
          result.error ?? 'Webhook verification failed',
          {
            status: 403,
            headers: { 'Content-Type': 'text/plain' },
          },
        )
      },
      POST: async ({ request }) => {
        const signature = request.headers.get('x-hub-signature-256')

        if (!signature) {
          return new Response('Missing signature', {
            status: 403,
            headers: { 'Content-Type': 'text/plain' },
          })
        }

        const rawBody = await request.text()

        const isValid = verifyWebhookSignature(rawBody, signature)
        if (!isValid) {
          return new Response('Invalid signature', {
            status: 403,
            headers: { 'Content-Type': 'text/plain' },
          })
        }

        const payload = JSON.parse(rawBody)
        const result = await handleIncomingMessage(payload)

        if (!result.success) {
          return new Response('Failed to process message', {
            status: 500,
            headers: { 'Content-Type': 'text/plain' },
          })
        }

        return new Response('OK', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        })
      },
    },
  },
})
