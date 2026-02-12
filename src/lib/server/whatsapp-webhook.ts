/**
 * WhatsApp webhook handlers for verification and message receiving.
 *
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */

import crypto from 'crypto';
import { createServiceClient } from './auth';
import {
  getConversationState,
  setConversationState,
  incrementVerificationAttempts,
  resetConversationState,
} from './conversation-manager';
import {
  CHECKIN_BUTTON_REGEX,
  EXPLAIN_SKIP_REGEX,
  NINE_AM_ALERT_REGEX,
  confirmDroppingOffMessage,
  explanationPromptMessage,
  explanationReceivedMessage,
  confirmNotTodayMessage,
  alreadyRespondedMessage,
  verifyInClassMessage,
  verifySuccessMessage,
  verifyRetryMessage,
  otherExplanationPromptMessage,
  adminEscalationMessage,
  parentExplanationForwardMessage,
  namesMatch,
} from './message-templates';
import { toDbPhone, toWhatsAppPhone } from './phone-utils';
import {
  sendTextMessage,
  sendInteractiveButtonMessage,
} from './whatsapp';

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
  // Meta signs webhook payloads with the App Secret, not the API token
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    console.error('WHATSAPP_APP_SECRET not set, cannot verify signature');
    return false;
  }

  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }

  const signatureHash = signature.replace('sha256=', '');

  const hmac = crypto.createHmac('sha256', appSecret);
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

// ---------------------------------------------------------------------------
// Lookup helper
// ---------------------------------------------------------------------------

async function lookupParent(senderPhone: string) {
  const supabase = createServiceClient();
  const dbPhone = toDbPhone(senderPhone);
  const { data } = await supabase
    .from('parents')
    .select('id, name, phone')
    .eq('phone', dbPhone)
    .single();
  return data;
}

// ---------------------------------------------------------------------------
// Check-in response handler (morning + second ping)
// ---------------------------------------------------------------------------

export async function processCheckinResponse(
  senderPhone: string,
  attendanceId: string,
  response: 'yes' | 'no'
): Promise<void> {
  const supabase = createServiceClient();
  const parent = await lookupParent(senderPhone);

  if (!parent) {
    console.error(`[Checkin] Parent not found for phone ${toDbPhone(senderPhone)}`);
    return;
  }

  const { data: record } = await supabase
    .from('daily_attendance')
    .select('id, child_id, parent_response')
    .eq('id', attendanceId)
    .single();

  if (!record) {
    console.error(`[Checkin] Attendance record ${attendanceId} not found`);
    return;
  }

  if (record.parent_response) {
    await sendTextMessage(senderPhone, alreadyRespondedMessage().text);
    return;
  }

  // Verify parent→child link
  const { data: link } = await supabase
    .from('children_parents')
    .select('child_id')
    .eq('child_id', record.child_id)
    .eq('parent_id', parent.id)
    .single();

  if (!link) {
    console.error(`[Checkin] Parent ${parent.id} not linked to child ${record.child_id}`);
    return;
  }

  const parentResponse = response === 'yes' ? 'dropping_off' : 'not_today';
  await supabase
    .from('daily_attendance')
    .update({
      parent_response: parentResponse,
      parent_response_time: new Date().toISOString(),
    })
    .eq('id', attendanceId);

  if (response === 'yes') {
    await sendTextMessage(senderPhone, confirmDroppingOffMessage().text);
    await resetConversationState(parent.id);
  } else {
    // "Not today" → ask for explanation
    const { data: child } = await supabase
      .from('children')
      .select('name')
      .eq('id', record.child_id)
      .single();

    const msg = explanationPromptMessage(child?.name ?? '', attendanceId);
    await sendInteractiveButtonMessage(senderPhone, msg.text, msg.buttons!);
    await setConversationState(parent.id, 'awaiting_explanation', attendanceId);
  }
}

// ---------------------------------------------------------------------------
// Explanation skip handler
// ---------------------------------------------------------------------------

async function handleExplanationSkip(
  senderPhone: string,
  attendanceId: string
): Promise<void> {
  const parent = await lookupParent(senderPhone);
  if (!parent) return;

  await sendTextMessage(senderPhone, confirmNotTodayMessage().text);
  await resetConversationState(parent.id);

  // Clear any pending explanation expectation
  const supabase = createServiceClient();
  await supabase
    .from('daily_attendance')
    .update({ parent_explanation: null })
    .eq('id', attendanceId);
}

// ---------------------------------------------------------------------------
// 9am alert response handler
// ---------------------------------------------------------------------------

async function handleNineAmResponse(
  senderPhone: string,
  attendanceId: string,
  action: 'inclass' | 'withme' | 'other'
): Promise<void> {
  const supabase = createServiceClient();
  const parent = await lookupParent(senderPhone);
  if (!parent) return;

  const responseMap = {
    inclass: 'in_class',
    withme: 'with_me',
    other: 'other',
  } as const;

  await supabase
    .from('daily_attendance')
    .update({ nine_am_parent_response: responseMap[action] })
    .eq('id', attendanceId);

  if (action === 'inclass') {
    // High friction: ask parent to type child's name
    await sendTextMessage(senderPhone, verifyInClassMessage().text);
    await setConversationState(parent.id, 'awaiting_name_verify', attendanceId);
  } else if (action === 'withme') {
    // Check for inconsistency: teacher says arrived but parent says "with me"
    const { data: record } = await supabase
      .from('daily_attendance')
      .select('child_id, teacher_confirmed')
      .eq('id', attendanceId)
      .single();

    if (record?.teacher_confirmed) {
      await flagInconsistency(
        attendanceId,
        record.child_id,
        'teacher_confirmed_parent_says_with_me',
        'איתי',
        'אושרה הגעה'
      );
    }

    await sendTextMessage(senderPhone, confirmNotTodayMessage().text);
    await resetConversationState(parent.id);
  } else {
    // "Other" → ask for free-text explanation
    await sendTextMessage(senderPhone, otherExplanationPromptMessage().text);
    await setConversationState(parent.id, 'awaiting_other_explain', attendanceId);
  }
}

// ---------------------------------------------------------------------------
// Free text handler (routes based on conversation state)
// ---------------------------------------------------------------------------

async function handleFreeText(
  senderPhone: string,
  text: string
): Promise<void> {
  const parent = await lookupParent(senderPhone);
  if (!parent) return;

  const convo = await getConversationState(parent.id);
  if (!convo || convo.state === 'idle') return;

  const supabase = createServiceClient();

  if (convo.state === 'awaiting_explanation') {
    // Parent explaining why child isn't coming
    if (convo.attendance_id) {
      await supabase
        .from('daily_attendance')
        .update({ parent_explanation: text })
        .eq('id', convo.attendance_id);

      await forwardExplanationToTeacher(convo.attendance_id, parent, text);
    }

    await sendTextMessage(senderPhone, explanationReceivedMessage().text);
    await resetConversationState(parent.id);
  } else if (convo.state === 'awaiting_name_verify') {
    // Parent typing child's name to verify "in class" claim
    if (!convo.attendance_id) return;

    const { data: record } = await supabase
      .from('daily_attendance')
      .select('child_id, teacher_confirmed')
      .eq('id', convo.attendance_id)
      .single();
    if (!record) return;

    const { data: child } = await supabase
      .from('children')
      .select('name')
      .eq('id', record.child_id)
      .single();
    if (!child) return;

    if (namesMatch(text, child.name)) {
      await sendTextMessage(senderPhone, verifySuccessMessage().text);

      // Check inconsistency: parent says in class but teacher hasn't confirmed
      if (!record.teacher_confirmed) {
        await flagInconsistency(
          convo.attendance_id,
          record.child_id,
          'parent_says_in_class_teacher_not_confirmed',
          'בכיתה',
          'לא אושרה הגעה'
        );
      }

      await resetConversationState(parent.id);
    } else {
      const attempts = await incrementVerificationAttempts(parent.id);
      if (attempts >= 3) {
        // Escalate to admin after 3 failed attempts
        await flagInconsistency(
          convo.attendance_id,
          record.child_id,
          'name_verification_failed',
          'בכיתה (אימות נכשל)',
          record.teacher_confirmed ? 'אושרה הגעה' : 'לא אושרה הגעה'
        );
        await sendTextMessage(senderPhone, verifySuccessMessage().text);
        await resetConversationState(parent.id);
      } else {
        await sendTextMessage(senderPhone, verifyRetryMessage().text);
      }
    }
  } else if (convo.state === 'awaiting_other_explain') {
    // Free-text explanation for "other" in 9am alert
    if (convo.attendance_id) {
      await supabase
        .from('daily_attendance')
        .update({ nine_am_explanation: text })
        .eq('id', convo.attendance_id);

      await forwardExplanationToTeacher(convo.attendance_id, parent, text);
    }

    await sendTextMessage(senderPhone, explanationReceivedMessage().text);
    await resetConversationState(parent.id);
  }
}

// ---------------------------------------------------------------------------
// Forward explanation to nursery teachers
// ---------------------------------------------------------------------------

async function forwardExplanationToTeacher(
  attendanceId: string,
  parent: { id: string; name: string; phone: string },
  explanation: string
): Promise<void> {
  const supabase = createServiceClient();

  // Get child + nursery from attendance
  const { data: record } = await supabase
    .from('daily_attendance')
    .select('child_id')
    .eq('id', attendanceId)
    .single();
  if (!record) return;

  const { data: child } = await supabase
    .from('children')
    .select('name, nursery_id')
    .eq('id', record.child_id)
    .single();
  if (!child) return;

  const { data: teachers } = await supabase
    .from('teachers')
    .select('phone')
    .eq('nursery_id', child.nursery_id);
  if (!teachers?.length) return;

  const msg = parentExplanationForwardMessage(
    child.name,
    parent.name,
    explanation,
    parent.phone
  );

  for (const teacher of teachers) {
    try {
      await sendTextMessage(toWhatsAppPhone(teacher.phone), msg.text);
    } catch (err) {
      console.error(`[Forward] Failed to send to teacher ${teacher.phone}:`, err);
    }
  }
}

// ---------------------------------------------------------------------------
// Inconsistency detection + admin escalation
// ---------------------------------------------------------------------------

async function flagInconsistency(
  attendanceId: string,
  childId: string,
  type: string,
  parentClaim: string,
  teacherStatus: string
): Promise<void> {
  const supabase = createServiceClient();

  await supabase
    .from('daily_attendance')
    .update({
      inconsistency: true,
      inconsistency_type: type,
    })
    .eq('id', attendanceId);

  // Look up child → nursery → admins + teachers for escalation
  const { data: child } = await supabase
    .from('children')
    .select('name, nursery_id')
    .eq('id', childId)
    .single();
  if (!child) return;

  const [nurseryResult, adminsResult, teachersResult, parentResult] = await Promise.all([
    supabase.from('nurseries').select('name').eq('id', child.nursery_id).single(),
    supabase.from('admins').select('phone').eq('nursery_id', child.nursery_id),
    supabase.from('teachers').select('phone').eq('nursery_id', child.nursery_id).limit(1),
    supabase
      .from('children_parents')
      .select('parents(phone)')
      .eq('child_id', childId)
      .limit(1),
  ]);

  const nurseryName = nurseryResult.data?.name ?? '';
  const admins = adminsResult.data ?? [];
  const teacherPhone = teachersResult.data?.[0]?.phone ?? '';
  const parentRow = parentResult.data?.[0]?.parents as unknown as { phone: string } | null;
  const parentPhone = parentRow?.phone ?? '';

  const msg = adminEscalationMessage(
    nurseryName,
    child.name,
    parentClaim,
    teacherStatus,
    parentPhone,
    teacherPhone
  );

  for (const admin of admins) {
    try {
      await sendTextMessage(toWhatsAppPhone(admin.phone), msg.text);
    } catch (err) {
      console.error(`[Escalation] Failed to send to admin ${admin.phone}:`, err);
    }
  }
}

// ---------------------------------------------------------------------------
// Main handler — state machine
// ---------------------------------------------------------------------------

/**
 * Handles incoming WhatsApp message webhook POST.
 *
 * Routes button replies by ID pattern, and free-text messages
 * by the parent's conversation state.
 */
export async function handleIncomingMessage(
  payload: WhatsAppWebhookPayload
): Promise<{ success: boolean }> {
  const parsed = parseIncomingMessage(payload);

  if (!parsed.success) {
    return { success: false };
  }

  if (!parsed.sender) {
    return { success: true };
  }

  console.log('[WhatsApp Message Received]', {
    sender: parsed.sender,
    messageText: parsed.messageText,
    timestamp: parsed.timestamp,
    messageId: parsed.messageId,
    messageType: parsed.messageType,
    buttonReplyId: parsed.buttonReplyId,
    buttonReplyTitle: parsed.buttonReplyTitle,
  });

  try {
    // 1. Button reply → match against patterns
    if (parsed.buttonReplyId) {
      const checkinMatch = parsed.buttonReplyId.match(CHECKIN_BUTTON_REGEX);
      if (checkinMatch) {
        await processCheckinResponse(
          parsed.sender,
          checkinMatch[2],
          checkinMatch[1] as 'yes' | 'no'
        );
        return { success: true };
      }

      const skipMatch = parsed.buttonReplyId.match(EXPLAIN_SKIP_REGEX);
      if (skipMatch) {
        await handleExplanationSkip(parsed.sender, skipMatch[1]);
        return { success: true };
      }

      const nineAmMatch = parsed.buttonReplyId.match(NINE_AM_ALERT_REGEX);
      if (nineAmMatch) {
        await handleNineAmResponse(
          parsed.sender,
          nineAmMatch[2],
          nineAmMatch[1] as 'inclass' | 'withme' | 'other'
        );
        return { success: true };
      }
    }

    // 2. Free text → route via conversation state
    if (parsed.messageText) {
      await handleFreeText(parsed.sender, parsed.messageText);
    }
  } catch (err) {
    console.error('[Webhook] Error processing message:', err);
  }

  return { success: true };
}
