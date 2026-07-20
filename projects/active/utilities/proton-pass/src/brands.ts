/**
 * Local branded ID types for Proton Pass domain identifiers.
 *
 * Mirrors the FactoryWager harness pattern (type + as* + try* + parse*) so the
 * package stays type-safe even when consumed outside the monorepo.
 */

declare const vaultBrand: unique symbol;
export type VaultId = string & { readonly [vaultBrand]: true };

export function asVaultId(value: string): VaultId {
  if (!value) throw new Error('VaultId cannot be empty');
  return value as VaultId;
}

export function tryVaultId(value: string | undefined | null): VaultId | undefined {
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  return trimmed ? (trimmed as VaultId) : undefined;
}

export function parseVaultId(value: unknown): VaultId {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Invalid VaultId: ${String(value)}`);
  }
  return value.trim() as VaultId;
}

declare const itemBrand: unique symbol;
export type ItemId = string & { readonly [itemBrand]: true };

export function asItemId(value: string): ItemId {
  if (!value) throw new Error('ItemId cannot be empty');
  return value as ItemId;
}

export function tryItemId(value: string | undefined | null): ItemId | undefined {
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  return trimmed ? (trimmed as ItemId) : undefined;
}

export function parseItemId(value: unknown): ItemId {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Invalid ItemId: ${String(value)}`);
  }
  return value.trim() as ItemId;
}
