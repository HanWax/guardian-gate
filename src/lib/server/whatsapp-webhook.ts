/**
 * WhatsApp webhook handlers for verification and message receiving.
 *
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */

import crypto from 'crypto';

/**
 * Result of webhook verification.
 */
export interface WebhookVerificationResult {
  success: boolean;
  challenge?: string;
  error?: string;
}

/**
 * WhatsApp webhook payload structure from Meta.
 */
export interface WhatsAppWebhookPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      value?: {
        messaging_product?: string;
        metadata?: {
          display_phone_number?: string;
          phone_number_id?: string;
        };
        messages?: Array<{
          from?: string;
          id?: string;
          timestamp?: string;
          type?: string;
          text?: {
            body?: string;
          };
          image?: Record<string, unknown>;
          [key: string]: unknown;
        }>;
      };
      field?: string;
    }>;
  }>;
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

/**
 * Result of parsing an incoming WhatsApp message.
 */
export interface MessageParseResult {
  success: boolean;
  sender?: string;
  messageText?: string;
  timestamp?: string;
  messageId?: string;
  messageType?: string;
}

/**
 * Parses incoming WhatsApp message payload from Meta webhook POST.
 *
 * Extracts sender phone number, message text, timestamp, and message ID
 * from the nested webhook payload structure.
 *
 * @param payload - Webhook POST payload from Meta
 * @returns Parsed message data or success: true with no data if no messages
 *
 * @example
 * ```ts
 * const result = parseIncomingMessage(webhookPayload);
 * if (result.success && result.messageText) {
 *   console.log(`Message from ${result.sender}: ${result.messageText}`);
 * }
 * ```
 */
export function parseIncomingMessage(
  payload: WhatsAppWebhookPayload
): MessageParseResult {
  try {
    const entry = payload?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return { success: true };
    }

    const message = messages[0];
    const sender = message.from;
    const messageId = message.id;
    const timestamp = message.timestamp;
    const messageType = message.type;

    let messageText: string | undefined;

    if (messageType === 'text' && message.text?.body) {
      messageText = message.text.body;
    }

    return {
      success: true,
      sender,
      messageText,
      timestamp,
      messageId,
      messageType,
    };
  } catch (error) {
    console.error('Error parsing incoming message:', error);
    return { success: false };
  }
}

/**
 * Verifies webhook signature from Meta using HMAC SHA256.
 *
 * Meta signs webhook payloads with x-hub-signature-256 header.
 * This function validates that signature using WHATSAPP_API_TOKEN as secret.
 *
 * @param payload - Raw request body string
 * @param signature - Value of x-hub-signature-256 header
 * @returns true if signature is valid, false otherwise
 *
 * @example
 * ```ts
 * const isValid = verifyWebhookSignature(
 *   JSON.stringify(requestBody),
 *   request.headers.get('x-hub-signature-256')
 * );
 *
 * if (!isValid) {
 *   return new Response('Invalid signature', { status: 403 });
 * }
 * ```
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const apiToken = process.env.WHATSAPP_API_TOKEN;

  if (!apiToken) {
    console.error('WHATSAPP_API_TOKEN not set, cannot verify signature');
    return false;
  }

  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }

  const signatureHash = signature.replace('sha256=', '');

  const hmac = crypto.createHmac('sha256', apiToken);
  hmac.update(payload);
  const expectedHash = hmac.digest('hex');

  // timingSafeEqual requires buffers of same length
  const signatureBuffer = Buffer.from(signatureHash);
  const expectedBuffer = Buffer.from(expectedHash);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

/**
 * Handles incoming WhatsApp message webhook POST.
 *
 * Parses the message payload, logs structured message details, and returns success.
 * This function should be called from the webhook POST endpoint handler.
 *
 * @param payload - Incoming webhook payload from Meta
 * @returns Result indicating success or failure
 *
 * @example
 * ```ts
 * const result = handleIncomingMessage(requestBody);
 * if (result.success) {
 *   return new Response('OK', { status: 200 });
 * }
 * ```
 */
export function handleIncomingMessage(
  payload: WhatsAppWebhookPayload
): { success: boolean } {
  const parsed = parseIncomingMessage(payload);

  if (!parsed.success) {
    return { success: false };
  }

  // Only log if there's an actual message
  if (parsed.sender) {
    console.log('[WhatsApp Message Received]', {
      sender: parsed.sender,
      messageText: parsed.messageText,
      timestamp: parsed.timestamp,
      messageId: parsed.messageId,
      messageType: parsed.messageType,
    });
  }

  return { success: true };
}
