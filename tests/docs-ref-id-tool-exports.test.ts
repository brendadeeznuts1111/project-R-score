// @see https://bun.com/docs/test — bun:test
/**
 * Prove monorepo CLIs re-export the same REF:ID leaves as lib/docs/ref-id-tool-flags.
 */
import { describe, expect, test } from 'bun:test';
import {
  IMAGES_GENERATE_LEAVES,
  LINT_WIRES_LEAVES,
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

  test('unknownLongOptionLeaves + partner-onboard allowlist', () => {
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
  });
});
