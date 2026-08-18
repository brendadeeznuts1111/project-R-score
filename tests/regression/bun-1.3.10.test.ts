// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/bundler/index#basic-example — Bun.build
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/blog/bun-v1.3.10 — native REPL, standalone browser HTML, Windows ARM64
import { describe, expect } from 'bun:test';
import { join } from 'node:path';
import { releaseTest, tempRoot } from './shared.ts';

const MIN_VERSION = '1.3.10';
const BLOG = 'https://bun.com/blog/bun-v1.3.10';

const { test: releaseCase, skipIf } = releaseTest(MIN_VERSION);

describe(`Bun ${MIN_VERSION} features (${BLOG})`, () => {
  releaseCase('native REPL starts without a package download and evaluates input', () => {
    const result = Bun.spawnSync([process.execPath, 'repl'], {
      stdin: new TextEncoder().encode('1 + 1\n.exit\n'),
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...Bun.env, NO_COLOR: '1' },
    });

    const output = Bun.stripANSI(result.stdout.toString());
    expect(result.exitCode).toBe(0);
    expect(result.stderr.toString()).toBe('');
    expect(output).toContain(`Welcome to Bun v${Bun.version}`);
    expect(output).toMatch(/\n2\n/);
  });

  releaseCase('browser compile emits one self-contained HTML file', async () => {
    const root = tempRoot('1.3.10-browser-compile');
    const entrypoint = join(root, 'index.html');
    await Bun.write(join(root, 'app.ts'), 'document.body.dataset.ready = "yes";\n');
    await Bun.write(join(root, 'style.css'), 'body { color: rgb(1, 2, 3); }\n');
    await Bun.write(
      entrypoint,
      '<!doctype html><link rel="stylesheet" href="./style.css"><script type="module" src="./app.ts"></script>'
    );

    const result = await Bun.build({
      entrypoints: [entrypoint],
      target: 'browser',
      compile: true,
      outdir: join(root, 'out'),
    });

    expect(result.success).toBe(true);
    expect(result.logs).toEqual([]);
    expect(result.outputs).toHaveLength(1);
    const output = await result.outputs[0]!.text();
    expect(result.outputs[0]!.path).toEndWith('.html');
    expect(output).toContain('<style>');
    expect(output).toContain('document.body.dataset.ready = "yes"');
    expect(output).not.toMatch(/<(?:script|link)[^>]+(?:src|href)=/);
  });

  skipIf(process.platform !== 'win32' || process.arch !== 'arm64')(
    'Windows ARM64 runtime can compile a bun-windows-arm64 executable',
    async () => {
      const root = tempRoot('1.3.10-windows-arm64');
      const entrypoint = join(root, 'entry.ts');
      const outfile = join(root, 'probe');
      await Bun.write(entrypoint, 'console.log("windows-arm64");\n');

      const result = await Bun.build({
        entrypoints: [entrypoint],
        compile: { target: 'bun-windows-arm64', outfile },
      });

      expect(process.arch).toBe('arm64');
      expect(result.success).toBe(true);
      expect(result.outputs).toHaveLength(1);
    }
  );
});
