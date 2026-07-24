/**
 * Portal shared data service — SWR cache, backoff, and portal:data events.
 * @see ./portal-types.d.ts
 */

/** @type {import('./portal-types.d.ts').PortalHealthPayload|null} */
let healthData = null;

const CACHE_KEY = 'portal_health_cache';
const DEFAULT_POLL_MS = 30_000;
const FETCH_TIMEOUT_MS = 5_000;

let pollingId = null;
let retryCount = 0;
let backoffTimer = null;
let firstLoadAttempted = false;

/**
 * @returns {number}
 */
function pollIntervalMs() {
  const meta = document.querySelector('meta[name="portal-poll-ms"]');
  const n = meta ? Number(meta.getAttribute('content')) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_POLL_MS;
}

/**
 * @returns {import('./portal-types.d.ts').PortalHealthPayload|null}
 */
function loadCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * @param {import('./portal-types.d.ts').PortalHealthPayload} data
 */
function saveCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

/**
 * @param {import('./portal-types.d.ts').PortalDataEventDetail} detail
 */
function emitPortalData(detail) {
  document.dispatchEvent(new CustomEvent('portal:data', { detail }));
}

/**
 * @returns {Promise<import('./portal-types.d.ts').PortalHealthPayload>}
 */
async function fetchHealthOnce() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch('/api/health', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.schemaVersion != null && data.schemaVersion !== 1) {
      console.warn(`[portal:data] unknown health schemaVersion ${data.schemaVersion} (expected 1)`);
    }
    return { ...data, _stale: false, _timestamp: Date.now() };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/**
 * @param {boolean} [isRetry]
 */
async function fetchHealth(isRetry = false) {
  const cached = loadCache();
  if (cached && !healthData) {
    healthData = { ...cached, _stale: true, _timestamp: Date.now() };
    emitPortalData({ status: 'stale', data: healthData });
  }

  try {
    const fresh = await fetchHealthOnce();
    healthData = fresh;
    saveCache(fresh);
    retryCount = 0;
    if (backoffTimer) {
      clearTimeout(backoffTimer);
      backoffTimer = null;
    }
    emitPortalData({ status: 'ok', data: healthData });
  } catch (err) {
    console.warn('[portal:data] health fetch failed:', err);

    if (!firstLoadAttempted && !isRetry) {
      firstLoadAttempted = true;
      setTimeout(() => fetchHealth(true), 2_000);
      return;
    }
    firstLoadAttempted = true;

    const stale = loadCache();
    if (stale) {
      healthData = { ...stale, _stale: true, _timestamp: Date.now() };
      emitPortalData({ status: 'stale', data: healthData, error: err });
    } else {
      healthData = null;
      emitPortalData({ status: 'error', error: err });
    }

    retryCount += 1;
    const delay = Math.min(1000 * 2 ** retryCount, 30_000) + Math.random() * 500;
    if (backoffTimer) clearTimeout(backoffTimer);
    backoffTimer = setTimeout(() => {
      backoffTimer = null;
      fetchHealth(true);
    }, delay);
  }
}

/**
 * Start polling /api/health (idempotent).
 * @param {number} [pollMs]
 */
export function startDataService(pollMs = pollIntervalMs()) {
  if (typeof window !== 'undefined' && window.__portalDataStarted) return;
  if (typeof window !== 'undefined') {
    window.__portalDataStarted = true;
    installDevFetchGuard();
  }

  emitPortalData({ status: 'loading', data: healthData });
  fetchHealth();

  if (pollingId) clearInterval(pollingId);
  pollingId = setInterval(() => fetchHealth(true), pollMs);
}

/** @returns {import('./portal-types.d.ts').PortalHealthPayload|null} */
export function getHealthData() {
  return healthData;
}

/** Warn when pages bypass the shared health fetch (localhost dev only). */
function installDevFetchGuard() {
  const host = location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') return;
  if (window.__portalFetchGuard) return;
  window.__portalFetchGuard = true;
  const original = window.fetch.bind(window);
  window.fetch = function portalFetchGuard(input, init) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (typeof url === 'string' && url.includes('/api/health')) {
      if (location.pathname.startsWith('/portal/health')) {
        return original(input, init);
      }
      const stack = new Error().stack ?? '';
      if (!stack.includes('fetchHealthOnce') && !stack.includes('data.js')) {
        console.warn(
          '[portal:data] Direct fetch to /api/health — use portal:data or getHealthData() (docs/portal-foundation.md)'
        );
      }
    }
    return original(input, init);
  };
}
