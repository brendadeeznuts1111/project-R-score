import { describe, it, expect } from 'bun:test';
import { FantasySportEvent } from '../entities/fantasy-sport-event';

describe('FantasySportEvent', () => {
  it('maps external data without throwing', () => {
    const external = {
      id: 'EVENT123',
      sport: 'football',
      league: 'NFL',
      home_team: 'New England Patriots',
      away_team: 'Kansas City Chiefs',
      start_time: '2024-01-15T13:00:00Z',
      status: 'scheduled',
      odds: {
        home: -150,
        away: 130,
        draw: 1000,
      },
      score: {
        home: 24,
        away: 17,
      },
      metadata: { venue: 'Gillette Stadium' },
    } as const;

    expect(() => FantasySportEvent.fromExternalData(external)).not.toThrow();
  });

  it('handles different sports and statuses', () => {
    const sports = ['football', 'basketball', 'baseball'];
    const statuses = ['scheduled', 'in_progress', 'completed'];

    sports.forEach(sport => {
      statuses.forEach(status => {
        const external = {
          id: `EVENT${sport}${status}`,
          sport,
          league: 'Test League',
          home_team: 'Home Team',
          away_team: 'Away Team',
          start_time: '2024-01-15T13:00:00Z',
          status,
          odds: {
            home: 100,
            away: 100,
          },
          metadata: {},
        } as const;

        expect(() => FantasySportEvent.fromExternalData(external)).not.toThrow();
      });
    });
  });
});
