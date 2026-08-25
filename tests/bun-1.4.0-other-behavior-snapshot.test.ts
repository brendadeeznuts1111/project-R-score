// @see https://bun.com/docs/runtime/image#terminals — Bun.Image terminals
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
import { describe, expect, test } from 'bun:test';
import {
  auditImageTerminals,
  buildOtherBehaviorSnapshot,
} from '../tools/audit-bun-1.4-other-behavior-snapshot.ts';

const TARGET = '1.4.0';
const rt = Bun.version === TARGET ? test : test.skip;

describe('audit-bun-1.4-other-behavior-snapshot', () => {
  rt('Bun.Image terminal methods produce inspectable evidence', async () => {
    const image = await auditImageTerminals();
    expect(image.ok).toBe(true);
    expect(image.metadata.format).toBe('png');
    expect(image.terminals.bytes).toBeGreaterThan(0);
    expect(image.terminals.inspect).toContain('metadata');
    expect(image.terminals.inspect).toContain('digest');
  });

  rt('Other-behavior snapshot separates executable routes from planned behavior', async () => {
    const snap = await buildOtherBehaviorSnapshot();
    expect(snap.otherBehavior.claim).toBe('inventory-routing-not-test-results');
    expect(snap.otherBehavior.covered + snap.otherBehavior.planned).toBe(
      snap.otherBehavior.total
    );
    expect(snap.otherBehavior.planned).toBeGreaterThan(0);
    expect(snap.otherBehavior.pct).toBeLessThan(100);
    expect(snap.inspectTable).toContain('testPath');
    expect(snap.image.ok).toBe(true);
    expect(snap.ok).toBe(true);
  });
});
