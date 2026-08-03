// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';

import {
  PARTNER_HISTORY_SURFACE_CONCEPTS,
  PARTNERS_SURFACE_CONCEPTS,
} from '../lib/portal/semantic-vocabulary.ts';

describe('validate:surface-coverage', () => {
  test('partner-history surface includes chrome inventory ids', () => {
    const ids = new Set(Object.values(PARTNER_HISTORY_SURFACE_CONCEPTS));
    for (const id of [
      'ops.metric.visible_changes',
      'ui.filter.window',
      'ops.panel.partner_limit_history',
      'ops.table.recent_changes',
      'ui.action.export',
      'ui.semantic.artifact',
    ] as const) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  test('partners surface includes hash route concept used in board HTML', () => {
    expect(PARTNERS_SURFACE_CONCEPTS.partnerHashRoute).toBe('ui.route.partnerHash');
  });

  test('surface coverage script passes', async () => {
    const proc = Bun.spawn(['bun', 'scripts/validate-surface-coverage.ts', '--json'], {
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: `${import.meta.dir}/..`,
    });
    const [stdout, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      proc.exited,
    ]);
    expect(exitCode).toBe(0);
    const payload = JSON.parse(stdout) as { ok: boolean; orphans: unknown[] };
    expect(payload.ok).toBe(true);
    expect(payload.orphans).toEqual([]);
  });
});
