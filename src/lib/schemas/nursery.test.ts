import { describe, it, expect } from 'vitest';
import { updateNurserySettingsSchema } from './nursery';

const validData = {
  dropoff_start: '07:30',
  dropoff_end: '09:00',
  first_message_time: '12:00',
  second_ping_time: '14:30',
  nine_am_check_time: '09:00',
  timezone: 'Asia/Jerusalem',
};

describe('updateNurserySettingsSchema', () => {
  it('validates valid nursery settings data', () => {
    expect(() => updateNurserySettingsSchema.parse(validData)).not.toThrow();
  });

  it('rejects invalid dropoff_start time format', () => {
    expect(() => updateNurserySettingsSchema.parse({ ...validData, dropoff_start: '7:30' })).toThrow('פורמט שעה לא תקין');
  });

  it('rejects invalid dropoff_end time format', () => {
    expect(() => updateNurserySettingsSchema.parse({ ...validData, dropoff_end: '9:00 AM' })).toThrow('פורמט שעה לא תקין');
  });

  it('rejects invalid first_message_time format', () => {
    expect(() => updateNurserySettingsSchema.parse({ ...validData, first_message_time: '12:0' })).toThrow('פורמט שעה לא תקין');
  });

  it('rejects invalid second_ping_time format', () => {
    expect(() => updateNurserySettingsSchema.parse({ ...validData, second_ping_time: '25:30' })).toThrow('פורמט שעה לא תקין');
  });

  it('rejects invalid nine_am_check_time format', () => {
    expect(() => updateNurserySettingsSchema.parse({ ...validData, nine_am_check_time: '9am' })).toThrow('פורמט שעה לא תקין');
  });

  it('rejects empty timezone', () => {
    expect(() => updateNurserySettingsSchema.parse({ ...validData, timezone: '' })).toThrow('אזור זמן הוא שדה חובה');
  });

  it('rejects missing timezone', () => {
    const { timezone: _, ...noTz } = validData;
    expect(() => updateNurserySettingsSchema.parse(noTz)).toThrow();
  });

  it('accepts various valid time formats', () => {
    const times = ['00:00', '23:59', '12:30', '08:45'];
    times.forEach((time) => {
      const data = {
        dropoff_start: time,
        dropoff_end: time,
        first_message_time: time,
        second_ping_time: time,
        nine_am_check_time: time,
        timezone: 'Asia/Jerusalem',
      };
      expect(() => updateNurserySettingsSchema.parse(data)).not.toThrow();
    });
  });

  it('trims whitespace from timezone', () => {
    const result = updateNurserySettingsSchema.parse({ ...validData, timezone: '  Asia/Jerusalem  ' });
    expect(result.timezone).toBe('Asia/Jerusalem');
  });

  it('allows partial updates', () => {
    const partial = { dropoff_start: '08:00' };
    expect(() => updateNurserySettingsSchema.partial().parse(partial)).not.toThrow();
  });

  it('validates provided fields in partial updates', () => {
    const invalid = { dropoff_start: '8:00' };
    expect(() => updateNurserySettingsSchema.partial().parse(invalid)).toThrow('פורמט שעה לא תקין');
  });
});
