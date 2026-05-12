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
  POLL_TITLE_TO_ACTION,
  TEACHER_POLL_NONE_OPTION,
  parseMultiChildOption,
  confirmDroppingOffMessage,
  explanationPromptMessage,
  explanationReceivedMessage,
  confirmNotTodayMessage,
  lateArrivalPromptMessage,
  lateArrivalConfirmedMessage,
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
 *
 * Two distinct event shapes arrive:
 * - "messages.upsert": regular messages; message data is nested under data.messages
 * - "poll.results": poll vote; data is flat at data.key / data.pollResult
 */
export interface WhatsAppWebhookPayload {
  event?: string;
  timestamp?: number;
  sessionId?: string;
  data?: {
    // "messages.upsert" — all fields nested under messages
    messages?: {
      key?: {
        id?: string;
        fromMe?: boolean;
        remoteJid?: string;
        cleanedSenderPn?: string;
        senderPn?: string;
      };
      messageBody?: string;
      messageTimestamp?: number;
      pushName?: string;
      message?: Record<string, unknown>;
    };
    // "poll.results" — flat under data
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
    };
    pollResult?: Array<{
      name?: string;
      voters?: string[];
    }>;
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
  /** Routing action derived from poll option title (e.g. "checkin_yes") */
  buttonReplyId?: string;
  /** The raw option title that triggered the action */
  buttonReplyTitle?: string;
  /** For multi-child combined polls: child name parsed from the option title */
  childName?: string;
  /** All voted option names from a poll.results event (supports multi-select) */
  allPollOptions?: string[];
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
/** Strips the @domain suffix from a WhatsApp JID and returns the numeric phone, or undefined if not phone-shaped. */
function jidToPhone(jid: string): string | undefined {
  const num = jid.replace(/@[^@]+$/, '');
  return /^\d{10,15}$/.test(num) ? num : undefined;
}

export function parseIncomingMessage(
  payload: WhatsAppWebhookPayload
): MessageParseResult {
  try {
    const event = payload?.event;

    // Poll votes arrive as a separate "poll.results" event with a flat data shape
    if (event === 'poll.results') {
      const data = payload?.data;
      if (!data) return { success: true };

      // Sender = voter. Try voter JIDs first (phone-shaped), fall back to remoteJid.
      const voterPhones = (data.pollResult ?? [])
        .flatMap(opt => (opt.voters ?? []).map(jidToPhone).filter((p): p is string => !!p));
      const sender = voterPhones[0] ?? jidToPhone(data.key?.remoteJid ?? '');
      if (!sender) {
        console.log('[Webhook] poll.results: could not extract phone from voter/remoteJid');
        return { success: true };
      }

      // Collect all option names the sender voted for
      const allPollOptions = (data.pollResult ?? [])
        .filter(opt => Array.isArray(opt.voters) && opt.voters.length > 0 && opt.name)
        .map(opt => opt.name as string);

      if (!allPollOptions.length) return { success: true };

      // Match the first option to a routing action (parent polls use known titles)
      let buttonReplyId: string | undefined;
      let buttonReplyTitle: string | undefined;
      let childName: string | undefined;

      for (const optionText of allPollOptions) {
        const staticAction = POLL_TITLE_TO_ACTION[optionText.trim()];
        if (staticAction) {
          buttonReplyId = staticAction;
          buttonReplyTitle = optionText;
          break;
        }
        const multi = parseMultiChildOption(optionText);
        if (multi) {
          buttonReplyId = multi.action;
          buttonReplyTitle = optionText;
          childName = multi.childName;
          break;
        }
      }

      // No action match → all options are plain child names (teacher poll)
      if (!buttonReplyId) buttonReplyTitle = allPollOptions[0];

      return {
        success: true,
        sender,
        timestamp: payload.timestamp?.toString(),
        messageId: data.key?.id,
        messageType: 'poll_response',
        buttonReplyId,
        buttonReplyTitle,
        childName,
        allPollOptions,
      };
    }

    // Regular inbound messages arrive as "messages.upsert" with data nested under data.messages
    if (event !== 'messages.upsert') {
      return { success: true };
    }

    const messages = payload?.data?.messages;
    if (!messages) return { success: true };

    // Skip echoes of our own sent messages
    if (messages.key?.fromMe) return { success: true };

    const sender = messages.key?.cleanedSenderPn;
    if (!sender) return { success: true };

    return {
      success: true,
      sender,
      messageText: messages.messageBody,
      timestamp: payload.timestamp?.toString(),
      messageId: messages.key?.id,
      messageType: 'text',
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
// Lookup helpers
// ---------------------------------------------------------------------------

async function lookupTeacher(senderPhone: string) {
  const supabase = createServiceClient();
  const dbPhone = toDbPhone(senderPhone);
  const { data } = await supabase
    .from('teachers')
    .select('id, phone, nursery_id')
    .eq('phone', dbPhone)
    .single();
  return data;
}

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
// Attendance lookup helpers (phone-based, used by webhook routing)
// ---------------------------------------------------------------------------

function getTodayIL(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
}

async function lookupPendingCheckinAttendance(senderPhone: string): Promise<string | null> {
  const supabase = createServiceClient();
  const parent = await lookupParent(senderPhone);
  if (!parent) return null;

  const { data: links } = await supabase
    .from('children_parents')
    .select('child_id')
    .eq('parent_id', parent.id);
  if (!links?.length) return null;

  const childIds = links.map((l) => l.child_id);
  const { data: records } = await supabase
    .from('daily_attendance')
    .select('id')
    .in('child_id', childIds)
    .eq('date', getTodayIL())
    .is('parent_response', null)
    .limit(1);

  return records?.[0]?.id ?? null;
}

async function lookupPendingNineAmAttendance(senderPhone: string): Promise<string | null> {
  const supabase = createServiceClient();
  const parent = await lookupParent(senderPhone);
  if (!parent) return null;

  const { data: links } = await supabase
    .from('children_parents')
    .select('child_id')
    .eq('parent_id', parent.id);
  if (!links?.length) return null;

  const childIds = links.map((l) => l.child_id);
  const { data: records } = await supabase
    .from('daily_attendance')
    .select('id')
    .in('child_id', childIds)
    .eq('date', getTodayIL())
    .is('nine_am_parent_response', null)
    .limit(1);

  return records?.[0]?.id ?? null;
}

async function lookupAttendanceByChildName(
  senderPhone: string,
  childName: string
): Promise<string | null> {
  const supabase = createServiceClient();
  const parent = await lookupParent(senderPhone);
  if (!parent) return null;

  const { data: links } = await supabase
    .from('children_parents')
    .select('child_id')
    .eq('parent_id', parent.id);
  if (!links?.length) return null;

  const childIds = links.map((l) => l.child_id);
  const today = getTodayIL();

  const { data: records } = await supabase
    .from('daily_attendance')
    .select('id, children!inner(name)')
    .in('child_id', childIds)
    .eq('date', today);

  const match = (records ?? []).find((r) => {
    const child = Array.isArray(r.children) ? r.children[0] : r.children;
    return (child as { name: string } | null)?.name === childName;
  });

  return match?.id ?? null;
}

// ---------------------------------------------------------------------------
// Teacher poll response handler
// ---------------------------------------------------------------------------

async function handleTeacherPollResponse(
  teacher: { id: string; nursery_id: string },
  childName: string
): Promise<void> {
  if (childName === TEACHER_POLL_NONE_OPTION) return;

  const supabase = createServiceClient();
  const today = getTodayIL();

  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('nursery_id', teacher.nursery_id)
    .eq('name', childName)
    .single();

  if (!child) {
    console.error(`[TeacherPoll] Child "${childName}" not found in nursery ${teacher.nursery_id}`);
    return;
  }

  const { data: record } = await supabase
    .from('daily_attendance')
    .select('id, teacher_confirmed')
    .eq('child_id', child.id)
    .eq('date', today)
    .single();

  if (!record || record.teacher_confirmed) return;

  await supabase
    .from('daily_attendance')
    .update({
      teacher_confirmed: true,
      teacher_confirmed_time: new Date().toISOString(),
      teacher_confirmed_by: teacher.id,
    })
    .eq('id', record.id);
}

// ---------------------------------------------------------------------------
// Check-in response handler (morning + second ping)
// ---------------------------------------------------------------------------

export async function processCheckinResponse(
  senderPhone: string,
  attendanceId: string,
  response: 'yes' | 'late' | 'no'
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

  const parentResponse =
    response === 'yes' ? 'dropping_off' :
    response === 'late' ? 'dropping_off_late' :
    'not_today';
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
  } else if (response === 'late') {
    await sendTextMessage(senderPhone, lateArrivalPromptMessage().text);
    await setConversationState(parent.id, 'awaiting_late_arrival_time', attendanceId);
  } else {
    // "Not today" → ask for explanation
    const { data: child } = await supabase
      .from('children')
      .select('name')
      .eq('id', record.child_id)
      .single();

    const msg = explanationPromptMessage(child?.name ?? '', attendanceId);
    await setConversationState(parent.id, 'awaiting_explanation', attendanceId);
    await sendInteractiveButtonMessage(senderPhone, msg.text, msg.buttons!);
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
// Multi-child combined poll handler
// ---------------------------------------------------------------------------

async function sendConflictClarification(
  senderPhone: string,
  childName: string,
  attendanceId: string
): Promise<void> {
  const supabase = createServiceClient();
  // Clear the conflicting response so the follow-up can set a clean one
  await supabase
    .from('daily_attendance')
    .update({ parent_response: null, parent_response_time: null, parent_response_by: null })
    .eq('id', attendanceId);

  await sendInteractiveButtonMessage(
    senderPhone,
    `יש סתירה לגבי ${childName} — האם הוא/היא מגיע/ה היום לגן?`,
    [
      { id: 'clarify_yes', title: '✓ בדרך לגן' },
      { id: 'clarify_no', title: '✗ לא היום' },
    ],
    false
  );
}

async function handleMultiChildCheckin(
  senderPhone: string,
  childName: string,
  action: 'yes' | 'no'
): Promise<void> {
  const attendanceId = await lookupAttendanceByChildName(senderPhone, childName);
  if (!attendanceId) {
    console.error(`[Checkin] No attendance found for child "${childName}"`);
    return;
  }

  const supabase = createServiceClient();
  const { data: record } = await supabase
    .from('daily_attendance')
    .select('parent_response')
    .eq('id', attendanceId)
    .single();

  if (record?.parent_response) {
    const wasDropping =
      record.parent_response === 'dropping_off' ||
      record.parent_response === 'dropping_off_late';
    const nowDropping = action === 'yes';

    if (wasDropping !== nowDropping) {
      await sendConflictClarification(senderPhone, childName, attendanceId);
    }
    // Same answer → idempotent, ignore
    return;
  }

  await processCheckinResponse(senderPhone, attendanceId, action);
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
    }

    await resetConversationState(parent.id);

    if (convo.attendance_id) {
      await forwardExplanationToTeacher(convo.attendance_id, parent, text);
    }
    await sendTextMessage(senderPhone, explanationReceivedMessage().text);
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
  } else if (convo.state === 'awaiting_late_arrival_time') {
    // Parent provided expected arrival time after selecting "yes but late"
    if (convo.attendance_id) {
      await supabase
        .from('daily_attendance')
        .update({ parent_explanation: text })
        .eq('id', convo.attendance_id);

      await forwardLateArrivalToTeacher(convo.attendance_id, parent, text);
    }

    await sendTextMessage(senderPhone, lateArrivalConfirmedMessage().text);
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

async function forwardLateArrivalToTeacher(
  attendanceId: string,
  parent: { id: string; name: string; phone: string },
  arrivalTime: string
): Promise<void> {
  const supabase = createServiceClient();

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

  const text = [
    `הורה ${parent.name} דיווח שהילד/ה ${child.name} יגיע/ה מאוחר.`,
    `שעת הגעה משוערת: ${arrivalTime}`,
    `📞 ${parent.phone}`,
  ].join('\n');

  for (const teacher of teachers) {
    try {
      await sendTextMessage(toWhatsAppPhone(teacher.phone), text);
    } catch (err) {
      console.error(`[LateArrival] Failed to send to teacher ${teacher.phone}:`, err);
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
    // 1. Teacher poll response: no action match → option titles are plain child names
    if (parsed.messageType === 'poll_response' && !parsed.buttonReplyId) {
      const teacher = await lookupTeacher(parsed.sender);
      if (teacher) {
        // allPollOptions holds all selected children (multi-select support)
        for (const name of (parsed.allPollOptions ?? [])) {
          await handleTeacherPollResponse(teacher, name);
        }
        return { success: true };
      }
    }

    // 2. Button reply → route by action key derived from poll option title
    if (parsed.buttonReplyId) {
      const action = parsed.buttonReplyId;

      // Multi-child combined poll: only yes/no per child, no late option
      if ((action === 'checkin_yes' || action === 'checkin_no') && parsed.childName) {
        for (const opt of (parsed.allPollOptions ?? [])) {
          const multi = parseMultiChildOption(opt);
          if (multi) {
            await handleMultiChildCheckin(
              parsed.sender,
              multi.childName,
              multi.action.slice('checkin_'.length) as 'yes' | 'no'
            );
          }
        }
        return { success: true };
      }

      // Single-child poll: yes / late / no
      if (action === 'checkin_yes' || action === 'checkin_late' || action === 'checkin_no') {
        const attendanceId = await lookupPendingCheckinAttendance(parsed.sender);
        if (attendanceId) {
          await processCheckinResponse(
            parsed.sender,
            attendanceId,
            action.slice('checkin_'.length) as 'yes' | 'late' | 'no'
          );
        }
        return { success: true };
      }

      if (action === 'explain_skip') {
        const parent = await lookupParent(parsed.sender);
        if (parent) {
          const convo = await getConversationState(parent.id);
          if (convo?.attendance_id) {
            await handleExplanationSkip(parsed.sender, convo.attendance_id);
          }
        }
        return { success: true };
      }

      if (action === 'ninealert_inclass' || action === 'ninealert_withme') {
        const attendanceId = await lookupPendingNineAmAttendance(parsed.sender);
        if (attendanceId) {
          await handleNineAmResponse(
            parsed.sender,
            attendanceId,
            action.slice('ninealert_'.length) as 'inclass' | 'withme'
          );
        }
        return { success: true };
      }
    }

    // 3. Free text → route via conversation state
    if (parsed.messageText) {
      await handleFreeText(parsed.sender, parsed.messageText);
    }
  } catch (err) {
    console.error('[Webhook] Error processing message:', err);
  }

  return { success: true };
}
