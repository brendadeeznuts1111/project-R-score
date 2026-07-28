// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/test/snapshots — toMatchSnapshot / --update-snapshots
/**
 * Capability map subset — parse + bake integrity + drift snapshot.
 *
 * After legitimate AGENTS.md capability changes:
 *   bun run bake:capabilities
 *   bun test tests/capability-map-subset.test.ts --update-snapshots
 */
import { describe, expect, test } from 'bun:test';
import {
  assertApiIntegrity,
  buildCapabilityMapFull,
  buildCapabilityMapSubset,
  capabilityMapsDeepEqual,
  capabilityMapSubsetFingerprint,
  capabilityMapSubsetForSnapshot,
  extractMdLinkUrl,
  normalizeSemver,
  parseCapabilityTableFromMarkdown,
  parseVersionConstraints,
  pickApiCell,
  pickProtocol,
  stripMdCell,
  type CapabilityMapRow,
} from '../lib/portal/capability-map-subset.ts';

const SAMPLE = `
## Grounded capability map

| Capability | Type | Version | Bun API | Proton CLI | Used in | Status | Source | Example (snippet) |
|---|---|---|---|---|---|---|---|---|
| **Vault inject** | secrets | pass‑cli ≥2.2 | — | \`pass-cli inject -i\` | portal-cli secret inject | Implemented | [docs](https://example.com/pass) | \`x\` |
| **Pack workspace** | pkg | Bun ≥1.0 | \`bun pm pack\` | — | portal-cli pm pack | Implemented | [pm](https://example.com/pm) | \`y\` |
| **Sleep** | runtime | Bun ≥1.0 | \`Bun.sleep(ms)\` | — | rate limiting | Available | [sleep](https://example.com/sleep) | \`z\` |
| **Both stacks** | secrets | Bun ≥1.4 · pass-cli ≥2.2 | \`Bun.spawn\` | \`pass-cli list\` | bake | Implemented | (custom) | — |

## Known technical debt
`;

describe('capability-map-subset parse', () => {
  test('stripMdCell removes bold and links', () => {
    expect(stripMdCell('**Vault inject**')).toBe('Vault inject');
    expect(stripMdCell('[docs](https://x)')).toBe('docs');
    expect(stripMdCell('`pass-cli inject`')).toBe('pass-cli inject');
  });

  test('extractMdLinkUrl keeps canonical https only', () => {
    expect(extractMdLinkUrl('[Bun TOML](https://bun.sh/docs/runtime/loaders#toml)')).toBe(
      'https://bun.sh/docs/runtime/loaders#toml'
    );
    expect(extractMdLinkUrl('(custom)')).toBeUndefined();
    expect(extractMdLinkUrl('same')).toBeUndefined();
    expect(extractMdLinkUrl('—')).toBeUndefined();
  });

  test('parseVersionConstraints extracts minBun / minPassCli', () => {
    expect(parseVersionConstraints('Bun ≥1.4')).toEqual({ minBun: '1.4.0' });
    expect(parseVersionConstraints('Bun ≥1.0')).toEqual({ minBun: '1.0.0' });
    expect(parseVersionConstraints('pass‑cli ≥2.2')).toEqual({ minPassCli: '2.2.0' });
    expect(parseVersionConstraints('Bun ≥1.4 · pass-cli ≥2.2')).toEqual({
      minBun: '1.4.0',
      minPassCli: '2.2.0',
    });
    expect(parseVersionConstraints('—')).toEqual({});
    expect(normalizeSemver('1.4')).toBe('1.4.0');
  });

  test('pickApiCell prefers Bun API over dash Proton', () => {
    expect(pickApiCell('bun pm pack', '—')).toBe('bun pm pack');
    expect(pickApiCell('—', 'pass-cli inject -i')).toBe('pass-cli inject -i');
  });

  test('assertApiIntegrity accepts derived api and rejects drift', () => {
    const ok: CapabilityMapRow = {
      id: 'pack',
      capability: 'Pack',
      api: 'bun pm pack',
      status: 'Implemented',
      usedIn: 'x',
      type: 'pkg',
      version: 'Bun ≥1.0',
      protocol: 'Bun',
      bunApi: 'bun pm pack',
      protonCli: '—',
    };
    expect(() => assertApiIntegrity(ok)).not.toThrow();
    expect(() => assertApiIntegrity({ ...ok, api: 'wrong' })).toThrow(/api integrity/);
  });

  test('pickProtocol classifies Bun vs pass-cli', () => {
    expect(pickProtocol('bun pm pack', '—')).toBe('Bun');
    expect(pickProtocol('—', 'pass-cli inject -i')).toBe('pass-cli');
    expect(pickProtocol('Bun.spawn', 'pass-cli list')).toBe('Bun + pass-cli');
    expect(pickProtocol('—', '—')).toBe('—');
  });

  test('parseCapabilityTableFromMarkdown extracts rows with type/protocol/api/source/min', () => {
    const rows = parseCapabilityTableFromMarkdown(SAMPLE);
    expect(rows.length).toBe(4);
    expect(rows[0]?.capability).toBe('Vault inject');
    expect(rows[0]?.id).toBe('vault-inject');
    expect(rows[0]?.api).toContain('pass-cli inject');
    expect(rows[0]?.type).toBe('secrets');
    expect(rows[0]?.protocol).toBe('pass-cli');
    expect(rows[0]?.version).toContain('pass');
    expect(rows[0]?.minPassCli).toBe('2.2.0');
    expect(rows[0]?.source).toBe('https://example.com/pass');
    expect(rows[0]?.status).toBe('Implemented');
    expect(rows[1]?.api).toContain('bun pm pack');
    expect(rows[1]?.type).toBe('pkg');
    expect(rows[1]?.protocol).toBe('Bun');
    expect(rows[1]?.minBun).toBe('1.0.0');
    expect(rows[2]?.status).toBe('Available');
    expect(rows[3]?.protocol).toBe('Bun + pass-cli');
    expect(rows[3]?.minBun).toBe('1.4.0');
    expect(rows[3]?.minPassCli).toBe('2.2.0');
    expect(rows[3]?.source).toBeUndefined(); // (custom)
    expect(rows[3]?.api).toBe('Bun.spawn'); // Bun wins
  });

  test('buildCapabilityMapSubset sets kind, summary, schema v3', () => {
    const p = buildCapabilityMapSubset(SAMPLE, '2026-07-28T00:00:00.000Z');
    expect(p.kind).toBe('capability-map-subset');
    expect(p.schemaVersion).toBe(3);
    expect(p.rowCount).toBe(4);
    expect(p.rows).toHaveLength(4);
    expect(p.rows.every(r => r.id && r.type && r.protocol && r.api)).toBe(true);
    expect(p.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(p.summary.protocolCounts['Bun']).toBe(2);
    expect(p.summary.protocolCounts['pass-cli']).toBe(1);
    expect(p.summary.protocolCounts['Bun + pass-cli']).toBe(1);
    expect(p.summary.typeCounts['secrets']).toBe(2);
    expect(capabilityMapSubsetFingerprint(p)).not.toContain('2026-07-28');
  });

  test('buildCapabilityMapFull includes example + sourceLabel', () => {
    const f = buildCapabilityMapFull(SAMPLE, '2026-07-28T00:00:00.000Z');
    expect(f.kind).toBe('capability-map-full');
    expect(f.schemaVersion).toBe(1);
    expect(f.rowCount).toBe(4);
    expect(f.rows[0]?.example).toBe('x');
    expect(f.rows[0]?.sourceLabel).toBe('docs');
    expect(f.rows[0]?.source).toBe('https://example.com/pass');
  });

  test('repo AGENTS.md parses non-empty map', async () => {
    const md = await Bun.file('AGENTS.md').text();
    const rows = parseCapabilityTableFromMarkdown(md);
    expect(rows.length).toBeGreaterThanOrEqual(65);
    expect(rows.some(r => /item view|Secret retrieval|Vault inject/i.test(r.capability + r.api))).toBe(
      true
    );
    const requiredRuntimeCapabilities = [
      'Watch mode (hard restart)',
      'Hot reload (state-preserving)',
      'No clear screen on reload',
      'Debugger',
      'Working directory',
      'Custom Bun config',
      'Define constants',
      'Custom export conditions',
      'Silent command echo',
      'Low memory mode',
      'Prefer cached packages',
      'Auto-install fallback',
    ];
    for (const capability of requiredRuntimeCapabilities) {
      expect(rows.some(row => row.capability === capability && row.status === 'Available')).toBe(
        true
      );
    }
    expect(rows.filter(row => row.capability === 'Debugger')).toHaveLength(1);
    expect(rows.some(row => row.capability === 'Runtime inspect')).toBe(false);
    // no invented item get
    expect(rows.every(r => !/\bitem get\b/i.test(r.api))).toBe(true);
    // every row passes api integrity
    for (const r of rows) assertApiIntegrity(r);
    // most Bun rows have minBun
    expect(rows.filter(r => r.protocol === 'Bun' && r.minBun).length).toBeGreaterThan(30);
    // source URLs present for Bun docs rows
    expect(rows.filter(r => r.source?.startsWith('https://')).length).toBeGreaterThan(20);
  });

  test('baked subset matches AGENTS (Bun.deepEquals) and snapshot contract', async () => {
    const md = await Bun.file('AGENTS.md').text();
    const built = buildCapabilityMapSubset(md, '2026-07-28T00:00:00.000Z');
    const bakedPath = 'public/registry/capability-map-subset.json';
    const bakedFile = Bun.file(bakedPath);
    expect(await bakedFile.exists()).toBe(true);
    const baked = (await bakedFile.json()) as ReturnType<typeof buildCapabilityMapSubset>;
    // Structural equality (strict) — generatedAt/fingerprint stripped inside helper.
    if (!capabilityMapsDeepEqual(baked, built)) {
      throw new Error(
        `stale ${bakedPath} — run: bun run bake:capabilities\n` +
          `Then if the snapshot is intentionally new: bun test tests/capability-map-subset.test.ts --update-snapshots`
      );
    }
    expect(capabilityMapsDeepEqual(baked, baked)).toBe(true);
    expect(capabilityMapSubsetFingerprint(baked)).toBe(capabilityMapSubsetFingerprint(built));
    expect(baked.schemaVersion).toBe(3);
    expect(baked.summary).toBeDefined();
    expect(baked.summary.protocolCounts).toBeDefined();
    // Drift gate: stable shape without generatedAt
    expect(capabilityMapSubsetForSnapshot(built)).toMatchSnapshot();
  });

  test('full bake present and row-aligned with subset', async () => {
    const md = await Bun.file('AGENTS.md').text();
    const subset = buildCapabilityMapSubset(md, '2026-07-28T00:00:00.000Z');
    const full = buildCapabilityMapFull(md, '2026-07-28T00:00:00.000Z');
    expect(full.rowCount).toBe(subset.rowCount);
    expect(full.rows.map(r => r.capability)).toEqual(subset.rows.map(r => r.capability));
    const fullPath = 'public/registry/capability-map-full.json';
    expect(await Bun.file(fullPath).exists()).toBe(true);
  });
});
