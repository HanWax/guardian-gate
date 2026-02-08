import { describe, it, expect, beforeEach, vi } from 'vitest';
import { verifyWebhook, parseIncomingMessage, verifyWebhookSignature, handleIncomingMessage } from './whatsapp-webhook';
import crypto from 'crypto';

// Mock console.log to test message logging
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

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
    it('should log parsed message details when message is received', () => {
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

      const result = handleIncomingMessage(payload);

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

    it('should return success without logging when no messages in payload', () => {
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
      const result = handleIncomingMessage(payload);

      expect(result.success).toBe(true);
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        '[WhatsApp Message Received]',
        expect.anything()
      );
    });

    it('should handle non-text messages by logging type only', () => {
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
      const result = handleIncomingMessage(payload);

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
});
