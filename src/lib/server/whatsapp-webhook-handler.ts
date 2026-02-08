import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { verifyWebhook } from '~/lib/server/whatsapp-webhook';

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
