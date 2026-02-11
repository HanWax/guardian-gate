import { describe, it, expect, beforeEach, vi } from 'vitest';
import { verifyWebhook, parseIncomingMessage, verifyWebhookSignature, handleIncomingMessage, processCheckinResponse } from './whatsapp-webhook';
import crypto from 'crypto';

// Mock Supabase service client
const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockSingle = vi.fn();
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
const mockFrom = vi.fn().mockReturnValue({
  select: mockSelect,
  eq: mockEq,
  single: mockSingle,
  update: mockUpdate,
});

vi.mock('./auth', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

// Mock WhatsApp sending
const mockSendTextMessage = vi.fn().mockResolvedValue({});
vi.mock('./whatsapp', () => ({
  sendTextMessage: (...args: unknown[]) => mockSendTextMessage(...args),
  sendInteractiveButtonMessage: vi.fn(),
}));

// Mock console.log to test message logging
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('WhatsApp Webhook', () => {
  beforeEach(() => {
    // Set up environment variables for tests
    process.env.WHATSAPP_VERIFY_TOKEN = 'test-verify-token-123';
    process.env.WHATSAPP_API_TOKEN = 'test-api-token-456';
    consoleLogSpy.mockClear();
  });

  describe('verifyWebhook', () => {
    it('should return challenge when verify token matches', () => {
      const result = verifyWebhook({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test-verify-token-123',
        'hub.challenge': 'challenge-string-xyz',
      });

      expect(result.success).toBe(true);
      expect(result.challenge).toBe('challenge-string-xyz');
    });

    it('should return error when verify token does not match', () => {
      const result = verifyWebhook({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': 'challenge-string-xyz',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid verify token');
    });

    it('should return error when hub.mode is not subscribe', () => {
      const result = verifyWebhook({
        'hub.mode': 'unsubscribe',
        'hub.verify_token': 'test-verify-token-123',
        'hub.challenge': 'challenge-string-xyz',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid hub.mode');
    });

    it('should return error when hub.verify_token is missing', () => {
      const result = verifyWebhook({
        'hub.mode': 'subscribe',
        'hub.challenge': 'challenge-string-xyz',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing hub.verify_token');
    });

    it('should return error when hub.challenge is missing', () => {
      const result = verifyWebhook({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test-verify-token-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing hub.challenge');
    });

    it('should return error when WHATSAPP_VERIFY_TOKEN env var is not set', () => {
      delete process.env.WHATSAPP_VERIFY_TOKEN;

      const result = verifyWebhook({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test-verify-token-123',
        'hub.challenge': 'challenge-string-xyz',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('WHATSAPP_VERIFY_TOKEN');
    });
  });

  describe('parseIncomingMessage', () => {
    it('should parse message payload and extract sender, text, timestamp', () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '972501234567',
                    phone_number_id: 'test-phone-id',
                  },
                  messages: [
                    {
                      from: '972509876543',
                      id: 'wamid.xyz',
                      timestamp: '1234567890',
                      type: 'text',
                      text: {
                        body: 'שלום! זו הודעת בדיקה',
                      },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const result = parseIncomingMessage(payload);

      expect(result.success).toBe(true);
      expect(result.sender).toBe('972509876543');
      expect(result.messageText).toBe('שלום! זו הודעת בדיקה');
      expect(result.timestamp).toBe('1234567890');
      expect(result.messageId).toBe('wamid.xyz');
    });

    it('should handle payload with no messages', () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '972501234567',
                    phone_number_id: 'test-phone-id',
                  },
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const result = parseIncomingMessage(payload);

      expect(result.success).toBe(true);
      expect(result.sender).toBeUndefined();
      expect(result.messageText).toBeUndefined();
    });

    it('should parse interactive button_reply message', () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '972501234567',
                    phone_number_id: 'test-phone-id',
                  },
                  messages: [
                    {
                      from: '972509876543',
                      id: 'wamid.btn1',
                      timestamp: '1234567890',
                      type: 'interactive',
                      interactive: {
                        type: 'button_reply',
                        button_reply: {
                          id: 'btn_on_way',
                          title: '✓ בדרך',
                        },
                      },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const result = parseIncomingMessage(payload);

      expect(result.success).toBe(true);
      expect(result.sender).toBe('972509876543');
      expect(result.messageType).toBe('interactive');
      expect(result.buttonReplyId).toBe('btn_on_way');
      expect(result.buttonReplyTitle).toBe('✓ בדרך');
      expect(result.messageText).toBeUndefined();
    });

    it('should parse template quick_reply button message', () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '972501234567',
                    phone_number_id: 'test-phone-id',
                  },
                  messages: [
                    {
                      from: '972509876543',
                      id: 'wamid.btn2',
                      timestamp: '1234567890',
                      type: 'button',
                      button: {
                        text: '✓ בדרך',
                        payload: 'btn_dropping_off',
                      },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const result = parseIncomingMessage(payload);

      expect(result.success).toBe(true);
      expect(result.sender).toBe('972509876543');
      expect(result.messageType).toBe('button');
      expect(result.buttonReplyId).toBe('btn_dropping_off');
      expect(result.buttonReplyTitle).toBe('✓ בדרך');
      expect(result.messageText).toBeUndefined();
    });

    it('should handle payload with non-text message type', () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '972501234567',
                    phone_number_id: 'test-phone-id',
                  },
                  messages: [
                    {
                      from: '972509876543',
                      id: 'wamid.abc',
                      timestamp: '1234567890',
                      type: 'image',
                      image: {
                        id: 'image123',
                      },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const result = parseIncomingMessage(payload);

      expect(result.success).toBe(true);
      expect(result.sender).toBe('972509876543');
      expect(result.messageText).toBeUndefined(); // No text for image messages
      expect(result.timestamp).toBe('1234567890');
    });
  });

  describe('verifyWebhookSignature', () => {
    const testPayload = JSON.stringify({ test: 'data' });
    const testSecret = 'test-api-token-456';

    it('should return true for valid signature', () => {
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(testPayload);
      const validSignature = `sha256=${hmac.digest('hex')}`;

      const result = verifyWebhookSignature(testPayload, validSignature);

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const invalidSignature = 'sha256=invalid-signature-hash';

      const result = verifyWebhookSignature(testPayload, invalidSignature);

      expect(result).toBe(false);
    });

    it('should return false when signature does not start with sha256=', () => {
      const invalidSignature = 'invalid-format';

      const result = verifyWebhookSignature(testPayload, invalidSignature);

      expect(result).toBe(false);
    });

    it('should return false when WHATSAPP_API_TOKEN is not set', () => {
      delete process.env.WHATSAPP_API_TOKEN;

      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(testPayload);
      const validSignature = `sha256=${hmac.digest('hex')}`;

      const result = verifyWebhookSignature(testPayload, validSignature);

      expect(result).toBe(false);
    });
  });

  describe('handleIncomingMessage', () => {
    it('should log parsed message details when message is received', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '972501234567',
                    phone_number_id: 'test-phone-id',
                  },
                  messages: [
                    {
                      from: '972509876543',
                      id: 'wamid.xyz',
                      timestamp: '1234567890',
                      type: 'text',
                      text: {
                        body: 'Test message',
                      },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const result = await handleIncomingMessage(payload);

      expect(result.success).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[WhatsApp Message Received]',
        expect.objectContaining({
          sender: '972509876543',
          messageText: 'Test message',
          timestamp: '1234567890',
          messageId: 'wamid.xyz',
          messageType: 'text',
        })
      );
    });

    it('should return success without logging when no messages in payload', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '972501234567',
                    phone_number_id: 'test-phone-id',
                  },
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      consoleLogSpy.mockClear();
      const result = await handleIncomingMessage(payload);

      expect(result.success).toBe(true);
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        '[WhatsApp Message Received]',
        expect.anything()
      );
    });

    it('should handle non-text messages by logging type only', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '972501234567',
                    phone_number_id: 'test-phone-id',
                  },
                  messages: [
                    {
                      from: '972509876543',
                      id: 'wamid.abc',
                      timestamp: '1234567890',
                      type: 'image',
                      image: {
                        id: 'image123',
                      },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      consoleLogSpy.mockClear();
      const result = await handleIncomingMessage(payload);

      expect(result.success).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[WhatsApp Message Received]',
        expect.objectContaining({
          sender: '972509876543',
          timestamp: '1234567890',
          messageType: 'image',
        })
      );
    });
  });

  describe('processCheckinResponse', () => {
    beforeEach(() => {
      mockFrom.mockClear();
      mockSendTextMessage.mockClear();
      consoleErrorSpy.mockClear();
    });

    it('should update attendance and send confirmation for "yes" response', async () => {
      const attendanceId = '11111111-1111-1111-1111-111111111111';

      // Mock chained calls for: parents lookup, attendance lookup, children_parents link, attendance update
      const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'parent-1' }, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: attendanceId, child_id: 'child-1', parent_response: null },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { child_id: 'child-1' }, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: mockUpdateEq,
          }),
        });

      await processCheckinResponse('972509876543', attendanceId, 'yes');

      expect(mockSendTextMessage).toHaveBeenCalledWith(
        '972509876543',
        expect.stringContaining('בדרך לגן')
      );
    });

    it('should send already-responded message when parent_response is set', async () => {
      const attendanceId = '22222222-2222-2222-2222-222222222222';

      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'parent-1' }, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: attendanceId, child_id: 'child-1', parent_response: 'dropping_off' },
                error: null,
              }),
            }),
          }),
        });

      await processCheckinResponse('972509876543', attendanceId, 'yes');

      expect(mockSendTextMessage).toHaveBeenCalledWith(
        '972509876543',
        'כבר קיבלנו את תשובתך, תודה!'
      );
    });

    it('should log error when parent not found', async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
          }),
        }),
      });

      await processCheckinResponse('972500000000', 'some-id', 'yes');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Parent not found'),
      );
      expect(mockSendTextMessage).not.toHaveBeenCalled();
    });
  });
});
