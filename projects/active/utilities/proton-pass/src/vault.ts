import type { ItemId, VaultId } from './brands.ts';
import { runJson, runRaw } from './client.ts';
import { ProtonVault, ProtonVaultSchema } from './types.ts';

export async function listVaults(): Promise<ProtonVault[]> {
  const raw = await runJson<unknown[]>(['vault', 'list']);
  return raw.map(item => ProtonVaultSchema.parse(item));
}

export async function createVault(name: string): Promise<ProtonVault> {
  const raw = await runJson<unknown>(['vault', 'create', '--name', name]);
  return ProtonVaultSchema.parse(raw);
}

export async function shareVault(vaultId: VaultId, email: string): Promise<void> {
  await runRaw(['vault', 'share', '--share-id', vaultId, '--email', email]);
}

export async function copyVault(
  _sourceVaultId: VaultId,
  _targetName: string
): Promise<ProtonVault> {
  // Proton Pass CLI does not expose a direct vault clone primitive.
  // Implement via export/import or item-level clone once the upstream
  // command surface is known.
  throw new Error('copyVault is not yet implemented');
}

export async function findItemIds(_vaultId: VaultId): Promise<ItemId[]> {
  throw new Error('findItemIds is not yet implemented');
}
