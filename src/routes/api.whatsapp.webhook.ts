/**
 * WhatsApp webhook API route.
 *
 * Handles POST requests from WASenderAPI with incoming messages.
 * Verifies webhook signature using X-Webhook-Signature header.
 * Endpoint: /api/whatsapp/webhook
 */
import { createFileRoute } from '@tanstack/react-router'
import { handleIncomingMessage } from '~/lib/server/whatsapp-webhook'

export const Route = createFileRoute('/api/whatsapp/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Verify WASenderAPI webhook signature
        const signature = request.headers.get('x-webhook-signature');
        const webhookSecret = process.env.WASENDER_WEBHOOK_SECRET;

        if (!webhookSecret) {
          console.error('WASENDER_WEBHOOK_SECRET not configured');
          return new Response('Webhook not configured', {
            status: 500,
            headers: { 'Content-Type': 'text/plain' },
          });
        }

        if (!signature || signature !== webhookSecret) {
          console.warn('Webhook request rejected: invalid or missing signature');
          return new Response('Invalid signature', {
            status: 403,
            headers: { 'Content-Type': 'text/plain' },
          });
        }

        const payload = await request.json()

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
