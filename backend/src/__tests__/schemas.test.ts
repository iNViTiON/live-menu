import { describe, it, expect } from 'vitest';
import {
  registrationLinkSchema,
  userUpdateSchema,
  menuItemNameSchema,
  loginVerifySchema,
} from '../validation/schemas';

describe('Zod schema edge cases', () => {
  describe('registrationLinkSchema', () => {
    it('rejects empty name', () => {
      const result = registrationLinkSchema.safeParse({ preFilledName: '', role: 'staff' });
      expect(result.success).toBe(false);
    });

    it('rejects name > 255 chars', () => {
      const result = registrationLinkSchema.safeParse({
        preFilledName: 'a'.repeat(256),
        role: 'staff',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid role', () => {
      const result = registrationLinkSchema.safeParse({
        preFilledName: 'Valid Name',
        role: 'superadmin',
      });
      expect(result.success).toBe(false);
    });

    it('accepts valid input', () => {
      const result = registrationLinkSchema.safeParse({
        preFilledName: 'Valid Name',
        role: 'admin',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('userUpdateSchema', () => {
    it('accepts valid partial update', () => {
      const result = userUpdateSchema.safeParse({ name: 'New Name' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid role', () => {
      const result = userUpdateSchema.safeParse({ role: 'root' });
      expect(result.success).toBe(false);
    });

    it('accepts empty object (all fields optional)', () => {
      const result = userUpdateSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('menuItemNameSchema', () => {
    it('rejects empty name', () => {
      const result = menuItemNameSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('accepts valid name', () => {
      const result = menuItemNameSchema.safeParse({ name: 'Fish and Chips' });
      expect(result.success).toBe(true);
    });
  });

  describe('loginVerifySchema', () => {
    it('rejects missing challengeId', () => {
      const result = loginVerifySchema.safeParse({
        response: {
          id: 'abc',
          rawId: 'abc',
          response: { clientDataJSON: 'data' },
        },
        // challengeId missing
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty challengeId', () => {
      const result = loginVerifySchema.safeParse({
        response: {
          id: 'abc',
          rawId: 'abc',
          response: { clientDataJSON: 'data' },
        },
        challengeId: '',
      });
      expect(result.success).toBe(false);
    });
  });
});
