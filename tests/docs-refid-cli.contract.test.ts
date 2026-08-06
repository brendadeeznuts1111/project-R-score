// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Contract tests: run REF:ID validator / CLI as a subprocess and assert
 * stdout / exit codes (not in-process imports of the check path).
 */
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../lib/path-bun.ts';

const REPO = resolvePath(import.meta.dir, '..');
const CLI = resolvePath(REPO, 'tools/docs-refid.ts');
const CHECK = resolvePath(REPO, 'tools/docs-refid-check.ts');

function run(
  args: string[],
  entry: string = CLI
): { exitCode: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync(['bun', entry, ...args], {
    cwd: REPO,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, NO_COLOR: '1' },
  });
  return {
    exitCode: result.exitCode ?? 1,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

describe('docs-refid CLI contract (subprocess)', () => {
  test('--help shows defaults, commands, and validation presets', () => {
    const r = run(['--help']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('docs-refid');
    expect(r.stdout).toContain('DEFAULTS');
    expect(r.stdout).toContain('--section');
    expect(r.stdout).toContain('4.1');
    expect(r.stdout).toContain('docs/design/bun-types-inventory.md');
    expect(r.stdout).toContain('bun:types-status');
    expect(r.stdout).toContain('VALIDATION PRESETS');
    expect(r.stdout).toContain('--strict-format');
    expect(r.stdout).toContain('--skip-refid-check');
    expect(r.stdout).toContain('--dry-run');
    expect(r.stdout).toContain('REGISTERED DOCS');
    expect(r.stdout).toContain('check');
    expect(r.stdout).toContain('audit');
    expect(r.stdout).toContain('suggest');
    expect(r.stdout).toContain('list');
    expect(r.stdout).toContain('scaffold');
    expect(r.stdout).toContain('CONTRIBUTING.md');
  });

  test('help command same as --help', () => {
    const r = run(['help']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('USAGE');
  });

  test('check on registered inventory doc exits 0 with ok line', () => {
    const r = run(['check']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/docs:refid:check.*ok|REF:ID v2 ok/i);
  });

  test('check --json emits schema factorywager/ref-id/v2', () => {
    const r = run(['check', '--json']);
    expect(r.exitCode).toBe(0);
    const body = JSON.parse(r.stdout) as {
      schema: string;
      count: number;
      issues: unknown[];
    };
    expect(body.schema).toBe('factorywager/ref-id/v2');
    expect(body.count).toBe(0);
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues).toHaveLength(0);
  });

  test('check --skip-refid-check exits 0 without validating', () => {
    const r = run(['check', '--skip-refid-check']);
    expect(r.exitCode).toBe(0);
    // skip path still prints ok with empty issues via printRefIdIssues
    expect(r.stdout).toMatch(/ok|REF:ID/i);
  });

  test('check --dry-run exits 0 and labels dry-run + audit inventory', () => {
    const r = run(['check', '--dry-run']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('[dry-run]');
    expect(r.stdout).toMatch(/audit|scanned/i);
    expect(r.stdout).toContain('docs/design/bun-types-inventory.md');
  });

  test('audit lists registered docs with zero flags-table-only gaps', () => {
    const r = run(['audit']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/scanned \d+/);
    expect(r.stdout).toMatch(/registered=\d+/);
    expect(r.stdout).toContain('flags-table-only=0');
    expect(r.stdout).toContain('docs/design/bun-types-inventory.md');
    expect(r.stdout).toContain('keep-registered');
  });

  test('audit --json schema factorywager/ref-id-audit/v1', () => {
    const r = run(['audit', '--json']);
    expect(r.exitCode).toBe(0);
    const body = JSON.parse(r.stdout) as {
      schema: string;
      scanned: number;
      summary: Record<string, number>;
      rows: Array<{ file: string; class: string }>;
    };
    expect(body.schema).toBe('factorywager/ref-id-audit/v1');
    expect(body.scanned).toBeGreaterThan(10);
    expect(body.summary.registered).toBeGreaterThanOrEqual(1);
    expect(body.summary['flags-table-only'] ?? 0).toBe(0);
    expect(body.rows.some(row => row.file.includes('bun-types-inventory'))).toBe(true);
  });

  test('check --strict-format still green on registered doc', () => {
    const r = run(['check', '--strict-format']);
    expect(r.exitCode).toBe(0);
  });

  test('suggest --flag normalizes and prints free REF:ID', () => {
    const r = run(['suggest', '--section=4.1', '--flag=--contract-probe-xyz']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('4.1.contract-probe-xyz');
    expect(r.stdout).toContain('#4.1.contract-probe-xyz');
    expect(r.stdout).toMatch(/free|format ok/i);
    expect(r.stdout).toContain('<a id="4.1.contract-probe-xyz"></a>');
  });

  test('suggest --json machine shape', () => {
    const r = run(['suggest', '--section=4.1', '--keyword=contract-json-leaf', '--json']);
    expect(r.exitCode).toBe(0);
    const body = JSON.parse(r.stdout) as {
      refId: string; // brand-ok — REF:ID fragment from CLI JSON, not domain brand
      href: string;
      formatOk: boolean;
      section: string;
    };
    expect(body.section).toBe('4.1');
    expect(body.refId).toBe('4.1.contract-json-leaf');
    expect(body.href).toBe('#4.1.contract-json-leaf');
    expect(body.formatOk).toBe(true);
  });

  test('list includes numbered §4.1 flags from inventory doc', () => {
    const r = run(['list']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('4.1.refresh');
    expect(r.stdout).toContain('4.1.strict');
    expect(r.stdout).toContain('docs/design/bun-types-inventory.md');
  });

  test('scaffold prints comment + anchor + table row', () => {
    const r = run(['scaffold', '--section=4.1', '--flag=--scaffold-probe']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('<!-- REF:ID 4.1.scaffold-probe -->');
    expect(r.stdout).toContain('<a id="4.1.scaffold-probe"></a>');
    expect(r.stdout).toContain('`4.1.scaffold-probe`');
    expect(r.stdout).toContain('#4.1.scaffold-probe');
  });

  test('unknown command exits non-zero and shows help', () => {
    const r = run(['not-a-command']);
    expect(r.exitCode).not.toBe(0);
    expect(r.stdout + r.stderr).toMatch(/unknown command|USAGE|docs-refid/i);
  });

  test('suggest without keyword/flag exits non-zero', () => {
    const r = run(['suggest', '--section=4.1']);
    expect(r.exitCode).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/usage:|keyword|flag/i);
  });

  test('suggest renumbers when keyword is already taken', () => {
    const r = run(['suggest', '--section=4.1', '--keyword=refresh']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('4.1.refresh-2');
    expect(r.stdout).toContain('#4.1.refresh-2');
  });

  test('--help mentions --write-hrefs and --section-ref', () => {
    const r = run(['--help']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('--write-hrefs');
    expect(r.stdout).toContain('--section-ref');
    expect(r.stdout).toContain('--section-heading');
    expect(r.stdout).toContain('refresh-2');
  });

  test('check --doc placement fixture fails with section-placement', () => {
    const r = run([
      'check',
      '--doc=tests/fixtures/ref-id/placement-bad.md',
      '--section-ref=4.1',
      '--section-heading=### Flags / settings',
      '--json',
    ]);
    expect(r.exitCode).not.toBe(0);
    const body = JSON.parse(r.stdout) as {
      issues: Array<{ kind: string }>;
    };
    expect(body.issues.some(i => i.kind === 'section-placement')).toBe(true);
  });

  test('check --doc comment-orphan fixture fails comment-missing-anchor', () => {
    const r = run([
      'check',
      '--doc=tests/fixtures/ref-id/comment-orphan.md',
      '--json',
    ]);
    expect(r.exitCode).not.toBe(0);
    const body = JSON.parse(r.stdout) as {
      issues: Array<{ kind: string; refId?: string }>;
    };
    expect(
      body.issues.some(
        i => i.kind === 'comment-missing-anchor' && i.refId === '4.1.orphan-leaf'
      )
    ).toBe(true);
  });

  test('check --write-hrefs fills auto cells in a temp --doc', async () => {
    const rel = `tests/fixtures/ref-id/.tmp-href-write-${Bun.randomUUIDv7()}.md`;
    const abs = resolvePath(REPO, rel);
    const src = resolvePath(REPO, 'tests/fixtures/ref-id/href-auto.md');
    await Bun.write(abs, Bun.file(src));
    try {
      const r = run([
        'check',
        `--doc=${rel}`,
        '--write-hrefs',
        '--section-ref=4.1',
        '--section-heading=### Flags / settings',
      ]);
      expect(r.exitCode).toBe(0);
      expect(r.stdout).toMatch(/wrote 2 href cell/);
      const after = await Bun.file(abs).text();
      expect(after).toContain('[`#4.1.refresh`](#4.1.refresh)');
      expect(after).toContain('[`#4.1.strict`](#4.1.strict)');
      expect(after).not.toMatch(/\|\s*auto\s*\|/);
    } finally {
      Bun.spawnSync(['rm', '-f', abs], { cwd: REPO });
    }
  });
});

describe('docs-refid-check thin entry (subprocess)', () => {
  test('--help documents defaults and presets', () => {
    const r = run(['--help'], CHECK);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('docs-refid-check');
    expect(r.stdout).toContain('DEFAULTS');
    expect(r.stdout).toContain('--strict-format');
    expect(r.stdout).toContain('--skip-refid-check');
    expect(r.stdout).toContain('--write-hrefs');
    expect(r.stdout).toContain('docs/design/bun-types-inventory.md');
  });

  test('default check exits 0 on registered doc', () => {
    const r = run([], CHECK);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/ok/i);
  });

  test('--json schema matches multi-CLI', () => {
    const r = run(['--json'], CHECK);
    expect(r.exitCode).toBe(0);
    const body = JSON.parse(r.stdout) as { schema: string; count: number };
    expect(body.schema).toBe('factorywager/ref-id/v2');
    expect(body.count).toBe(0);
  });
});
