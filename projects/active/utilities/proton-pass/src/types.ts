import { z } from 'zod';
import { asItemId, asVaultId } from './brands.ts';
import type { ItemId, VaultId } from './brands.ts';

export type { ItemId, VaultId };

export const ProtonItemTypeSchema = z.enum([
  'login',
  'password',
  'note',
  'creditCard',
  'alias',
]);

export type ProtonItemType = z.infer<typeof ProtonItemTypeSchema>;

const ProtonItemBaseSchema = z.object({
  title: z.string().min(1),
  type: ProtonItemTypeSchema,
  username: z.string().optional(),
  password: z.string().optional(),
  note: z.string().optional(),
  url: z.string().optional(),
  fields: z.record(z.string()).optional(),
});

export const ProtonItemCreateSchema = ProtonItemBaseSchema.extend({
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type ProtonItemCreate = z.infer<typeof ProtonItemCreateSchema>;

export const ProtonItemSchema = ProtonItemBaseSchema.extend({
  id: z.string().min(1).transform(asItemId),
  vaultId: z.string().min(1).transform(asVaultId),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ProtonItem = z.infer<typeof ProtonItemSchema>;

export const ProtonVaultSchema = z.object({
  id: z.string().min(1).transform(asVaultId),
  name: z.string().min(1),
  members: z
    .array(
      z.object({
        email: z.string().email(),
        role: z.enum(['admin', 'write', 'read']),
      })
    )
    .optional(),
});

export type ProtonVault = z.infer<typeof ProtonVaultSchema>;

export const VaultTemplateSchema = z.object({
  name: z.string().optional(),
  items: z.array(ProtonItemCreateSchema.omit({ createdAt: true, updatedAt: true })),
  folders: z
    .array(
      z.object({
        name: z.string().min(1),
        itemTitles: z.array(z.string().min(1)),
      })
    )
    .optional(),
});

export type VaultTemplate = z.infer<typeof VaultTemplateSchema>;
