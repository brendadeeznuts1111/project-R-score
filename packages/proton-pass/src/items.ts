// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type ItemId, type VaultId } from '../../../lib/types/branded.ts';
import { runJson, runRaw } from './client.ts';
import { type ProtonItem, ProtonItemSchema } from './types.ts';

export async function listItems(vaultId: VaultId): Promise<ProtonItem[]> {
  const raw = await runJson<unknown[]>(['item', 'list', '--vault', vaultId]);
  return raw.map(item => ProtonItemSchema.parse(item));
}

export async function getItem(itemId: ItemId): Promise<ProtonItem> {
  const raw = await runJson<unknown>(['item', 'get', itemId]);
  return ProtonItemSchema.parse(raw);
}

export async function createItem(vaultId: VaultId, template: Partial<ProtonItem>): Promise<ProtonItem> {
  const tempFile = join(tmpdir(), `proton-pass-item-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  await Bun.write(tempFile, JSON.stringify(template));
  try {
    const raw = await runJson<unknown>([
      'item',
      'create',
      '--vault',
      vaultId,
      '--from-template',
      tempFile,
    ]);
    return ProtonItemSchema.parse(raw);
  } finally {
    await Bun.file(tempFile).delete().catch(() => {});
  }
}

export async function updateItem(itemId: ItemId, fields: Record<string, unknown>): Promise<ProtonItem> {
  const setArgs: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    setArgs.push('--set', `${key}=${JSON.stringify(value)}`);
  }
  const raw = await runJson<unknown>(['item', 'update', itemId, ...setArgs]);
  return ProtonItemSchema.parse(raw);
}

export async function deleteItem(itemId: ItemId): Promise<void> {
  await runRaw(['item', 'delete', itemId]);
}
