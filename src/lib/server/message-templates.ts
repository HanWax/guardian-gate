/**
 * Centralized WhatsApp message text, button ID patterns, and conversation state types.
 *
 * All user-facing strings are Hebrew. Button titles must be ≤ 20 chars.
 * Button IDs encode the action + attendance record UUID for stateless routing.
 */

// ---------------------------------------------------------------------------
// Conversation state
// ---------------------------------------------------------------------------

export type ConversationState =
  | 'idle'
  | 'awaiting_explanation'
  | 'awaiting_name_verify'
  | 'awaiting_other_explain'

// ---------------------------------------------------------------------------
// Button ID patterns (regex)
// ---------------------------------------------------------------------------

/** checkin_yes_{uuid} or checkin_no_{uuid} */
export const CHECKIN_BUTTON_REGEX = /^checkin_(yes|no)_([0-9a-f-]{36})$/

/** explain_skip_{uuid} */
export const EXPLAIN_SKIP_REGEX = /^explain_skip_([0-9a-f-]{36})$/

/** ninealert_(inclass|withme|other)_{uuid} */
export const NINE_AM_ALERT_REGEX =
  /^ninealert_(inclass|withme|other)_([0-9a-f-]{36})$/

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

/** Flow 1 — Morning check-in */
export function morningCheckinMessage(
  parentName: string,
  childName: string,
  attendanceId: string
): MessagePayload {
  return {
    text: `בוקר טוב ${parentName}! האם ${childName} מגיע/ה היום לגן?`,
    buttons: [
      { id: `checkin_yes_${attendanceId}`, title: '\u2713 בדרך לגן' },
      { id: `checkin_no_${attendanceId}`, title: '\u2717 לא היום' },
    ],
  }
}

/** Flow 2 — Second ping (reminder) */
export function secondPingMessage(
  childName: string,
  attendanceId: string
): MessagePayload {
  return {
    text: `תזכורת: אנא אשרו האם ${childName} מגיע/ה היום`,
    buttons: [
      { id: `checkin_yes_${attendanceId}`, title: '\u2713 בדרך לגן' },
      { id: `checkin_no_${attendanceId}`, title: '\u2717 לא היום' },
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

/** Flow 4 — 9am unconfirmed arrival alert */
export function nineAmAlertMessage(
  childName: string,
  nurseryName: string,
  attendanceId: string
): MessagePayload {
  return {
    text: `לא אישרנו עדיין את הגעת ${childName} ל${nurseryName}. איפה הילד/ה?`,
    buttons: [
      { id: `ninealert_inclass_${attendanceId}`, title: 'בכיתה' },
      { id: `ninealert_withme_${attendanceId}`, title: 'איתי' },
      { id: `ninealert_other_${attendanceId}`, title: 'אחר' },
    ],
  }
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
  return { text: 'תודה, נתראה בקרוב! \u2713' }
}

/** Flow 8 — Confirmation after "not today" (skip explanation) */
export function confirmNotTodayMessage(): MessagePayload {
  return { text: 'תודה! יום טוב \u2713' }
}

/** Confirmation that explanation was received */
export function explanationReceivedMessage(): MessagePayload {
  return { text: 'תודה על השיתוף! יום טוב \u2713' }
}

/** Already responded acknowledgement */
export function alreadyRespondedMessage(): MessagePayload {
  return { text: 'כבר קיבלנו את תשובתך, תודה!' }
}

/** Flow 5 — Teacher consolidated summary */
export function teacherSummaryMessage(
  nurseryName: string,
  date: string,
  expected: string[],
  notComing: Array<{ name: string; explanation?: string }>,
  noResponse: Array<{ name: string; parentPhone: string }>
): MessagePayload {
  const expectedList = expected.length > 0
    ? expected.map((n) => `  • ${n}`).join('\n')
    : '  (אין)'
  const notComingList = notComing.length > 0
    ? notComing
        .map((c) => `  • ${c.name}${c.explanation ? ` — ${c.explanation}` : ''}`)
        .join('\n')
    : '  (אין)'
  const noResponseList = noResponse.length > 0
    ? noResponse.map((c) => `  • ${c.name} (${c.parentPhone})`).join('\n')
    : '  (אין)'

  const text = [
    `סיכום נוכחות - ${nurseryName} - ${date}`,
    '',
    `\u2713 צפויים להגיע: ${expected.length}`,
    expectedList,
    '',
    `\u2717 לא מגיעים היום: ${notComing.length}`,
    notComingList,
    '',
    `\u26A0\uFE0F לא ענו: ${noResponse.length}`,
    noResponseList,
  ].join('\n')

  return { text }
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
    `\uD83D\uDEA8 חוסר התאמה ב${nurseryName}`,
    `ילד/ה: ${childName}`,
    `ההורה טוען: ${parentClaim}`,
    `סטטוס מורה: ${teacherStatus}`,
    `\uD83D\uDCDE הורה: ${parentPhone}`,
    `\uD83D\uDCDE צוות: ${teacherPhone}`,
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
    `לפרטים נוספים ניתן ליצור קשר בטלפון: ${parentPhone} \uD83D\uDCF1`,
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
