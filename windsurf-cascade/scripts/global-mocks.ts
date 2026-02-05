// scripts/global-mocks.ts
// Global mocks for preload demonstration

import { mock } from "bun:test";

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.API_URL = "http://localhost:3001";
process.env.DATABASE_URL = "postgresql://localhost:5432/test_db";
process.env.LOG_LEVEL = "error";

// Mock external API dependencies
mock.module("@citadel/nba-api", () => ({
    fetchNBALiveOdds: mock(() => Promise.resolve({
        rotationId: "TEST_ROT_123",
        gameId: "TEST_GAME_456",
        odds: {
            moneyline: { home: -150, away: 130 },
            spread: { home: -2.5, away: 2.5 },
            total: { over: 220.5, under: 220.5 }
        },
        teams: {
            home: { name: "Test Lakers", abbreviation: "TLA" },
            away: { name: "Test Celtics", abbreviation: "TCE" }
        },
        timestamp: Date.now(),
        status: "test"
    })),

    fetchNBATeamStats: mock(() => Promise.resolve({
        teamId: "TEST_TEAM_123",
        season: "2023-24",
        gamesPlayed: 10,
        wins: 6,
        losses: 4,
        pointsPerGame: 105.5,
        reboundsPerGame: 42.3,
        assistsPerGame: 25.7,
        lastUpdated: Date.now()
    }))
}));

// Mock database dependencies
mock.module("@citadel/database", () => ({
    query: mock((sql: string, params?: any[]) => {
        console.log(`[Mock DB] Executing: ${sql.substring(0, 50)}...`);
        return Promise.resolve({
            rows: [
                {
                    id: 1,
                    rotation_id: 'TEST_ROT_123',
                    home_team: 'Test Lakers',
                    away_team: 'Test Celtics',
                    home_odds: -150,
                    away_odds: 130,
                    created_at: new Date().toISOString()
                }
            ],
            rowCount: 1
        });
    }),

    transaction: mock((callback: any) => {
        console.log('[Mock DB] Transaction started');
        return Promise.resolve(callback({
            query: mock.query
        })).then(result => {
            console.log('[Mock DB] Transaction completed');
            return result;
        });
    })
}));

// Mock external services
mock.module("./external-api", () => ({
    fetchData: mock(() => Promise.resolve({
        data: "test",
        timestamp: Date.now(),
        status: "success"
    })),

    fetchUser: mock((userId: string) => Promise.resolve({
        id: userId,
        name: `Test User ${userId}`,
        email: `test${userId}@example.com`,
        createdAt: new Date().toISOString()
    })),

    createOrder: mock((orderData: any) => Promise.resolve({
        id: `TEST_ORDER_${Date.now()}`,
        ...orderData,
        status: "created",
        createdAt: new Date().toISOString()
    }))
}));

// Mock filesystem operations
mock.module("fs", () => ({
    readFileSync: mock((path: string) => {
        console.log(`[Mock FS] Reading file: ${path}`);
        return JSON.stringify({ test: "data", path });
    }),

    writeFileSync: mock((path: string, data: string) => {
        console.log(`[Mock FS] Writing file: ${path}`);
        return true;
    }),

    existsSync: mock((path: string) => {
        console.log(`[Mock FS] Checking existence: ${path}`);
        return true;
    })
}));

// Mock network requests
global.fetch = mock((url: string, options?: any) => {
    console.log(`[Mock Fetch] ${url}`);
    return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
            url,
            method: options?.method || 'GET',
            data: "mock response",
            timestamp: Date.now()
        }),
        text: () => Promise.resolve('mock response text')
    });
});

// Mock console methods for cleaner test output
const originalConsole = global.console;
global.console = {
    ...originalConsole,
    log: mock((...args: any[]) => {
        if (process.env.VERBOSE_TESTS === 'true') {
            originalConsole.log(...args);
        }
    }),
    warn: mock((...args: any[]) => {
        if (process.env.VERBOSE_TESTS === 'true') {
            originalConsole.warn(...args);
        }
    }),
    error: mock((...args: any[]) => {
        originalConsole.error(...args);
    }),
    info: mock((...args: any[]) => {
        if (process.env.VERBOSE_TESTS === 'true') {
            originalConsole.info(...args);
        }
    })
};

// Set up global test utilities
global.testUtils = {
    generateMockData: (type: string) => {
        switch (type) {
            case 'odds':
                return {
                    home: -Math.floor(Math.random() * 200 + 100),
                    away: Math.floor(Math.random() * 150 + 100)
                };
            case 'game':
                return {
                    id: `GAME_${Date.now()}`,
                    status: 'live',
                    timestamp: Date.now()
                };
            default:
                return { type, data: 'mock' };
        }
    },

    createMockUser: (id: string) => ({
        id,
        name: `Test User ${id}`,
        email: `test${id}@example.com`,
        createdAt: new Date().toISOString()
    }),

    delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
};

console.log('🎭 Global mocks loaded successfully');
console.log('   Environment: test');
console.log('   API URL: http://localhost:3001');
console.log('   Database: postgresql://localhost:5432/test_db');
console.log('   External services: mocked');
