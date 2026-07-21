import type { VaultId } from './brands.ts';
import { runJson, runRaw } from './client.ts';
import { getLogger } from './logger.ts';
import { createItem, listItems } from './items.ts';
import { type ProtonItem, type ProtonItemCreate, ProtonVault, ProtonVaultSchema } from './types.ts';

export async function listVaults(): Promise<ProtonVault[]> {
  const raw = await runJson<unknown[]>(['vault', 'list']);
  return raw.map(item => ProtonVaultSchema.parse(item));
}

export async function getVault(vaultId: VaultId): Promise<ProtonVault> {
  const raw = await runJson<unknown>(['vault', 'get', vaultId]);
  return ProtonVaultSchema.parse(raw);
}

export async function createVault(name: string): Promise<ProtonVault> {
  const raw = await runJson<unknown>(['vault', 'create', '--name', name]);
  return ProtonVaultSchema.parse(raw);
}

export async function shareVault(vaultId: VaultId, email: string): Promise<void> {
  await runRaw(['vault', 'share', '--share-id', vaultId, '--email', email]);
}

function cloneItemInput(item: ProtonItem): ProtonItemCreate {
  const { id: _id, vaultId: _vaultId, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = item;
  return rest as ProtonItemCreate;
}

export async function copyVault(sourceVaultId: VaultId, targetName: string): Promise<ProtonVault> {
  const logger = getLogger();
  const sourceVault = await getVault(sourceVaultId);
  const sourceItems = await listItems(sourceVaultId);

  logger.info(`copying vault ${sourceVault.name} -> ${targetName} (${sourceItems.length} items)`);

  const targetVault = await createVault(targetName);

  for (const item of sourceItems) {
    await createItem(targetVault.id, cloneItemInput(item));
  }

  return targetVault;
}
