// @see https://bun.com/docs/test
// @see https://bun.com/docs/pm/security-scanner-api
// @see https://bun.com/docs/runtime/toml#bun-toml-parse
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn
import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolvePath } from '../scripts/lib/fs-bun';
import {
  clearInstallSecurityScanner,
  formatScannerStatus,
  isValidScannerPackageName,
  parseInstallSecurityFromText,
  setInstallSecurityScanner,
  dispatchScanner,
  SECURITY_SCANNER_DOCS,
  SECURITY_SCANNER_TEMPLATE,
} from '../tools/lib/portal-cli-scanner.ts';
import { PORTAL_CLI_COMMANDS } from '../tools/lib/portal-cli-bun-flags.ts';

const ROOT = resolvePath(import.meta.dir, '..');
const CLI = resolvePath(ROOT, 'tools/portal-cli.ts');

const SAMPLE_BUNFIG = `# sample
[install]
exact = true
frozenLockfile = true

[install.scopes]
"@factorywager" = { url = "http://localhost:3000/" }

[test]
timeout = 10000
`;

describe('portal-cli-scanner pure helpers', () => {
  test('isValidScannerPackageName accepts npm names and local paths', () => {
    expect(isValidScannerPackageName('@acme/bun-security-scanner')).toBe(true);
    expect(isValidScannerPackageName('my-scanner')).toBe(true);
    expect(isValidScannerPackageName('./local-scanner')).toBe(true);
    expect(isValidScannerPackageName('')).toBe(false);
    expect(isValidScannerPackageName('bad name')).toBe(false);
  });

  test('parseInstallSecurityFromText reads scanner + frozenLockfile', () => {
    const none = parseInstallSecurityFromText(SAMPLE_BUNFIG);
    expect(none.scanner).toBeUndefined();
    expect(none.frozenLockfile).toBe(true);
    expect(none.exact).toBe(true);

    const withSec =
      SAMPLE_BUNFIG +
      `\n[install.security]\nscanner = "@acme/bun-security-scanner"\n`;
    const p = parseInstallSecurityFromText(withSec);
    expect(p.scanner).toBe('@acme/bun-security-scanner');
  });

  test('setInstallSecurityScanner appends section when missing', () => {
    const next = setInstallSecurityScanner(SAMPLE_BUNFIG, '@acme/scanner');
    expect(next).toContain('[install.security]');
    expect(next).toContain('scanner = "@acme/scanner"');
    // preserves prior tables
    expect(next).toContain('frozenLockfile = true');
    expect(next).toContain('[install.scopes]');
    const p = parseInstallSecurityFromText(next);
    expect(p.scanner).toBe('@acme/scanner');
  });

  test('setInstallSecurityScanner replaces existing scanner value', () => {
    const once = setInstallSecurityScanner(SAMPLE_BUNFIG, '@acme/a');
    const twice = setInstallSecurityScanner(once, '@acme/b');
    expect(twice.match(/\[install\.security\]/g)?.length).toBe(1);
    expect(twice).toContain('scanner = "@acme/b"');
    expect(twice).not.toContain('scanner = "@acme/a"');
  });

  test('clearInstallSecurityScanner removes section', () => {
    const withSec = setInstallSecurityScanner(SAMPLE_BUNFIG, '@acme/x');
    const cleared = clearInstallSecurityScanner(withSec);
    expect(parseInstallSecurityFromText(cleared).scanner).toBeUndefined();
    expect(cleared).not.toMatch(/\[install\.security\]/);
    expect(cleared).toContain('frozenLockfile = true');
  });

  test('formatScannerStatus mentions docs and unconfigured state', () => {
    const text = formatScannerStatus({
      bunfigPath: 'bunfig.toml',
      bunfigExists: true,
      scanner: undefined,
      frozenLockfile: true,
      exact: true,
    });
    expect(text).toContain('(not configured)');
    expect(text).toContain(SECURITY_SCANNER_DOCS);
    expect(text).toContain('frozenLockfile');
    expect(text).toContain(SECURITY_SCANNER_TEMPLATE);
  });

  test('PORTAL_CLI_COMMANDS includes scanner', () => {
    expect(PORTAL_CLI_COMMANDS.has('scanner')).toBe(true);
  });
});

describe('dispatchScanner', () => {
  test('configure dry-run does not write bunfig', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'portal-scanner-'));
    try {
      const bunfig = join(dir, 'bunfig.toml');
      await Bun.write(bunfig, SAMPLE_BUNFIG);
      const code = await dispatchScanner('configure', ['@acme/test-scanner'], {
        bunfigPath: bunfig,
        cwd: dir,
      });
      expect(code).toBe(0);
      const after = await Bun.file(bunfig).text();
      expect(after).toBe(SAMPLE_BUNFIG);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('configure --write sets scanner; clear --write removes it', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'portal-scanner-'));
    try {
      const bunfig = join(dir, 'bunfig.toml');
      await Bun.write(bunfig, SAMPLE_BUNFIG);
      const w = await dispatchScanner(
        'configure',
        ['@acme/test-scanner', '--write'],
        { bunfigPath: bunfig, cwd: dir }
      );
      expect(w).toBe(0);
      const mid = await Bun.file(bunfig).text();
      expect(parseInstallSecurityFromText(mid).scanner).toBe('@acme/test-scanner');

      const c = await dispatchScanner('clear', ['--write'], {
        bunfigPath: bunfig,
        cwd: dir,
      });
      expect(c).toBe(0);
      const end = await Bun.file(bunfig).text();
      expect(parseInstallSecurityFromText(end).scanner).toBeUndefined();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('scan without scanner returns 1 and does not spawn', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'portal-scanner-'));
    let spawned = false;
    try {
      const bunfig = join(dir, 'bunfig.toml');
      await Bun.write(bunfig, SAMPLE_BUNFIG);
      const code = await dispatchScanner('scan', [], {
        bunfigPath: bunfig,
        cwd: dir,
        spawnBun: async () => {
          spawned = true;
          return 0;
        },
      });
      expect(code).toBe(1);
      expect(spawned).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('scan with scanner spawns bun pm scan', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'portal-scanner-'));
    let seen: string[] | undefined;
    try {
      const bunfig = join(dir, 'bunfig.toml');
      await Bun.write(
        bunfig,
        setInstallSecurityScanner(SAMPLE_BUNFIG, '@acme/scanner')
      );
      const code = await dispatchScanner('scan', [], {
        bunfigPath: bunfig,
        cwd: dir,
        spawnBun: async args => {
          seen = args;
          return 0;
        },
      });
      expect(code).toBe(0);
      expect(seen).toEqual(['pm', 'scan']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('install spawns bun add -d', async () => {
    let seen: string[] | undefined;
    const code = await dispatchScanner('install', ['@acme/scanner'], {
      bunfigPath: join(ROOT, 'bunfig.toml'),
      cwd: ROOT,
      spawnBun: async args => {
        seen = args;
        return 0;
      },
    });
    expect(code).toBe(0);
    expect(seen).toEqual(['add', '-d', '@acme/scanner']);
  });

  test('init spawns git clone of official template', async () => {
    let seen: string[] | undefined;
    const code = await dispatchScanner('init', ['my-org-scanner'], {
      cwd: ROOT,
      spawnGit: async args => {
        seen = args;
        return 0;
      },
    });
    expect(code).toBe(0);
    expect(seen?.[0]).toBe('clone');
    expect(seen).toContain(SECURITY_SCANNER_TEMPLATE);
    expect(seen).toContain('my-org-scanner');
  });
});

describe('portal-cli scanner CLI', () => {
  test('bare scanner / status exits 0 and documents real API', async () => {
    const proc = Bun.spawn(['bun', CLI, 'scanner'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('scanner:');
    expect(out).toContain(SECURITY_SCANNER_DOCS);
    // Repo bunfig has no scanner yet
    expect(out).toContain('not configured');
  });

  test('scanner help lists grounded subcommands', async () => {
    const proc = Bun.spawn(['bun', CLI, 'scanner', 'help'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('configure');
    expect(out).toContain('bun pm scan');
    expect(out).toContain('fatal');
    expect(out).toContain('warn');
  });

  test('scanner scan without config exits non-zero', async () => {
    const proc = Bun.spawn(['bun', CLI, 'scanner', 'scan'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const err = await new Response(proc.stderr).text();
    expect(code).not.toBe(0);
    expect(err.includes('no security scanner') || err.includes('not configured')).toBe(
      true
    );
  });

  test('root help lists scanner command', async () => {
    const proc = Bun.spawn(['bun', CLI, 'help'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('scanner');
  });
});
