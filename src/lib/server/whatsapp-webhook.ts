/**
 * WhatsApp webhook handlers for verification and message receiving.
 *
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */

import crypto from 'crypto';
import { createServiceClient } from './auth';
import { sendTextMessage } from './whatsapp';

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
  /** Button ID from interactive button reply or payload from template quick reply */
  buttonReplyId?: string;
  /** Button title/text from the reply */
  buttonReplyTitle?: string;
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
    let buttonReplyId: string | undefined;
    let buttonReplyTitle: string | undefined;

    if (messageType === 'text' && message.text?.body) {
      messageText = message.text.body;
    }

    // Interactive button reply (from sendInteractiveButtonMessage)
    if (messageType === 'interactive') {
      const interactive = message.interactive as
        | { type?: string; button_reply?: { id?: string; title?: string } }
        | undefined;
      if (interactive?.type === 'button_reply' && interactive.button_reply) {
        buttonReplyId = interactive.button_reply.id;
        buttonReplyTitle = interactive.button_reply.title;
      }
    }

    // Template quick reply button (from sendTemplateMessage with buttons)
    if (messageType === 'button') {
      const button = message.button as
        | { text?: string; payload?: string }
        | undefined;
      if (button) {
        buttonReplyId = button.payload;
        buttonReplyTitle = button.text;
      }
    }

    return {
      success: true,
      sender,
      messageText,
      timestamp,
      messageId,
      messageType,
      buttonReplyId,
      buttonReplyTitle,
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
 * Processes a check-in button response from a parent.
 *
 * Looks up the parent by phone, verifies the attendance record,
 * and updates with their response.
 */
export async function processCheckinResponse(
  senderPhone: string,
  attendanceId: string,
  response: 'yes' | 'no'
): Promise<void> {
  const supabase = createServiceClient();

  // WhatsApp sends 972..., DB stores +972...
  const dbPhone = `+${senderPhone}`;

  // Look up parent by phone
  const { data: parent, error: parentErr } = await supabase
    .from('parents')
    .select('id')
    .eq('phone', dbPhone)
    .single();

  if (parentErr || !parent) {
    console.error(`[Checkin] Parent not found for phone ${dbPhone}`);
    return;
  }

  // Get attendance record
  const { data: record, error: recordErr } = await supabase
    .from('daily_attendance')
    .select('id, child_id, parent_response')
    .eq('id', attendanceId)
    .single();

  if (recordErr || !record) {
    console.error(`[Checkin] Attendance record ${attendanceId} not found`);
    return;
  }

  // Already responded — send acknowledgement
  if (record.parent_response) {
    try {
      await sendTextMessage(senderPhone, 'כבר קיבלנו את תשובתך, תודה!');
    } catch (err) {
      console.error('[Checkin] Failed to send already-responded message:', err);
    }
    return;
  }

  // Verify parent is linked to this child
  const { data: link, error: linkErr } = await supabase
    .from('children_parents')
    .select('child_id')
    .eq('child_id', record.child_id)
    .eq('parent_id', parent.id)
    .single();

  if (linkErr || !link) {
    console.error(`[Checkin] Parent ${parent.id} not linked to child ${record.child_id}`);
    return;
  }

  // Update attendance record
  const parentResponse = response === 'yes' ? 'dropping_off' : 'not_today';
  const { error: updateErr } = await supabase
    .from('daily_attendance')
    .update({
      parent_response: parentResponse,
      parent_response_time: new Date().toISOString(),
    })
    .eq('id', attendanceId);

  if (updateErr) {
    console.error(`[Checkin] Failed to update attendance ${attendanceId}:`, updateErr);
    return;
  }

  // Send confirmation
  const confirmText =
    response === 'yes'
      ? 'תודה! סימנו שהילד/ה בדרך לגן \u{1F31E}'
      : 'תודה! סימנו שהילד/ה לא מגיע/ה היום';

  try {
    await sendTextMessage(senderPhone, confirmText);
  } catch (err) {
    console.error('[Checkin] Failed to send confirmation:', err);
  }
}

const CHECKIN_BUTTON_REGEX = /^checkin_(yes|no)_([0-9a-f-]{36})$/;

/**
 * Handles incoming WhatsApp message webhook POST.
 *
 * Parses the message payload, logs structured message details,
 * processes check-in button responses, and returns success.
 *
 * @param payload - Incoming webhook payload from Meta
 * @returns Result indicating success or failure
 */
export async function handleIncomingMessage(
  payload: WhatsAppWebhookPayload
): Promise<{ success: boolean }> {
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
      buttonReplyId: parsed.buttonReplyId,
      buttonReplyTitle: parsed.buttonReplyTitle,
    });

    // Process check-in button responses
    if (parsed.buttonReplyId) {
      const match = parsed.buttonReplyId.match(CHECKIN_BUTTON_REGEX);
      if (match) {
        const response = match[1] as 'yes' | 'no';
        const attendanceId = match[2];
        await processCheckinResponse(parsed.sender, attendanceId, response);
      }
    }
  }

  return { success: true };
}
