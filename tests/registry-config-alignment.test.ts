import { describe, expect, test } from 'bun:test';
import { checkRegistryConfig } from '../scripts/check-registry-config.ts';

describe('FactoryWager registry configuration', () => {
  test('all tracked project configs use the canonical read-only npm base', async () => {
    const result = await checkRegistryConfig();
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
