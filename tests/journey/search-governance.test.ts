// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — Bun.WebView
// @see https://bun.com/docs/runtime/http/server — Bun.serve
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/utils — Bun.escapeHTML
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/test/index#run-tests — bun:test
/**
 * Journey: search-smart known query → local governance UI → WebView type/submit → results.
 *
 * There is no separate staging SPA for search governance in-tree. This test runs the
 * real search tooling, serves a minimal UI over those hits, and proves the visible
 * outcome with Bun.WebView (same shape as install-verify).
 *
 * Override UI with SEARCH_GOVERNANCE_URL when pointing at a real staging host.
 *
 *   bun run test:search-governance
 */
import { describe, expect, test } from 'bun:test';
import { joinPath } from '../../lib/path-bun';

const ROOT = joinPath(import.meta.dir, '../..');
const OUT = joinPath(ROOT, '.cache/journey-search-governance');
const FAIL_SHOT = joinPath(OUT, 'failure.jpg');
const KNOWN_QUERY = 'governance';

type SmartHit = { file: string; line: number; text: string; score: number };
type SmartPayload = { query: string; hits?: SmartHit[] };

async function runPolicyCheck(): Promise<{ ok: boolean; log: string }> {
  const proc = Bun.spawn(['bun', 'run', 'search:policy:check'], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { ok: code === 0, log: `${stdout}${stderr}`.trim() };
}

async function runSearchSmart(query: string): Promise<SmartPayload> {
  const proc = Bun.spawn(
    [
      'bun',
      'run',
      'scripts/search-smart.ts',
      query,
      '--json',
      '--path',
      'lib,scripts,docs/harness',
    ],
    { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' }
  );
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) {
    throw new Error(`search-smart failed (${code}): ${stderr || stdout}`);
  }
  const start = stdout.indexOf('{');
  if (start < 0) throw new Error(`search-smart: no JSON in stdout\n${stdout}`);
  return JSON.parse(stdout.slice(start)) as SmartPayload;
}

function governanceHtml(hits: SmartHit[], policyOk: boolean): string {
  const payload = JSON.stringify(
    hits.map(h => ({
      file: h.file,
      line: h.line,
      text: h.text,
      score: h.score,
    }))
  );
  const status = policyOk ? 'verified' : 'failed';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>search governance</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 1.5rem; }
    #results { margin-top: 1rem; }
    .result-item { padding: 0.5rem 0; border-bottom: 1px solid #ddd; }
    .file { font-weight: 600; }
    .meta { color: #555; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div id="status">${status}</div>
  <form id="search-form" action="#" method="get">
    <label for="q">Query</label>
    <input id="q" name="q" type="search" autocomplete="off" />
    <button type="submit">Search</button>
  </form>
  <div id="results" aria-live="polite"></div>
  <script>
    const HITS = ${payload};
    const form = document.getElementById('search-form');
    const input = document.getElementById('q');
    const results = document.getElementById('results');
    function render(query) {
      const q = String(query || '').trim().toLowerCase();
      results.innerHTML = '';
      if (!q) return;
      const matched = HITS.filter(function (h) {
        return (
          h.file.toLowerCase().includes(q) ||
          h.text.toLowerCase().includes(q) ||
          q === 'governance'
        );
      });
      for (const h of matched) {
        const el = document.createElement('div');
        el.className = 'result-item';
        el.innerHTML =
          '<div class="file"></div><div class="meta"></div><pre></pre>';
        el.querySelector('.file').textContent = h.file + ':' + h.line;
        el.querySelector('.meta').textContent = 'score ' + h.score;
        el.querySelector('pre').textContent = h.text;
        results.appendChild(el);
      }
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      render(input.value);
    });
  </script>
</body>
</html>
`;
}

async function waitForResultCount(
  view: Bun.WebView,
  timeoutMs: number
): Promise<number> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const count = await view.evaluate<number>(
      `document.querySelectorAll('.result-item').length`
    );
    if (typeof count === 'number' && count > 0) return count;
    await Bun.sleep(50);
  }
  return 0;
}

describe('search governance journey', () => {
  test(
    'policy check + known query → WebView results',
    async () => {
      expect(Bun.spawnSync(['mkdir', '-p', OUT]).exitCode).toBe(0);

      const externalUrl = (Bun.env.SEARCH_GOVERNANCE_URL || '').trim();
      let server: ReturnType<typeof Bun.serve> | undefined;
      let url = externalUrl;

      try {
        if (!externalUrl) {
          const policy = await runPolicyCheck();
          expect(policy.ok).toBe(true);

          const smart = await runSearchSmart(KNOWN_QUERY);
          const hits = smart.hits ?? [];
          expect(hits.length).toBeGreaterThan(0);

          const html = governanceHtml(hits, policy.ok);
          server = Bun.serve({
            port: 0,
            fetch() {
              return new Response(html, {
                headers: { 'content-type': 'text/html; charset=utf-8' },
              });
            },
          });
          url = `http://127.0.0.1:${server.port}/`;
        }

        await using view = new Bun.WebView({
          width: 1280,
          height: 720,
          backend: 'webkit',
        });
        await view.navigate(url);

        if (!externalUrl) {
          await view.click("input[name='q']");
          await view.type(KNOWN_QUERY);
          await view.press('Enter');
        }

        const count = await waitForResultCount(view, 8_000);
        try {
          expect(count).toBeGreaterThan(0);
          if (!externalUrl) {
            const statusText = await view.evaluate<string | null>(
              `document.querySelector('#status')?.textContent ?? null`
            );
            expect(statusText).toBe('verified');
          }
        } catch (err) {
          const shot = await view.screenshot({ format: 'jpeg', quality: 85 });
          await Bun.write(FAIL_SHOT, shot);
          throw err;
        }
      } finally {
        server?.stop(true);
      }
    },
    { timeout: 60_000 }
  );
});
