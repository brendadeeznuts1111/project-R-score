// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  checkRefIdDocument,
  hrefFromRefId,
  parseRefId,
  suggestRefId,
  validateRefIdFormat,
  extractFlagTableRows,
  extractHtmlAnchors,
} from '../lib/docs/ref-id.ts';
import { runRefIdChecks } from '../tools/docs-refid-check.ts';
import {
  BUN_TYPES_INVENTORY_DOC,
  buildStatusFlagRows,
  defaultStatusCli,
  flagDocRef,
} from '../tools/bun-types-status.ts';

describe('REF:ID v2 format', () => {
  test('parseRefId accepts section.keyword paths', () => {
    expect(parseRefId('4.1.refresh')).toEqual({
      id: '4.1.refresh',
      section: '4.1',
      keyword: 'refresh',
      segments: ['refresh'],
    });
    expect(parseRefId('4.1.max-age-days')?.segments).toEqual(['max-age-days']);
    expect(parseRefId('4.1.shared.prefer-local')?.keyword).toBe('shared.prefer-local');
    expect(parseRefId('types-status.refresh')).toBeNull();
    expect(parseRefId('4.1.-foo')).toBeNull();
  });

  test('validateRefIdFormat rejects reserved + short segments', () => {
    const reserved = validateRefIdFormat('4.1.toc');
    expect(reserved.some(i => i.kind === 'reserved-keyword' && i.severity === 'error')).toBe(true);

    const short = validateRefIdFormat('4.1.x');
    expect(short.some(i => i.kind === 'keyword-length')).toBe(true);

    const ok = validateRefIdFormat('4.1.refresh');
    expect(ok).toHaveLength(0);
  });

  test('hrefFromRefId is always # + id', () => {
    expect(hrefFromRefId('4.1.refresh')).toBe('#4.1.refresh');
    expect(flagDocRef('refresh')).toEqual({ refId: '4.1.refresh', href: '#4.1.refresh' });
  });

  test('suggestRefId avoids taken ids', () => {
    const taken = new Set(['4.1.refresh']);
    expect(suggestRefId('4.1', 'refresh', taken)).toBe('4.1.refresh-2');
    expect(suggestRefId('4.1', 'json', taken)).toBe('4.1.json');
  });
});

describe('REF:ID markdown extract + check', () => {
  test('extracts anchors and flag table; catches href mismatch + missing anchor', () => {
    const md = `
## Contents
1. [Commands](#commands)
   - [4.1 Flags](#4.1)

<a id="4.1"></a>
<a id="4.1.refresh"></a>

### Flags

| Script | REF:ID | href | --flag |
| --- | --- | --- | --- |
| \`bun:types-status\` | \`4.1.refresh\` | [\`#4.1.refresh\`](#4.1.refresh) | \`--refresh\` |
| x | \`4.1.strict\` | \`#wrong\` | \`--strict\` |
| y | \`4.1.json\` | \`#4.1.json\` | \`--json\` |
`;
    const anchors = extractHtmlAnchors(md, 't.md');
    expect(anchors.map(a => a.id)).toEqual(['4.1', '4.1.refresh']);
    const rows = extractFlagTableRows(md, 't.md');
    expect(rows).toHaveLength(3);
    expect(rows[0]?.href).toBe('#4.1.refresh');

    const issues = checkRefIdDocument(md, 't.md');
    expect(issues.some(i => i.kind === 'href-mismatch' && i.refId === '4.1.strict')).toBe(true);
    expect(issues.some(i => i.kind === 'missing-anchor' && i.refId === '4.1.strict')).toBe(true);
    expect(issues.some(i => i.kind === 'missing-anchor' && i.refId === '4.1.json')).toBe(true);
    // refresh is complete
    expect(
      issues.some(i => i.severity === 'error' && i.refId === '4.1.refresh' && i.kind !== 'orphan-anchor')
    ).toBe(false);
  });

  test('duplicate anchors are errors', () => {
    const md = `
<a id="4.1.refresh"></a>
<a id="4.1.refresh"></a>
| REF:ID | href |
| --- | --- |
| \`4.1.refresh\` | \`#4.1.refresh\` |
`;
    const issues = checkRefIdDocument(md, 'dup.md');
    expect(issues.some(i => i.kind === 'duplicate-anchor')).toBe(true);
  });

  test('registered bun-types inventory doc passes with status tool flags', async () => {
    const issues = await runRefIdChecks({});
    const errors = issues.filter(i => i.severity === 'error');
    expect(errors).toEqual([]);
    const rows = buildStatusFlagRows(defaultStatusCli());
    expect(rows.every(r => r.href === `#${r.refId}`)).toBe(true);
    expect(BUN_TYPES_INVENTORY_DOC).toBe('docs/design/bun-types-inventory.md');
  });
});
