// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  buildSuggestRefIdResult,
  checkRefIdDocument,
  collectTakenRefIds,
  fillEmptyHrefCells,
  hrefFromRefId,
  parseRefId,
  scanMarkdownRefIds,
  suggestRefId,
  validateRefIdFormat,
  extractFlagTableRows,
  extractHtmlAnchors,
} from '../lib/docs/ref-id.ts';
import { runRefIdChecks, suggestFromRegistry } from '../tools/docs-refid-check.ts';
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

  test('empty href cell is accepted as implied #REF:ID', () => {
    const md = `
<a id="4.1.refresh"></a>
<a id="4.1"></a>
### Flags / settings
| Script | REF:ID | href | --flag |
| --- | --- | --- | --- |
| x | \`4.1.refresh\` | — | \`--refresh\` |
`;
    const issues = checkRefIdDocument(md, 't.md', {
      sectionRefId: '4.1',
      sectionHeading: '### Flags / settings',
    });
    expect(issues.some(i => i.kind === 'href-mismatch')).toBe(false);
  });

  test('section placement fails when 4.1 is not above heading', () => {
    const md = `
<a id="4.1"></a>
<a id="4.1.refresh"></a>
### Flags / settings
| Script | REF:ID | href |
| --- | --- | --- |
| x | \`4.1.refresh\` | \`#4.1.refresh\` |
`;
    const issues = checkRefIdDocument(md, 't.md', {
      sectionRefId: '4.1',
      sectionHeading: '### Flags / settings',
    });
    expect(issues.some(i => i.kind === 'section-placement')).toBe(true);
  });

  test('comment without matching anchor is error', () => {
    const md = `
<!-- REF:ID 4.1.refresh -->
<a id="4.1"></a>
### Flags / settings
| Script | REF:ID | href |
| --- | --- | --- |
| x | \`4.1.strict\` | \`#4.1.strict\` |
`;
    const issues = checkRefIdDocument(md, 't.md', {
      sectionRefId: '4.1',
      sectionHeading: '### Flags / settings',
    });
    expect(issues.some(i => i.kind === 'comment-missing-anchor' && i.refId === '4.1.refresh')).toBe(
      true
    );
  });

  test('fillEmptyHrefCells rewrites — cells', () => {
    const md = `| Script | REF:ID | href |
| --- | --- | --- |
| x | \`4.1.refresh\` | — |
`;
    const { text, filled } = fillEmptyHrefCells(md);
    expect(filled).toBe(1);
    expect(text).toContain('[`#4.1.refresh`](#4.1.refresh)');
  });

  test('suggestFromRegistry returns taken refresh-2', async () => {
    const r = await suggestFromRegistry({ section: '4.1', keyword: 'refresh' });
    expect(r.refId).toBe('4.1.refresh-2');
    expect(r.href).toBe('#4.1.refresh-2');
    expect(r.paste.anchor).toContain('4.1.refresh-2');
    const fresh = await suggestFromRegistry({ section: '4.1', keyword: 'dry-run' });
    expect(fresh.refId).toBe('4.1.dry-run');
  });

  test('collectTakenRefIds + buildSuggestRefIdResult', () => {
    const scan = scanMarkdownRefIds(
      `<a id="4.1.refresh"></a>\n| REF:ID | href |\n| --- | --- |\n| \`4.1.json\` | \`#4.1.json\` |\n`,
      't.md'
    );
    const taken = collectTakenRefIds(scan);
    expect(taken.has('4.1.refresh')).toBe(true);
    expect(taken.has('4.1.json')).toBe(true);
    const s = buildSuggestRefIdResult('4.1', 'refresh', taken);
    expect(s.refId).toBe('4.1.refresh-2');
  });
});
