/**
 * Shared fail-soft JSON fetch for static portal boards.
 */

export async function fetchJsonResult(url, init = {}) {
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      ...init,
      headers: {
        accept: 'application/json',
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) {
      return { ok: false, data: null, status: response.status, error: response.statusText };
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
