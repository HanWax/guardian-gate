/**
 * WhatsApp Cloud API client for sending messages via Meta Graph API.
 *
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
 */

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

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
