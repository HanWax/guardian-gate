import { describe, it, expect } from 'vitest'
import {
  CHECKIN_BUTTON_REGEX,
  EXPLAIN_SKIP_REGEX,
  NINE_AM_ALERT_REGEX,
  morningCheckinMessage,
  secondPingMessage,
  explanationPromptMessage,
  nineAmAlertMessage,
  verifyInClassMessage,
  verifyRetryMessage,
  confirmDroppingOffMessage,
  confirmNotTodayMessage,
  teacherSummaryMessage,
  managerEscalationMessage,
  parentExplanationForwardMessage,
  namesMatch,
} from './message-templates'

const TEST_UUID = '11111111-1111-1111-1111-111111111111'

describe('message-templates', () => {
  describe('button ID patterns', () => {
    it('CHECKIN_BUTTON_REGEX matches checkin_yes_{uuid}', () => {
      const match = `checkin_yes_${TEST_UUID}`.match(CHECKIN_BUTTON_REGEX)
      expect(match).not.toBeNull()
      expect(match![1]).toBe('yes')
      expect(match![2]).toBe(TEST_UUID)
    })

    it('CHECKIN_BUTTON_REGEX matches checkin_no_{uuid}', () => {
      const match = `checkin_no_${TEST_UUID}`.match(CHECKIN_BUTTON_REGEX)
      expect(match).not.toBeNull()
      expect(match![1]).toBe('no')
      expect(match![2]).toBe(TEST_UUID)
    })

    it('CHECKIN_BUTTON_REGEX rejects invalid format', () => {
      expect('checkin_maybe_abc'.match(CHECKIN_BUTTON_REGEX)).toBeNull()
    })

    it('EXPLAIN_SKIP_REGEX matches explain_skip_{uuid}', () => {
      const match = `explain_skip_${TEST_UUID}`.match(EXPLAIN_SKIP_REGEX)
      expect(match).not.toBeNull()
      expect(match![1]).toBe(TEST_UUID)
    })

    it('NINE_AM_ALERT_REGEX matches all actions', () => {
      for (const action of ['inclass', 'withme', 'other']) {
        const match = `ninealert_${action}_${TEST_UUID}`.match(NINE_AM_ALERT_REGEX)
        expect(match).not.toBeNull()
        expect(match![1]).toBe(action)
        expect(match![2]).toBe(TEST_UUID)
      }
    })

    it('NINE_AM_ALERT_REGEX rejects invalid action', () => {
      expect(`ninealert_invalid_${TEST_UUID}`.match(NINE_AM_ALERT_REGEX)).toBeNull()
    })
  })

  describe('message builders', () => {
    it('morningCheckinMessage has 2 buttons with valid titles', () => {
      const msg = morningCheckinMessage('רונית', 'דניאל', TEST_UUID)
      expect(msg.text).toContain('רונית')
      expect(msg.text).toContain('דניאל')
      expect(msg.buttons).toHaveLength(2)
      for (const btn of msg.buttons!) {
        expect(btn.title.length).toBeLessThanOrEqual(20)
      }
    })

    it('secondPingMessage has 2 buttons', () => {
      const msg = secondPingMessage('דניאל', TEST_UUID)
      expect(msg.text).toContain('תזכורת')
      expect(msg.buttons).toHaveLength(2)
    })

    it('explanationPromptMessage has 1 skip button', () => {
      const msg = explanationPromptMessage('דניאל', TEST_UUID)
      expect(msg.buttons).toHaveLength(1)
      expect(msg.buttons![0].id).toContain('explain_skip')
    })

    it('nineAmAlertMessage has 3 buttons', () => {
      const msg = nineAmAlertMessage('דניאל', 'גן שקד', TEST_UUID)
      expect(msg.buttons).toHaveLength(3)
      for (const btn of msg.buttons!) {
        expect(btn.title.length).toBeLessThanOrEqual(20)
      }
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

    it('teacherSummaryMessage formats all sections', () => {
      const msg = teacherSummaryMessage(
        'גן שקד',
        '12/02/2026',
        ['דניאל', 'מיכל'],
        [{ name: 'יונתן', explanation: 'חולה' }],
        [{ name: 'נועה', parentPhone: '+972505551234' }]
      )
      expect(msg.text).toContain('גן שקד')
      expect(msg.text).toContain('12/02/2026')
      expect(msg.text).toContain('דניאל')
      expect(msg.text).toContain('יונתן')
      expect(msg.text).toContain('חולה')
      expect(msg.text).toContain('נועה')
      expect(msg.text).toContain('צפויים להגיע: 2')
      expect(msg.text).toContain('לא מגיעים היום: 1')
      expect(msg.text).toContain('לא ענו: 1')
    })

    it('teacherSummaryMessage handles empty lists', () => {
      const msg = teacherSummaryMessage('גן', '01/01/2026', [], [], [])
      expect(msg.text).toContain('(אין)')
    })

    it('managerEscalationMessage includes all fields', () => {
      const msg = managerEscalationMessage(
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
