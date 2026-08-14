// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  COMPLEXITY_FLOOR_DOC,
  IMAGES_GENERATE_DOC,
  LINT_WIRES_DOC,
  MONOREPO_FILTER_DOC,
  OPS_SNAPSHOT_DOC,
  PARTNER_ONBOARD_DOC,
  TELEGRAM_OPS_DOC,
  complexityFloorToolFlags,
  imagesGenerateToolFlags,
  lintWiresToolFlags,
  monorepoFilterToolFlags,
  opsSnapshotToolFlags,
  partnerOnboardToolFlags,
  telegramOpsToolFlags,
  toolFlagsAt,
} from '../lib/docs/ref-id-tool-flags.ts';
import { checkRefIdDocument, hrefFromRefId } from '../lib/docs/ref-id.ts';
import { joinPath, resolvePath } from '../lib/path-bun.ts';
import { refIdRegistry } from '../tools/docs-refid-check.ts';

const REPO = resolvePath(import.meta.dir, '..');

describe('ref-id-tool-flags SSOT', () => {
  test('toolFlagsAt builds #href from section.leaf', () => {
    const rows = toolFlagsAt('4.1', ['scan', 'why'], 'scripts/validate-wire-traps.ts');
    expect(rows).toEqual([
      { refId: '4.1.scan', href: '#4.1.scan', source: 'scripts/validate-wire-traps.ts' },
      { refId: '4.1.why', href: '#4.1.why', source: 'scripts/validate-wire-traps.ts' },
    ]);
  });

  test('lint-wires leaves match partner-surface table', () => {
    expect(lintWiresToolFlags().map(r => r.refId)).toEqual([
      '4.1.help',
      '4.1.scan',
      '4.1.staged',
      '4.1.why',
      '4.1.document',
      '4.1.strict-globs',
    ]);
  });

  test('every registry entry with requireToolCoverage has ≥1 tool flag', () => {
    for (const e of refIdRegistry()) {
      if (e.requireToolCoverage) {
        expect(e.toolFlags().length).toBeGreaterThan(0);
      }
    }
  });

  test('tool flags are covered by their registered markdown tables', async () => {
    const pairs: Array<{ doc: string; flags: ReturnType<typeof lintWiresToolFlags> }> = [
      { doc: LINT_WIRES_DOC, flags: lintWiresToolFlags() },
      { doc: PARTNER_ONBOARD_DOC, flags: partnerOnboardToolFlags() },
      { doc: IMAGES_GENERATE_DOC, flags: imagesGenerateToolFlags() },
      { doc: OPS_SNAPSHOT_DOC, flags: opsSnapshotToolFlags() },
      { doc: TELEGRAM_OPS_DOC, flags: telegramOpsToolFlags() },
      { doc: MONOREPO_FILTER_DOC, flags: monorepoFilterToolFlags() },
      { doc: COMPLEXITY_FLOOR_DOC, flags: complexityFloorToolFlags() },
    ];
    for (const { doc, flags } of pairs) {
      const text = await Bun.file(joinPath(REPO, doc)).text();
      const issues = checkRefIdDocument(text, doc, {
        toolFlags: flags,
        requireToolCoverage: true,
      });
      const errors = issues.filter(i => i.severity === 'error');
      const missingTool = issues.filter(i =>
        i.detail.includes('not listed in markdown flags table')
      );
      expect(errors).toEqual([]);
      expect(missingTool).toEqual([]);
      for (const f of flags) {
        expect(f.href).toBe(hrefFromRefId(f.refId));
      }
    }
  });
});
