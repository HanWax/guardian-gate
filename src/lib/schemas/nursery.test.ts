import { describe, it, expect } from 'vitest';
import { updateNurserySettingsSchema } from './nursery';

describe('updateNurserySettingsSchema', () => {
  it('validates valid nursery settings data', () => {
    const valid = {
      dropoff_start: '07:30',
      dropoff_end: '09:00',
      first_message_time: '12:00',
      second_ping_time: '14:30',
      timezone: 'Asia/Jerusalem',
    };
    expect(() => updateNurserySettingsSchema.parse(valid)).not.toThrow();
  });

  it('rejects invalid dropoff_start time format', () => {
    const invalid = {
      dropoff_start: '7:30',
      dropoff_end: '09:00',
      first_message_time: '12:00',
      second_ping_time: '14:30',
      timezone: 'Asia/Jerusalem',
    };
    expect(() => updateNurserySettingsSchema.parse(invalid)).toThrow('פורמט שעה לא תקין');
  });

  it('rejects invalid dropoff_end time format', () => {
    const invalid = {
      dropoff_start: '07:30',
      dropoff_end: '9:00 AM',
      first_message_time: '12:00',
      second_ping_time: '14:30',
      timezone: 'Asia/Jerusalem',
    };
    expect(() => updateNurserySettingsSchema.parse(invalid)).toThrow('פורמט שעה לא תקין');
  });

  it('rejects invalid first_message_time format', () => {
    const invalid = {
      dropoff_start: '07:30',
      dropoff_end: '09:00',
      first_message_time: '12:0',
      second_ping_time: '14:30',
      timezone: 'Asia/Jerusalem',
    };
    expect(() => updateNurserySettingsSchema.parse(invalid)).toThrow('פורמט שעה לא תקין');
  });

  it('rejects invalid second_ping_time format', () => {
    const invalid = {
      dropoff_start: '07:30',
      dropoff_end: '09:00',
      first_message_time: '12:00',
      second_ping_time: '25:30',
      timezone: 'Asia/Jerusalem',
    };
    expect(() => updateNurserySettingsSchema.parse(invalid)).toThrow('פורמט שעה לא תקין');
  });

  it('rejects empty timezone', () => {
    const invalid = {
      dropoff_start: '07:30',
      dropoff_end: '09:00',
      first_message_time: '12:00',
      second_ping_time: '14:30',
      timezone: '',
    };
    expect(() => updateNurserySettingsSchema.parse(invalid)).toThrow('אזור זמן הוא שדה חובה');
  });

  it('rejects missing timezone', () => {
    const invalid = {
      dropoff_start: '07:30',
      dropoff_end: '09:00',
      first_message_time: '12:00',
      second_ping_time: '14:30',
    };
    expect(() => updateNurserySettingsSchema.parse(invalid)).toThrow();
  });

  it('accepts various valid time formats', () => {
    const valid = [
      '00:00',
      '23:59',
      '12:30',
      '08:45',
    ];
    valid.forEach((time) => {
      const data = {
        dropoff_start: time,
        dropoff_end: time,
        first_message_time: time,
        second_ping_time: time,
        timezone: 'Asia/Jerusalem',
      };
      expect(() => updateNurserySettingsSchema.parse(data)).not.toThrow();
    });
  });

  it('trims whitespace from timezone', () => {
    const data = {
      dropoff_start: '07:30',
      dropoff_end: '09:00',
      first_message_time: '12:00',
      second_ping_time: '14:30',
      timezone: '  Asia/Jerusalem  ',
    };
    const result = updateNurserySettingsSchema.parse(data);
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
