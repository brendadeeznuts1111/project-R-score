import { describe, it, expect } from 'bun:test';
import { FantasyBet } from '../entities/fantasy-bet';

describe('FantasyBet', () => {
  it('maps external data without throwing', () => {
    const external = {
      betId: 'BET123',
      agentId: 'AGENT456',
      customerId: 'CUST789',
      eventId: 'EVENT101',
      betType: 'moneyline',
      amount: 100,
      odds: -110,
      selection: 'New England Patriots',
      status: 'pending',
      placedAt: '2024-01-15T10:30:00Z',
      settledAt: '2024-01-15T14:30:00Z',
      result: 'won' as const,
      payout: 190.91,
      metadata: { source: 'api' },
    } as const;

    expect(() => FantasyBet.fromExternalData(external)).not.toThrow();
  });

  it('handles different bet types', () => {
    const betTypes = ['moneyline', 'spread', 'total', 'parlay'];

    betTypes.forEach(betType => {
      const external = {
        betId: `BET${betType}123`,
        agentId: 'AGENT456',
        eventId: 'EVENT101',
        betType,
        amount: 50,
        odds: 100,
        selection: 'Test Selection',
        status: 'accepted',
        placedAt: '2024-01-15T10:30:00Z',
        metadata: {},
      } as const;

      expect(() => FantasyBet.fromExternalData(external)).not.toThrow();
    });
  });
});
