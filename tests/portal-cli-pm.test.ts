// @see https://bun.com/docs/test
// @see https://bun.com/docs/pm/cli/pm — bun pm
// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../scripts/lib/fs-bun';
import {
  PACKAGE_GRAPH_UPDATE_COMMAND,
  availablePackageGraphScopes,
  colorizeByHealth,
  formatPackageGraphCsv,
  packageGraphViewMatches,
  parsePackageGraphFlags,
  selectPackageGraphRows,
  toneHealthBadge,
  updatePackageGraphBake,
} from '../tools/lib/portal-package-scope';

const ROOT = resolvePath(import.meta.dir, '..');
const CLI = resolvePath(ROOT, 'tools/portal-cli.ts');

describe('portal-cli pm passthrough', () => {
  test('bare pm prints short help and exits 0', async () => {
    const proc = Bun.spawn(['bun', CLI, 'pm'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    // Short PM_HELP — not a full bun pm dump; lists main subcommands
    expect(out.includes('pack') || out.includes('ls')).toBe(true);
    expect(out.includes('https://bun.com/docs/pm/cli/pm')).toBe(true);
  });

  test('pm ls exits 0 and lists workspace packages', async () => {
    const proc = Bun.spawn(['bun', CLI, 'pm', 'ls'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    // Root monorepo workspaces appear in bun pm ls
    expect(out.includes('@factorywager/') || out.includes('workspace:')).toBe(true);
  });

  test('pm pkg get name returns root package name', async () => {
    const proc = Bun.spawn(['bun', CLI, 'pm', 'pkg', 'get', 'name'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = (await new Response(proc.stdout).text()).trim();
    expect(code).toBe(0);
    expect(out.includes('factorywager') || out.includes('"name"')).toBe(true);
  });

  test('pm graph prints offline packages-graph-map table', async () => {
    const proc = Bun.spawn(['bun', CLI, 'pm', 'graph'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out.includes('packages-graph-map') || out.includes('registry-client')).toBe(true);
    expect(out.includes('Rebake') || out.includes('role') || out.includes('score')).toBe(true);
    expect(out).toContain('selection  scope=all  view=all  selected=');
    expect(out).toContain('surfaces=global');
  });

  test('pm graph --view=dormant filters package rows', async () => {
    const proc = Bun.spawn(['bun', CLI, 'pm', 'graph', '--view=dormant', '--no-color'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('view=dormant');
    // dormant packages in current bake include business/p2p when present
    expect(out.includes('dormant') || out.includes('selected=')).toBe(true);
  });

  test('pm graph --export=json is machine-readable', async () => {
    const proc = Bun.spawn(['bun', CLI, 'pm', 'graph', '--export=json', '--view=all'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    const j = JSON.parse(out);
    expect(Array.isArray(j.packages)).toBe(true);
    expect(j.view).toBe('all');
  });

  test('pm graph filters canonical workspace package names by npm scope', async () => {
    const proc = Bun.spawn(['bun', CLI, 'pm', 'graph', '--scope', 'factorywager'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('selection  scope=@factorywager  view=all  selected=6/6');
    expect(out).toContain('@factorywager/registry-client');
  });

  test('pm graph help distinguishes the complete update from view-only scope filtering', async () => {
    const proc = Bun.spawn(['bun', CLI, 'pm', 'graph', '--help'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('Filter packages/* rows only (surface sections stay global)');
    expect(out).toContain('Refresh the complete package audit + graph before reading');
  });

  test('pm graph surfaces block after v13 bake (or rebake hint)', async () => {
    const proc = Bun.spawn(['bun', CLI, 'pm', 'graph'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    // v13 bake shows monorepo surfaces; v12 shows rebake hint
    const hasSurfaces =
      out.includes('monorepo surfaces') ||
      out.includes('workspace members') ||
      out.includes('registry bake plane') ||
      out.includes('no surfaces block');
    expect(hasSurfaces).toBe(true);
  });
});

describe('portal-cli pm graph flags', () => {
  test('normalizes npm scopes and preserves all/unscoped selectors', () => {
    expect(parsePackageGraphFlags([])).toEqual({
      scope: 'all',
      view: 'all',
      exportFormat: 'table',
      update: false,
      help: false,
      color: 'auto',
    });
    expect(parsePackageGraphFlags(['--scope', 'factorywager'])).toEqual({
      scope: '@factorywager',
      view: 'all',
      exportFormat: 'table',
      update: false,
      help: false,
      color: 'auto',
    });
    expect(parsePackageGraphFlags(['--scope=@factory', '--update'])).toEqual({
      scope: '@factory',
      view: 'all',
      exportFormat: 'table',
      update: true,
      help: false,
      color: 'auto',
    });
    expect(parsePackageGraphFlags(['--scope', 'unscoped'])).toEqual({
      scope: 'unscoped',
      view: 'all',
      exportFormat: 'table',
      update: false,
      help: false,
      color: 'auto',
    });
  });

  test('parses --view and --export / --json', () => {
    expect(parsePackageGraphFlags(['--view', 'dormant'])).toMatchObject({
      view: 'dormant',
      exportFormat: 'table',
    });
    expect(parsePackageGraphFlags(['--view=healthy', '--export=csv'])).toMatchObject({
      view: 'healthy',
      exportFormat: 'csv',
    });
    expect(parsePackageGraphFlags(['--json', '--view=consumed'])).toMatchObject({
      view: 'consumed',
      exportFormat: 'json',
    });
    expect(parsePackageGraphFlags(['--no-color'])).toMatchObject({ color: false });
  });

  test('rejects missing, repeated, and unknown graph options', () => {
    expect(() => parsePackageGraphFlags(['--scope'])).toThrow('--scope requires');
    expect(() => parsePackageGraphFlags(['--scope', 'all', '--scope', 'unscoped'])).toThrow(
      'only be specified once'
    );
    expect(() => parsePackageGraphFlags(['--view', 'nope'])).toThrow('Invalid --view');
    expect(() => parsePackageGraphFlags(['--bogus'])).toThrow('Unknown pm graph option');
  });

  test('CLI rejects --bogus and a missing --scope value without forwarding to bun pm', async () => {
    const cases = [
      { args: ['--bogus'], message: 'Unknown pm graph option: --bogus' },
      { args: ['--scope'], message: '--scope requires an npm scope' },
    ];

    for (const fixture of cases) {
      const proc = Bun.spawn(['bun', CLI, 'pm', 'graph', ...fixture.args], {
        cwd: ROOT,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const code = await proc.exited;
      const error = await new Response(proc.stderr).text();
      expect(code).toBe(1);
      expect(error).toContain(fixture.message);
    }
  });

  test('filters on canonical workspace names and keeps genuinely unscoped rows', () => {
    const packages = [
      { name: 'business', score: 100, role: 'dormant' },
      { name: 'health-check', score: 90, role: 'consumed' },
      { name: 'local-tool', score: 80, role: 'dormant' },
      { name: '@other/direct', score: 70, role: 'consumed' },
    ];
    const workspaces = [
      { path: 'packages/business', name: '@factorywager/business' },
      { path: 'packages/health-check/', name: '@factory/health-check' },
      { path: 'tools/local-tool', name: '@factorywager/not-a-package-row' },
    ];

    expect(
      selectPackageGraphRows(packages, workspaces, '@factorywager').map(row => row.npmName)
    ).toEqual(['@factorywager/business']);
    expect(selectPackageGraphRows(packages, workspaces, '@factory').map(row => row.npmName)).toEqual(
      ['@factory/health-check']
    );
    expect(
      selectPackageGraphRows(packages, workspaces, 'unscoped').map(row => row.npmName)
    ).toEqual(['local-tool']);
    expect(selectPackageGraphRows(packages, workspaces, 'all')).toHaveLength(4);
    expect(
      selectPackageGraphRows(packages, workspaces, 'all', 'dormant').map(r => r.npmName)
    ).toEqual(['@factorywager/business', 'local-tool']);
    expect(packageGraphViewMatches({ name: 'x', role: 'consumed', score: 100 }, 'healthy')).toBe(
      true
    );
    expect(toneHealthBadge(100)).toBe('ok');
    expect(toneHealthBadge(70)).toBe('warn');
    expect(toneHealthBadge(40)).toBe('bad');
    expect(colorizeByHealth('90', 90, false)).toBe('90');
    expect(colorizeByHealth('90', 90, true)).toContain('90');
    const csv = formatPackageGraphCsv(
      selectPackageGraphRows(packages, workspaces, 'all', 'consumed')
    );
    expect(csv).toContain('package,role,score');
    expect(csv).toContain('@factory/health-check');
    expect(availablePackageGraphScopes(packages, workspaces)).toEqual([
      '@factory',
      '@factorywager',
      '@other',
      'unscoped',
    ]);
  });

  test('unavailable npm scope reports the scopes present in the bake', async () => {
    const proc = Bun.spawn(['bun', CLI, 'pm', 'graph', '--scope', '@unavailable'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('no packages match scope=@unavailable view=all');
    expect(out).toContain('available scopes: @factorywager');
  });

  test('--update invokes the canonical offline rebake without writing in the test', async () => {
    const calls: Array<{ command: readonly string[]; cwd: string }> = [];
    const code = await updatePackageGraphBake('/tmp/package-graph-fixture', async (command, cwd) => {
      calls.push({ command, cwd });
      return 0;
    });

    expect(code).toBe(0);
    expect(calls).toEqual([
      {
        command: PACKAGE_GRAPH_UPDATE_COMMAND,
        cwd: '/tmp/package-graph-fixture',
      },
    ]);
  });
});
