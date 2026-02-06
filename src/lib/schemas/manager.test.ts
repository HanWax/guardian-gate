import { describe, it, expect } from 'vitest';
import { managerCreateSchema, managerUpdateSchema } from './manager';

describe('managerCreateSchema', () => {
  it('validates valid manager data', () => {
    const valid = {
      name: 'שרה כהן',
      phone: '050-1234567',
      nursery_id: '123e4567-e89b-12d3-a456-426614174000',
    };
    expect(() => managerCreateSchema.parse(valid)).not.toThrow();
  });

  it('rejects empty name', () => {
    const invalid = {
      name: '',
      phone: '050-1234567',
      nursery_id: '123e4567-e89b-12d3-a456-426614174000',
    };
    expect(() => managerCreateSchema.parse(invalid)).toThrow('שם הוא שדה חובה');
  });

  it('rejects missing name', () => {
    const invalid = {
      phone: '050-1234567',
      nursery_id: '123e4567-e89b-12d3-a456-426614174000',
    };
    expect(() => managerCreateSchema.parse(invalid)).toThrow();
  });

  it('trims whitespace from name', () => {
    const data = {
      name: '  שרה כהן  ',
      phone: '050-1234567',
      nursery_id: '123e4567-e89b-12d3-a456-426614174000',
    };
    const result = managerCreateSchema.parse(data);
    expect(result.name).toBe('שרה כהן');
  });

  it('rejects empty phone', () => {
    const invalid = {
      name: 'שרה כהן',
      phone: '',
      nursery_id: '123e4567-e89b-12d3-a456-426614174000',
    };
    expect(() => managerCreateSchema.parse(invalid)).toThrow('טלפון הוא שדה חובה');
  });

  it('rejects invalid phone format', () => {
    const invalid = {
      name: 'שרה כהן',
      phone: 'abc',
      nursery_id: '123e4567-e89b-12d3-a456-426614174000',
    };
    expect(() => managerCreateSchema.parse(invalid)).toThrow('מספר טלפון לא תקין');
  });

  it('accepts valid phone formats', () => {
    const valid = [
      '0501234567',
      '050-1234567',
      '+972501234567',
      '+972-50-1234567',
    ];
    valid.forEach((phone) => {
      const data = {
        name: 'שרה כהן',
        phone,
        nursery_id: '123e4567-e89b-12d3-a456-426614174000',
      };
      expect(() => managerCreateSchema.parse(data)).not.toThrow();
    });
  });

  it('rejects invalid UUID for nursery_id', () => {
    const invalid = {
      name: 'שרה כהן',
      phone: '050-1234567',
      nursery_id: 'not-a-uuid',
    };
    expect(() => managerCreateSchema.parse(invalid)).toThrow('מזהה גן לא תקין');
  });

  it('rejects missing nursery_id', () => {
    const invalid = {
      name: 'שרה כהן',
      phone: '050-1234567',
    };
    expect(() => managerCreateSchema.parse(invalid)).toThrow();
  });
});

describe('managerUpdateSchema', () => {
  it('allows partial updates', () => {
    const partial = { name: 'שרה לוי' };
    expect(() => managerUpdateSchema.parse(partial)).not.toThrow();
  });

  it('allows updating only phone', () => {
    const partial = { phone: '052-9876543' };
    expect(() => managerUpdateSchema.parse(partial)).not.toThrow();
  });

  it('allows updating only nursery_id', () => {
    const partial = { nursery_id: '123e4567-e89b-12d3-a456-426614174000' };
    expect(() => managerUpdateSchema.parse(partial)).not.toThrow();
  });

  it('allows empty object', () => {
    expect(() => managerUpdateSchema.parse({})).not.toThrow();
  });

  it('still validates provided fields', () => {
    const invalid = { phone: 'abc' };
    expect(() => managerUpdateSchema.parse(invalid)).toThrow('מספר טלפון לא תקין');
  });
});
