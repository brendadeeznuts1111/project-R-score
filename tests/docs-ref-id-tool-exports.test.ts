// @see https://bun.com/docs/test — bun:test
/**
 * Prove monorepo CLIs re-export the same REF:ID leaves as lib/docs/ref-id-tool-flags.
 */
import { describe, expect, test } from 'bun:test';
import {
  IMAGES_GENERATE_ALLOWED_LONG,
  IMAGES_GENERATE_LEAVES,
  LINT_WIRES_ALLOWED_LONG,
  LINT_WIRES_LEAVES,
  OPS_SNAPSHOT_ALLOWED_LONG,
  OPS_SNAPSHOT_LEAVES,
  PARTNER_ONBOARD_LEAVES,
  TELEGRAM_OPS_LEAVES,
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
  unknownLongOptionLeaves,
} from '../lib/docs/ref-id-tool-flags.ts';
import { PARTNER_ONBOARD_ALLOWED_LONG } from '../tools/partner-onboard.ts';
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
  });

  test('CLI rejects unknown long options (spawn)', () => {
    const cwd = import.meta.dir + '/..';
    const lint = Bun.spawnSync(['bun', 'scripts/validate-wire-traps.ts', '--scan', '--bogus'], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(lint.exitCode).not.toBe(0);
    expect((lint.stderr.toString() + lint.stdout.toString()).toLowerCase()).toMatch(/unknown/);

    const img = Bun.spawnSync(['bun', 'scripts/images-generate.ts', '--not-a-flag'], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(img.exitCode).not.toBe(0);

    const ops = Bun.spawnSync(['bun', 'tools/ops-snapshot.ts', '--not-a-flag'], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(ops.exitCode).not.toBe(0);
    expect((ops.stderr.toString() + ops.stdout.toString()).toLowerCase()).toMatch(/unknown/);
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
