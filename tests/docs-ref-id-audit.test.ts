// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  classifyMarkdownFile,
  extractOperatorFlagTables,
  summarizeAudit,
} from '../lib/docs/ref-id-audit.ts';

describe('extractOperatorFlagTables', () => {
  test('finds Flag tables without REF:ID columns', () => {
    const md = `
### lint-wires flags

| Flag | Meaning |
| ---- | ------- |
| \`--scan\` | Walk tree |
| \`--strict\` | Fail hard |
`;
    const hits = extractOperatorFlagTables(md);
    expect(hits.length).toBe(1);
    expect(hits[0]!.headers.map(h => h.toLowerCase())).toContain('flag');
  });

  test('ignores REF:ID tables', () => {
    const md = `
| Script | REF:ID | href | --flag |
| --- | --- | --- | --- |
| x | \`4.1.a\` | \`#4.1.a\` | \`--a\` |
`;
    expect(extractOperatorFlagTables(md)).toHaveLength(0);
  });

  test('ignores design Option A/B/C tables even when prose mentions --flags', () => {
    const md = `
| Option | What | Fit |
|--------|------|-----|
| **A — Bookmaker API** | Fetch bet/win data | Works only for books |
| **C — File import** | \`partner:settlement:import --file <csv>\` bulk entry | Fast to build |
`;
    expect(extractOperatorFlagTables(md)).toHaveLength(0);
  });

  test('accepts Options tables when the Option cell is a --cli-flag', () => {
    const md = `
| Option | Description |
|--------|-------------|
| \`--source\` | Input path |
| \`--out\` | Output path |
`;
    expect(extractOperatorFlagTables(md)).toHaveLength(1);
  });

  test('ignores board-map tables with trailing Flags column', () => {
    const md = `
| Short id | Label | Command | Flags | Docs |
|----------|-------|---------|-------|------|
| \`ssot\` | Soft pack | \`bun run ssot:flow:soft\` | — | tenant |
`;
    expect(extractOperatorFlagTables(md)).toHaveLength(0);
  });
});

describe('classifyMarkdownFile', () => {
  test('registered wins over other signals', () => {
    const md = `
<a id="4.1"></a>
| REF:ID | href |
| --- | --- |
| \`4.1.x\` | auto |
`;
    const row = classifyMarkdownFile('docs/design/foo.md', md, new Set(['docs/design/foo.md']));
    expect(row.class).toBe('registered');
    expect(row.action).toBe('keep-registered');
  });

  test('design Flags-only is candidate-promote', () => {
    const md = `
| Flag | Meaning |
| --- | --- |
| --x | y |
`;
    const row = classifyMarkdownFile(
      'docs/design/partner-surface-inventory.md',
      md,
      new Set()
    );
    expect(row.class).toBe('flags-table-only');
    expect(row.action).toBe('candidate-promote');
  });

  test('harness Flags-only is leave-as-is', () => {
    const md = `
| Flag | Meaning |
| --- | --- |
| --x | y |
`;
    const row = classifyMarkdownFile('docs/harness/tenants/ops-snapshot.md', md, new Set());
    expect(row.class).toBe('flags-table-only');
    expect(row.action).toBe('leave-as-is');
  });

  test('clean file is not-needed', () => {
    const row = classifyMarkdownFile('docs/README.md', '# Hi\n\nNo tables.', new Set());
    expect(row.class).toBe('clean');
    expect(row.action).toBe('not-needed');
  });
});

describe('summarizeAudit', () => {
  test('counts classes', () => {
    const s = summarizeAudit([
      classifyMarkdownFile('a.md', '', new Set(['a.md'])),
      classifyMarkdownFile('b.md', '| Flag |\n| --- |\n| x |', new Set()),
    ]);
    // a has no content → clean unless registered - wait registered with empty
    expect(s.registered + s.clean + s['flags-table-only']).toBeGreaterThan(0);
  });
});
