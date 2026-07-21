// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — Bun.WebView
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils — Bun.escapeHTML
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/test/index#run-tests — bun:test
/**
 * Journey: install:verify → HTML smoke report → Bun.WebView asserts #status.
 *
 * install:verify is console-only; this test materializes the report from its
 * exit code + output, then proves the visible outcome in a headless WebView.
 *
 *   bun run test:install-verify
 */
import { describe, expect, test } from 'bun:test';
import { joinPath } from '../../lib/path-bun';

const ROOT = joinPath(import.meta.dir, '../..');
const OUT = joinPath(ROOT, '.cache/journey-install-verify');
const REPORT = joinPath(OUT, 'index.html');
const FAIL_SHOT = joinPath(OUT, 'failure.jpg');

async function runInstallVerify(): Promise<{ ok: boolean; log: string }> {
  const proc = Bun.spawn(['bun', 'run', 'install:verify'], {
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

function smokeHtml(ok: boolean, log: string): string {
  const status = ok ? 'verified' : 'failed';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>install:verify</title></head>
<body>
  <div id="status">${status}</div>
  <pre id="output">${Bun.escapeHTML(log)}</pre>
</body>
</html>
`;
}

describe('install:verify journey', () => {
  test(
    'materializes report + WebView assertion',
    async () => {
      expect(Bun.spawnSync(['mkdir', '-p', OUT]).exitCode).toBe(0);

      const { ok, log } = await runInstallVerify();
      expect(ok).toBe(true);

      const html = smokeHtml(ok, log || 'install:verify ok');
      await Bun.write(REPORT, html);

      await using view = new Bun.WebView({ width: 800, height: 600, backend: 'webkit' });
      // data: URL — same DOM as the written report; avoids file:// hangs in CI
      await view.navigate(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      const statusText = await view.evaluate<string | null>(
        `document.querySelector('#status')?.textContent ?? null`
      );
      try {
        expect(statusText).toBe('verified');
      } catch (err) {
        const shot = await view.screenshot({ format: 'jpeg', quality: 85 });
        await Bun.write(FAIL_SHOT, shot);
        throw err;
      }
    },
    { timeout: 30_000 }
  );
});
