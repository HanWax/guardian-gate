/**
 * WhatsApp webhook handlers for verification and message receiving.
 *
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */

/**
 * Result of webhook verification.
 */
export interface WebhookVerificationResult {
  success: boolean;
  challenge?: string;
  error?: string;
}

/**
 * Verifies WhatsApp webhook GET request from Meta.
 *
 * Meta sends a GET request with query parameters to verify webhook ownership.
 * This function validates the verify token and returns the challenge if valid.
 *
 * @param params - Query parameters from the GET request
 * @param params['hub.mode'] - Should be 'subscribe'
 * @param params['hub.verify_token'] - Verify token to match against env var
 * @param params['hub.challenge'] - Challenge string to return if verification succeeds
 * @returns Verification result with challenge or error message
 *
 * @example
 * ```ts
 * const result = verifyWebhook({
 *   'hub.mode': 'subscribe',
 *   'hub.verify_token': 'my-verify-token',
 *   'hub.challenge': 'challenge-123'
 * });
 *
 * if (result.success) {
 *   return new Response(result.challenge, { status: 200 });
 * } else {
 *   return new Response(result.error, { status: 403 });
 * }
 * ```
 */
export function verifyWebhook(params: {
  'hub.mode'?: string;
  'hub.verify_token'?: string;
  'hub.challenge'?: string;
}): WebhookVerificationResult {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    return {
      success: false,
      error: 'WHATSAPP_VERIFY_TOKEN environment variable is not set',
    };
  }

  const mode = params['hub.mode'];
  const token = params['hub.verify_token'];
  const challenge = params['hub.challenge'];

  if (!token) {
    return {
      success: false,
      error: 'Missing hub.verify_token',
    };
  }

  if (!challenge) {
    return {
      success: false,
      error: 'Missing hub.challenge',
    };
  }

  if (mode !== 'subscribe') {
    return {
      success: false,
      error: 'Invalid hub.mode',
    };
  }

  if (token !== verifyToken) {
    return {
      success: false,
      error: 'Invalid verify token',
    };
  }

  return {
    success: true,
    challenge,
  };
}
