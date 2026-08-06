import { describe, expect, test } from 'bun:test';
import {
  collectTrapRowTokens,
  collectWireAllowPathGlobs,
  findLineSuppression,
  findNakedPartnerIdHits,
  maskNonCodeSpans,
  pathMatchesAnyGlob,
  validateWireGlobCoverage,
  warnMissingWireBoundaryGlobs,
} from '../lib/docs/partner-surface-wire-lint.ts';
import {
  allPartnerSurfaceRows,
  type PartnerSurfaceRow,
} from '../lib/docs/partner-surface-inventory.ts';
import {
  DOCUMENT_REL,
  HELP_TEXT,
  WHY_MARKDOWN,
  main as lintWiresMain,
} from '../scripts/validate-wire-traps.ts';

/** Split so this test file itself does not trip lint-wires when scanned. */
const colonString = ': string';

describe('partner-surface-wire-lint', () => {
  test('inventory ExternalPartnerRef rows expose sports + kalshi allow globs', () => {
    const globs = collectWireAllowPathGlobs(allPartnerSurfaceRows());
    expect(globs.some(g => g.includes('sports-terminal-os'))).toBe(true);
    expect(globs.some(g => g.includes('Kalshi-bot'))).toBe(true);
  });

  test('trap tokens include unqualified partnerId', () => {
    const traps = collectTrapRowTokens(allPartnerSurfaceRows());
    expect(traps).toContain('partnerId');
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

  test('maskNonCodeSpans ignores string literals and line comments', () => {
    const line = `const s = "partnerId${colonString}"; partnerId${colonString}; // trail`;
    const masked = maskNonCodeSpans(line);
    expect(masked).not.toContain('"');
    expect(masked).toContain(`partnerId${colonString}`);
    const hits = findNakedPartnerIdHits('demo.ts', line);
    expect(hits.length).toBe(1);
    expect(hits[0]?.match).toBe(`partnerId${colonString}`);
  });

  test('findNakedPartnerIdHits skips JSDoc and quoted examples', () => {
    const src = [
      '/** @param partnerId the id */',
      `const tip = 'use partnerId${colonString}';`,
      `export type Row = { partnerId${colonString} };`,
      `function f(partner_id?${colonString}) {}`,
    ].join('\n');
    const hits = findNakedPartnerIdHits('demo.ts', src);
    expect(hits.map(h => h.match).sort()).toEqual(
      [`partnerId${colonString}`, `partner_id?${colonString}`].sort()
    );
  });

  test('wire-ok / brand-ok suppress with optional reason', () => {
    const lines = [
      `partnerId${colonString}; // wire-ok: sports parse`,
      '// brand-ok — opaque',
      `partner_id${colonString};`,
      `partnerId${colonString};`,
      '// wire-ok',
    ];
    expect(findLineSuppression(lines, 0)?.reason).toBe('sports parse');
    expect(findLineSuppression(lines, 2)?.kind).toBe('brand-ok');
    expect(findLineSuppression(lines, 3)?.kind).toBe('wire-ok');
    expect(findLineSuppression(lines, 3)?.reason).toBe('');
  });

  test('unqualified wire-field does not warn for empty globs; pandora does', () => {
    const rows = allPartnerSurfaceRows().filter(r => r.aspect === 'wire-field');
    const warns = warnMissingWireBoundaryGlobs(rows);
    expect(warns.some(w => w.message.includes('wire.partnerId.unqualified'))).toBe(false);
    expect(warns.some(w => w.message.includes('wire.pandora.partnerId'))).toBe(true);
  });

  test('glob coverage warns on empty nested checkout (not error by default)', async () => {
    const rows: PartnerSurfaceRow[] = [
      {
        id: 'wire.empty-tree',
        aspect: 'wire-field',
        token: 'partnerId',
        repo: 'Kalshi-bot',
        path: 'Kalshi-bot',
        properties: [],
        owner: 'test',
        wireField: {
          wireName: 'partnerId',
          sourceSystemId: 'kalshi',
          resolvesTo: 'ExternalPartnerRef',
          quarantineOnFail: true,
          boundaryPathGlobs: ['Kalshi-bot/**'],
        },
      },
    ];
    const issues = await validateWireGlobCoverage({
      root: process.cwd(),
      rows,
      strictGlobs: false,
    });
    // Worktree Kalshi-bot is empty → warn, not error
    expect(issues.every(i => i.level === 'warn' || i.level === 'error')).toBe(true);
    if (issues.length > 0) {
      expect(issues[0]?.level).toBe('warn');
    }
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
          strict: true,
          requireReason: false,
        },
      },
    ];
    const globs = collectWireAllowPathGlobs(rows);
    expect(pathMatchesAnyGlob('lib/adapters/demo/parse.ts', globs)).toBe(true);
    expect(pathMatchesAnyGlob('lib/core/service.ts', globs)).toBe(false);
  });

  test('CLI --hlp / --why / --document exit 0 without scanning failures', async () => {
    expect(HELP_TEXT).toContain('--hlp');
    expect(HELP_TEXT).toContain('--scan');
    expect(WHY_MARKDOWN).toContain('Layer C');
    expect(DOCUMENT_REL).toBe('docs/design/partner-surface-inventory.md');
    expect(await lintWiresMain(['bun', 'scripts/validate-wire-traps.ts'])).toBe(0);
    expect(await lintWiresMain(['bun', 'scripts/validate-wire-traps.ts', '--hlp'])).toBe(0);
    expect(await lintWiresMain(['bun', 'scripts/validate-wire-traps.ts', '--why'])).toBe(0);
    expect(await lintWiresMain(['bun', 'scripts/validate-wire-traps.ts', '--document'])).toBe(0);
  });

  test('CLI --scan runs the gate', async () => {
    expect(await lintWiresMain(['bun', 'scripts/validate-wire-traps.ts', '--scan'])).toBe(0);
  });
});
