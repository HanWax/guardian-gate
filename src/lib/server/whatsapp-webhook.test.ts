import { describe, it, expect, beforeEach } from 'vitest';
import { verifyWebhook } from './whatsapp-webhook';

describe('WhatsApp Webhook', () => {
  beforeEach(() => {
    // Set up environment variable for tests
    process.env.WHATSAPP_VERIFY_TOKEN = 'test-verify-token-123';
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
});
