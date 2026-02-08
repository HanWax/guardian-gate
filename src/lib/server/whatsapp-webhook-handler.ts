import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import {
  verifyWebhook,
  handleIncomingMessage,
  verifyWebhookSignature,
} from '~/lib/server/whatsapp-webhook';

/**
 * WhatsApp webhook verification endpoint (GET handler).
 *
 * Responds to Meta's webhook verification challenge.
 */
export const GET = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      'hub.mode': z.string().optional(),
      'hub.verify_token': z.string().optional(),
      'hub.challenge': z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const result = verifyWebhook(data);

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
  });

/**
 * WhatsApp webhook message receiver endpoint (POST handler).
 *
 * Receives incoming WhatsApp messages from Meta, verifies signature, and logs messages.
 */
export const POST = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      payload: z.any(),
      signature: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const { payload, signature } = data;

    // Get raw body as string for signature verification
    const rawBody = JSON.stringify(payload);

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
  });
