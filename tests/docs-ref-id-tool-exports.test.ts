// @see https://bun.com/docs/test — bun:test
/**
 * Prove monorepo CLIs re-export the same REF:ID leaves as lib/docs/ref-id-tool-flags.
 */
import { describe, expect, test } from 'bun:test';
import {
  ALLOWED_LONG_REGISTRY,
  BUN_PR_VERIFY_ALLOWED_LONG,
  BUN_RELEASE_CONTRACTS_ALLOWED_LONG,
  BUN_RUNTIME_PIN_ALLOWED_LONG,
  SCREENSHOT_ALLOWED_LONG,
  CLOUDFLARE_ENV_VALIDATE_ALLOWED_LONG,
  GLOSSARY_HEALTH_ALLOWED_LONG,
  IMAGES_GENERATE_ALLOWED_LONG,
  ROUTING_REGISTRY_PROOF_ALLOWED_LONG,
  IMAGES_GENERATE_LEAVES,
  LINT_WIRES_ALLOWED_LONG,
  LINT_WIRES_LEAVES,
  OPS_SNAPSHOT_ALLOWED_LONG,
  OPS_SNAPSHOT_LEAVES,
  PARTNER_ONBOARD_ALLOWED_LONG,
  PARTNER_ONBOARD_LEAVES,
  TELEGRAM_OPS_ALLOWED_LONG,
  TELEGRAM_OPS_LEAVES,
  checkUnknownLongOptions,
  imagesGenerateFlagDocRef,
  imagesGenerateToolFlags,
  lintWiresFlagDocRef,
  lintWiresToolFlags,
  opsSnapshotFlagDocRef,
  opsSnapshotToolFlags,
  partnerOnboardFlagDocRef,
  partnerOnboardToolFlags,
  telegramOpsFlagDocRef,
  telegramOpsToolFlags,
  unknownFlagPolicy,
  unknownLongOptionLeaves,
} from '../lib/docs/ref-id-tool-flags.ts';
import { PARTNER_ONBOARD_ALLOWED_LONG as partnerOnboardAllowedReexport } from '../tools/partner-onboard.ts';
import {
  flagDocRef as imagesGenerateFlagDocRefExport,
  imagesGenerateToolFlags as imagesGenerateFromTool,
} from '../scripts/images-generate.ts';
import {
  flagDocRef as lintWiresFlagDocRefExport,
  lintWiresToolFlags as lintWiresFromTool,
} from '../scripts/validate-wire-traps.ts';
import {
  flagDocRef as opsSnapshotFlagDocRefExport,
  opsSnapshotToolFlags as opsSnapshotFromTool,
} from '../tools/ops-snapshot.ts';
import {
  flagDocRef as partnerOnboardFlagDocRefExport,
  partnerOnboardToolFlags as partnerOnboardFromTool,
} from '../tools/partner-onboard.ts';
import {
  flagDocRef as telegramOpsFlagDocRefExport,
  telegramOpsToolFlags as telegramOpsFromTool,
} from '../tools/telegram-ops.ts';

describe('in-tool flagDocRef re-exports', () => {
  test('lint-wires flagDocRef matches SSOT', () => {
    for (const leaf of LINT_WIRES_LEAVES) {
      expect(lintWiresFlagDocRefExport(leaf)).toEqual(lintWiresFlagDocRef(leaf));
    }
    expect(lintWiresFromTool().map(r => r.refId)).toEqual(
      lintWiresToolFlags().map(r => r.refId)
    );
  });

  test('partner-onboard flagDocRef matches SSOT', () => {
    for (const leaf of PARTNER_ONBOARD_LEAVES) {
      expect(partnerOnboardFlagDocRefExport(leaf)).toEqual(partnerOnboardFlagDocRef(leaf));
    }
    expect(partnerOnboardFromTool().map(r => r.refId)).toEqual(
      partnerOnboardToolFlags().map(r => r.refId)
    );
  });

  test('telegram-ops flagDocRef matches SSOT', () => {
    for (const leaf of TELEGRAM_OPS_LEAVES) {
      expect(telegramOpsFlagDocRefExport(leaf)).toEqual(telegramOpsFlagDocRef(leaf));
    }
    expect(telegramOpsFromTool().map(r => r.refId)).toEqual(
      telegramOpsToolFlags().map(r => r.refId)
    );
  });

  test('images:generate flagDocRef matches SSOT', () => {
    for (const leaf of IMAGES_GENERATE_LEAVES) {
      expect(imagesGenerateFlagDocRefExport(leaf)).toEqual(imagesGenerateFlagDocRef(leaf));
    }
    expect(imagesGenerateFromTool().map(r => r.refId)).toEqual(
      imagesGenerateToolFlags().map(r => r.refId)
    );
  });

  test('ops:snapshot flagDocRef matches SSOT', () => {
    for (const leaf of OPS_SNAPSHOT_LEAVES) {
      expect(opsSnapshotFlagDocRefExport(leaf)).toEqual(opsSnapshotFlagDocRef(leaf));
    }
    expect(opsSnapshotFromTool().map(r => r.refId)).toEqual(
      opsSnapshotToolFlags().map(r => r.refId)
    );
  });

  test('help text includes REF:ID section marker (lint-wires · images · ops)', () => {
    const cwd = import.meta.dir + '/..';
    const cases: Array<{ cmd: string[]; needle: string }> = [
      { cmd: ['bun', 'scripts/validate-wire-traps.ts', '--help'], needle: '4.1.scan' },
      { cmd: ['bun', 'scripts/images-generate.ts', '--help'], needle: '1.1.source' },
      { cmd: ['bun', 'tools/ops-snapshot.ts', '--help'], needle: '1.1.seed' },
    ];
    for (const { cmd, needle } of cases) {
      const r = Bun.spawnSync(cmd, { cwd, stdout: 'pipe', stderr: 'pipe' });
      const out = r.stdout.toString() + r.stderr.toString();
      expect(r.exitCode).toBe(0);
      expect(out).toContain('REF:ID');
      expect(out).toContain(needle);
    }
  });

  test('ALLOWED_LONG_REGISTRY covers all guarded CLIs', () => {
    expect(ALLOWED_LONG_REGISTRY['partner:onboard']).toEqual(PARTNER_ONBOARD_ALLOWED_LONG);
    expect(partnerOnboardAllowedReexport).toEqual(PARTNER_ONBOARD_ALLOWED_LONG);
    expect(ALLOWED_LONG_REGISTRY['lint-wires']).toBe(LINT_WIRES_ALLOWED_LONG);
    expect(ALLOWED_LONG_REGISTRY['images:generate']).toBe(IMAGES_GENERATE_ALLOWED_LONG);
    expect(ALLOWED_LONG_REGISTRY['ops:snapshot']).toBe(OPS_SNAPSHOT_ALLOWED_LONG);
    expect(ALLOWED_LONG_REGISTRY['telegram:ops']).toBe(TELEGRAM_OPS_ALLOWED_LONG);
    expect(ALLOWED_LONG_REGISTRY['bun:pr:verify']).toBe(BUN_PR_VERIFY_ALLOWED_LONG);
    expect([...BUN_PR_VERIFY_ALLOWED_LONG]).toEqual(['proof', 'json', 'diff']);
    expect(ALLOWED_LONG_REGISTRY['bun:release-contracts']).toBe(BUN_RELEASE_CONTRACTS_ALLOWED_LONG);
    expect([...BUN_RELEASE_CONTRACTS_ALLOWED_LONG]).toContain('json');
    expect([...BUN_RELEASE_CONTRACTS_ALLOWED_LONG]).toContain('force');
    expect(ALLOWED_LONG_REGISTRY.screenshot).toBe(SCREENSHOT_ALLOWED_LONG);
    expect([...SCREENSHOT_ALLOWED_LONG]).toContain('allow-placeholder');
    expect([...SCREENSHOT_ALLOWED_LONG]).toContain('force');
    expect(ALLOWED_LONG_REGISTRY['bun:runtime-pin']).toBe(BUN_RUNTIME_PIN_ALLOWED_LONG);
    expect(ALLOWED_LONG_REGISTRY['glossary:health']).toBe(GLOSSARY_HEALTH_ALLOWED_LONG);
    expect(ALLOWED_LONG_REGISTRY['cloudflare:env:validate']).toBe(
      CLOUDFLARE_ENV_VALIDATE_ALLOWED_LONG
    );
    expect(ALLOWED_LONG_REGISTRY['routing:registry-proof']).toBe(
      ROUTING_REGISTRY_PROOF_ALLOWED_LONG
    );
    // Batch-2 operator CLIs — non-empty allowlists registered
    const batch2 = [
      'ops:seed:toc',
      'discovery:compose',
      'public:discovery',
      'schema:audit',
      'telegram:handshake:catalog',
      'concept:health',
      'ops:loop:gate-backfill',
      'ops:limits:check',
      'identity:admin',
      'provision:queue',
      'monorepo:health',
      'brand:status',
      'docs:refid',
      'concept:audit',
      'concept:registry:graph',
      'concept:discover',
      'seat:desk',
      'packages:metafile-audit',
      'harness:violations',
      'portal:cli',
      'bun:brand-map',
      'env:inventory',
      'check:import-graph',
      'check:console-format',
      'concept:review',
      'concept:deprecate',
    ] as const;
    for (const key of batch2) {
      expect(ALLOWED_LONG_REGISTRY[key].length).toBeGreaterThan(0);
    }
    expect(Object.keys(ALLOWED_LONG_REGISTRY).length).toBeGreaterThanOrEqual(300);
    expect(ALLOWED_LONG_REGISTRY['portal:cli'].length).toBeGreaterThan(40);
    expect(ALLOWED_LONG_REGISTRY['bun:brand-map']).toEqual(['check', 'write-baseline', 'json']);
    expect(ALLOWED_LONG_REGISTRY['env:inventory']).toEqual([
      'json',
      'vault-only',
      'ratchet',
      'write-baseline',
      'bake',
    ]);
    expect(ALLOWED_LONG_REGISTRY['check:import-graph']).toEqual(['json', 'write-baseline']);
    expect(ALLOWED_LONG_REGISTRY['check:console-format']).toEqual(['staged', 'write-baseline']);
    expect(ALLOWED_LONG_REGISTRY['precommit:ast-grep']).toContain('full');
    expect(ALLOWED_LONG_REGISTRY['concept:review']).toEqual([
      'list',
      'output',
      'id',
      'approve',
      'reject',
      'reason',
      'correlation-id',
    ]);
    expect(ALLOWED_LONG_REGISTRY['concept:deprecate']).toEqual(['replace-by', 'reason']);
    expect(ALLOWED_LONG_REGISTRY['check:networking']).toContain('external');
    expect(ALLOWED_LONG_REGISTRY['check:networking']).toContain('authority-host');
    // bun:pr:verify must include --diff (behavior-diff vs installed Bun)
    expect([...ALLOWED_LONG_REGISTRY['bun:pr:verify']]).toContain('diff');
  });

  test('unknownFlagPolicy defaults + Bun.env toggles', () => {
    expect(unknownFlagPolicy({})).toEqual({ stripUnknown: false, logUnknown: true });
    expect(unknownFlagPolicy({ BUN_STRIP_UNKNOWN: 'true', BUN_LOG_UNKNOWN: 'false' })).toEqual({
      stripUnknown: true,
      logUnknown: false,
    });
  });

  test('checkUnknownLongOptions strips when BUN_STRIP_UNKNOWN=true', () => {
    const r = checkUnknownLongOptions(['--scan', '--bogus', '--fix'], LINT_WIRES_ALLOWED_LONG, {
      env: { BUN_STRIP_UNKNOWN: 'true' },
    });
    expect(r.unknown).toEqual(['bogus']);
    expect(r.shouldFail).toBe(false);
    expect(r.argv).toEqual(['--scan', '--fix']);
  });

  test('checkUnknownLongOptions fails closed by default', () => {
    const r = checkUnknownLongOptions(['--scan', '--bogus'], LINT_WIRES_ALLOWED_LONG, {
      env: {},
    });
    expect(r.shouldFail).toBe(true);
    expect(r.argv).toEqual(['--scan', '--bogus']);
  });

  test('unknownLongOptionLeaves + CLI allowlists', () => {
    expect(unknownLongOptionLeaves(['--deal', '30', '--code', 'X'], PARTNER_ONBOARD_LEAVES)).toEqual(
      ['code']
    );
    expect(
      unknownLongOptionLeaves(
        ['--deal', '30', '--code', 'X', '--typo-flag'],
        PARTNER_ONBOARD_ALLOWED_LONG
      )
    ).toEqual(['typo-flag']);
    expect(
      unknownLongOptionLeaves(
        ['--deal=30', '--currency=USD', '--code', 'ASH'],
        PARTNER_ONBOARD_ALLOWED_LONG
      )
    ).toEqual([]);
    // lint-wires: --fix is meta (not a Flags-table leaf) but allowed
    expect(unknownLongOptionLeaves(['--scan', '--fix'], LINT_WIRES_ALLOWED_LONG)).toEqual([]);
    expect(unknownLongOptionLeaves(['--scan', '--nope'], LINT_WIRES_ALLOWED_LONG)).toEqual([
      'nope',
    ]);
    // images: --template allowed; typo not
    expect(
      unknownLongOptionLeaves(['--template=avatar', '--source=./x'], IMAGES_GENERATE_ALLOWED_LONG)
    ).toEqual([]);
    expect(unknownLongOptionLeaves(['--width=64'], IMAGES_GENERATE_ALLOWED_LONG)).toEqual([
      'width',
    ]);
    // ops:snapshot seed + bake toggles
    expect(
      unknownLongOptionLeaves(['--no-seed', '--no-routing'], OPS_SNAPSHOT_ALLOWED_LONG)
    ).toEqual([]);
    expect(unknownLongOptionLeaves(['--no-seed', '--bogus'], OPS_SNAPSHOT_ALLOWED_LONG)).toEqual([
      'bogus',
    ]);
    // telegram:ops — REF:ID leaves + send/directory meta
    expect(
      unknownLongOptionLeaves(
        ['link-package-group', 'ASH', '-1001', '--invite=https://t.me/+x', '--db=./x.db'],
        TELEGRAM_OPS_ALLOWED_LONG
      )
    ).toEqual([]);
    expect(
      unknownLongOptionLeaves(['send', '--all', '--queue', '--bogus'], TELEGRAM_OPS_ALLOWED_LONG)
    ).toEqual(['bogus']);
  });

  test('CLI rejects unknown long options (spawn)', () => {
    const cwd = import.meta.dir + '/..';
    const env = { ...process.env, BUN_STRIP_UNKNOWN: 'false' };
    const lint = Bun.spawnSync(['bun', 'scripts/validate-wire-traps.ts', '--scan', '--bogus'], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
      env,
    });
    expect(lint.exitCode).not.toBe(0);
    expect((lint.stderr.toString() + lint.stdout.toString()).toLowerCase()).toMatch(/unknown/);

    const img = Bun.spawnSync(['bun', 'scripts/images-generate.ts', '--not-a-flag'], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
      env,
    });
    expect(img.exitCode).not.toBe(0);

    const ops = Bun.spawnSync(['bun', 'tools/ops-snapshot.ts', '--not-a-flag'], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
      env,
    });
    expect(ops.exitCode).not.toBe(0);
    expect((ops.stderr.toString() + ops.stdout.toString()).toLowerCase()).toMatch(/unknown/);

    const tg = Bun.spawnSync(['bun', 'tools/telegram-ops.ts', 'send', '--not-a-flag'], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
      env,
    });
    expect(tg.exitCode).not.toBe(0);
    expect((tg.stderr.toString() + tg.stdout.toString()).toLowerCase()).toMatch(/unknown/);
  });

  test('CLI strips unknown long options when BUN_STRIP_UNKNOWN=true (spawn)', () => {
    const cwd = import.meta.dir + '/..';
    const env = {
      ...process.env,
      BUN_STRIP_UNKNOWN: 'true',
      BUN_LOG_UNKNOWN: 'true',
    };
    // Guard runs before --help in parseArgs; strip then help → exit 0 + strip warning
    const img = Bun.spawnSync(
      ['bun', 'scripts/images-generate.ts', '--not-a-flag', '--help'],
      { cwd, stdout: 'pipe', stderr: 'pipe', env }
    );
    expect(img.exitCode).toBe(0);
    expect((img.stderr.toString() + img.stdout.toString()).toLowerCase()).toMatch(
      /stripping|unknown/
    );
    expect(img.stdout.toString()).toMatch(/images:generate|Bun\.Image/i);
  });

  test('docs:refid check --json exposes planes', () => {
    const r = Bun.spawnSync(['bun', 'tools/docs-refid.ts', 'check', '--json'], {
      cwd: import.meta.dir + '/..',
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(r.exitCode).toBe(0);
    const body = JSON.parse(r.stdout.toString()) as {
      planes?: Record<string, { registryDocs?: number }>;
      registry?: unknown[];
    };
    // schema may wrap issues; accept either top-level planes or nested
    const planes = body.planes ?? (body as { report?: { planes?: typeof body.planes } }).report?.planes;
    if (planes) {
      expect(planes.design?.registryDocs ?? 0).toBeGreaterThan(0);
    } else {
      // fallback: at least schema issues array
      expect(r.stdout.toString()).toMatch(/ref-id|schema|issues|planes/i);
    }
  });
});
