import { describe, it, expect } from 'vitest';
import {
  registrationLinkSchema,
  userUpdateSchema,
  menuItemNameSchema,
  menuItemUpdateSchema,
  reorderSchema,
  optionCreateSchema,
  optionUpdateSchema,
  nameWithDescriptionSchema,
  settingValueSchema,
  loginVerifySchema,
  languageCreateSchema,
  optionGroupUpdateSchema,
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

  // M13: menuItemUpdateSchema edge cases
  describe('menuItemUpdateSchema', () => {
    it('accepts base_price=0', () => {
      const result = menuItemUpdateSchema.safeParse({ base_price: 0 });
      expect(result.success).toBe(true);
    });

    it('rejects base_price=-1', () => {
      const result = menuItemUpdateSchema.safeParse({ base_price: -1 });
      expect(result.success).toBe(false);
    });

    it('accepts base_price as integer (cents)', () => {
      const result = menuItemUpdateSchema.safeParse({ base_price: 650 });
      expect(result.success).toBe(true);
    });
  });

  // M13: reorderSchema edge cases
  describe('reorderSchema', () => {
    it('accepts valid reorder items', () => {
      const result = reorderSchema.safeParse({ items: [{ id: 1, sort_order: 0 }] });
      expect(result.success).toBe(true);
    });

    it('accepts empty items array', () => {
      const result = reorderSchema.safeParse({ items: [] });
      expect(result.success).toBe(true);
    });

    it('rejects negative sort_order', () => {
      const result = reorderSchema.safeParse({ items: [{ id: 1, sort_order: -1 }] });
      expect(result.success).toBe(false);
    });

    it('rejects negative id', () => {
      const result = reorderSchema.safeParse({ items: [{ id: -1, sort_order: 0 }] });
      expect(result.success).toBe(false);
    });
  });

  // M13: optionCreateSchema edge cases
  describe('optionCreateSchema', () => {
    it('rejects missing option_group_id', () => {
      const result = optionCreateSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('accepts valid option_group_id', () => {
      const result = optionCreateSchema.safeParse({ option_group_id: 1 });
      expect(result.success).toBe(true);
    });
  });

  // M13: optionUpdateSchema edge cases
  describe('optionUpdateSchema', () => {
    it('accepts negative price_delta', () => {
      // price_delta is z.number().optional() — no min constraint, negatives are valid (discounts)
      const result = optionUpdateSchema.safeParse({ price_delta: -50 });
      expect(result.success).toBe(true);
    });

    it('accepts zero price_delta', () => {
      const result = optionUpdateSchema.safeParse({ price_delta: 0 });
      expect(result.success).toBe(true);
    });
  });

  // M13: nameWithDescriptionSchema edge cases
  describe('nameWithDescriptionSchema', () => {
    it('rejects empty name', () => {
      const result = nameWithDescriptionSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('rejects name over 500 chars', () => {
      const result = nameWithDescriptionSchema.safeParse({ name: 'a'.repeat(501) });
      expect(result.success).toBe(false);
    });

    it('accepts name at max length', () => {
      const result = nameWithDescriptionSchema.safeParse({ name: 'a'.repeat(500) });
      expect(result.success).toBe(true);
    });
  });

  // M10: languageCreateSchema edge cases
  describe('languageCreateSchema', () => {
    it('rejects 1-char code', () => {
      const result = languageCreateSchema.safeParse({ code: 'A', displayName: 'Test' });
      expect(result.success).toBe(false);
    });

    it('rejects 3-char code', () => {
      const result = languageCreateSchema.safeParse({ code: 'ABC', displayName: 'Test' });
      expect(result.success).toBe(false);
    });

    it('accepts 2-char code', () => {
      const result = languageCreateSchema.safeParse({ code: 'FR', displayName: 'French' });
      expect(result.success).toBe(true);
    });
  });

  // M10: optionGroupUpdateSchema edge cases
  describe('optionGroupUpdateSchema', () => {
    it('rejects multi_select=2', () => {
      const result = optionGroupUpdateSchema.safeParse({ multi_select: 2 });
      expect(result.success).toBe(false);
    });

    it('accepts multi_select=0', () => {
      const result = optionGroupUpdateSchema.safeParse({ multi_select: 0 });
      expect(result.success).toBe(true);
    });

    it('accepts multi_select=1', () => {
      const result = optionGroupUpdateSchema.safeParse({ multi_select: 1 });
      expect(result.success).toBe(true);
    });
  });

  // M13: settingValueSchema edge cases
  describe('settingValueSchema', () => {
    it('rejects missing value', () => {
      const result = settingValueSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('accepts empty string (no min constraint)', () => {
      // settingValueSchema is z.string().max(10000) — no min(1), so empty is valid at schema level
      const result = settingValueSchema.safeParse({ value: '' });
      expect(result.success).toBe(true);
    });

    it('rejects value over 10000 chars', () => {
      const result = settingValueSchema.safeParse({ value: 'x'.repeat(10001) });
      expect(result.success).toBe(false);
    });
  });
});
