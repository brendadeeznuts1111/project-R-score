// @see https://bun.com/docs/test
import { describe, expect, test } from 'bun:test';
import {
  buildCapabilityMapSubset,
  capabilityMapSubsetFingerprint,
  parseCapabilityTableFromMarkdown,
  pickApiCell,
  stripMdCell,
} from '../lib/portal/capability-map-subset.ts';

const SAMPLE = `
## Grounded capability map

| Capability | Type | Version | Bun API | Proton CLI | Used in | Status | Source | Example (snippet) |
|---|---|---|---|---|---|---|---|---|
| **Vault inject** | secrets | pass‑cli ≥2.2 | — | \`pass-cli inject -i\` | portal-cli secret inject | Implemented | [docs](https://x) | \`x\` |
| **Pack workspace** | pkg | Bun ≥1.0 | \`bun pm pack\` | — | portal-cli pm pack | Implemented | [pm](https://y) | \`y\` |
| **Sleep** | runtime | Bun ≥1.0 | \`Bun.sleep(ms)\` | — | rate limiting | Available | [sleep](https://z) | \`z\` |

## Known technical debt
`;

describe('capability-map-subset parse', () => {
  test('stripMdCell removes bold and links', () => {
    expect(stripMdCell('**Vault inject**')).toBe('Vault inject');
    expect(stripMdCell('[docs](https://x)')).toBe('docs');
    expect(stripMdCell('`pass-cli inject`')).toBe('pass-cli inject');
  });

  test('pickApiCell prefers Bun API over dash Proton', () => {
    expect(pickApiCell('bun pm pack', '—')).toBe('bun pm pack');
    expect(pickApiCell('—', 'pass-cli inject -i')).toBe('pass-cli inject -i');
  });

  test('parseCapabilityTableFromMarkdown extracts rows', () => {
    const rows = parseCapabilityTableFromMarkdown(SAMPLE);
    expect(rows.length).toBe(3);
    expect(rows[0]?.capability).toBe('Vault inject');
    expect(rows[0]?.api).toContain('pass-cli inject');
    expect(rows[0]?.status).toBe('Implemented');
    expect(rows[1]?.api).toContain('bun pm pack');
    expect(rows[2]?.status).toBe('Available');
  });

  test('buildCapabilityMapSubset sets kind and count', () => {
    const p = buildCapabilityMapSubset(SAMPLE, '2026-07-28T00:00:00.000Z');
    expect(p.kind).toBe('capability-map-subset');
    expect(p.schemaVersion).toBe(1);
    expect(p.rowCount).toBe(3);
    expect(p.rows).toHaveLength(3);
    expect(capabilityMapSubsetFingerprint(p)).not.toContain('2026-07-28');
  });

  test('repo AGENTS.md parses non-empty map', async () => {
    const md = await Bun.file('AGENTS.md').text();
    const rows = parseCapabilityTableFromMarkdown(md);
    expect(rows.length).toBeGreaterThan(10);
    expect(rows.some(r => /item view|Secret retrieval|Vault inject/i.test(r.capability + r.api))).toBe(
      true
    );
    // no invented item get
    expect(rows.every(r => !/\bitem get\b/i.test(r.api))).toBe(true);
  });
});
