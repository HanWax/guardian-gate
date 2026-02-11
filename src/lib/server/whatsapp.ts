/**
 * WhatsApp Cloud API client for sending messages via Meta Graph API.
 *
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
 */

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Button definition for interactive button messages.
 */
export interface InteractiveButton {
  /** Unique button identifier, max 256 chars (e.g., "btn_dropping_off") */
  id: string;
  /** Button display text, max 20 chars (e.g., "✓ בדרך") */
  title: string;
}

/**
 * Component for template message parameters (e.g., dynamic text replacements).
 */
export interface TemplateComponent {
  type: string;
  parameters?: Array<{ type: string; text: string }>;
}

/**
 * Response from WhatsApp Cloud API when sending a message.
 */
export interface WhatsAppMessageResponse {
  messaging_product: string;
  contacts?: Array<{ input: string; wa_id: string }>;
  messages?: Array<{ id: string }>;
}

/**
 * Sends a WhatsApp template message to a phone number.
 *
 * Template messages must be pre-approved in Meta Business Manager before use.
 *
 * @param to - Recipient phone number in international format (e.g., "972501234567")
 * @param templateName - Name of the approved message template
 * @param languageCode - Language code for the template (e.g., "he" for Hebrew)
 * @param components - Optional template components for dynamic parameters
 * @returns Promise resolving to the API response
 * @throws Error if environment variables are not set or API request fails
 *
 * @example
 * ```ts
 * await sendTemplateMessage('972501234567', 'hello_world', 'he');
 * ```
 *
 * @example With components
 * ```ts
 * await sendTemplateMessage('972501234567', 'greeting', 'he', [
 *   {
 *     type: 'body',
 *     parameters: [{ type: 'text', text: 'שרה' }]
 *   }
 * ]);
 * ```
 */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string,
  components?: TemplateComponent[]
): Promise<WhatsAppMessageResponse> {
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!apiToken) {
    throw new Error('WHATSAPP_API_TOKEN environment variable is not set');
  }

  if (!phoneNumberId) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID environment variable is not set');
  }

  const url = `${GRAPH_API_BASE_URL}/${phoneNumberId}/messages`;

  const templatePayload: {
    name: string;
    language: { code: string };
    components?: TemplateComponent[];
  } = {
    name: templateName,
    language: {
      code: languageCode,
    },
  };

  if (components) {
    templatePayload.components = components;
  }

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: templatePayload,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `WhatsApp API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
    );
  }

  return response.json();
}

/**
 * Sends a plain text WhatsApp message to a phone number.
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
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!apiToken) {
    throw new Error('WHATSAPP_API_TOKEN environment variable is not set');
  }

  if (!phoneNumberId) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID environment variable is not set');
  }

  const url = `${GRAPH_API_BASE_URL}/${phoneNumberId}/messages`;

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      body: text,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `WhatsApp API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
    );
  }

  return response.json();
}

/**
 * Sends an interactive button message via WhatsApp Cloud API.
 *
 * Interactive button messages display up to 3 reply buttons the user can tap.
 *
 * @param to - Recipient phone number in international format (e.g., "972501234567")
 * @param bodyText - Message body text (max 1024 chars)
 * @param buttons - Array of 1-3 reply buttons
 * @param options - Optional header and footer text
 * @returns Promise resolving to the API response
 * @throws Error if validation fails, env vars are missing, or API request fails
 *
 * @example
 * ```ts
 * await sendInteractiveButtonMessage(
 *   '972501234567',
 *   'האם הילד/ה בדרך היום?',
 *   [
 *     { id: 'btn_on_way', title: '✓ בדרך' },
 *     { id: 'btn_not_today', title: '✗ לא היום' },
 *   ]
 * );
 * ```
 */
export async function sendInteractiveButtonMessage(
  to: string,
  bodyText: string,
  buttons: InteractiveButton[],
  options?: { headerText?: string; footerText?: string }
): Promise<WhatsAppMessageResponse> {
  if (buttons.length === 0 || buttons.length > 3) {
    throw new Error('Interactive messages require 1-3 buttons');
  }

  if (bodyText.length > 1024) {
    throw new Error('Body text must not exceed 1024 characters');
  }

  for (const button of buttons) {
    if (button.title.length > 20) {
      throw new Error(`Button title "${button.title}" exceeds 20 character limit`);
    }
  }

  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!apiToken) {
    throw new Error('WHATSAPP_API_TOKEN environment variable is not set');
  }

  if (!phoneNumberId) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID environment variable is not set');
  }

  const url = `${GRAPH_API_BASE_URL}/${phoneNumberId}/messages`;

  const interactive: Record<string, unknown> = {
    type: 'button',
    body: { text: bodyText },
    action: {
      buttons: buttons.map((btn) => ({
        type: 'reply',
        reply: { id: btn.id, title: btn.title },
      })),
    },
  };

  if (options?.headerText) {
    interactive.header = { type: 'text', text: options.headerText };
  }

  if (options?.footerText) {
    interactive.footer = { text: options.footerText };
  }

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `WhatsApp API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
    );
  }

  return response.json();
}
