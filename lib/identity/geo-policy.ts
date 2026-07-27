/**
 * Geolocation blocking policy (Phase 2b) — config, not state.
 *
 * Pure module: no DB access, no imports from identity.ts (identity.ts
 * imports THIS file — one-way dependency, no cycle). The policy itself is
 * a constructor option (`IdentityOptions.geoPolicy`); nothing is persisted.
 *
 * Semantics (evaluated by IdentitySystem.login BEFORE password verification
 * — fail cheap, no credential oracle):
 *   - mode 'off'       → never blocks (default when the option is omitted)
 *   - mode 'allowlist' → blocks unless the resolved country IS listed
 *   - mode 'blocklist' → blocks when the resolved country IS listed
 *   - no ctx.ip, no configured geoResolver, or resolver → null
 *     → offline-allow (documented: a missing geo signal never blocks)
 *
 * `countries` are ISO 3166-1 alpha-2 codes, compared case-insensitively.
 */

export interface GeoPolicy {
  mode: 'off' | 'allowlist' | 'blocklist';
  countries: string[];
}

/**
 * True when `country` is blocked under `policy`. Case-insensitive on both
 * sides. An 'off' policy never blocks.
 */
export function isGeoBlocked(policy: GeoPolicy, country: string): boolean {
  if (policy.mode === 'off') return false;
  const listed = policy.countries.some(c => c.toUpperCase() === country.toUpperCase());
  return policy.mode === 'blocklist' ? listed : !listed;
}
