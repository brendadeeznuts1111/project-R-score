import { describe, expect, test } from 'bun:test';

import { isCanaryBunBuild } from '../lib/verification/bun-release-channel.ts';

describe('Bun release channel detection', () => {
  test('detects the canary marker emitted only by bun --revision', () => {
    expect(isCanaryBunBuild(['1.4.0', '1.4.0', '1.4.0-canary.1+a227ad991'])).toBe(true);
  });

  test('accepts stable version descriptors and opaque revision hashes', () => {
    expect(
      isCanaryBunBuild(['1.4.0', '1.4.0', 'a227ad991b62fc4e9b9ee5e998ad6c2e6508fe88'])
    ).toBe(false);
  });

  test('does not mistake unrelated prose for a release-channel marker', () => {
    expect(isCanaryBunBuild(['1.4.0', 'this mentions canary in prose'])).toBe(false);
  });
});
