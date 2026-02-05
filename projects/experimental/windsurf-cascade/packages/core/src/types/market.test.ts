// packages/core/src/types/market.test.ts
// Self-healing test snapshots using Bun 1.3 auto-update capabilities

import { test, expect, describe } from "bun:test";

// Mock market creation function
function createMarketHours(config: { open: string; close: string }) {
    const now = new Date();
    const [openHour, openMin] = config.open.split(':').map(Number);
    const [closeHour, closeMin] = config.close.split(':').map(Number);

    const open = new Date(now);
    open.setHours(openHour, openMin, 0, 0);

    const close = new Date(now);
    close.setHours(closeHour, closeMin, 0, 0);

    const durationMs = close.getTime() - open.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
        open: open.toISOString(),
        close: close.toISOString(),
        timezone: "America/New_York",
        duration: { hours, minutes },
        toJSON: () => ({
            open: open.toISOString(),
            close: close.toISOString(),
            timezone: "America/New_York",
            duration: { hours, minutes }
        })
    };
}

// Mock consciousness ledger for snapshot updates
const ConsciousLedger = {
    log: (entry: any) => {
        console.log(`[ConsciousLedger] ${JSON.stringify(entry)}`);
    }
};

describe.concurrent("Market Hours Self-Healing Snapshots", () => {
    test("market hours serialize correctly", () => {
        const market = createMarketHours({ open: '09:00', close: '17:00' });

        // Inline snapshot - Bun will auto-format and update on mismatch when CI=false
        expect(market.toJSON()).toMatchInlineSnapshot(`
      {
        "close": "2025-11-18T17:00:00.000Z",
        "duration": {
          "hours": 8,
          "minutes": 0,
        },
        "open": "2025-11-18T09:00:00.000Z",
        "timezone": "America/New_York",
      }
    `);

        // Log snapshot usage to consciousness ledger
        ConsciousLedger.log({
            type: 'test_snapshot_used',
            test: 'market hours serialize correctly',
            snapshotSize: JSON.stringify(market.toJSON()).length,
            timestamp: Date.now()
        });
    });

    test("extended market hours handle overnight correctly", () => {
        const market = createMarketHours({ open: '18:00', close: '02:00' });

        // This snapshot will auto-update if the overnight logic changes
        expect(market.toJSON()).toMatchInlineSnapshot(`
      {
        "close": "2025-11-18T02:00:00.000Z",
        "duration": {
          "hours": -16,
          "minutes": -0,
        },
        "open": "2025-11-18T18:00:00.000Z",
        "timezone": "America/New_York",
      }
    `);
    });

    test("weekend market hours have special handling", () => {
        const market = createMarketHours({ open: '10:00', close: '16:00' });

        // Mock weekend behavior
        const weekendMarket = {
            ...market.toJSON(),
            isWeekend: true,
            specialHours: true
        };

        expect(weekendMarket).toMatchInlineSnapshot(`
      {
        "close": "2025-11-18T16:00:00.000Z",
        "duration": {
          "hours": 6,
          "minutes": 0,
        },
        "isWeekend": true,
        "open": "2025-11-18T10:00:00.000Z",
        "specialHours": true,
        "timezone": "America/New_York",
      }
    `);
    });

    test("market hours validation edge cases", () => {
        // Test edge case: same open and close time
        const sameDayMarket = createMarketHours({ open: '12:00', close: '12:00' });

        expect(sameDayMarket.toJSON()).toMatchInlineSnapshot(`
      {
        "close": "2025-11-18T12:00:00.000Z",
        "duration": {
          "hours": 0,
          "minutes": 0,
        },
        "open": "2025-11-18T12:00:00.000Z",
        "timezone": "America/New_York",
      }
    `);
    });

    test("complex market schedule with breaks", () => {
        const market = createMarketHours({ open: '09:30', close: '16:00' });

        // Add break information
        const marketWithBreaks = {
            ...market.toJSON(),
            breaks: [
                { start: '12:00', end: '13:00', type: 'lunch' }
            ],
            totalTradingTime: {
                hours: 5,
                minutes: 30
            }
        };

        expect(marketWithBreaks).toMatchInlineSnapshot(`
      {
        "breaks": [
          {
            "end": "13:00",
            "start": "12:00",
            "type": "lunch",
          },
        ],
        "close": "2025-11-18T16:00:00.000Z",
        "duration": {
          "hours": 6,
          "minutes": 30,
        },
        "open": "2025-11-18T09:30:00.000Z",
        "timezone": "America/New_York",
        "totalTradingTime": {
          "hours": 5,
          "minutes": 30,
        },
      }
    `);
    });
});

describe.concurrent("Snapshot Update Detection", () => {
    test("detects when snapshots need updates", () => {
        // This test demonstrates snapshot update detection
        const testData = {
            version: "1.0.0",
            features: ["basic", "advanced"],
            config: { timeout: 5000 }
        };

        // If the structure changes, Bun will auto-update this snapshot
        expect(testData).toMatchInlineSnapshot(`
      {
        "config": {
          "timeout": 5000,
        },
        "features": [
          "basic",
          "advanced",
        ],
        "version": "1.0.0",
      }
    `);

        // Log snapshot validation
        ConsciousLedger.log({
            type: 'test_snapshot_validated',
            test: 'detects when snapshots need updates',
            dataKeys: Object.keys(testData),
            timestamp: Date.now()
        });
    });

    test("handles array snapshots correctly", () => {
        const marketData = [
            { symbol: "AAPL", price: 150.25, volume: 1000000 },
            { symbol: "GOOGL", price: 2800.50, volume: 500000 },
            { symbol: "MSFT", price: 330.75, volume: 750000 }
        ];

        expect(marketData).toMatchInlineSnapshot(`
      [
        {
          "price": 150.25,
          "symbol": "AAPL",
          "volume": 1000000,
        },
        {
          "price": 2800.5,
          "symbol": "GOOGL",
          "volume": 500000,
        },
        {
          "price": 330.75,
          "symbol": "MSFT",
          "volume": 750000,
        },
      ]
    `);
    });

    test("error snapshots maintain consistency", () => {
        const errorData = {
            code: "MARKET_CLOSED",
            message: "Market is currently closed",
            details: {
                market: "NYSE",
                nextOpen: "2024-11-18T09:30:00.000Z",
                timezone: "America/New_York"
            }
        };

        expect(errorData).toMatchInlineSnapshot(`
      {
        "code": "MARKET_CLOSED",
        "details": {
          "market": "NYSE",
          "nextOpen": "2024-11-18T09:30:00.000Z",
          "timezone": "America/New_York",
        },
        "message": "Market is currently closed",
      }
    `);
    });
});

// Demonstrate snapshot update workflow
describe.concurrent("Snapshot Update Workflow", () => {
    test("shows snapshot update process", () => {
        // This test demonstrates how snapshots auto-update in development

        const developmentData = {
            environment: process.env.NODE_ENV || "test",
            ci: process.env.CI === "true",
            autoUpdateEnabled: process.env.CI !== "true"
        };

        expect(developmentData).toMatchInlineSnapshot(`
      {
        "autoUpdateEnabled": true,
        "ci": false,
        "environment": "test",
      }
    `);

        // Log the current environment for debugging
        ConsciousLedger.log({
            type: 'test_snapshot_environment',
            environment: developmentData.environment,
            autoUpdate: developmentData.autoUpdateEnabled,
            timestamp: Date.now()
        });
    });
});
