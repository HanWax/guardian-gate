/**
 * WhatsApp API client for sending messages via WASenderAPI.
 *
 * @see https://wasenderapi.com/api-docs
 */

const API_BASE_URL = process.env.WASENDER_API_BASE_URL || 'https://api.wasenderapi.com';

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
  const apiKey = process.env.WASENDER_API_KEY;

  if (!apiKey) {
    throw new Error('WASENDER_API_KEY environment variable is not set');
  }

  const url = `${API_BASE_URL}/api/send-message`;

  const body = {
    to: `+${to}`,
    text,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `WhatsApp API error: ${response.status} ${response.statusText} - ${JSON.stringify(data)}`
    );
  }

  return data;
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
  buttons: InteractiveButton[]
): Promise<WhatsAppMessageResponse> {
  // Import here to avoid circular dependency
  const { encodeButtonId } = await import('./message-templates');

  if (buttons.length === 0 || buttons.length > 12) {
    throw new Error('Interactive messages require 1-12 options');
  }

  if (bodyText.length > 1024) {
    throw new Error('Body text must not exceed 1024 characters');
  }

  const apiKey = process.env.WASENDER_API_KEY;

  if (!apiKey) {
    throw new Error('WASENDER_API_KEY environment variable is not set');
  }

  const url = `${API_BASE_URL}/api/send-message`;

  const body = {
    to: `+${to}`,
    poll: {
      question: bodyText,
      options: buttons.map((btn) => encodeButtonId(btn.id, btn.title)),
      multiSelect: false,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `WhatsApp API error: ${response.status} ${response.statusText} - ${JSON.stringify(data)}`
    );
  }

  return data;
}
