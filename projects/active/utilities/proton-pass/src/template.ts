// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file

import { z } from 'zod';
import type { VaultId } from './brands.ts';
import { createItem, listItems, updateItem } from './items.ts';
import { type ProtonItemCreate, type VaultTemplate, VaultTemplateSchema } from './types.ts';

const ReplacementsSchema = z.record(z.string());

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function applyPlaceholders(value: unknown, replacements: Record<string, string>): unknown {
  if (typeof value === 'string') {
    return Object.entries(replacements).reduce(
      (acc, [key, replacement]) =>
        acc.replace(new RegExp(`{${escapeRegExp(key)}}`, 'g'), replacement),
      value
    );
  }

  if (Array.isArray(value)) {
    return value.map(item => applyPlaceholders(item, replacements));
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      result[key] = applyPlaceholders(v, replacements);
    }
    return result;
  }

  return value;
}

export async function applyTemplate(
  vaultId: VaultId,
  template: VaultTemplate,
  replacements: Record<string, string>
): Promise<{ itemsCreated: number; itemsUpdated: number }> {
  const validatedReplacements = ReplacementsSchema.parse(replacements);
  const existingItems = await listItems(vaultId);
  const existingByTitle = new Map(existingItems.map(item => [item.title, item]));

  let created = 0;
  let updated = 0;

  for (const itemTemplate of template.items) {
    const processed = applyPlaceholders(
      itemTemplate,
      validatedReplacements
    ) as ProtonItemCreate;

    if (!processed.title || typeof processed.title !== 'string') {
      throw new Error('Template item is missing a title after placeholder replacement');
    }

    const existing = existingByTitle.get(processed.title);

    if (existing) {
      await updateItem(existing.id, processed);
      updated++;
    } else {
      await createItem(vaultId, processed);
      created++;
    }
  }

  return { itemsCreated: created, itemsUpdated: updated };
}

export async function loadTemplateFromFile(path: string): Promise<VaultTemplate> {
  const raw = await Bun.file(path).json();
  return VaultTemplateSchema.parse(raw);
}
