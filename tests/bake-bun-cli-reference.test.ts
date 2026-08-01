import { describe, expect, test } from 'bun:test';
import {
  parseBunHelpFlags,
  parseHelpFlagLine,
  groupFlags,
  normalizeFlag,
} from '../tools/bake-bun-cli-reference.ts';

const SAMPLE = `
Flags:
      --silent                        Don't print the script command
      --elide-lines=<val>             Number of lines (default: 10). Set to 0 to show all.
  -F, --filter=<val>                  Run a script in all workspace packages
  -i                                  Auto-install dependencies during execution
      --watch                         Automatically restart
      --inspect=<val>                 Activate Bun's debugger
Examples:
  bun run
`;

describe('bake-bun-cli-reference parser', () => {
  test('parseHelpFlagLine extracts long + short + default', () => {
    const f = parseHelpFlagLine(
      '      --elide-lines=<val>             Number of lines (default: 10). Set to 0.'
    );
    expect(f?.flag).toBe('--elide-lines');
    expect(f?.type).toBe('number');
    expect(f?.default).toBe('10');
  });

  test('parseBunHelpFlags collects Flags section only', () => {
    const flags = parseBunHelpFlags(SAMPLE);
    expect(flags.map(x => x.flag)).toContain('--silent');
    expect(flags.map(x => x.flag)).toContain('--filter');
    expect(flags.find(x => x.flag === '--filter')?.short).toBe('-F');
    expect(flags.find(x => x.flag === '-i' || x.short === '-i')).toBeTruthy();
  });

  test('groupFlags assigns workspace and debug buckets', () => {
    const groups = groupFlags(parseBunHelpFlags(SAMPLE));
    const byId = Object.fromEntries(groups.map(g => [g.id, g.flags.map(f => f.flag)]));
    expect(byId['workspace-management']).toContain('--filter');
    expect(byId['debug'] || byId['development']).toBeTruthy();
    expect(byId['debug']?.includes('--inspect') || byId['development']?.includes('--watch')).toBe(
      true
    );
  });

  test('normalizeFlag defaults booleans to false and strips trailing curated', () => {
    const n = normalizeFlag({
      flag: '--silent',
      type: 'boolean',
      default: null,
      description: "Don't print curated",
    });
    expect(n.default).toBe('false');
    expect(n.description).toBe("Don't print");
  });
});
