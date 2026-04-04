import { z } from 'zod';

export const registrationLinkSchema = z.object({
  preFilledName: z.string().min(1).max(255),
  role: z.enum(['admin', 'staff']),
});

export const registerChallengeSchema = z.object({
  token: z.string().min(1),
});

export const registerVerifySchema = z.object({
  userId: z.number().int().positive(),
  response: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      attestationObject: z.string().optional(),
      clientDataJSON: z.string(),
      authenticatorData: z.string().optional(),
    }),
    type: z.literal('public-key').optional(),
    clientExtensionResults: z.record(z.unknown()).optional(),
    authenticatorAttachment: z.string().optional(),
  }),
  challengeId: z.string().min(1),
  token: z.string().min(1),
  deviceName: z.string().optional(),
});

export const loginVerifySchema = z.object({
  response: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      authenticatorData: z.string().optional(),
      clientDataJSON: z.string(),
      signature: z.string().optional(),
      userHandle: z.string().nullable().optional(),
    }),
    type: z.literal('public-key').optional(),
    clientExtensionResults: z.record(z.unknown()).optional(),
    authenticatorAttachment: z.string().optional(),
  }),
  challengeId: z.string().min(1),
});

export const userUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  is_active: z.boolean().optional(),
  role: z.enum(['admin', 'staff']).optional(),
});

export const languageCreateSchema = z.object({
  code: z.string().length(2),
  displayName: z.string().min(1).max(100),
});

export const menuItemUpdateSchema = z.object({
  is_visible: z.boolean().optional(),
  base_price: z.number().min(0).optional(),
});

export const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int().positive(),
      sort_order: z.number().int().min(0),
    })
  ),
});

export const menuItemNameSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().max(2000).nullish(),
});

// Shared schema for name + optional description (traits, option groups, options)
export const nameWithDescriptionSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().max(2000).nullish(),
});

// Option group flags update
export const optionGroupUpdateSchema = z.object({
  multi_select: z.number().int().min(0).max(1).optional(),
  required: z.number().int().min(0).max(1).optional(),
});

// Create an option — must specify which group it belongs to
export const optionCreateSchema = z.object({
  option_group_id: z.number().int().positive(),
});

// Update option price
export const optionUpdateSchema = z.object({
  price_delta: z.number().optional(),
});

// Upsert a setting value
export const settingValueSchema = z.object({
  value: z.string().max(10000),
});
