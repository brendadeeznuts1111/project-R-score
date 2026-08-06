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
  evaluateDoctor,
  buildDoctorChecks,
  packageJsonHasScanner,
  parseSocketPassRefFromEnvTemplate,
  parseSocketFromVaultMapText,
  SECURITY_SCANNER_DOCS,
  SECURITY_SCANNER_TEMPLATE,
  SOCKET_API_KEY_PASS_REF,
  SOCKET_SCANNER_PACKAGE,
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

  test('formatScannerStatus mentions docs, vault ref, and unconfigured state', () => {
    const text = formatScannerStatus({
      bunfigPath: 'bunfig.toml',
      bunfigExists: true,
      scanner: undefined,
      frozenLockfile: true,
      exact: true,
      saveTextLockfile: true,
      socketApiKeySet: false,
      socketApiKeyPassRef: 'pass://factorywager/Socket API Key/password',
      scannerInPackageJson: false,
      scannerInNodeModules: false,
      socketInEnvTemplate: true,
      socketInVaultMap: true,
      socketRefsAligned: true,
      mode: 'unconfigured',
    });
    expect(text).toContain('(not configured)');
    expect(text).toContain(SECURITY_SCANNER_DOCS);
    expect(text).toContain('frozenLockfile');
    expect(text).toContain(SECURITY_SCANNER_TEMPLATE);
    expect(text).toContain('SOCKET_API_KEY');
    expect(text).toContain('pass://factorywager/Socket API Key/password');
    expect(text).toContain('unset');
    expect(text).toContain('mode:');
  });

  test('parseSocketPassRefFromEnvTemplate + vault-map TOML', () => {
    const ref = parseSocketPassRefFromEnvTemplate(
      '# c\nSOCKET_API_KEY={{ pass://factorywager/Socket API Key/password }}\n'
    );
    expect(ref).toBe(SOCKET_API_KEY_PASS_REF);
    const vm = parseSocketFromVaultMapText(`
[env.SOCKET_API_KEY]
vault = "factorywager"
item = "Socket API Key"
field = "password"
`);
    expect(vm.present).toBe(true);
    expect(vm.passRef).toBe(SOCKET_API_KEY_PASS_REF);
  });

  test('packageJsonHasScanner reads devDependencies', () => {
    expect(
      packageJsonHasScanner(
        { devDependencies: { [SOCKET_SCANNER_PACKAGE]: '1.1.2' } },
        SOCKET_SCANNER_PACKAGE
      )
    ).toBe(true);
    expect(packageJsonHasScanner({ dependencies: {} }, SOCKET_SCANNER_PACKAGE)).toBe(false);
  });

  test('doctor is ok for package present + install-time off (quota-safe)', () => {
    const s = {
      bunfigPath: 'bunfig.toml',
      bunfigExists: true,
      scanner: undefined,
      frozenLockfile: true,
      exact: true,
      saveTextLockfile: true,
      socketApiKeySet: false,
      socketApiKeyPassRef: SOCKET_API_KEY_PASS_REF,
      scannerInPackageJson: true,
      scannerInNodeModules: true,
      socketInEnvTemplate: true,
      socketInVaultMap: true,
      socketRefsAligned: true,
      mode: 'unconfigured' as const,
    };
    const r = evaluateDoctor(s);
    expect(r.ok).toBe(true);
    expect(buildDoctorChecks(s).find(c => c.id === 'install-time-scanner')?.message).toContain(
      'OFF'
    );
  });

  test('doctor fails fatal when scanner package missing', () => {
    const r = evaluateDoctor({
      bunfigPath: 'bunfig.toml',
      bunfigExists: true,
      scanner: undefined,
      frozenLockfile: true,
      exact: true,
      saveTextLockfile: true,
      socketApiKeySet: false,
      socketApiKeyPassRef: SOCKET_API_KEY_PASS_REF,
      scannerInPackageJson: false,
      scannerInNodeModules: false,
      socketInEnvTemplate: true,
      socketInVaultMap: true,
      socketRefsAligned: true,
      mode: 'unconfigured',
    });
    expect(r.ok).toBe(false);
    expect(r.checks.find(c => c.id === 'scanner-package')?.ok).toBe(false);
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
  test('bare scanner / status exits 0 and documents real API + vault ref', async () => {
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
    // Repo bunfig configures Socket after feat(security) enable commit
    expect(out).toContain('@socketsecurity/bun-security-scanner');
    expect(out).toContain('SOCKET_API_KEY');
    expect(out).toContain('pass://factorywager/Socket API Key/password');
    expect(out).toContain('mode:');
    expect(out).toContain('env.template:');
  });

  test('scanner status --json is machine-readable', async () => {
    const proc = Bun.spawn(['bun', CLI, 'scanner', 'status', '--json'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    const j = JSON.parse(out);
    // install-time scanner may be off (quota-safe); package still present
    expect(j.scannerInPackageJson).toBe(true);
    expect(j.socketApiKeyPassRef).toBe(SOCKET_API_KEY_PASS_REF);
    expect(j.socketInEnvTemplate).toBe(true);
    expect(j.socketInVaultMap).toBe(true);
    expect(['free', 'authenticated', 'unconfigured']).toContain(j.mode);
  });

  test('scanner doctor exits 0 with package present and install-time off', async () => {
    const proc = Bun.spawn(['bun', CLI, 'scanner', 'doctor'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain('doctor');
    expect(out).toContain('scanner-package');
    expect(out).toContain('install-time-scanner');
  });

  test('scanner policy and estimate are API-free', async () => {
    for (const sub of ['policy', 'estimate'] as const) {
      const proc = Bun.spawn(['bun', CLI, 'scanner', sub, '--json'], {
        cwd: ROOT,
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const code = await proc.exited;
      const out = await new Response(proc.stdout).text();
      expect(code).toBe(0);
      const j = JSON.parse(out);
      if (sub === 'estimate') {
        expect(j.packageCountEstimate).toBeGreaterThan(100);
        expect(j.freeApiHitsIfScanned).toBe(j.packageCountEstimate);
      } else {
        expect(j.kind).toBe('portal-cli-package-policy');
        expect(j.scanCooldownHours).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(j.quotaNotes)).toBe(true);
      }
    }
  });

  test('evaluateScanCooldown skips within window unless force', async () => {
    const { evaluateScanCooldown } = await import('../tools/lib/portal-cli-scanner.ts');
    const last = {
      kind: 'portal-scanner-last' as const,
      schemaVersion: 1 as const,
      at: new Date().toISOString(),
      mode: 'free' as const,
      exitCode: 0,
      packageCountEstimate: 100,
      force: false,
    };
    const blocked = evaluateScanCooldown(last, { cooldownHours: 24, nowMs: Date.now() });
    expect(blocked.skip).toBe(true);
    const forced = evaluateScanCooldown(last, { force: true, cooldownHours: 24 });
    expect(forced.skip).toBe(false);
  });

  test('scanner vault prints Pass create recipe without secrets', async () => {
    const proc = Bun.spawn(['bun', CLI, 'scanner', 'vault'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = await new Response(proc.stdout).text();
    expect(code).toBe(0);
    expect(out).toContain(SOCKET_API_KEY_PASS_REF);
    expect(out).toContain('pass-cli item create login');
    expect(out).toContain('packages');
    // never leak a token-looking value
    expect(out).not.toMatch(/skt_[a-zA-Z0-9]{8,}/);
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
    expect(out).toContain('doctor');
    expect(out).toContain('vault');
    expect(out).toContain('bun pm scan');
    expect(out).toContain('fatal');
    expect(out).toContain('warn');
  });

  test('scanner scan --oneshot --force free mode exits 0 (quota path)', async () => {
    const proc = Bun.spawn(['bun', CLI, 'scanner', 'scan', '--oneshot', '--force'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const code = await proc.exited;
    const out = (await new Response(proc.stdout).text()) + (await new Response(proc.stderr).text());
    // Socket free/auth API may 429 under quota; oneshot must still restore bunfig
    // and surface a coherent scan path message.
    const quotaOrOk =
      code === 0 ||
      out.includes('429') ||
      out.includes('ScannerFailed') ||
      out.includes('quota') ||
      /rate.?limit/i.test(out);
    expect(quotaOrOk).toBe(true);
    expect(
      out.includes('No advisories') ||
        out.includes('free mode') ||
        out.includes('Scanning') ||
        out.includes('oneshot') ||
        out.includes('pm scan') ||
        out.includes('Security scanner failed')
    ).toBe(true);
    // bunfig should not retain a live install-time scanner line after oneshot
    const bunfig = await Bun.file(`${ROOT}/bunfig.toml`).text();
    expect(/^scanner\s*=\s*"@socketsecurity\/bun-security-scanner"/m.test(bunfig)).toBe(
      false
    );
    expect(/^\[install\.security\]\s*$/m.test(bunfig)).toBe(false);
  }, 20_000);

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
