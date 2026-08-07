// @see https://bun.com/docs/test — bun:test
/**
 * Prove monorepo CLIs re-export the same REF:ID leaves as lib/docs/ref-id-tool-flags.
 */
import { describe, expect, test } from 'bun:test';
import {
  LINT_WIRES_LEAVES,
  PARTNER_ONBOARD_LEAVES,
  TELEGRAM_OPS_LEAVES,
  lintWiresFlagDocRef,
  lintWiresToolFlags,
  partnerOnboardFlagDocRef,
  partnerOnboardToolFlags,
  telegramOpsFlagDocRef,
  telegramOpsToolFlags,
} from '../lib/docs/ref-id-tool-flags.ts';
import {
  flagDocRef as lintWiresFlagDocRefExport,
  lintWiresToolFlags as lintWiresFromTool,
} from '../scripts/validate-wire-traps.ts';
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

  test('help text includes REF:ID section marker (lint-wires)', () => {
    // Spawn help — no scan
    const r = Bun.spawnSync(['bun', 'scripts/validate-wire-traps.ts', '--help'], {
      cwd: import.meta.dir + '/..',
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const out = r.stdout.toString() + r.stderr.toString();
    expect(r.exitCode).toBe(0);
    expect(out).toContain('REF:ID');
    expect(out).toContain('4.1.scan');
  });
});
