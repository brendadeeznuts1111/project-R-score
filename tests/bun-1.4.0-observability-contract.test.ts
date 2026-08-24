// @see https://bun.com/blog/bun-v1.4#observability — Bun 1.4.0 Observability
/**
 * Executable proofs for Bun 1.4.0 Observability (safe / in-process tier).
 * Inventory: packages/bun-release-contracts/contracts/bun-v1.4.0.json → "Observability"
 * metafile-md: tests/bun-1.4-cli-example.test.ts
 * Left planned: Datadog · OpenTelemetry npm packages · BUN_CPU_PROFILE alone
 *   (env without --cpu-prof* did not write a profile on this pin).
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import inspector from 'node:inspector';

const TARGET_VERSION = '1.4.0';
const releaseTest = Bun.version === TARGET_VERSION ? test : test.skip;

const root = mkdtempSync(join(tmpdir(), 'bun-1.4-observability-'));
afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

function writeHotScript(dir: string): string {
  const path = join(dir, 'hot.ts');
  writeFileSync(
    path,
    [
      'function escapeHtml(s: string) {',
      "  let o = '';",
      '  for (let i = 0; i < s.length; i++) o += s[i] === "<" ? "&lt;" : s[i];',
      '  return o;',
      '}',
      'function tokenize(s: string) {',
      '  const out: string[] = [];',
      '  for (let i = 0; i < 4000; i++) out.push(s.slice(0, (i % s.length) + 1));',
      '  return out;',
      '}',
      'function render(s: string) { return escapeHtml(tokenize(s).join("")); }',
      'render("hello <world> ".repeat(30));',
      '',
    ].join('\n')
  );
  return path;
}

describe('Bun 1.4.0 Observability — CLI profile markdown', () => {
  releaseTest('--cpu-prof-md writes Hot Functions / Call Tree markdown', () => {
    const dir = join(root, 'cpu-md');
    mkdirSync(dir, { recursive: true });
    const script = writeHotScript(dir);
    const proc = Bun.spawnSync(
      [
        process.execPath,
        '--cpu-prof-md',
        `--cpu-prof-dir=${dir}`,
        '--cpu-prof-name=cpu',
        script,
      ],
      { stdout: 'pipe', stderr: 'pipe', cwd: dir }
    );
    expect(proc.exitCode).toBe(0);
    const md = readFileSync(join(dir, 'cpu'), 'utf8');
    expect(md).toContain('# CPU Profile');
    expect(md).toContain('## Hot Functions (Self Time)');
    expect(md).toContain('## Call Tree (Total Time)');
    expect(md).toContain('## Function Details');
    expect(md).toMatch(/`tokenize`|`escapeHtml`|`render`/);
  });

  releaseTest('--cpu-prof writes Chrome DevTools JSON (.cpuprofile)', () => {
    const dir = join(root, 'cpu-json');
    mkdirSync(dir, { recursive: true });
    const script = writeHotScript(dir);
    const proc = Bun.spawnSync(
      [process.execPath, '--cpu-prof', `--cpu-prof-dir=${dir}`, script],
      { stdout: 'pipe', stderr: 'pipe', cwd: dir }
    );
    expect(proc.exitCode).toBe(0);
    const profiles = readdirSync(dir).filter(name => name.endsWith('.cpuprofile'));
    expect(profiles.length).toBeGreaterThanOrEqual(1);
    const body = JSON.parse(readFileSync(join(dir, profiles[0]!), 'utf8')) as {
      nodes?: unknown[];
    };
    expect(Array.isArray(body.nodes)).toBe(true);
    expect(body.nodes!.length).toBeGreaterThan(0);
  });

  releaseTest('--heap-prof-md writes Summary and Top Types markdown', () => {
    const dir = join(root, 'heap-md');
    mkdirSync(dir, { recursive: true });
    const script = join(dir, 'alloc.ts');
    writeFileSync(
      script,
      'const a: string[] = [];\nfor (let i = 0; i < 8000; i++) a.push("x".repeat(80));\nconsole.log(a.length);\n'
    );
    const proc = Bun.spawnSync(
      [
        process.execPath,
        '--heap-prof-md',
        `--heap-prof-dir=${dir}`,
        '--heap-prof-name=heap',
        script,
      ],
      { stdout: 'pipe', stderr: 'pipe', cwd: dir }
    );
    expect(proc.exitCode).toBe(0);
    const md = readFileSync(join(dir, 'heap'), 'utf8');
    expect(md).toContain('# Bun Heap Profile');
    expect(md).toContain('## Summary');
    expect(md).toContain('## Top 50 Types by Retained Size');
    expect(md).toContain('Total Heap Size');
  });

  releaseTest('--heap-prof writes a V8-compatible heap profile on exit', () => {
    const dir = join(root, 'heap-bin');
    mkdirSync(dir, { recursive: true });
    const script = join(dir, 'alloc.ts');
    writeFileSync(
      script,
      'const a: string[] = [];\nfor (let i = 0; i < 5000; i++) a.push("y".repeat(40));\nconsole.log(a.length);\n'
    );
    const proc = Bun.spawnSync(
      [process.execPath, '--heap-prof', `--heap-prof-dir=${dir}`, script],
      { stdout: 'pipe', stderr: 'pipe', cwd: dir }
    );
    expect(proc.exitCode).toBe(0);
    const snaps = readdirSync(dir).filter(
      name => name.endsWith('.heapprofile') || name.endsWith('.heapsnapshot')
    );
    expect(snaps.length).toBeGreaterThanOrEqual(1);
    expect(readFileSync(join(dir, snaps[0]!)).byteLength).toBeGreaterThan(1000);
  });

  releaseTest('bun --help documents cpu-prof-md and heap-prof-md', () => {
    const proc = Bun.spawnSync([process.execPath, '--help'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const out = `${proc.stdout.toString()}\n${proc.stderr.toString()}`;
    expect(out).toContain('--cpu-prof-md');
    expect(out).toContain('--heap-prof-md');
  });
});

describe('Bun 1.4.0 Observability — process + inspector', () => {
  releaseTest('process.on("memoryPressure") accepts warning|critical levels', () => {
    const seen: string[] = [];
    const onPressure = (level: 'warning' | 'critical') => {
      seen.push(level);
    };
    process.on('memoryPressure', onPressure);
    try {
      expect(process.emit('memoryPressure', 'warning')).toBe(true);
      expect(process.emit('memoryPressure', 'critical')).toBe(true);
      expect(seen).toEqual(['warning', 'critical']);
    } finally {
      process.off('memoryPressure', onPressure);
    }
  });

  releaseTest('node:inspector Session Profiler.start/stop returns a profile (#25939)', async () => {
    const session = new inspector.Session();
    session.connect();
    try {
      await new Promise<void>((resolve, reject) => {
        session.post('Profiler.enable', err => (err ? reject(err) : resolve()));
      });
      await new Promise<void>((resolve, reject) => {
        session.post('Profiler.start', err => (err ? reject(err) : resolve()));
      });
      let x = 0;
      for (let i = 0; i < 200_000; i++) x += Math.sqrt(i);
      expect(x).toBeGreaterThan(0);
      const result = await new Promise<{ profile?: { nodes?: unknown[] } }>((resolve, reject) => {
        session.post('Profiler.stop', (err, params) => (err ? reject(err) : resolve(params as never)));
      });
      expect(Array.isArray(result.profile?.nodes)).toBe(true);
      expect((result.profile?.nodes?.length ?? 0) > 0).toBe(true);
    } finally {
      session.disconnect();
    }
  });

  releaseTest('async fs.promises / Bun.file errors point at the await site', async () => {
    async function userAwait() {
      await Bun.file(join(root, `missing-${Date.now()}.bin`)).text();
    }
    try {
      await userAwait();
      expect.unreachable();
    } catch (error) {
      const stack = error instanceof Error ? String(error.stack) : String(error);
      expect(stack).toContain('userAwait');
      expect(stack).not.toMatch(/at native|native code/i);
    }
  });
});
