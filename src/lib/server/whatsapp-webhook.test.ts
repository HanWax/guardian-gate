import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';

// Mock Supabase service client
const mockUpdateEqFn = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  update: vi.fn().mockReturnValue({ eq: mockUpdateEqFn }),
  upsert: vi.fn().mockResolvedValue({ error: null }),
});

vi.mock('./auth', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

// Mock WhatsApp sending
const mockSendTextMessage = vi.fn().mockResolvedValue({});
const mockSendInteractiveButtonMessage = vi.fn().mockResolvedValue({});
vi.mock('./whatsapp', () => ({
  sendTextMessage: (...args: unknown[]) => mockSendTextMessage(...args),
  sendInteractiveButtonMessage: (...args: unknown[]) => mockSendInteractiveButtonMessage(...args),
}));

// Mock conversation manager
const mockGetConversationState = vi.fn().mockResolvedValue(null);
const mockSetConversationState = vi.fn().mockResolvedValue(undefined);
const mockResetConversationState = vi.fn().mockResolvedValue(undefined);
const mockIncrementVerificationAttempts = vi.fn().mockResolvedValue(1);
vi.mock('./conversation-manager', () => ({
  getConversationState: (...args: unknown[]) => mockGetConversationState(...args),
  setConversationState: (...args: unknown[]) => mockSetConversationState(...args),
  resetConversationState: (...args: unknown[]) => mockResetConversationState(...args),
  incrementVerificationAttempts: (...args: unknown[]) => mockIncrementVerificationAttempts(...args),
}));

// Mock console
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

// Import after mocks
import {
  verifyWebhook,
  parseIncomingMessage,
  verifyWebhookSignature,
  handleIncomingMessage,
  processCheckinResponse,
} from './whatsapp-webhook';

describe('WhatsApp Webhook', () => {
  beforeEach(() => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'test-verify-token-123';
    process.env.WHATSAPP_API_TOKEN = 'test-api-token-456';
    consoleLogSpy.mockClear();
    consoleErrorSpy.mockClear();
    mockFrom.mockClear();
    mockSendTextMessage.mockClear();
    mockSendInteractiveButtonMessage.mockClear();
    mockGetConversationState.mockClear();
    mockSetConversationState.mockClear();
    mockResetConversationState.mockClear();
    mockIncrementVerificationAttempts.mockClear();
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
        entry: [{
          id: '123456',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '972501234567', phone_number_id: 'test-phone-id' },
              messages: [{
                from: '972509876543',
                id: 'wamid.xyz',
                timestamp: '1234567890',
                type: 'text',
                text: { body: 'שלום! זו הודעת בדיקה' },
              }],
            },
            field: 'messages',
          }],
        }],
      };

      const result = parseIncomingMessage(payload);
      expect(result.success).toBe(true);
      expect(result.sender).toBe('972509876543');
      expect(result.messageText).toBe('שלום! זו הודעת בדיקה');
    });

    it('should handle payload with no messages', () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: '123456',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '972501234567', phone_number_id: 'test-phone-id' },
            },
            field: 'messages',
          }],
        }],
      };

      const result = parseIncomingMessage(payload);
      expect(result.success).toBe(true);
      expect(result.sender).toBeUndefined();
    });

    it('should parse interactive button_reply message', () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: '123456',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '972501234567', phone_number_id: 'test-phone-id' },
              messages: [{
                from: '972509876543',
                id: 'wamid.btn1',
                timestamp: '1234567890',
                type: 'interactive',
                interactive: {
                  type: 'button_reply',
                  button_reply: { id: 'btn_on_way', title: '\u2713 בדרך' },
                },
              }],
            },
            field: 'messages',
          }],
        }],
      };

      const result = parseIncomingMessage(payload);
      expect(result.success).toBe(true);
      expect(result.buttonReplyId).toBe('btn_on_way');
      expect(result.buttonReplyTitle).toBe('\u2713 בדרך');
    });

    it('should parse template quick_reply button message', () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: '123456',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '972501234567', phone_number_id: 'test-phone-id' },
              messages: [{
                from: '972509876543',
                id: 'wamid.btn2',
                timestamp: '1234567890',
                type: 'button',
                button: { text: '\u2713 בדרך', payload: 'btn_dropping_off' },
              }],
            },
            field: 'messages',
          }],
        }],
      };

      const result = parseIncomingMessage(payload);
      expect(result.buttonReplyId).toBe('btn_dropping_off');
    });
  });

  describe('verifyWebhookSignature', () => {
    const testPayload = JSON.stringify({ test: 'data' });
    const testAppSecret = 'test-app-secret-789';

    beforeEach(() => {
      process.env.WHATSAPP_APP_SECRET = testAppSecret;
    });

    it('should return true for valid signature', () => {
      const hmac = crypto.createHmac('sha256', testAppSecret);
      hmac.update(testPayload);
      const validSignature = `sha256=${hmac.digest('hex')}`;
      expect(verifyWebhookSignature(testPayload, validSignature)).toBe(true);
    });

    it('should return false for invalid signature', () => {
      expect(verifyWebhookSignature(testPayload, 'sha256=invalid')).toBe(false);
    });

    it('should return false when signature does not start with sha256=', () => {
      expect(verifyWebhookSignature(testPayload, 'invalid-format')).toBe(false);
    });
  });

  describe('handleIncomingMessage', () => {
    it('should log parsed message details', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: '123456',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '972501234567', phone_number_id: 'test-phone-id' },
              messages: [{
                from: '972509876543',
                id: 'wamid.xyz',
                timestamp: '1234567890',
                type: 'text',
                text: { body: 'Test message' },
              }],
            },
            field: 'messages',
          }],
        }],
      };

      const result = await handleIncomingMessage(payload);
      expect(result.success).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[WhatsApp Message Received]',
        expect.objectContaining({ sender: '972509876543', messageText: 'Test message' })
      );
    });

    it('should return success without logging when no messages', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: '123456',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '972501234567', phone_number_id: 'test-phone-id' },
            },
            field: 'messages',
          }],
        }],
      };

      consoleLogSpy.mockClear();
      const result = await handleIncomingMessage(payload);
      expect(result.success).toBe(true);
      expect(consoleLogSpy).not.toHaveBeenCalledWith('[WhatsApp Message Received]', expect.anything());
    });

    it('should route checkin button to processCheckinResponse', async () => {
      const uuid = '11111111-1111-1111-1111-111111111111';

      // Mock lookupParent → parent found, attendance record, link, update
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'p1', name: 'רונית', phone: '+972521234567' }, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: uuid, child_id: 'c1', parent_response: null }, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { child_id: 'c1' }, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        });

      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: '972521234567',
                id: 'wamid.1',
                timestamp: '123',
                type: 'interactive',
                interactive: {
                  type: 'button_reply',
                  button_reply: { id: `checkin_yes_${uuid}`, title: '\u2713 בדרך לגן' },
                },
              }],
            },
            field: 'messages',
          }],
        }],
      };

      const result = await handleIncomingMessage(payload);
      expect(result.success).toBe(true);
      expect(mockSendTextMessage).toHaveBeenCalledWith(
        '972521234567',
        expect.stringContaining('נתראה')
      );
    });

    it('should route explain_skip button to skip handler', async () => {
      const uuid = '22222222-2222-2222-2222-222222222222';

      // Mock lookupParent
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'p1', name: 'רונית', phone: '+972521234567' }, error: null }),
            }),
          }),
        })
        // Mock upsert for resetConversationState (called through conversation-manager mock)
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        });

      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: '972521234567',
                id: 'wamid.2',
                timestamp: '123',
                type: 'interactive',
                interactive: {
                  type: 'button_reply',
                  button_reply: { id: `explain_skip_${uuid}`, title: 'דלג/י' },
                },
              }],
            },
            field: 'messages',
          }],
        }],
      };

      const result = await handleIncomingMessage(payload);
      expect(result.success).toBe(true);
      expect(mockSendTextMessage).toHaveBeenCalledWith(
        '972521234567',
        expect.stringContaining('יום טוב')
      );
    });

    it('should route ninealert_withme button (no inconsistency)', async () => {
      const uuid = '33333333-3333-3333-3333-333333333333';

      // lookupParent → update nine_am_parent_response → select attendance
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'p1', name: 'רונית', phone: '+972521234567' }, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { child_id: 'c1', teacher_confirmed: false },
                error: null,
              }),
            }),
          }),
        });

      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: '972521234567',
                id: 'wamid.3',
                timestamp: '123',
                type: 'interactive',
                interactive: {
                  type: 'button_reply',
                  button_reply: { id: `ninealert_withme_${uuid}`, title: 'איתי' },
                },
              }],
            },
            field: 'messages',
          }],
        }],
      };

      const result = await handleIncomingMessage(payload);
      expect(result.success).toBe(true);
      // "withme" + teacher NOT confirmed → no inconsistency, just confirm
      expect(mockSendTextMessage).toHaveBeenCalledWith(
        '972521234567',
        expect.stringContaining('יום טוב')
      );
      expect(mockResetConversationState).toHaveBeenCalledWith('p1');
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

      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'parent-1', name: 'רונית', phone: '+972521234567' }, error: null }),
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
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        });

      await processCheckinResponse('972509876543', attendanceId, 'yes');

      expect(mockSendTextMessage).toHaveBeenCalledWith(
        '972509876543',
        expect.stringContaining('נתראה')
      );
      expect(mockResetConversationState).toHaveBeenCalledWith('parent-1');
    });

    it('should send already-responded message when parent_response is set', async () => {
      const attendanceId = '22222222-2222-2222-2222-222222222222';

      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'parent-1', name: 'רונית', phone: '+972521234567' }, error: null }),
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

    it('should send explanation prompt for "no" response', async () => {
      const attendanceId = '33333333-3333-3333-3333-333333333333';

      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'parent-1', name: 'רונית', phone: '+972521234567' }, error: null }),
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
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        })
        // child name lookup
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { name: 'דניאל' }, error: null }),
            }),
          }),
        });

      await processCheckinResponse('972509876543', attendanceId, 'no');

      expect(mockSendInteractiveButtonMessage).toHaveBeenCalledWith(
        '972509876543',
        expect.stringContaining('דניאל'),
        expect.arrayContaining([
          expect.objectContaining({ id: expect.stringContaining('explain_skip') }),
        ])
      );
      expect(mockSetConversationState).toHaveBeenCalledWith(
        'parent-1',
        'awaiting_explanation',
        attendanceId
      );
    });
  });
});
