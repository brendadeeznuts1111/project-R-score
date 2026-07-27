import { describe, expect, test } from 'bun:test';
import { interpretPackageGroupMemberCount } from '../lib/telegram/package-group-membership.ts';

describe('package-group-membership', () => {
  test('house_only is normal for designated seat', () => {
    const tell = interpretPackageGroupMemberCount(2, { dmSeatStatus: 'designated' });
    expect(tell.status).toBe('house_only');
    expect(tell.label).toBe('house');
  });

  test('partner_present at three members', () => {
    const tell = interpretPackageGroupMemberCount(3);
    expect(tell.status).toBe('partner_present');
    expect(tell.label).toBe('OK');
  });

  test('extended for four or more', () => {
    const tell = interpretPackageGroupMemberCount(5);
    expect(tell.status).toBe('extended');
  });

  test('understaffed at one member', () => {
    const tell = interpretPackageGroupMemberCount(1);
    expect(tell.status).toBe('understaffed');
  });

  test('linked seat with only two members flags invite gap', () => {
    const tell = interpretPackageGroupMemberCount(2, { dmSeatStatus: 'linked' });
    expect(tell.status).toBe('house_only');
    expect(tell.detail).toContain('invite');
  });
});
