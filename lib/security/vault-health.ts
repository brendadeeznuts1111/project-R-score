/**
 * Vault health — cross-references the env→vault map (config/vault-map.toml,
 * via buildVaultMapBundle) against LIVE Proton Pass item states.
 *
 * The killer checks (would have caught the 2026-07 trashed-Telegram incident
 * before it became a 30-day purge time-bomb):
 *   - referencedTrashed — an env-referenced item sits in trash (auto-purged ~30d)
 *   - referencedMissing — an env-referenced item does not exist in its vault
 *
 * Pure module (no pass-cli, no fetch) — the bake CLI supplies live rows.
 */

export type VaultLiveItem = {
  title: string;
  state: string; // 'Active' | 'Trashed' | … (pass-cli item list)
};

export type ReferencedHealth = {
  envKey: string;
  vault: string;
  item: string;
  status: 'ok' | 'trashed' | 'missing';
};

export type VaultHealthVault = {
  name: string;
  active: number;
  trashed: number;
  trashedTitles: string[];
};

export type VaultHealthReport = {
  kind: 'vault-health';
  generatedAt: string;
  vaults: VaultHealthVault[];
  referenced: ReferencedHealth[];
  summary: {
    vaultCount: number;
    activeItems: number;
    trashedItems: number;
    referencedOk: number;
    referencedTrashed: number;
    referencedMissing: number;
    healthy: boolean;
  };
};

export type VaultRefInput = {
  envKey: string;
  vault: string | null;
  item: string | null;
};

/** Extract title from an `item list --output json` row (title | name | metadata.name). */
export function itemTitleFromRow(row: Record<string, unknown>): string | null {
  const r = row as { title?: unknown; name?: unknown; data?: { metadata?: { name?: unknown } } };
  if (typeof r.title === 'string' && r.title) return r.title;
  if (typeof r.name === 'string' && r.name) return r.name;
  const meta = r.data?.metadata?.name;
  return typeof meta === 'string' && meta ? meta : null;
}

/** Parse `item list --output json` (array or { items: [...] }) into live item states. */
export function liveItemsFromListJson(raw: string): VaultLiveItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Failed to parse item list JSON');
  }
  const arr: unknown[] = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown }).items)
      ? ((parsed as { items: unknown[] }).items ?? [])
      : [];
  const out: VaultLiveItem[] = [];
  for (const row of arr) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const title = itemTitleFromRow(r);
    if (!title) continue;
    out.push({ title, state: typeof r.state === 'string' ? r.state : 'Unknown' });
  }
  return out;
}

/** Cross-reference env→vault refs against live vault contents. */
export function computeVaultHealth(
  refs: VaultRefInput[],
  liveByVault: Map<string, VaultLiveItem[]>,
  generatedAt = new Date().toISOString()
): VaultHealthReport {
  const vaults: VaultHealthVault[] = [];
  for (const [name, items] of [...liveByVault.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const trashedItems = items.filter(i => i.state === 'Trashed');
    vaults.push({
      name,
      active: items.filter(i => i.state === 'Active').length,
      trashed: trashedItems.length,
      trashedTitles: trashedItems.map(i => i.title).sort(),
    });
  }

  const referenced: ReferencedHealth[] = [];
  for (const ref of refs) {
    if (!ref.vault || !ref.item) continue;
    const live = liveByVault.get(ref.vault) ?? [];
    const found = live.find(i => i.title === ref.item);
    referenced.push({
      envKey: ref.envKey,
      vault: ref.vault,
      item: ref.item,
      status: !found ? 'missing' : found.state === 'Trashed' ? 'trashed' : 'ok',
    });
  }
  referenced.sort((a, b) => a.envKey.localeCompare(b.envKey));

  const referencedTrashed = referenced.filter(r => r.status === 'trashed').length;
  const referencedMissing = referenced.filter(r => r.status === 'missing').length;
  return {
    kind: 'vault-health',
    generatedAt,
    vaults,
    referenced,
    summary: {
      vaultCount: vaults.length,
      activeItems: vaults.reduce((n, v) => n + v.active, 0),
      trashedItems: vaults.reduce((n, v) => n + v.trashed, 0),
      referencedOk: referenced.filter(r => r.status === 'ok').length,
      referencedTrashed,
      referencedMissing,
      healthy: referencedTrashed === 0 && referencedMissing === 0,
    },
  };
}
