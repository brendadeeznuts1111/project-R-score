// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/fetch — fetch with AbortSignal.timeout
/**
 * Login anomaly detection (Phase 2) — device fingerprinting + geo heuristic.
 *
 * Thin-wrapper module over `IdentitySystem` (same pattern as lockout.ts):
 * all DB access goes through narrow typed methods on the system; this file
 * holds the scoring policy only. Imports IdentitySystem type-only (no cycle).
 *
 * Risk semantics (evaluated in this exact order):
 *   1. trusted fingerprint                      → low
 *   2. geo country present, node HAS a country baseline, and the country is
 *      not in that baseline                       → high (`Login from XX (first time)`)
 *   3. first-ever fingerprint for the node       → medium ('New device/unknown location')
 *   4. known but untrusted fingerprint           → medium ('Known device but not trusted')
 *
 * Coherence refinements (documented, deliberate):
 *   - An EMPTY country baseline can never be anomalous: with no history there
 *     is nothing to deviate from, and the first-ever device is already
 *     'medium'. This keeps the very first geo-resolved login from blocking
 *     itself out of establishing a baseline.
 *   - Every outcome upserts the fingerprint row (first_seen/last_seen, and
 *     country_code when known) so trust decisions and history stay current —
 *     including blocked logins, which are exactly the sightings ops wants.
 *   - Geo is best-effort: no resolver, a throwing resolver, or a resolver
 *     returning null all mean "no geo signal" — never an error.
 */

import type { TreeNodeId } from '../types/branded.ts';
import type { IdentitySystem } from './identity.ts';

const IP_GEO_API_BASE_URL = Bun.env.IP_GEO_API_BASE_URL ?? 'https://ipapi.co';

export type GeoResolver = (ip: string) => Promise<string | null>;

export type AnomalyRisk = { risk: 'low' | 'medium' | 'high'; reason?: string };

/**
 * SHA-256 hex of `<network prefix>|<first 50 chars of UA>`.
 * IPv4: the /24 network (`a.b.c.0/24`) — stable across DHCP host jitter.
 * IPv6: the first 4 hextets (`x:x:x:x::/64`, the typical LAN prefix) —
 * a deliberately simple approximation; documented, not exhaustive.
 */
export function getFingerprint(ip: string, userAgent: string): string {
  const material = `${networkPrefix(ip)}|${userAgent.slice(0, 50)}`;
  return new Bun.CryptoHasher('sha256').update(material).digest('hex');
}

function networkPrefix(ip: string): string {
  if (ip.includes('.')) {
    const octets = ip.split('.');
    return `${octets.slice(0, 3).join('.')}.0/24`;
  }
  const hextets = ip.split(':');
  return `${hextets.slice(0, 4).join(':')}::/64`;
}

/**
 * Production geo resolver: ipapi.co country lookup with a 2s timeout.
 * ANY failure (network, timeout, non-2xx, unexpected body) → null
 * (offline-allow). Never throws.
 */
export function defaultGeoResolver(): GeoResolver {
  return async (ip: string): Promise<string | null> => {
    try {
      const res = await fetch(`${IP_GEO_API_BASE_URL}/${encodeURIComponent(ip)}/country/`, {
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) return null;
      const text = (await res.text()).trim();
      return /^[A-Z]{2}$/.test(text) ? text : null;
    } catch {
      return null;
    }
  };
}

/** Exported for geo-policy gate in identity.ts — one resolver-safety implementation. */
export async function safeResolveCountry(
  resolveGeo: GeoResolver,
  ip: string
): Promise<string | null> {
  try {
    const country = await resolveGeo(ip);
    return typeof country === 'string' && country.length > 0 ? country : null;
  } catch {
    return null; // a throwing resolver must never break login
  }
}

/**
 * Score a login attempt. When `resolveGeo` is omitted no geo lookup happens
 * (hermetic default); pass `defaultGeoResolver()` in production or a fake in
 * tests. Always upserts the fingerprint row before returning.
 */
export async function checkAnomaly(
  identity: IdentitySystem,
  nodeId: TreeNodeId,
  ip: string,
  userAgent: string,
  resolveGeo?: GeoResolver
): Promise<AnomalyRisk> {
  const fingerprintHash = getFingerprint(ip, userAgent);
  const existing = identity.fingerprintFor(nodeId, fingerprintHash);
  const country = resolveGeo ? await safeResolveCountry(resolveGeo, ip) : null;

  let result: AnomalyRisk;
  if (existing?.trusted) {
    result = { risk: 'low' };
  } else if (country !== null) {
    const baseline = identity.countriesFor(nodeId);
    if (baseline.length > 0 && !baseline.includes(country)) {
      result = { risk: 'high', reason: `Login from ${country} (first time)` };
    } else {
      result = existing
        ? { risk: 'medium', reason: 'Known device but not trusted' }
        : { risk: 'medium', reason: 'New device/unknown location' };
    }
  } else {
    result = existing
      ? { risk: 'medium', reason: 'Known device but not trusted' }
      : { risk: 'medium', reason: 'New device/unknown location' };
  }

  identity.upsertFingerprint(nodeId, fingerprintHash, country);
  return result;
}

/** Mark a device fingerprint as trusted. Audits `device_trusted`. */
export function trustDevice(
  identity: IdentitySystem,
  nodeId: TreeNodeId,
  fingerprintHash: string
): void {
  identity.trustFingerprint(nodeId, fingerprintHash);
  identity.logAuthEvent({
    nodeId,
    action: 'device_trusted',
    details: { fingerprintHash },
  });
}
