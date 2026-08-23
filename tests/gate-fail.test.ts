// @see https://bun.com/docs/test — bun:test
/**
 * gate-fail markdown shape — gate · why · fix for pre-commit / day-loop UX.
 */
import { describe, expect, test } from 'bun:test';
import {
  formatGateFailureMarkdown,
  type GateFailureInput,
} from '../lib/harness/gate-fail.ts';

const sample: GateFailureInput = {
  title: 'Console format',
  gate: 'console-format-staged',
  why: 'raw console.table in staged lines',
  fix: 'bun run check:console-format',
  detail: 'Use logTable / logDepth from lib/console',
};

describe('formatGateFailureMarkdown', () => {
  test('includes gate name, why, and fix command', () => {
    const md = formatGateFailureMarkdown(sample);
    expect(md).toContain('console-format-staged');
    expect(md).toContain('Gate failed: Console format');
    expect(md).toContain('raw console.table in staged lines');
    expect(md).toContain('bun run check:console-format');
    expect(md).toContain('Use logTable / logDepth from lib/console');
  });

  test('omits detail section when detail is empty', () => {
    const md = formatGateFailureMarkdown({
      title: 'Path bun',
      gate: 'path-bun',
      why: 'node:path import',
      fix: 'bun run check:path-bun',
    });
    expect(md).toContain('`path-bun`');
    expect(md).not.toContain('## Detail');
  });
});
