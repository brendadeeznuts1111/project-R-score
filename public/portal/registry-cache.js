/**
 * registry-cache.js — shared registry JSON fetch with request deduplication and TTL.
 *
 * All <package-card> instances share one in-flight request and a short-lived
 * in-memory cache.  No external dependencies — pure web platform.
 *
 * @see /registry/registry.json  (canonical RegistryIndex)
 */

const pending = new Map();
const cache = new Map();
let generation = 0;
const TTL = 60_000; // 1 minute

function parseRegistry(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new TypeError('Registry response must be an object');
  }
  if (!data.packages || typeof data.packages !== 'object' || Array.isArray(data.packages)) {
    throw new TypeError('Registry response is missing a package index');
  }
  return data;
}

/**
 * Fetch the registry index, deduplicating concurrent requests and
 * caching the result for TTL ms.
 *
 * @param {string} [url='/registry/registry.json'] — registry JSON URL
 * @returns {Promise<{ schemaVersion: number, lastUpdated: string, packages: Record<string, object> }>}
 */
export async function fetchRegistry(url = '/registry/registry.json') {
  // If there's already an in-flight request for this URL, join it
  if (pending.has(url)) return pending.get(url);

  // Cache entries are URL-scoped so alternate registries cannot cross-contaminate.
  const cached = cache.get(url);
  if (cached && Date.now() - cached.fetchedAt < TTL) return cached.data;

  const requestGeneration = generation;

  const promise = fetch(url)
    .then(r => {
      if (!r.ok) throw new Error(`Registry fetch failed: ${r.status} ${r.statusText}`);
      return r.json();
    })
    .then(raw => {
      const data = parseRegistry(raw);
      if (generation === requestGeneration) {
        cache.set(url, { data, fetchedAt: Date.now() });
      }
      return data;
    })
    .finally(() => {
      // Do not let an older request clear a newer request for the same URL.
      if (pending.get(url) === promise) pending.delete(url);
    });

  pending.set(url, promise);
  return promise;
}

/** Clear cached data and any pending requests. */
export function clearRegistryCache() {
  generation += 1;
  cache.clear();
  pending.clear();
}

/**
 * Look up a single package entry from the cached registry.
 * Returns undefined when the package is not found or no cache exists.
 *
 * @param {string} name — package name
 * @returns {object|undefined}
 */
export function getCachedPackage(name, url = '/registry/registry.json') {
  return cache.get(url)?.data?.packages?.[name];
}

/**
 * Get the last-fetch timestamp (Unix ms). Useful for freshness displays.
 * Returns 0 when no fetch has completed.
 *
 * @returns {number}
 */
export function getLastFetchTime(url = '/registry/registry.json') {
  return cache.get(url)?.fetchedAt ?? 0;
}
