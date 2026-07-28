import { describe, expect, test } from 'bun:test';

import {
  canonicalNavigationPath,
  resolveCurrentNavigationHref,
} from '../public/portal/navigation.js';

describe('portal navigation signals', () => {
  test('canonicalizes directory and index-document href variants', () => {
    expect(canonicalNavigationPath('/portal/ops/')).toBe('/portal/ops');
    expect(canonicalNavigationPath('/portal/ops/index.html')).toBe('/portal/ops');
    expect(canonicalNavigationPath('/portal//ops///')).toBe('/portal/ops');
    expect(canonicalNavigationPath('/')).toBe('/');
  });

  test('resolves only the exact current internal surface', () => {
    const hrefs = ['/', '/portal/', '/portal/ops', '/portal/health/', '/portal/dashboard'];

    expect(resolveCurrentNavigationHref('/portal/ops/', hrefs)).toBe('/portal/ops');
    expect(resolveCurrentNavigationHref('/portal/dashboard/index.html', hrefs)).toBe(
      '/portal/dashboard'
    );
    expect(resolveCurrentNavigationHref('/portal/compliance/', hrefs)).toBeNull();
  });

  test('ignores external links even when their path matches', () => {
    expect(
      resolveCurrentNavigationHref(
        '/portal/ops',
        ['https://other.example/portal/ops', '/portal/ops'],
        'https://factory-wager.com'
      )
    ).toBe('/portal/ops');
  });
});
