import { describe, expect, test } from 'bun:test';
import {
  checkRefIdDocument,
  extractFlagsTableRefs,
  extractHtmlAnchors,
  isSectionRefId,
  parseRefId,
  validateKeyword,
} from '../lib/docs/refid-check.ts';
import {
  BUN_TYPES_INVENTORY_DOC,
  buildStatusFlagRows,
  defaultStatusCli,
  flagDocRef,
} from '../tools/bun-types-status.ts';
import { resolvePath } from '../lib/path-bun.ts';

describe('refid-check lexicon', () => {
  test('isSectionRefId accepts section-only and leaf forms', () => {
    expect(isSectionRefId('4.1')).toBe(true);
    expect(isSectionRefId('4.1.refresh')).toBe(true);
    expect(isSectionRefId('4.1.max-age-days')).toBe(true);
    expect(isSectionRefId('4.1.shared.strict')).toBe(true);
    expect(isSectionRefId('lane:bake_drift')).toBe(false);
    expect(isSectionRefId('types-status.refresh')).toBe(false);
  });

  test('validateKeyword reserved / length / kebab', () => {
    expect(validateKeyword('index').ok).toBe(false);
    const short = validateKeyword('x');
    expect(short.ok).toBe(false);
    if (!short.ok) expect(short.severity).toBe('warn');
    expect(validateKeyword('-foo').ok).toBe(false);
    expect(validateKeyword('refresh').ok).toBe(true);
    expect(validateKeyword('max-age-days').ok).toBe(true);
  });

  test('parseRefId splits section and keywords', () => {
    const p = parseRefId('4.1.shared.strict');
    expect(p.ok).toBe(true);
    if (p.ok) {
      expect(p.section).toBe('4.1');
      expect(p.keywords).toEqual(['shared', 'strict']);
    }
  });
});

describe('refid-check document', () => {
  test('duplicate anchors are errors', () => {
    const text = `
<a id="4.1.refresh"></a>
<a id="4.1.refresh"></a>
<a id="4.1"></a>
### Flags / settings
| Script | REF:ID | href | --flag |
| --- | --- | --- | --- |
| x | \`4.1.refresh\` | [\`#4.1.refresh\`](#4.1.refresh) | \`--refresh\` |
`;
    const issues = checkRefIdDocument({
      path: 'fixture.md',
      text,
      sectionRefId: '4.1',
      sectionHeading: '### Flags / settings',
    });
    expect(issues.some(i => i.kind === 'refid-duplicate-anchor')).toBe(true);
  });

  test('missing anchor for Flags table REF:ID is error', () => {
    const text = `
<a id="4.1"></a>
### Flags / settings
| Script | REF:ID | href | --flag |
| --- | --- | --- | --- |
| x | \`4.1.refresh\` | [\`#4.1.refresh\`](#4.1.refresh) | \`--refresh\` |
`;
    const issues = checkRefIdDocument({
      path: 'fixture.md',
      text,
      sectionRefId: '4.1',
      sectionHeading: '### Flags / settings',
    });
    expect(issues.some(i => i.kind === 'refid-missing-anchor' && i.target === '4.1.refresh')).toBe(
      true
    );
  });

  test('href mismatch is error', () => {
    const text = `
<a id="4.1.refresh"></a>
<a id="4.1"></a>
### Flags / settings
| Script | REF:ID | href | --flag |
| --- | --- | --- | --- |
| x | \`4.1.refresh\` | [\`#4.1.other\`](#4.1.other) | \`--refresh\` |
`;
    const issues = checkRefIdDocument({
      path: 'fixture.md',
      text,
      sectionRefId: '4.1',
      sectionHeading: '### Flags / settings',
    });
    expect(issues.some(i => i.kind === 'refid-href-mismatch')).toBe(true);
  });

  test('reserved keyword is error', () => {
    const text = `
<a id="4.1.index"></a>
<a id="4.1"></a>
### Flags / settings
| Script | REF:ID | href | --flag |
| --- | --- | --- | --- |
| x | \`4.1.index\` | [\`#4.1.index\`](#4.1.index) | \`--index\` |
`;
    const issues = checkRefIdDocument({
      path: 'fixture.md',
      text,
      sectionRefId: '4.1',
      sectionHeading: '### Flags / settings',
    });
    expect(issues.some(i => i.kind === 'refid-reserved-keyword')).toBe(true);
  });

  test('short keyword is warn; strict promotes to error', () => {
    const text = `
<a id="4.1.x"></a>
<a id="4.1"></a>
### Flags / settings
| Script | REF:ID | href | --flag |
| --- | --- | --- | --- |
| x | \`4.1.x\` | [\`#4.1.x\`](#4.1.x) | \`--x\` |
`;
    const soft = checkRefIdDocument({
      path: 'fixture.md',
      text,
      sectionRefId: '4.1',
      sectionHeading: '### Flags / settings',
    });
    const format = soft.filter(i => i.kind === 'refid-format');
    expect(format.length).toBeGreaterThan(0);
    expect(format.every(i => i.severity === 'warn')).toBe(true);

    const hard = checkRefIdDocument({
      path: 'fixture.md',
      text,
      sectionRefId: '4.1',
      sectionHeading: '### Flags / settings',
      strict: true,
    });
    expect(hard.some(i => i.kind === 'refid-format' && i.severity === 'error')).toBe(true);
  });

  test('extractHtmlAnchors and extractFlagsTableRefs parse inventory shape', () => {
    const sample = `
<a id="4.1.refresh"></a>
<a id="4.1"></a>
### Flags / settings
| Script | REF:ID | href | --flag |
| --- | --- | --- | --- |
| \`bun:types-status\` | \`4.1.refresh\` | [\`#4.1.refresh\`](#4.1.refresh) | \`--refresh\` |
`;
    expect(extractHtmlAnchors(sample).map(a => a.id)).toEqual(['4.1.refresh', '4.1']);
    const rows = extractFlagsTableRefs(sample);
    expect(rows.length).toBe(1);
    expect(rows[0]!.refId).toBe('4.1.refresh');
    expect(rows[0]!.href).toBe('#4.1.refresh');
  });

  test('live bun-types-inventory.md syncs with buildStatusFlagRows', async () => {
    const path = resolvePath(import.meta.dir, '..', BUN_TYPES_INVENTORY_DOC);
    const text = await Bun.file(path).text();
    const tooling = buildStatusFlagRows(defaultStatusCli()).map(r => ({
      refId: r.refId,
      href: r.href,
    }));
    const issues = checkRefIdDocument({
      path: BUN_TYPES_INVENTORY_DOC,
      text,
      toolingRefs: tooling,
      sectionRefId: '4.1',
      sectionHeading: '### Flags / settings',
      strict: true,
    });
    const errors = issues.filter(i => i.severity === 'error');
    expect(errors).toEqual([]);
    expect(flagDocRef('refresh')).toEqual({ refId: '4.1.refresh', href: '#4.1.refresh' });
  });
});
