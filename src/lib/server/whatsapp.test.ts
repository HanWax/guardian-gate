import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendTemplateMessage, sendTextMessage } from './whatsapp';

// Mock fetch globally
global.fetch = vi.fn();

describe('WhatsApp API Client', () => {
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up environment variables for tests
    process.env.WHATSAPP_API_TOKEN = 'test-token-123';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'test-phone-id-456';
  });

  describe('sendTemplateMessage', () => {
    it('should send a template message with correct API call', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ success: true, message_id: 'msg_123' }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await sendTemplateMessage(
        '972501234567',
        'hello_world',
        'he'
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v21.0/test-phone-id-456/messages',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token-123',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: '972501234567',
            type: 'template',
            template: {
              name: 'hello_world',
              language: {
                code: 'he',
              },
            },
          }),
        }
      );
      expect(result).toEqual({ success: true, message_id: 'msg_123' });
    });

    it('should send template message with components when provided', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ success: true, message_id: 'msg_456' }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const components = [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'שרה' },
          ],
        },
      ];

      await sendTemplateMessage(
        '972501234567',
        'greeting_template',
        'he',
        components
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v21.0/test-phone-id-456/messages',
        expect.objectContaining({
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: '972501234567',
            type: 'template',
            template: {
              name: 'greeting_template',
              language: {
                code: 'he',
              },
              components,
            },
          }),
        })
      );
    });

    it('should throw error when API returns non-ok response', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: { message: 'Invalid template name' } }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(
        sendTemplateMessage('972501234567', 'invalid_template', 'he')
      ).rejects.toThrow('WhatsApp API error');
    });

    it('should throw error when WHATSAPP_API_TOKEN is not set', async () => {
      delete process.env.WHATSAPP_API_TOKEN;

      await expect(
        sendTemplateMessage('972501234567', 'hello_world', 'he')
      ).rejects.toThrow('WHATSAPP_API_TOKEN');
    });

    it('should throw error when WHATSAPP_PHONE_NUMBER_ID is not set', async () => {
      delete process.env.WHATSAPP_PHONE_NUMBER_ID;

      await expect(
        sendTemplateMessage('972501234567', 'hello_world', 'he')
      ).rejects.toThrow('WHATSAPP_PHONE_NUMBER_ID');
    });
  });

  describe('sendTextMessage', () => {
    it('should send a text message with correct API call', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ success: true, message_id: 'msg_789' }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await sendTextMessage('972501234567', 'שלום עולם');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v21.0/test-phone-id-456/messages',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token-123',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: '972501234567',
            type: 'text',
            text: {
              body: 'שלום עולם',
            },
          }),
        }
      );
      expect(result).toEqual({ success: true, message_id: 'msg_789' });
    });

    it('should throw error when API returns non-ok response', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: { message: 'Invalid phone number' } }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(
        sendTextMessage('invalid', 'test message')
      ).rejects.toThrow('WhatsApp API error');
    });

    it('should throw error when WHATSAPP_API_TOKEN is not set', async () => {
      delete process.env.WHATSAPP_API_TOKEN;

      await expect(
        sendTextMessage('972501234567', 'test')
      ).rejects.toThrow('WHATSAPP_API_TOKEN');
    });

    it('should throw error when WHATSAPP_PHONE_NUMBER_ID is not set', async () => {
      delete process.env.WHATSAPP_PHONE_NUMBER_ID;

      await expect(
        sendTextMessage('972501234567', 'test')
      ).rejects.toThrow('WHATSAPP_PHONE_NUMBER_ID');
    });
  });
});
