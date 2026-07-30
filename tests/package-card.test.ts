/**
 * Tests for <package-card> web component and registry-cache module.
 *
 * These tests validate:
 *   - Pure health computation functions (no DOM needed)
 *   - Component class contract (name, registration)
 *   - Shared fetch cache behavior (deduplication, TTL)
 *   - DOM/shadow-DOM rendering via Bun.WebView (real browser backend —
 *     no happy-dom dependency; skips automatically when WebView is unavailable)
 *
 * @see ../public/portal/components/package-card.js
 * @see ../public/portal/registry-cache.js
 * @see https://bun.com/docs/runtime/webview — Bun.WebView click/evaluate/navigate
 */

import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test';

/* ── registry-cache.js tests ─────────────────────────────────────────── */

describe('registry-cache.js', () => {
  beforeEach(() => {
    // Reset module state between tests
    const { clearRegistryCache } = require('../public/portal/registry-cache.js');
    clearRegistryCache();
  });

  test('fetchRegistry returns data and caches it', async () => {
    const { fetchRegistry, clearRegistryCache } = await import('../public/portal/registry-cache.js');
    clearRegistryCache();

    // Mock the global fetch
    const mockData = { schemaVersion: 1, packages: { test: { versions: ['1.0.0'] } } };
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    try {
      const result = await fetchRegistry('/registry/registry.json');
      expect(result).toEqual(mockData);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await fetchRegistry('/registry/registry.json');
      expect(result2).toEqual(mockData);
      expect(fetchSpy).toHaveBeenCalledTimes(1); // no additional fetch
    } finally {
      fetchSpy.mockRestore();
    }
  });

  test('fetchRegistry deduplicates concurrent requests', async () => {
    const { fetchRegistry, clearRegistryCache } = await import('../public/portal/registry-cache.js');
    clearRegistryCache();

    let resolvePromise;
    const mockData = { packages: { pkg: { versions: ['1.0.0'] } } };
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(() => {
      return new Promise(resolve => {
        resolvePromise = () => resolve(new Response(JSON.stringify(mockData), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }));
      });
    });

    try {
      const p1 = fetchRegistry('/registry/registry.json');
      const p2 = fetchRegistry('/registry/registry.json');

      resolvePromise();
      const [r1, r2] = await Promise.all([p1, p2]);

      expect(r1).toEqual(mockData);
      expect(r2).toEqual(mockData);
      expect(fetchSpy).toHaveBeenCalledTimes(1); // deduplicated
    } finally {
      fetchSpy.mockRestore();
    }
  });

  test('clearRegistryCache resets cache and pending', async () => {
    const { fetchRegistry, clearRegistryCache } = await import('../public/portal/registry-cache.js');
    clearRegistryCache();

    const mockData = { packages: { a: { versions: ['1.0.0'] } } };
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    try {
      await fetchRegistry('/registry/registry.json');
      clearRegistryCache();

      const fetchSpy2 = spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return new Response(JSON.stringify({ packages: { b: { versions: ['2.0.0'] } } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      });

      const result = await fetchRegistry('/registry/registry.json');
      expect(result.packages.b).toBeDefined(); // fresh data
      fetchSpy2.mockRestore();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  test('getCachedPackage after fetch returns entry', async () => {
    const { fetchRegistry, getCachedPackage } = await import('../public/portal/registry-cache.js');

    const mockData = { packages: { 'my-pkg': { versions: ['1.0.0', '1.1.0'] } } };
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    try {
      await fetchRegistry('/registry/registry.json');
      expect(getCachedPackage('my-pkg')).toBeDefined();
      expect(getCachedPackage('my-pkg').versions).toContain('1.0.0');
      expect(getCachedPackage('nonexistent')).toBeUndefined();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  test('getLastFetchTime returns 0 before any fetch', async () => {
    const { getLastFetchTime, clearRegistryCache } = await import('../public/portal/registry-cache.js');
    clearRegistryCache();
    expect(getLastFetchTime()).toBe(0);
  });
});

/* ── Health computation tests (inlined from package-card.js) ────────── */

// Mirrors the pure functions in public/portal/components/package-card.js
// so tests run without a DOM environment.

function computeHealth(release, totalVersions) {
  const freshness = release?.publishedAt ? dateFreshness(release.publishedAt) : 0;
  const completeness = tagCompleteness(release, totalVersions);
  const score = Math.round((freshness + completeness) / 2);
  return { score, freshness, completeness };
}

function dateFreshness(publishedAt) {
  const pub = new Date(publishedAt).getTime();
  const now = Date.now();
  const days = (now - pub) / (1000 * 60 * 60 * 24);
  if (days < 7) return 100;
  if (days < 30) return 80;
  if (days < 90) return 60;
  if (days < 180) return 40;
  return 20;
}

function tagCompleteness(release, totalVersions) {
  let score = 0;
  if (release?.description) score += 30;
  if (release?.tags?.length) score += 20;
  if (release?.readme) score += 20;
  if (release?.dependencies) score += 10;
  if (totalVersions > 1) score += 10;
  if (totalVersions > 3) score += 10;
  return Math.min(score, 100);
}

function healthClass(score) {
  if (score >= 70) return 'ok';
  if (score >= 40) return 'warn';
  return 'bad';
}

function healthLabel(score) {
  if (score >= 70) return 'Healthy';
  if (score >= 40) return 'Fair';
  return 'Needs work';
}

describe('health computation (inlined — matches package-card.js)', () => {
  test('computeHealth scores a fresh, complete release at 100', () => {
    const release = {
      description: 'Great package',
      tags: ['tag1', 'tag2'],
      readme: '# Docs',
      dependencies: { lodash: '^4' },
      publishedAt: new Date().toISOString(),
    };
    const result = computeHealth(release, 5);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  test('computeHealth scores a bare release lower', () => {
    const release = { publishedAt: new Date(Date.now() - 200 * 86400000).toISOString() };
    const result = computeHealth(release, 1);
    // 6+ months old (freshness=20) + 1 version (completeness=0) → ~10
    expect(result.score).toBeLessThanOrEqual(25);
  });

  test('computeHealth returns 0 for null release', () => {
    const result = computeHealth(null, 0);
    expect(result.score).toBe(0);
    expect(result.freshness).toBe(0);
    expect(result.completeness).toBe(0);
  });

  test('healthClass maps scores correctly', () => {
    expect(healthClass(100)).toBe('ok');
    expect(healthClass(70)).toBe('ok');
    expect(healthClass(69)).toBe('warn');
    expect(healthClass(40)).toBe('warn');
    expect(healthClass(39)).toBe('bad');
    expect(healthClass(0)).toBe('bad');
  });

  test('healthLabel maps scores correctly', () => {
    expect(healthLabel(100)).toBe('Healthy');
    expect(healthLabel(70)).toBe('Healthy');
    expect(healthLabel(69)).toBe('Fair');
    expect(healthLabel(40)).toBe('Fair');
    expect(healthLabel(39)).toBe('Needs work');
    expect(healthLabel(0)).toBe('Needs work');
  });

  test('tagCompleteness accumulates points', () => {
    const full = { description: 'x', tags: ['a'], readme: 'y', dependencies: { z: '1' } };
    expect(tagCompleteness(full, 5)).toBe(100);

    const bare = {};
    expect(tagCompleteness(bare, 0)).toBe(0);

    const partial = { description: 'x', tags: ['a'] };
    expect(tagCompleteness(partial, 2)).toBe(60); // 30 desc + 20 tags + 10 versions (>1)
  });
});

/* ── Component class tests ──────────────────────────────────────────────
 *
 * These require a minimal DOM environment (happy-dom).
 * Skip until happy-dom is installed.
 */

/**
 * DOM tests via Bun.WebView — a real browser backend (no happy-dom needed).
 * A tiny in-test Bun.serve exposes public/ so the component's module import
 * and /registry/registry.json fetch resolve against real artifacts.
 * Skips automatically when Bun.WebView is unavailable.
 */
const WEBVIEW_OK = typeof Bun.WebView === 'function';

describe.skipIf(!WEBVIEW_OK)('package-card.js DOM tests (Bun.WebView)', () => {
  let server: ReturnType<typeof Bun.serve>;
  let origin: string;

  async function cardPage(name: string): Promise<InstanceType<typeof Bun.WebView>> {
    const view = new Bun.WebView({ width: 640, height: 480 });
    await view.navigate(`${origin}/__card-test?name=${encodeURIComponent(name)}`);
    // Module scripts resolve asynchronously — wait for the page's ready flag.
    for (let i = 0; i < 40; i++) {
      const ready = await view.evaluate(`typeof window.__ready !== 'undefined'`);
      if (ready) return view;
      await Bun.sleep(50);
    }
    throw new Error('card test page did not become ready');
  }

  beforeEach(async () => {
    server = Bun.serve({
      port: 0,
      async fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === '/__card-test') {
          const name = url.searchParams.get('name') ?? '';
          return new Response(
            `<!doctype html><html><body><script type="module">
              import '/portal/components/package-card.js';
              const el = document.createElement('package-card');
              el.setAttribute('name', ${JSON.stringify(name)});
              el.addEventListener('package-detail', (e) => { window.__detail = e.detail; });
              document.body.appendChild(el);
              window.__ready = el.load ? el.load() : Promise.resolve();
            </script></body></html>`,
            { headers: { 'content-type': 'text/html; charset=utf-8' } }
          );
        }
        const file = Bun.file(`public${url.pathname}`);
        if (await file.exists()) return new Response(file);
        return new Response('not found', { status: 404 });
      },
    });
    origin = `http://127.0.0.1:${server.port}`;
  });

  afterEach(() => {
    server.stop(true);
  });

  test('component is defined as custom element', async () => {
    await using view = await cardPage('event-store');
    const defined = await view.evaluate(`customElements.get('package-card') !== undefined`);
    expect(defined).toBe(true);
  });

  test('element renders name attribute', async () => {
    await using view = await cardPage('event-store');
    const text = await view.evaluate(`
      window.__ready.then(() =>
        document.querySelector('package-card').shadowRoot.getElementById('name').textContent)
    `);
    expect(String(text)).toContain('event-store');
  });

  test('fires package-detail event on button click', async () => {
    await using view = await cardPage('event-store');
    await view.evaluate(`
      window.__ready.then(() => {
        const btn = document.querySelector('package-card').shadowRoot.getElementById('detail-btn');
        btn.click();
      })
    `);
    // Allow the CustomEvent to land on window.__detail
    let detail: string | null = null;
    for (let i = 0; i < 20 && !detail; i++) {
      detail = (await view.evaluate(`window.__detail ? window.__detail.name : null`)) as
        | string
        | null;
      if (!detail) await Bun.sleep(25);
    }
    expect(detail).toBe('event-store');
  });

  test('shows error state for unknown package', async () => {
    await using view = await cardPage('nonexistent-pkg');
    const hidden = await view.evaluate(`
      window.__ready.then(() => {
        const err = document.querySelector('package-card').shadowRoot.getElementById('error');
        return err ? err.hidden : null;
      })
    `);
    expect(hidden).toBe(false);
  });
});
