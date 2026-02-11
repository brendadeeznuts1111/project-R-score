import { describe, expect, test } from 'bun:test';

import { getSecretsDocs } from '../lib/docs/urls';

describe('getSecretsDocs regression', () => {
  test('returns a string URL even when feature is "com" on sh domain', () => {
    const url = getSecretsDocs('com', 'sh');
    expect(typeof url).toBe('string');
    expect(url).toContain('bun.sh');
  });

  test('returns com domain URL for known feature on com domain', () => {
    const url = getSecretsDocs('versioning', 'com');
    expect(typeof url).toBe('string');
    expect(url).toContain('bun.com');
  });
});
