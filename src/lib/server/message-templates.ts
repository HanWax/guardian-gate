/**
 * Centralized WhatsApp message text, button ID patterns, and conversation state types.
 *
 * All user-facing strings are Hebrew. Button titles must be ≤ 20 chars.
 * Button IDs encode the action + attendance record UUID for stateless routing.
 *
 * For WASenderAPI polls, IDs are embedded in the poll option text using "::" as a separator.
 * Format: "id::visual_title"
 */

// ---------------------------------------------------------------------------
// Conversation state
// ---------------------------------------------------------------------------

export type ConversationState =
  | 'idle'
  | 'awaiting_explanation'
  | 'awaiting_name_verify'
  | 'awaiting_other_explain'
  | 'awaiting_late_arrival_time'

// ---------------------------------------------------------------------------
// Poll title → action routing (for webhook)
// ---------------------------------------------------------------------------

/**
 * Maps poll option display text to a routing action key.
 * Used by the webhook to identify which action was selected without
 * embedding IDs in the visible option text.
 */
export const POLL_TITLE_TO_ACTION: Record<string, string> = {
  '✓ בדרך לגן': 'checkin_yes',
  '✗ לא היום': 'checkin_no',
  '✓ כן, בדרך': 'checkin_yes',
  'כן, אבל מאוחר': 'checkin_late',
  'דלג/י': 'explain_skip',
  'הורדתי': 'ninealert_inclass',
  'איתי': 'ninealert_withme',
}

// ---------------------------------------------------------------------------
// Multi-child poll option format
// ---------------------------------------------------------------------------

/** Suffix appended to child name for a "coming" option in a combined poll */
export const MULTI_YES_SUFFIX = ' - כן ✓'
/** Suffix appended to child name for a "not coming" option in a combined poll */
export const MULTI_NO_SUFFIX = ' - לא ✗'

/**
 * Parses a combined poll option title into child name + action.
 * Returns null if the title does not match the multi-child format.
 * Format: "${childName} - כן ✓" or "${childName} - לא ✗"
 */
export function parseMultiChildOption(
  title: string
): { childName: string; action: 'checkin_yes' | 'checkin_no' } | null {
  const t = title.trim()
  if (t.endsWith(MULTI_YES_SUFFIX)) {
    return { childName: t.slice(0, -MULTI_YES_SUFFIX.length), action: 'checkin_yes' }
  }
  if (t.endsWith(MULTI_NO_SUFFIX)) {
    return { childName: t.slice(0, -MULTI_NO_SUFFIX.length), action: 'checkin_no' }
  }
  return null
}

// ---------------------------------------------------------------------------
// Message builders
// ---------------------------------------------------------------------------

export interface ButtonDef {
  id: string
  title: string
}

export interface MessagePayload {
  text: string
  buttons?: ButtonDef[]
}

/** Flow 2 — Second ping (reminder) */
export function secondPingMessage(
  childName: string,
  attendanceId: string
): MessagePayload {
  return {
    text: `תזכורת: אנא אשרו האם ${childName} מגיע/ה היום`,
    buttons: [
      { id: `checkin_yes_${attendanceId}`, title: '✓ כן, בדרך' },
      { id: `checkin_late_${attendanceId}`, title: 'כן, אבל מאוחר' },
      { id: `checkin_no_${attendanceId}`, title: '✗ לא היום' },
    ],
  }
}

/** Flow 3 — Explanation prompt (after "not today") */
export function explanationPromptMessage(
  childName: string,
  attendanceId: string
): MessagePayload {
  return {
    text: `תודה. רוצה לשתף פרטים על ${childName}?`,
    buttons: [{ id: `explain_skip_${attendanceId}`, title: 'דלג/י' }],
  }
}

/** Flow 2b — Late arrival time prompt */
export function lateArrivalPromptMessage(): MessagePayload {
  return { text: 'מה שעת ההגעה המשוערת?' }
}

/** Flow 2b — Late arrival time confirmed */
export function lateArrivalConfirmedMessage(): MessagePayload {
  return { text: 'תודה! נעדכן את הצוות. נתראה בקרוב ✓' }
}

/** Flow 4a — Verify child is in class (name entry prompt) */
export function verifyInClassMessage(): MessagePayload {
  return { text: 'לאישור שהילד/ה בכיתה, הקלד/י את שם הילד/ה:' }
}

/** Flow 4a — Name verified, forwarding to staff */
export function verifySuccessMessage(): MessagePayload {
  return { text: 'תודה, מעבירים לצוות לבדיקה.' }
}

/** Flow 4a — Name mismatch retry */
export function verifyRetryMessage(): MessagePayload {
  return { text: 'השם לא תואם. נסה/י שוב:' }
}

/** Flow 4b — Other explanation prompt */
export function otherExplanationPromptMessage(): MessagePayload {
  return { text: 'ספר/י לנו עוד:' }
}

/** Flow 8 — Confirmation after "dropping off" */
export function confirmDroppingOffMessage(): MessagePayload {
  return { text: 'תודה, נתראה בקרוב! ✓' }
}

/** Flow 8 — Confirmation after "not today" (skip explanation) */
export function confirmNotTodayMessage(): MessagePayload {
  return { text: 'תודה! יום טוב ✓' }
}

/** Confirmation that explanation was received */
export function explanationReceivedMessage(): MessagePayload {
  return { text: 'תודה על השיתוף! יום טוב ✓' }
}

/** Already responded acknowledgement */
export function alreadyRespondedMessage(): MessagePayload {
  return { text: 'כבר קיבלנו את תשובתך, תודה!' }
}

/** Flow 5 — Teacher attendance poll (9am): expected children only, multiSelect */
export function teacherPollMessage(
  nurseryName: string,
  date: string,
  expectedChildren: string[],
  part?: string
): MessagePayload {
  const partSuffix = part ? ` (${part})` : ''
  return {
    text: `בדיקת נוכחות ${nurseryName} — ${date}${partSuffix}\nסמן/י כל ילד/ה שהגיע/ה:`,
    buttons: expectedChildren.map((name) => ({ id: name, title: name })),
  }
}

/**
 * Sentinel option appended to single-child teacher polls so WASender accepts them
 * (the API requires ≥2 options). Tapping it is a no-op in handleTeacherPollResponse.
 */
export const TEACHER_POLL_NONE_OPTION = '⏳ אחכה לעדכון'

/** Flow 5a — Teacher FYI at poll time when no parents have responded yet */
export function teacherNoResponseSummaryMessage(
  children: Array<{ name: string; parentPhones: string[] }>
): MessagePayload {
  const lines = [
    'לתשומת לבך: לא התקבלה תגובה מהורים של:',
    ...children.map(({ name, parentPhones }) =>
      parentPhones.length > 0
        ? `  • ${name} (${parentPhones.join(', ')})`
        : `  • ${name}`
    ),
  ]
  return { text: lines.join('\n') }
}

/** Flow 5b — Teacher FYI after 9:30 follow-ups sent */
export function teacherFollowupFYIMessage(
  unconfirmedExpected: string[],
  noResponse: Array<{ name: string; parentPhone: string }>
): MessagePayload {
  const lines: string[] = ['⚠️ ילדים שלא אושרו:']

  if (unconfirmedExpected.length > 0) {
    lines.push('', 'צפויים אך לא אושרו הגעה:')
    for (const name of unconfirmedExpected) lines.push(`  • ${name}`)
  }

  if (noResponse.length > 0) {
    lines.push('', 'הורים לא ענו:')
    for (const { name, parentPhone } of noResponse) lines.push(`  • ${name} (${parentPhone})`)
  }

  lines.push('', 'נשלחה הודעת מעקב להורים.')

  return { text: lines.join('\n') }
}

/** Flow 5c — Parent follow-up for expected child not confirmed by teacher */
export function parentUnconfirmedFollowupMessage(
  childName: string,
  nurseryName: string,
  attendanceId: string
): MessagePayload {
  return {
    text: `שלום, ${childName} צפוי/ה להגיע ל${nurseryName} אך טרם אושרה הגעתו/ה. איפה הילד/ה?`,
    buttons: [
      { id: `ninealert_inclass_${attendanceId}`, title: 'הורדתי' },
      { id: `ninealert_withme_${attendanceId}`, title: 'איתי' },
    ],
  }
}

/** Flow 5d — Parent follow-up for child with no morning response */
export function parentNoResponseFollowupMessage(
  childName: string,
  nurseryName: string
): MessagePayload {
  return {
    text: `שלום, טרם קיבלנו עדכון לגבי ${childName} ל${nurseryName} היום. האם הכל בסדר?`,
  }
}

/** Flow 6 — Admin escalation (inconsistency alert) */
export function adminEscalationMessage(
  nurseryName: string,
  childName: string,
  parentClaim: string,
  teacherStatus: string,
  parentPhone: string,
  teacherPhone: string
): MessagePayload {
  const text = [
    `🚨 חוסר התאמה ב${nurseryName}`,
    `ילד/ה: ${childName}`,
    `ההורה טוען: ${parentClaim}`,
    `סטטוס מורה: ${teacherStatus}`,
    `📞 הורה: ${parentPhone}`,
    `📞 צוות: ${teacherPhone}`,
  ].join('\n')

  return { text }
}

/** Flow 7 — Forward parent's explanation to teacher */
export function parentExplanationForwardMessage(
  childName: string,
  parentName: string,
  explanation: string,
  parentPhone: string
): MessagePayload {
  const text = [
    'שלום, התקבלה הודעה מהורה בנוגע להיעדרות היום.',
    '',
    `ילד/ה: ${childName}`,
    `הורה: ${parentName}`,
    '',
    'הסבר ההורה:',
    `"${explanation}"`,
    '',
    `לפרטים נוספים ניתן ליצור קשר בטלפון: ${parentPhone} 📱`,
  ].join('\n')

  return { text }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fuzzy name match: normalizes whitespace, trims, and compares case-insensitively.
 * For Hebrew names this is straightforward since there's no case.
 */
export function namesMatch(typed: string, expected: string): boolean {
  const normalize = (s: string) => s.trim().replace(/\s+/g, ' ')
  return normalize(typed) === normalize(expected)
}
