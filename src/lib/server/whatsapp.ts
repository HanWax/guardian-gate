/**
 * WhatsApp API client for sending messages via WASenderAPI.
 *
 * @see https://wasenderapi.com/api-docs
 */

const API_BASE_URL = process.env.WASENDER_API_BASE_URL || 'https://api.wasenderapi.com';

/**
 * Minimum interval between WASender sends within a single function instance.
 * Acts as a first-line burst buffer. It does NOT by itself clear WASender's
 * rate limits (Account Protection is 1 msg / 5 s, the trial plan 1 msg / min) —
 * the 429 backoff below does that adaptively by honoring the server-supplied
 * `retry_after`. Configurable via WASENDER_MIN_INTERVAL_MS.
 */
const DEFAULT_MIN_SEND_INTERVAL_MS = Number(process.env.WASENDER_MIN_INTERVAL_MS ?? 1100);
let minSendIntervalMs = DEFAULT_MIN_SEND_INTERVAL_MS;
let lastSendAt = 0;

/**
 * Ceiling on how many times a single send is retried after a 429. Retries also
 * stop early once the cumulative wait would exceed maxTotalRetryWaitMs, so this
 * is an upper bound on attempts, not a fixed count.
 */
const DEFAULT_MAX_SEND_RETRIES = Number(process.env.WASENDER_MAX_RETRIES ?? 5);
let maxSendRetries = DEFAULT_MAX_SEND_RETRIES;
/** Fallback wait when a 429 omits retry_after; matches Account Protection's 5 s window. */
const DEFAULT_RETRY_AFTER_MS = 5_000;
/** Safety cap so a pathological retry_after can't stall a send indefinitely. */
const MAX_RETRY_AFTER_MS = 65_000;
/**
 * Ceiling on the *total* time one send may spend waiting across all its 429
 * retries. Keeps a single send comfortably under the function timeout even on
 * the trial plan (1 msg/min → 60 s retry_after): once the next wait would push
 * the cumulative total past this, we stop and throw, leaving the second-ping
 * safety net to reach the family on a later run.
 */
const DEFAULT_MAX_TOTAL_RETRY_WAIT_MS = 120_000;
let maxTotalRetryWaitMs = DEFAULT_MAX_TOTAL_RETRY_WAIT_MS;
// Promise-chain mutex: concurrent callers append to the chain so each waits
// for the previous to finish its delay before reading lastSendAt. A plain
// timestamp check is racy — two parallel awaits would both see the same
// lastSendAt and burst past the limit.
let throttleChain: Promise<void> = Promise.resolve();

export async function throttleSend(): Promise<void> {
  const next = throttleChain.then(async () => {
    const wait = minSendIntervalMs - (Date.now() - lastSendAt);
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    lastSendAt = Date.now();
  });
  throttleChain = next.catch(() => {});
  return next;
}

/** Test-only: clears throttle state and optionally overrides the interval, retry budget, and total-wait cap. */
export function _resetThrottleForTesting(
  intervalMs?: number,
  retries?: number,
  totalWaitCapMs?: number
): void {
  lastSendAt = 0;
  throttleChain = Promise.resolve();
  minSendIntervalMs = intervalMs ?? DEFAULT_MIN_SEND_INTERVAL_MS;
  maxSendRetries = retries ?? DEFAULT_MAX_SEND_RETRIES;
  maxTotalRetryWaitMs = totalWaitCapMs ?? DEFAULT_MAX_TOTAL_RETRY_WAIT_MS;
}

/**
 * Resolves the wait before retrying a 429, in milliseconds.
 *
 * WASender reports `retry_after` (seconds) in the JSON body; we also accept a
 * standard Retry-After header as a fallback, then a fixed default. The value is
 * clamped so a bad number can't hang the function.
 */
export function resolveRetryAfterMs(body: unknown, headers: Headers): number {
  const clamp = (seconds: number) => Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);

  const bodySeconds = Number((body as { retry_after?: number | string } | null)?.retry_after);
  if (Number.isFinite(bodySeconds) && bodySeconds >= 0) return clamp(bodySeconds);

  const headerRaw = headers.get('retry-after');
  if (headerRaw !== null) {
    const headerSeconds = Number(headerRaw);
    if (Number.isFinite(headerSeconds) && headerSeconds >= 0) return clamp(headerSeconds);
  }

  return DEFAULT_RETRY_AFTER_MS;
}

/**
 * POSTs a message body to WASender, retrying on 429 (rate limit) by waiting the
 * server-supplied `retry_after`. Shared by the text and poll send paths so both
 * survive Account Protection / trial-plan throttling within a single run.
 */
async function postMessage(body: object): Promise<WhatsAppMessageResponse> {
  const apiKey = process.env.WASENDER_API_KEY;

  if (!apiKey) {
    throw new Error('WASENDER_API_KEY environment variable is not set');
  }

  const url = `${API_BASE_URL}/api/send-message`;
  let totalRetryWaitMs = 0;

  for (let attempt = 0; ; attempt++) {
    await throttleSend();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok) {
      return data;
    }

    if (response.status === 429 && attempt < maxSendRetries) {
      const waitMs = resolveRetryAfterMs(data, response.headers);
      // Stop retrying if this wait would blow the total budget; the second-ping
      // safety net will reach the family on a later run instead.
      if (totalRetryWaitMs + waitMs <= maxTotalRetryWaitMs) {
        totalRetryWaitMs += waitMs;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
    }

    throw new Error(
      `WhatsApp API error: ${response.status} ${response.statusText} - ${JSON.stringify(data)}`
    );
  }
}

/**
 * Button definition for interactive button messages (polls).
 * ID is encoded in poll option text using "::" separator for WASenderAPI.
 */
export interface InteractiveButton {
  /** Unique button identifier (encoded in poll option for WASenderAPI) */
  id: string;
  /** Button display text */
  title: string;
}

/**
 * Response from WASenderAPI when sending a message.
 */
export interface WhatsAppMessageResponse {
  success: boolean;
  data?: {
    msgId: number;
    jid: string;
    status: string;
  };
  error?: string;
}

/**
 * Sends a plain text WhatsApp message via WASenderAPI.
 *
 * @param to - Recipient phone number in international format (e.g., "972501234567")
 * @param text - Message text content (supports Hebrew and emojis)
 * @returns Promise resolving to the API response
 * @throws Error if environment variables are not set or API request fails
 *
 * @example
 * ```ts
 * await sendTextMessage('972501234567', 'שלום! איך הולך?');
 * ```
 */
export async function sendTextMessage(
  to: string,
  text: string
): Promise<WhatsAppMessageResponse> {
  return postMessage({
    to: `+${to}`,
    text,
  });
}

/**
 * Sends an interactive poll message (buttons) via WASenderAPI.
 *
 * WASenderAPI uses polls to display interactive options the user can tap.
 * Button IDs are encoded in the poll option text using "::" as separator: "id::visual_title"
 * Maps to 1-12 options (replaces Meta's 3-button limit).
 *
 * @param to - Recipient phone number in international format (e.g., "972501234567")
 * @param bodyText - Message body text (poll question)
 * @param buttons - Array of 1-12 button options (with id and title)
 * @returns Promise resolving to the API response
 * @throws Error if validation fails, env vars are missing, or API request fails
 *
 * @example
 * ```ts
 * await sendInteractiveButtonMessage(
 *   '972501234567',
 *   'האם הילד/ה בדרך היום?',
 *   [
 *     { id: 'checkin_yes_uuid', title: '✓ בדרך' },
 *     { id: 'checkin_no_uuid', title: '✗ לא היום' },
 *   ]
 * );
 * ```
 */
export async function sendInteractiveButtonMessage(
  to: string,
  bodyText: string,
  buttons: InteractiveButton[],
  multiSelect = false
): Promise<WhatsAppMessageResponse> {
  if (buttons.length === 0 || buttons.length > 12) {
    throw new Error('Interactive messages require 1-12 options');
  }

  if (bodyText.length > 1024) {
    throw new Error('Body text must not exceed 1024 characters');
  }

  return postMessage({
    to: `+${to}`,
    poll: {
      question: bodyText,
      options: buttons.map((btn) => btn.title),
      multiSelect,
    },
  });
}
