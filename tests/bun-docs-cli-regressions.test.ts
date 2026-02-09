import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function runCli(script: string, args: string[], env: Record<string, string>) {
  const proc = Bun.spawnSync(['bun', 'run', script, ...args], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdout: 'pipe',
    stderr: 'pipe',
  });

  return {
    exitCode: proc.exitCode,
    stdout: new TextDecoder().decode(proc.stdout),
    stderr: new TextDecoder().decode(proc.stderr),
  };
}

describe('bun docs cli regressions', () => {
  let originalHome: string | undefined;

  afterEach(() => {
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
  });

  test('bun-docs preserves numeric query terms with --max', async () => {
    const home = await mkdtemp(join(tmpdir(), 'bun-docs-home-'));
    const cacheDir = join(home, '.cache', 'bun-docs');
    await mkdir(cacheDir, { recursive: true });
    await writeFile(
      join(cacheDir, 'index.json'),
      JSON.stringify(
        {
          entries: [],
          lastUpdated: Date.now(),
          version: 'test',
          source: 'test',
        },
        null,
        2
      )
    );

    const out = runCli('barbershop/cli/bun-docs.ts', ['search', 'http', '404', '--max', '1'], { HOME: home });

    expect(out.exitCode).toBe(0);
    expect(out.stdout).toContain('No results found for "http 404"');
  });

  test('bun-docs-ultra does not treat --max value as query text', () => {
    const out = runCli('barbershop/cli/bun-docs-ultra.ts', ['--max', '20'], {});

    expect(out.exitCode).toBe(1);
    expect(out.stdout).toContain('Usage:');
    expect(out.stdout).not.toContain('🔍 "20"');
  });

  test('bun-docs-ultra refreshCache invokes refreshIndex path', async () => {
    originalHome = process.env.HOME;
    const home = await mkdtemp(join(tmpdir(), 'bun-docs-ultra-home-'));
    process.env.HOME = home;

    const module = await import(`../barbershop/cli/bun-docs-ultra.ts?refresh=${Date.now()}`);
    const interactive = new module.InteractiveSearcher() as any;
    let called = false;
    interactive.searcher.refreshIndex = async () => {
      called = true;
    };

    await interactive.refreshCache();
    expect(called).toBe(true);
  });
});
