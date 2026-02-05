// packages/odds-core/src/__tests__/snapshot-examples.test.ts
// Snapshot testing examples for Odds Protocol

import { test, expect } from "bun:test";
import { formatOddsTick, serializeMarketData } from '../utils/index.js';
import { OddsTick, MarketData } from '../types/index.js';

describe('Snapshot Testing', () => {
  test('should format odds tick consistently', () => {
    const tick: OddsTick = {
      id: 'test_123',
      sport: 'NFL',
      game_id: 'game_456',
      market_type: 'moneyline',
      exchange: 'BookmakerA',
      line: -110,
      juice: -110,
      timestamp: new Date('2024-01-15T10:30:00.000Z'),
      volume: 50000,
      sharp: true
    };

    const formatted = formatOddsTick(tick);
    expect(formatted).toMatchSnapshot();
  });

  test('should serialize market data correctly', () => {
    const marketData: MarketData = {
      id: 'market_789',
      sport: 'NBA',
      game_id: 'game_101',
      markets: [
        {
          type: 'spread',
          outcomes: [
            { name: 'Team A', odds: -5.5, juice: -110 },
            { name: 'Team B', odds: 5.5, juice: -110 }
          ]
        },
        {
          type: 'moneyline',
          outcomes: [
            { name: 'Team A', odds: -150, juice: -110 },
            { name: 'Team B', odds: 130, juice: -110 }
          ]
        }
      ],
      last_updated: new Date('2024-01-15T10:30:00.000Z')
    };

    const serialized = serializeMarketData(marketData);
    expect(serialized).toMatchSnapshot();
  });

  test('should handle complex nested data structures', () => {
    const complexData = {
      metadata: {
        source: 'external_api',
        version: '2.1.0',
        timestamp: '2024-01-15T10:30:00.000Z',
        checksum: 'abc123def456'
      },
      data: {
        odds: [
          { bookmaker: 'BookA', odds: 2.1, confidence: 0.85 },
          { bookmaker: 'BookB', odds: 2.05, confidence: 0.82 }
        ],
        analytics: {
          expected_value: 0.05,
          kelly_fraction: 0.02,
          risk_level: 'LOW'
        }
      }
    };

    expect(complexData).toMatchSnapshot('complex-analytics-data');
  });

  test('should match inline snapshot for simple cases', () => {
    const simpleOdds = {
      home: -110,
      away: -110,
      draw: 300
    };

    expect(JSON.stringify(simpleOdds, null, 2)).toMatchInlineSnapshot(`
      "{
        \\"home\\": -110,
        \\"away\\": -110,
        \\"draw\\": 300
      }"
    `);
  });
});

describe('Error Handling Snapshots', () => {
  test('should capture error snapshots', () => {
    const error = new Error('Invalid odds format');
    error.name = 'ValidationError';
    
    expect({
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n')[0] // Only first line for consistency
    }).toMatchSnapshot('validation-error');
  });
});
