import { describe, it, expect } from 'vitest';
import { teacherCreateSchema, teacherUpdateSchema } from './teacher';

const VALID_NURSERY_ID = '00000000-0000-0000-0000-000000000001';

describe('teacherCreateSchema', () => {
  it('validates a complete valid input', () => {
    const result = teacherCreateSchema.safeParse({
      name: 'דנה כהן',
      phone: '050-1234567',
      nursery_id: VALID_NURSERY_ID,
    });
    expect(result.success).toBe(true);
  });

  it('trims whitespace from name', () => {
    const result = teacherCreateSchema.parse({
      name: '  דנה כהן  ',
      phone: '0501234567',
      nursery_id: VALID_NURSERY_ID,
    });
    expect(result.name).toBe('דנה כהן');
  });

  it('rejects empty name', () => {
    const result = teacherCreateSchema.safeParse({
      name: '',
      phone: '0501234567',
      nursery_id: VALID_NURSERY_ID,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('שם הוא שדה חובה');
    }
  });

  it('rejects empty phone', () => {
    const result = teacherCreateSchema.safeParse({
      name: 'דנה כהן',
      phone: '',
      nursery_id: VALID_NURSERY_ID,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid phone format', () => {
    const result = teacherCreateSchema.safeParse({
      name: 'דנה כהן',
      phone: 'abc',
      nursery_id: VALID_NURSERY_ID,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('מספר טלפון לא תקין');
    }
  });

  it('accepts various valid phone formats', () => {
    const phones = ['0501234567', '050-123-4567', '+972501234567', '+972-50-123-4567'];
    for (const phone of phones) {
      const result = teacherCreateSchema.safeParse({
        name: 'דנה כהן',
        phone,
        nursery_id: VALID_NURSERY_ID,
      });
      expect(result.success, `expected "${phone}" to be valid`).toBe(true);
    }
  });

  it('rejects invalid nursery_id', () => {
    const result = teacherCreateSchema.safeParse({
      name: 'דנה כהן',
      phone: '0501234567',
      nursery_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('teacherUpdateSchema', () => {
  it('allows partial updates', () => {
    const result = teacherUpdateSchema.safeParse({ name: 'שרה' });
    expect(result.success).toBe(true);
  });

  it('allows empty object', () => {
    const result = teacherUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('still validates provided fields', () => {
    const result = teacherUpdateSchema.safeParse({ phone: 'bad' });
    expect(result.success).toBe(false);
  });
});
