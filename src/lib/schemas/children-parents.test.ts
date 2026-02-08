import { describe, it, expect } from 'vitest';
import { CreateChildrenParentsSchema, DeleteChildrenParentsSchema } from './children-parents';

const VALID_CHILD_ID = '00000000-0000-0000-0000-000000000001';
const VALID_PARENT_ID = '00000000-0000-0000-0000-000000000002';

describe('CreateChildrenParentsSchema', () => {
  it('validates complete valid input', () => {
    const result = CreateChildrenParentsSchema.safeParse({
      child_id: VALID_CHILD_ID,
      parent_id: VALID_PARENT_ID,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing child_id', () => {
    const result = CreateChildrenParentsSchema.safeParse({
      parent_id: VALID_PARENT_ID,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing parent_id', () => {
    const result = CreateChildrenParentsSchema.safeParse({
      child_id: VALID_CHILD_ID,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid child_id format', () => {
    const result = CreateChildrenParentsSchema.safeParse({
      child_id: 'not-a-uuid',
      parent_id: VALID_PARENT_ID,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid parent_id format', () => {
    const result = CreateChildrenParentsSchema.safeParse({
      child_id: VALID_CHILD_ID,
      parent_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty strings', () => {
    const result = CreateChildrenParentsSchema.safeParse({
      child_id: '',
      parent_id: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('DeleteChildrenParentsSchema', () => {
  it('validates complete valid input', () => {
    const result = DeleteChildrenParentsSchema.safeParse({
      child_id: VALID_CHILD_ID,
      parent_id: VALID_PARENT_ID,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing child_id', () => {
    const result = DeleteChildrenParentsSchema.safeParse({
      parent_id: VALID_PARENT_ID,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing parent_id', () => {
    const result = DeleteChildrenParentsSchema.safeParse({
      child_id: VALID_CHILD_ID,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid child_id format', () => {
    const result = DeleteChildrenParentsSchema.safeParse({
      child_id: 'not-a-uuid',
      parent_id: VALID_PARENT_ID,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid parent_id format', () => {
    const result = DeleteChildrenParentsSchema.safeParse({
      child_id: VALID_CHILD_ID,
      parent_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});
