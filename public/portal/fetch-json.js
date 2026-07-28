/**
 * Shared fail-soft JSON fetch for static portal boards.
 */

export const DEFAULT_JSON_TIMEOUT_MS = 8000;

/** @param {{ timeoutMs?: number }} init */
export function jsonFetchTimeout(init = {}) {
  const timeout = Number(init.timeoutMs);
  return Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_JSON_TIMEOUT_MS;
}

/** @param {RequestInit & { timeoutMs?: number }} init */
export async function fetchJsonResult(url, init = {}) {
  const { timeoutMs: _timeoutMs, ...requestInit } = init;
  const headers = new Headers(requestInit.headers);
  if (!headers.has('accept')) headers.set('accept', 'application/json');
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      ...requestInit,
      headers,
      signal: requestInit.signal ?? AbortSignal.timeout(jsonFetchTimeout(init)),
    });
    if (!response.ok) {
      return {
        ok: false,
        data: null,
        status: response.status,
        error: response.statusText || `HTTP ${response.status}`,
      };
    }
    return { ok: true, data: await response.json(), status: response.status, error: null };
  } catch (error) {
    return {
      ok: false,
      data: null,
      status: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function fetchJson(url, init = {}) {
  const result = await fetchJsonResult(url, init);
  return result.ok ? result.data : null;
}
