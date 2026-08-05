/**
 * Bake-manifest freshness — "Data as of" badges for portal boards.
 *
 * Fetches `/registry/bake-manifest.json` once (window cache). Missing/unreachable
 * manifest → fail-silent (no badge, never throws into board render).
 *
 * Thresholds (age from bakedAt → now):
 *   ok   < 1h
 *   warn 1–4h
 *   bad  > 4h
 *
 * @see docs/harness/tenants/bake-resilience.md
 * @see lib/registry/bake-manifest.ts
 */

const MANIFEST_URL = '/registry/bake-manifest.json';
const CACHE_KEY = '__BAKE_MANIFEST__';

const HOUR_MS = 60 * 60 * 1000;
export const FRESHNESS_OK_MS = 1 * HOUR_MS;
export const FRESHNESS_WARN_MS = 4 * HOUR_MS;

/**
 * @typedef {{ bakedAt: string | null, ageMs: number | null, isStale: boolean, tone: 'ok' | 'warn' | 'bad' | 'unknown', source: string | null, path: string | null, label: string, title: string }} FreshnessInfo
 */

function store() {
  try {
    return typeof window !== 'undefined' ? window : globalThis;
  } catch {
    return globalThis;
  }
}

/**
 * @param {string} path
 * @returns {string}
 */
export function normalizeRegistryPath(path) {
  const raw = String(path || '').trim();
  if (!raw) return '';
  if (raw.startsWith('/registry/')) return raw;
  if (raw.startsWith('registry/')) return `/${raw}`;
  return `/registry/${raw.replace(/^\//, '')}`;
}

/**
 * @param {number | null} ageMs
 * @returns {'ok' | 'warn' | 'bad' | 'unknown'}
 */
export function toneForAge(ageMs) {
  if (ageMs == null || !Number.isFinite(ageMs) || ageMs < 0) return 'unknown';
  if (ageMs < FRESHNESS_OK_MS) return 'ok';
  if (ageMs < FRESHNESS_WARN_MS) return 'warn';
  return 'bad';
}

/**
 * @param {number | null} ageMs
 * @returns {string}
 */
export function formatAge(ageMs) {
  if (ageMs == null || !Number.isFinite(ageMs) || ageMs < 0) return 'unknown age';
  const sec = Math.floor(ageMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

/**
 * @param {string | null | undefined} iso
 * @param {number} [now]
 * @returns {number | null}
 */
export function ageMsFromIso(iso, now = Date.now()) {
  if (!iso || typeof iso !== 'string') return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, now - t);
}

/**
 * @param {FreshnessInfo} info
 */
export function formatFreshnessLabel(info) {
  if (!info || info.tone === 'unknown' || info.ageMs == null) {
    return info?.bakedAt ? `Updated ${String(info.bakedAt).slice(0, 16).replace('T', ' ')}` : '';
  }
  return `Updated ${formatAge(info.ageMs)}`;
}

/**
 * Load + cache bake-manifest (once per page).
 * @param {{ force?: boolean, fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<object | null>}
 */
export async function loadBakeManifest(opts = {}) {
  const g = store();
  if (!opts.force && g[CACHE_KEY]) return g[CACHE_KEY];

  const fetchImpl = opts.fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!fetchImpl) return null;

  try {
    const res = await fetchImpl(MANIFEST_URL, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: typeof AbortSignal !== 'undefined' ? AbortSignal.timeout(5000) : undefined,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.kind !== 'registry-bake-manifest' || !Array.isArray(data.entries)) {
      return null;
    }
    g[CACHE_KEY] = data;
    return data;
  } catch {
    return null;
  }
}

/**
 * Resolve freshness for one or more registry paths.
 * Multiple keys → use the **oldest** bakedAt (worst-case board staleness).
 *
 * @param {string | string[]} registryKey
 * @param {{ now?: number, fallbacks?: Record<string, string | null | undefined>, manifest?: object | null }} [opts]
 * @returns {Promise<FreshnessInfo | null>}
 */
export async function getFreshness(registryKey, opts = {}) {
  const keys = (Array.isArray(registryKey) ? registryKey : [registryKey])
    .map(normalizeRegistryPath)
    .filter(Boolean);
  if (keys.length === 0) return null;

  const now = opts.now ?? Date.now();
  const manifest = opts.manifest !== undefined ? opts.manifest : await loadBakeManifest();
  const entries = Array.isArray(manifest?.entries) ? manifest.entries : [];
  const byPath = new Map(
    entries.map(e => [normalizeRegistryPath(e.path), e]).filter(([p]) => p)
  );

  /** @type {{ path: string, bakedAt: string, source: string | null }[]} */
  const hits = [];
  for (const path of keys) {
    const entry = byPath.get(path);
    let bakedAt =
      (entry && typeof entry.bakedAt === 'string' && entry.bakedAt.trim()) ||
      (opts.fallbacks && opts.fallbacks[path]) ||
      (opts.fallbacks && opts.fallbacks[path.replace(/^\/registry\//, '')]) ||
      null;
    if (typeof bakedAt === 'string' && bakedAt.trim()) {
      hits.push({
        path,
        bakedAt: bakedAt.trim(),
        source: (entry && entry.source) || null,
      });
    }
  }

  if (hits.length === 0) return null;

  hits.sort((a, b) => Date.parse(a.bakedAt) - Date.parse(b.bakedAt));
  const oldest = hits[0];
  const ageMs = ageMsFromIso(oldest.bakedAt, now);
  const tone = toneForAge(ageMs);
  const info = {
    bakedAt: oldest.bakedAt,
    ageMs,
    isStale: tone === 'bad' || tone === 'warn',
    tone,
    source: oldest.source,
    path: oldest.path,
    label: '',
    title: '',
  };
  info.label = formatFreshnessLabel(info);
  const when = oldest.bakedAt.replace('T', ' ').replace(/\.\d+Z$/, 'Z');
  info.title =
    `${oldest.path}` +
    (oldest.source ? ` · source ${oldest.source}` : '') +
    ` · baked ${when}` +
    (hits.length > 1 ? ` · worst of ${hits.length} bakes` : '');
  return info;
}

/**
 * Paint a badge into `el`. Hides/clears on failure (fail-silent).
 *
 * @param {HTMLElement | null | undefined} el
 * @param {string | string[]} registryKey
 * @param {{ fallbacks?: Record<string, string | null | undefined>, now?: number }} [opts]
 * @returns {Promise<FreshnessInfo | null>}
 */
export async function mountFreshnessBadge(el, registryKey, opts = {}) {
  if (!el || typeof el !== 'object') return null;
  try {
    const info = await getFreshness(registryKey, opts);
    if (!info || !info.label) {
      el.hidden = true;
      el.textContent = '';
      el.removeAttribute('data-tone');
      el.removeAttribute('title');
      return null;
    }
    el.hidden = false;
    el.classList.add('portal-freshness');
    el.classList.remove(
      'portal-freshness--ok',
      'portal-freshness--warn',
      'portal-freshness--bad',
      'portal-freshness--unknown'
    );
    el.classList.add(`portal-freshness--${info.tone}`);
    el.dataset.tone = info.tone;
    el.textContent = info.label;
    el.title = info.title;
    el.setAttribute('aria-label', info.title || info.label);
    return info;
  } catch {
    el.hidden = true;
    el.textContent = '';
    return null;
  }
}
