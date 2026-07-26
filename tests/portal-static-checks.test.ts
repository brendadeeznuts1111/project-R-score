import { describe, expect, test } from 'bun:test';
import { collectPortalStaticViolations } from '../lib/portal-static-checks.ts';

describe('portal-static-checks', () => {
  test('collectPortalStaticViolations is clean on current portal tree', async () => {
    const violations = await collectPortalStaticViolations();
    expect(violations).toEqual([]);
  });
});
