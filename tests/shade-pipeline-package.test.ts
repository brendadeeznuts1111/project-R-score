import { describe, expect, test } from 'bun:test';
import { SHADE_PIPELINE_PACKAGE_TARGET } from '../packages/shade-pipeline/src/index.ts';

describe('@factorywager/shade-pipeline scaffold', () => {
  test('exports the canonical workspace target', () => {
    expect(SHADE_PIPELINE_PACKAGE_TARGET).toEqual({
      target_name: '@factorywager/shade-pipeline',
      target_workspace: 'packages/shade-pipeline',
      implementation_status: 'scaffold-pending-extract',
      tracker_issue: 284,
      nested_product: 'projects/active/enterprise/bet-ticker-worker-v1.1',
      pending_extract_symbols: ['normalizeOdds', 'sportMapping', 'rotationResolver'],
    });
  });

  test('package.json name matches the target contract', async () => {
    const pkg = (await Bun.file('packages/shade-pipeline/package.json').json()) as {
      name: string;
      private: boolean;
      exports: Record<string, string>;
    };
    expect(pkg.name).toBe(SHADE_PIPELINE_PACKAGE_TARGET.target_name);
    expect(pkg.private).toBe(true);
    expect(pkg.exports['.']).toBe('./src/index.ts');
  });

  test('pending extract symbols stay empty stubs (no forged domain API)', async () => {
    const src = await Bun.file('packages/shade-pipeline/src/index.ts').text();
    for (const symbol of SHADE_PIPELINE_PACKAGE_TARGET.pending_extract_symbols) {
      expect(src.includes(`export function ${symbol}`)).toBe(false);
      expect(src.includes(`export const ${symbol}`)).toBe(false);
    }
  });
});
