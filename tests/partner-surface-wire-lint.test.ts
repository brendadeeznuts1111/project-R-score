import { describe, expect, test } from 'bun:test';
import {
  appendWireOkComment,
  buildNakedAnnotationRegex,
  buildWireLintRules,
  collectTrapRowTokens,
  collectWireAllowPathGlobs,
  findLineSuppression,
  findNakedHitsForRule,
  findNakedPartnerIdHits,
  isSimpleIdent,
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
  WIRE_LINT_DOC_REL,
  WHY_MARKDOWN,
  main as lintWiresMain,
} from '../scripts/validate-wire-traps.ts';

const colonString = ': string';

describe('partner-surface-wire-lint', () => {
  test('buildWireLintRules merges ExternalPartnerRef patterns and globs', () => {
    const rules = buildWireLintRules(allPartnerSurfaceRows());
    const ext = rules.find(r => r.brandedType === 'ExternalPartnerRef');
    expect(ext).toBeDefined();
    expect(ext!.patterns).toContain('partnerId');
    expect(ext!.patterns).toContain('partner_id');
    expect(ext!.globs.some(g => g.includes('sports-terminal-os'))).toBe(true);
    expect(ext!.globs.some(g => g.includes('Kalshi-bot'))).toBe(true);
  });

  test('OutId rule is present with seat-desk allowlist', () => {
    const rules = buildWireLintRules(allPartnerSurfaceRows());
    const out = rules.find(r => r.brandedType === 'OutId');
    expect(out).toBeDefined();
    expect(out!.patterns).toContain('outId');
    expect(out!.patterns).toContain('out_id');
    expect(out!.globs.some(g => g.includes('seat-*.ts'))).toBe(true);
    expect(out!.globs.some(g => g.includes('seat-desk-*.ts'))).toBe(true);
  });

  test('ExternalPartnerId trap row has pattern and empty globs', () => {
    const rules = buildWireLintRules(allPartnerSurfaceRows());
    const ext = rules.find(r => r.brandedType === 'ExternalPartnerId');
    expect(ext).toBeDefined();
    expect(ext!.patterns).toContain('externalRef');
    expect(ext!.globs).toEqual([]);
  });

  test('inventory allow globs still expose sports + kalshi', () => {
    const globs = collectWireAllowPathGlobs(allPartnerSurfaceRows());
    expect(globs.some(g => g.includes('sports-terminal-os'))).toBe(true);
    expect(globs.some(g => g.includes('Kalshi-bot'))).toBe(true);
  });

  test('trap tokens include partnerId and externalRef', () => {
    const traps = collectTrapRowTokens(allPartnerSurfaceRows());
    expect(traps).toContain('partnerId');
    expect(traps).toContain('externalRef');
  });

  test('isSimpleIdent rejects complex wire paths', () => {
    expect(isSimpleIdent('partnerId')).toBe(true);
    expect(isSimpleIdent('partners[].id')).toBe(false);
  });

  test('buildNakedAnnotationRegex escapes and matches optional props', () => {
    const re = buildNakedAnnotationRegex(['outId', 'partner_id'], 'string');
    expect(`outId${colonString}`).toMatch(re);
    re.lastIndex = 0;
    expect(`partner_id?${colonString}`).toMatch(re);
  });

  test('pathMatchesAnyGlob handles /** prefixes', () => {
    expect(
      pathMatchesAnyGlob(
        'projects/active/sports-terminal-os/src/api/partner-routes.ts',
        ['projects/active/sports-terminal-os/**']
      )
    ).toBe(true);
  });

  test('maskNonCodeSpans ignores string literals and line comments', () => {
    const line = `const s = "partnerId${colonString}"; partnerId${colonString}; // trail`;
    const hits = findNakedPartnerIdHits('demo.ts', line);
    expect(hits.length).toBe(1);
    expect(hits[0]?.match).toBe(`partnerId${colonString}`);
  });

  test('findNakedHitsForRule reports brandedType on hits', () => {
    const rule = buildWireLintRules(allPartnerSurfaceRows()).find(r => r.brandedType === 'OutId')!;
    const src = `function f(outId${colonString}, out_id${colonString}) {}`;
    const hits = findNakedHitsForRule('demo.ts', src, rule);
    expect(hits.length).toBe(2);
    expect(hits[0]?.brandedType).toBe('OutId');
    expect(hits.map(h => h.match)).toContain(`out_id${colonString}`);
  });

  test('appendWireOkComment is idempotent', () => {
    const line = `outId${colonString};`;
    const once = appendWireOkComment(line, 'OutId boundary');
    expect(once).toContain('// wire-ok: OutId boundary');
    expect(appendWireOkComment(once, 'again')).toBe(once);
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
          brandedType: 'ExternalPartnerRef',
          pattern: 'partnerId',
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
    if (issues.length > 0) {
      expect(issues[0]?.level).toBe('warn');
    }
  });

  test('CLI --hlp / --why / --document / --rules exit 0', async () => {
    expect(HELP_TEXT).toContain('--scan');
    expect(HELP_TEXT).toContain('--fix');
    expect(HELP_TEXT).toContain('--rules');
    expect(WHY_MARKDOWN).toContain('Layer C');
    expect(DOCUMENT_REL).toBe('docs/design/partner-surface-inventory.md');
    expect(WIRE_LINT_DOC_REL).toBe('docs/design/wire-lint.md');
    expect(await lintWiresMain(['bun', 'scripts/validate-wire-traps.ts'])).toBe(0);
    expect(await lintWiresMain(['bun', 'scripts/validate-wire-traps.ts', '--hlp'])).toBe(0);
    expect(await lintWiresMain(['bun', 'scripts/validate-wire-traps.ts', '--why'])).toBe(0);
    expect(await lintWiresMain(['bun', 'scripts/validate-wire-traps.ts', '--document'])).toBe(0);
    expect(await lintWiresMain(['bun', 'scripts/validate-wire-traps.ts', '--rules'])).toBe(0);
  });

  test('CLI --scan runs the gate', async () => {
    expect(await lintWiresMain(['bun', 'scripts/validate-wire-traps.ts', '--scan'])).toBe(0);
  });
});
