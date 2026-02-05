import { describe, it, expect } from 'bun:test';
import { FantasyAccount } from '../entities/fantasy-account';

describe('FantasyAccount', () => {
  it('maps external data without throwing', () => {
    const external = {
      customerID: 'CUST123',
      currentBalance: 2500.5,
      availableBalance: 2000.0,
      pendingWagerBalance: 500.5,
      creditLimit: 5000.0,
      active: true,
      lastActivity: '2024-01-15T10:30:00Z',
      metadata: { tier: 'gold' },
    } as const;

    expect(() => FantasyAccount.fromExternalData(external)).not.toThrow();
  });

  it('handles inactive accounts', () => {
    const external = {
      customerID: 'CUST456',
      currentBalance: 0,
      availableBalance: 0,
      pendingWagerBalance: 0,
      creditLimit: 1000.0,
      active: false,
      lastActivity: '2024-01-10T08:00:00Z',
      metadata: { status: 'suspended' },
    } as const;

    expect(() => FantasyAccount.fromExternalData(external)).not.toThrow();
  });
});
