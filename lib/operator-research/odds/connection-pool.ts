// @see https://bun.com/docs/runtime/networking/dns#dns-prefetch — dns.prefetch
// @see https://bun.com/docs/runtime/networking/fetch#preconnect-to-a-host — fetch.preconnect
import { dns } from 'bun';
import type { HostId } from '../../types/branded.ts';
import { tryHostId } from '../../types/branded.ts';

export type PrewarmStats = {
  hostKey: string;
  host: HostId | null;
  lastUsed: number;
  prewarms: number;
  lastError?: string;
};

const activeOrigins = new Map<string, PrewarmStats>();

export function getPrewarmStats(): PrewarmStats[] {
  return [...activeOrigins.values()];
}

function normalizeHostname(hostname: string): string {
  return (
    hostname
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      ?.toLowerCase() ?? hostname
  );
}

/**
 * Warm DNS + TLS/connection for a bookmaker origin.
 * Best-effort: failures are recorded, never thrown.
 */
export function prewarmBookmaker(hostname: string, port = 443): PrewarmStats {
  const key = normalizeHostname(hostname);
  const host = tryHostId(key) ?? null;
  const prev = activeOrigins.get(key);
  const stats: PrewarmStats = {
    hostKey: key,
    host,
    lastUsed: Date.now(),
    prewarms: (prev?.prewarms ?? 0) + 1,
  };

  try {
    dns.prefetch(key, port);
  } catch (err) {
    stats.lastError = err instanceof Error ? err.message : String(err);
  }

  try {
    fetch.preconnect(`https://${key}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    stats.lastError = stats.lastError ? `${stats.lastError}; ${msg}` : msg;
  }

  activeOrigins.set(key, stats);
  return stats;
}

/**
 * Periodic prewarm for a set of hosts. Returns the interval handle for shutdown.
 */
export function schedulePrewarm(
  hostnames: string[],
  intervalMs = 5_000
): ReturnType<typeof setInterval> {
  for (const h of hostnames) prewarmBookmaker(h);
  return setInterval(() => {
    for (const h of hostnames) prewarmBookmaker(h);
  }, intervalMs);
}

export function clearPrewarmState(): void {
  activeOrigins.clear();
}
