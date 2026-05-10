/**
 * WhatsApp webhook handlers for message receiving.
 *
 * @see https://wasenderapi.com/api-docs/getting-started/how-to-receive-messages-and-media-from-wasenderapi
 */

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
 * WhatsApp webhook payload structure from WASenderAPI.
 */
export interface WhatsAppWebhookPayload {
  event?: string;
  timestamp?: number;
  data?: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
    };
    messageBody?: string;
    cleanedSenderPn?: string;
    cleanedParticipantPn?: string;
    message?: Record<string, unknown>;
    pollResult?: {
      name?: string;
      voters?: Record<string, unknown>;
    };
    [key: string]: unknown;
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
 * Parses incoming WhatsApp message payload from WASenderAPI webhook POST.
 *
 * Extracts sender phone number, message text, timestamp, and message ID
 * from the WASenderAPI webhook payload structure.
 *
 * @param payload - Webhook POST payload from WASenderAPI
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
    // WASenderAPI only sends messages.upsert events we care about
    if (payload?.event !== 'messages.upsert') {
      return { success: true };
    }

    const data = payload?.data;
    if (!data) {
      return { success: true };
    }

    // Get sender phone - WASenderAPI provides cleanedSenderPn for private chats
    const sender = data.cleanedSenderPn || data.cleanedParticipantPn;
    if (!sender) {
      return { success: true };
    }

    const messageId = data.key?.id;
    const timestamp = payload.timestamp?.toString();
    const messageText = data.messageBody;

    let buttonReplyId: string | undefined;
    let buttonReplyTitle: string | undefined;

    // Poll responses (button-like interactions)
    if (data.pollResult) {
      // WASenderAPI polls: the selected option is in pollResult.name
      // Format is "id::visual_title", extract the ID part
      const optionText = data.pollResult.name;
      if (optionText && optionText.includes('::')) {
        const [id, ...titleParts] = optionText.split('::');
        buttonReplyId = id;
        buttonReplyTitle = titleParts.join('::');
      } else if (optionText) {
        // Fallback if format doesn't match
        buttonReplyId = optionText;
        buttonReplyTitle = optionText;
      }
    }

    return {
      success: true,
      sender,
      messageText,
      timestamp,
      messageId,
      messageType: data.pollResult ? 'poll_response' : 'text',
      buttonReplyId,
      buttonReplyTitle,
    };
  } catch (error) {
    console.error('Error parsing incoming message:', error);
    return { success: false };
  }
}

function maskIdentifier(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized.length <= 4) return '****';
  return `${'*'.repeat(normalized.length - 4)}${normalized.slice(-4)}`;
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
      parent_response_by: parent.id,
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
    .update({
      nine_am_parent_response: responseMap[action],
      nine_am_parent_response_time: new Date().toISOString(),
      nine_am_parent_response_by: parent.id,
    })
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
  console.log('[Webhook] Received payload:', JSON.stringify(payload).slice(0, 500));

  const parsed = parseIncomingMessage(payload);
  console.log('[Webhook] Parsed result:', parsed);

  if (!parsed.success) {
    return { success: false };
  }

  if (!parsed.sender) {
    return { success: true };
  }

  console.log('[WhatsApp Message Received]', {
    senderMasked: maskIdentifier(parsed.sender),
    messageLength: parsed.messageText?.length ?? 0,
    hasMessageText: !!parsed.messageText,
    timestamp: parsed.timestamp,
    messageId: parsed.messageId,
    messageType: parsed.messageType,
    buttonReplyId: parsed.buttonReplyId,
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
