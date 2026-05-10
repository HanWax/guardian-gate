import { describe, it, expect } from 'vitest'
import {
  secondPingMessage,
  explanationPromptMessage,
  lateArrivalPromptMessage,
  lateArrivalConfirmedMessage,
  verifyInClassMessage,
  verifyRetryMessage,
  confirmDroppingOffMessage,
  confirmNotTodayMessage,
  teacherPollMessage,
  teacherFollowupFYIMessage,
  parentUnconfirmedFollowupMessage,
  parentNoResponseFollowupMessage,
  adminEscalationMessage,
  parentExplanationForwardMessage,
  namesMatch,
} from './message-templates'

const TEST_UUID = '11111111-1111-1111-1111-111111111111'

describe('message-templates', () => {
  describe('message builders', () => {
    it('secondPingMessage has 3 buttons', () => {
      const msg = secondPingMessage('דניאל', TEST_UUID)
      expect(msg.text).toContain('תזכורת')
      expect(msg.buttons).toHaveLength(3)
    })

    it('lateArrivalPromptMessage is text-only', () => {
      const msg = lateArrivalPromptMessage()
      expect(msg.buttons).toBeUndefined()
      expect(msg.text).toContain('שעת ההגעה')
    })

    it('lateArrivalConfirmedMessage is text-only', () => {
      const msg = lateArrivalConfirmedMessage()
      expect(msg.buttons).toBeUndefined()
      expect(msg.text).toContain('נעדכן את הצוות')
    })

    it('explanationPromptMessage has 1 skip button', () => {
      const msg = explanationPromptMessage('דניאל', TEST_UUID)
      expect(msg.buttons).toHaveLength(1)
      expect(msg.buttons![0].id).toContain('explain_skip')
    })

    it('verifyInClassMessage is text-only', () => {
      const msg = verifyInClassMessage()
      expect(msg.buttons).toBeUndefined()
      expect(msg.text).toContain('הקלד')
    })

    it('verifyRetryMessage is text-only', () => {
      const msg = verifyRetryMessage()
      expect(msg.buttons).toBeUndefined()
      expect(msg.text).toContain('לא תואם')
    })

    it('confirmDroppingOffMessage is text-only', () => {
      expect(confirmDroppingOffMessage().text).toContain('נתראה')
    })

    it('confirmNotTodayMessage is text-only', () => {
      expect(confirmNotTodayMessage().text).toContain('יום טוב')
    })

    it('teacherPollMessage has one button per child', () => {
      const msg = teacherPollMessage('גן שקד', '12/02/2026', ['דניאל', 'מיכל', 'נועה'])
      expect(msg.text).toContain('גן שקד')
      expect(msg.text).toContain('12/02/2026')
      expect(msg.buttons).toHaveLength(3)
      expect(msg.buttons!.map((b) => b.title)).toEqual(['דניאל', 'מיכל', 'נועה'])
    })

    it('teacherPollMessage includes part label when provided', () => {
      const msg = teacherPollMessage('גן שקד', '12/02/2026', ['דניאל'], '1/2')
      expect(msg.text).toContain('(1/2)')
    })

    it('teacherFollowupFYIMessage includes both groups', () => {
      const msg = teacherFollowupFYIMessage(
        ['דניאל'],
        [{ name: 'נועה', parentPhone: '0501234567' }]
      )
      expect(msg.text).toContain('דניאל')
      expect(msg.text).toContain('נועה')
      expect(msg.text).toContain('0501234567')
    })

    it('parentUnconfirmedFollowupMessage has 2 ninealert buttons', () => {
      const msg = parentUnconfirmedFollowupMessage('דניאל', 'גן שקד', TEST_UUID)
      expect(msg.text).toContain('דניאל')
      expect(msg.buttons).toHaveLength(2)
      expect(msg.buttons!.map((b) => b.id)).toContain(`ninealert_inclass_${TEST_UUID}`)
      expect(msg.buttons!.map((b) => b.id)).toContain(`ninealert_withme_${TEST_UUID}`)
    })

    it('parentNoResponseFollowupMessage is text-only', () => {
      const msg = parentNoResponseFollowupMessage('דניאל', 'גן שקד')
      expect(msg.text).toContain('דניאל')
      expect(msg.buttons).toBeUndefined()
    })

    it('adminEscalationMessage includes all fields', () => {
      const msg = adminEscalationMessage(
        'גן שקד', 'דניאל', 'בכיתה', 'לא אושרה הגעה',
        '+972521234567', '+972524445566'
      )
      expect(msg.text).toContain('חוסר התאמה')
      expect(msg.text).toContain('דניאל')
      expect(msg.text).toContain('בכיתה')
    })

    it('parentExplanationForwardMessage includes explanation', () => {
      const msg = parentExplanationForwardMessage(
        'דניאל', 'רונית', 'חולה עם חום', '+972521234567'
      )
      expect(msg.text).toContain('דניאל')
      expect(msg.text).toContain('רונית')
      expect(msg.text).toContain('חולה עם חום')
    })
  })

  describe('namesMatch', () => {
    it('matches identical names', () => {
      expect(namesMatch('דניאל כהן', 'דניאל כהן')).toBe(true)
    })

    it('matches with extra whitespace', () => {
      expect(namesMatch('  דניאל   כהן  ', 'דניאל כהן')).toBe(true)
    })

    it('rejects different names', () => {
      expect(namesMatch('מיכל', 'דניאל')).toBe(false)
    })
  })
})
