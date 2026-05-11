import { describe, it, expect } from 'vitest'
import { parseIncomingMessage } from './whatsapp-webhook'

const SENDER_PHONE = '972525080035'

function pollResultsPayload(voted: string[]): object {
  return {
    event: 'poll.results',
    timestamp: 1234567890,
    data: {
      key: { remoteJid: `${SENDER_PHONE}@s.whatsapp.net`, fromMe: true, id: 'msg1' },
      pollResult: [
        { name: '✓ כן, בדרך', voters: voted.includes('✓ כן, בדרך') ? [`${SENDER_PHONE}@c.us`] : [] },
        { name: '✗ לא היום', voters: voted.includes('✗ לא היום') ? [`${SENDER_PHONE}@c.us`] : [] },
        { name: 'כן, אבל מאוחר', voters: voted.includes('כן, אבל מאוחר') ? [`${SENDER_PHONE}@c.us`] : [] },
      ],
    },
  }
}

function textMessagePayload(body: string, fromMe = false): object {
  return {
    event: 'messages.upsert',
    timestamp: 1234567890,
    data: {
      messages: {
        key: { id: 'msg2', fromMe, cleanedSenderPn: SENDER_PHONE },
        messageBody: body,
      },
    },
  }
}

describe('parseIncomingMessage', () => {
  describe('poll.results event', () => {
    it('extracts sender and action for a parent yes vote', () => {
      const result = parseIncomingMessage(pollResultsPayload(['✓ כן, בדרך']) as never)
      expect(result.success).toBe(true)
      expect(result.sender).toBe(SENDER_PHONE)
      expect(result.messageType).toBe('poll_response')
      expect(result.buttonReplyId).toBe('checkin_yes')
      expect(result.buttonReplyTitle).toBe('✓ כן, בדרך')
      expect(result.allPollOptions).toEqual(['✓ כן, בדרך'])
    })

    it('preserves timestamp and messageId from poll.results', () => {
      const result = parseIncomingMessage(pollResultsPayload(['✓ כן, בדרך']) as never)
      expect(result.timestamp).toBe('1234567890')
      expect(result.messageId).toBe('msg1')
    })

    it('extracts sender and action for a parent no vote', () => {
      const result = parseIncomingMessage(pollResultsPayload(['✗ לא היום']) as never)
      expect(result.buttonReplyId).toBe('checkin_no')
      expect(result.allPollOptions).toEqual(['✗ לא היום'])
    })

    it('extracts sender and action for a late vote', () => {
      const result = parseIncomingMessage(pollResultsPayload(['כן, אבל מאוחר']) as never)
      expect(result.buttonReplyId).toBe('checkin_late')
    })

    it('handles teacher poll with multiple selected child names', () => {
      const payload = {
        event: 'poll.results',
        timestamp: 1234567890,
        data: {
          key: { remoteJid: `${SENDER_PHONE}@s.whatsapp.net`, fromMe: true, id: 'msg3' },
          pollResult: [
            { name: 'אסיף', voters: [`${SENDER_PHONE}@c.us`] },
            { name: 'דן', voters: [`${SENDER_PHONE}@c.us`] },
            { name: 'מיכל', voters: [] },
          ],
        },
      }
      const result = parseIncomingMessage(payload as never)
      expect(result.success).toBe(true)
      expect(result.sender).toBe(SENDER_PHONE)
      expect(result.messageType).toBe('poll_response')
      expect(result.buttonReplyId).toBeUndefined()
      expect(result.buttonReplyTitle).toBe('אסיף')
      expect(result.allPollOptions).toEqual(['אסיף', 'דן'])
    })

    it('extracts buttonReplyId and childName from multi-child combined poll', () => {
      const payload = {
        event: 'poll.results',
        timestamp: 1234567890,
        data: {
          key: { remoteJid: `${SENDER_PHONE}@s.whatsapp.net`, id: 'msg4' },
          pollResult: [
            { name: 'אסיף - כן ✓', voters: [`${SENDER_PHONE}@c.us`] },
            { name: 'דן - לא ✗', voters: [`${SENDER_PHONE}@c.us`] },
            { name: 'מיכל - כן ✓', voters: [] },
          ],
        },
      }
      const result = parseIncomingMessage(payload as never)
      expect(result.success).toBe(true)
      expect(result.sender).toBe(SENDER_PHONE)
      expect(result.messageType).toBe('poll_response')
      expect(result.buttonReplyId).toBe('checkin_yes')
      expect(result.childName).toBe('אסיף')
      expect(result.buttonReplyTitle).toBe('אסיף - כן ✓')
      expect(result.allPollOptions).toEqual(['אסיף - כן ✓', 'דן - לא ✗'])
    })

    it('extracts checkin_no from first selected multi-child "no" option', () => {
      const payload = {
        event: 'poll.results',
        timestamp: 1234567890,
        data: {
          key: { remoteJid: `${SENDER_PHONE}@s.whatsapp.net`, id: 'msg5' },
          pollResult: [
            { name: 'אסיף - לא ✗', voters: [`${SENDER_PHONE}@c.us`] },
            { name: 'דן - כן ✓', voters: [] },
          ],
        },
      }
      const result = parseIncomingMessage(payload as never)
      expect(result.buttonReplyId).toBe('checkin_no')
      expect(result.childName).toBe('אסיף')
      expect(result.allPollOptions).toEqual(['אסיף - לא ✗'])
    })

    it('falls back to remoteJid sender when voter JIDs are non-phone-shaped', () => {
      const payload = {
        event: 'poll.results',
        timestamp: 1234567890,
        data: {
          key: { remoteJid: `${SENDER_PHONE}@s.whatsapp.net`, id: 'msg6' },
          pollResult: [
            { name: '✓ כן, בדרך', voters: ['grp-id@g.us'] },
          ],
        },
      }
      const result = parseIncomingMessage(payload as never)
      expect(result.success).toBe(true)
      expect(result.sender).toBe(SENDER_PHONE)
      expect(result.buttonReplyId).toBe('checkin_yes')
    })

    it('returns early when both voter JIDs and remoteJid are non-phone-shaped', () => {
      const payload = {
        event: 'poll.results',
        data: {
          key: { remoteJid: 'group-123@g.us' },
          pollResult: [{ name: '✓ כן, בדרך', voters: ['also-group@g.us'] }],
        },
      }
      const result = parseIncomingMessage(payload as never)
      expect(result.success).toBe(true)
      expect(result.sender).toBeUndefined()
    })

    it('routes explain_skip from poll option title', () => {
      const payload = {
        event: 'poll.results',
        timestamp: 1234567890,
        data: {
          key: { remoteJid: `${SENDER_PHONE}@s.whatsapp.net`, id: 'msg7' },
          pollResult: [{ name: 'דלג/י', voters: [`${SENDER_PHONE}@c.us`] }],
        },
      }
      const result = parseIncomingMessage(payload as never)
      expect(result.buttonReplyId).toBe('explain_skip')
      expect(result.buttonReplyTitle).toBe('דלג/י')
      expect(result.childName).toBeUndefined()
    })

    it('returns early when no options are voted', () => {
      const payload = {
        event: 'poll.results',
        data: {
          key: { remoteJid: `${SENDER_PHONE}@s.whatsapp.net`, fromMe: true },
          pollResult: [{ name: '✓ כן, בדרך', voters: [] }],
        },
      }
      const result = parseIncomingMessage(payload as never)
      expect(result.success).toBe(true)
      expect(result.sender).toBeUndefined()
    })

    it('returns early when data is missing', () => {
      const result = parseIncomingMessage({ event: 'poll.results' } as never)
      expect(result.success).toBe(true)
      expect(result.sender).toBeUndefined()
    })
  })

  describe('messages.upsert event', () => {
    it('extracts sender and text from an inbound message', () => {
      const result = parseIncomingMessage(textMessagePayload('שלום') as never)
      expect(result.success).toBe(true)
      expect(result.sender).toBe(SENDER_PHONE)
      expect(result.messageText).toBe('שלום')
      expect(result.messageType).toBe('text')
    })

    it('preserves timestamp and messageId from messages.upsert', () => {
      const result = parseIncomingMessage(textMessagePayload('שלום') as never)
      expect(result.timestamp).toBe('1234567890')
      expect(result.messageId).toBe('msg2')
    })

    it('returns early when data.messages is missing', () => {
      const result = parseIncomingMessage({ event: 'messages.upsert', data: {} } as never)
      expect(result.success).toBe(true)
      expect(result.sender).toBeUndefined()
    })

    it('skips messages sent by us (fromMe: true)', () => {
      const result = parseIncomingMessage(textMessagePayload('sent by us', true) as never)
      expect(result.success).toBe(true)
      expect(result.sender).toBeUndefined()
    })

    it('skips when cleanedSenderPn is missing', () => {
      const payload = {
        event: 'messages.upsert',
        data: { messages: { key: { fromMe: false }, messageBody: 'hi' } },
      }
      const result = parseIncomingMessage(payload as never)
      expect(result.success).toBe(true)
      expect(result.sender).toBeUndefined()
    })
  })

  describe('other events', () => {
    it('ignores messages.received events', () => {
      const result = parseIncomingMessage({ event: 'messages.received' } as never)
      expect(result.success).toBe(true)
      expect(result.sender).toBeUndefined()
    })

    it('ignores unknown event types', () => {
      const result = parseIncomingMessage({ event: 'connection.update' } as never)
      expect(result.success).toBe(true)
      expect(result.sender).toBeUndefined()
    })

    it('handles completely empty payload', () => {
      const result = parseIncomingMessage({} as never)
      expect(result.success).toBe(true)
      expect(result.sender).toBeUndefined()
    })
  })
})
