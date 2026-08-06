import { describe, expect, test } from 'bun:test';
import {
  collectWireAllowPathGlobs,
  findNakedPartnerIdHits,
  lineIsSuppressed,
  pathMatchesAnyGlob,
  warnMissingWireBoundaryGlobs,
} from '../lib/docs/partner-surface-wire-lint.ts';
import {
  allPartnerSurfaceRows,
  type PartnerSurfaceRow,
} from '../lib/docs/partner-surface-inventory.ts';

/** Split so this test file itself does not trip lint-wires when scanned. */
const colonString = ': string';

describe('partner-surface-wire-lint', () => {
  test('inventory ExternalPartnerRef rows expose sports + kalshi allow globs', () => {
    const globs = collectWireAllowPathGlobs(allPartnerSurfaceRows());
    expect(globs.some(g => g.includes('sports-terminal-os'))).toBe(true);
    expect(globs.some(g => g.includes('Kalshi-bot'))).toBe(true);
  });

  test('pathMatchesAnyGlob handles /** prefixes', () => {
    expect(
      pathMatchesAnyGlob(
        'projects/active/sports-terminal-os/src/api/partner-routes.ts',
        ['projects/active/sports-terminal-os/**']
      )
    ).toBe(true);
    expect(pathMatchesAnyGlob('lib/research/types.ts', ['Kalshi-bot/**'])).toBe(false);
  });

  test('findNakedPartnerIdHits catches params and optional props', () => {
    const src = [
      `export type Row = { partnerId${colonString}; other: number };`,
      `export type Opt = { partner_id?${colonString} };`,
      `function f(partnerId${colonString}) { return partnerId; }`,
    ].join('\n');
    const hits = findNakedPartnerIdHits('demo.ts', src);
    expect(hits.length).toBe(3);
  });

  test('brand-ok / wire-ok suppress same, prev, and next line', () => {
    const lines = [
      `partnerId${colonString}; // brand-ok — wire`,
      '// wire-ok — adapter',
      `partner_id${colonString};`,
      `partnerId${colonString};`,
      '// brand-ok — prettier wrap',
    ];
    expect(lineIsSuppressed(lines, 0)).toBe(true);
    expect(lineIsSuppressed(lines, 2)).toBe(true);
    expect(lineIsSuppressed(lines, 3)).toBe(true);
  });

  test('unqualified wire-field does not warn for empty globs; pandora does', () => {
    const rows = allPartnerSurfaceRows().filter(r => r.aspect === 'wire-field');
    const warns = warnMissingWireBoundaryGlobs(rows);
    expect(warns.some(w => w.message.includes('wire.partnerId.unqualified'))).toBe(false);
    expect(warns.some(w => w.message.includes('wire.pandora.partnerId'))).toBe(true);
  });

  test('allowlist skips hits inside boundary paths (integration shape)', () => {
    const rows: PartnerSurfaceRow[] = [
      {
        id: 'wire.test',
        aspect: 'wire-field',
        token: 'partnerId',
        repo: 'project-R-score',
        path: 'lib/adapters/demo',
        properties: [],
        owner: 'test',
        wireField: {
          wireName: 'partnerId',
          sourceSystemId: 'demo',
          resolvesTo: 'ExternalPartnerRef',
          quarantineOnFail: true,
          boundaryPathGlobs: ['lib/adapters/demo/**'],
        },
      },
    ];
    const globs = collectWireAllowPathGlobs(rows);
    expect(pathMatchesAnyGlob('lib/adapters/demo/parse.ts', globs)).toBe(true);
    expect(pathMatchesAnyGlob('lib/core/service.ts', globs)).toBe(false);
  });
});
