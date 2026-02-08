/**
 * WhatsApp webhook API route.
 *
 * Handles both GET (verification) and POST (message receiving) requests from Meta.
 * This file creates actual HTTP endpoints at /api/whatsapp/webhook
 */
import {
  verifyWebhook,
  handleIncomingMessage,
  verifyWebhookSignature,
} from '~/lib/server/whatsapp-webhook';

/**
 * GET /api/whatsapp/webhook
 * Handles Meta's webhook verification challenge
 */
export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const params = {
    'hub.mode': url.searchParams.get('hub.mode') ?? undefined,
    'hub.verify_token': url.searchParams.get('hub.verify_token') ?? undefined,
    'hub.challenge': url.searchParams.get('hub.challenge') ?? undefined,
  };

  const result = verifyWebhook(params);

  if (result.success && result.challenge) {
    return new Response(result.challenge, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  return new Response(result.error ?? 'Webhook verification failed', {
    status: 403,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

/**
 * POST /api/whatsapp/webhook
 * Receives incoming WhatsApp messages from Meta
 */
export async function POST({ request }: { request: Request }) {
  // Get signature from headers
  const signature = request.headers.get('x-hub-signature-256');

  if (!signature) {
    return new Response('Missing signature', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  // Get raw body
  const rawBody = await request.text();

  // Verify signature
  const isValid = verifyWebhookSignature(rawBody, signature);

  if (!isValid) {
    return new Response('Invalid signature', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  // Parse body as JSON
  const payload = JSON.parse(rawBody);

  // Handle the message
  const result = handleIncomingMessage(payload);

  if (!result.success) {
    return new Response('Failed to process message', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  // Return 200 to acknowledge receipt to Meta
  return new Response('OK', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
