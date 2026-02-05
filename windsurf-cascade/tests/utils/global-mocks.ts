// global-mocks.ts
// Global mocks for comprehensive configuration

import { mock } from "bun:test";

// Mock external database module
mock.module("pg", () => ({
    Pool: mock(() => ({
        connect: mock(() => Promise.resolve({
            query: mock((sql: string, params?: any[]) => {
                console.log(`[Mock DB] ${sql.substring(0, 50)}...`);
                return Promise.resolve({
                    rows: [{ id: 1, name: 'test', created_at: new Date() }],
                    rowCount: 1
                });
            }),
            release: mock(() => { })
        })),
        end: mock(() => Promise.resolve())
    })),
    Client: mock(() => ({
        connect: mock(() => Promise.resolve()),
        query: mock(() => Promise.resolve({ rows: [], rowCount: 0 })),
        end: mock(() => Promise.resolve())
    }))
}));

// Mock external API client
mock.module("axios", () => ({
    default: mock(() => ({
        get: mock((url: string) => {
            console.log(`[Mock Axios GET] ${url}`);
            return Promise.resolve({
                data: { url, method: 'GET', timestamp: Date.now() },
                status: 200,
                statusText: 'OK'
            });
        }),
        post: mock((url: string, data?: any) => {
            console.log(`[Mock Axios POST] ${url}`);
            return Promise.resolve({
                data: { url, method: 'POST', data, timestamp: Date.now() },
                status: 201,
                statusText: 'Created'
            });
        }),
        put: mock((url: string, data?: any) => {
            console.log(`[Mock Axios PUT] ${url}`);
            return Promise.resolve({
                data: { url, method: 'PUT', data, timestamp: Date.now() },
                status: 200,
                statusText: 'OK'
            });
        }),
        delete: mock((url: string) => {
            console.log(`[Mock Axios DELETE] ${url}`);
            return Promise.resolve({
                data: { url, method: 'DELETE', timestamp: Date.now() },
                status: 204,
                statusText: 'No Content'
            });
        })
    }))
}));

// Mock filesystem operations
mock.module("fs/promises", () => ({
    readFile: mock((path: string) => {
        console.log(`[Mock FS] Reading file: ${path}`);
        return Promise.resolve(JSON.stringify({ path, content: 'mock data' }));
    }),
    writeFile: mock((path: string, data: string) => {
        console.log(`[Mock FS] Writing file: ${path}`);
        return Promise.resolve();
    }),
    access: mock((path: string) => {
        console.log(`[Mock FS] Checking access: ${path}`);
        return Promise.resolve();
    }),
    mkdir: mock((path: string) => {
        console.log(`[Mock FS] Creating directory: ${path}`);
        return Promise.resolve();
    })
}));

// Mock configuration files
mock.module("./config.js", () => ({
    database: {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
    },
    api: {
        url: process.env.API_URL || 'http://localhost:3001',
        timeout: 5000,
        retries: 3
    },
    logging: {
        level: process.env.LOG_LEVEL || 'error',
        format: 'json'
    }
}));

// Mock utility functions
mock.module("./src/utils/logger.js", () => ({
    info: mock((message: string, ...args: any[]) => {
        if (process.env.LOG_LEVEL !== 'error') {
            console.log(`[INFO] ${message}`, ...args);
        }
    }),
    warn: mock((message: string, ...args: any[]) => {
        if (process.env.LOG_LEVEL !== 'error') {
            console.warn(`[WARN] ${message}`, ...args);
        }
    }),
    error: mock((message: string, ...args: any[]) => {
        console.error(`[ERROR] ${message}`, ...args);
    }),
    debug: mock((message: string, ...args: any[]) => {
        if (process.env.LOG_LEVEL === 'debug') {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    })
}));

// Mock external services
mock.module("./src/services/external-service.js", () => ({
    fetchData: mock((endpoint: string) => {
        console.log(`[Mock Service] Fetching from: ${endpoint}`);
        return Promise.resolve({
            endpoint,
            data: { mock: true, timestamp: Date.now() },
            status: 'success'
        });
    }),
    submitData: mock((endpoint: string, data: any) => {
        console.log(`[Mock Service] Submitting to: ${endpoint}`);
        return Promise.resolve({
            endpoint,
            submitted: true,
            data,
            id: `mock_${Date.now()}`
        });
    })
}));

// Global fetch mock
global.fetch = mock((url: string, options?: any) => {
    console.log(`[Mock Fetch] ${options?.method || 'GET'} ${url}`);

    return Promise.resolve({
        ok: true,
        status: options?.method === 'POST' ? 201 : 200,
        statusText: 'OK',
        json: () => Promise.resolve({
            url,
            method: options?.method || 'GET',
            timestamp: Date.now(),
            mock: true
        }),
        text: () => Promise.resolve('Mock response text'),
        headers: new Map([
            ['content-type', 'application/json'],
            ['x-mock', 'true']
        ])
    });
});

// Set up global test utilities
global.testUtils = {
    generateMockData: (type: string) => {
        const mockData = {
            user: { id: 1, name: 'Test User', email: 'test@example.com' },
            product: { id: 1, name: 'Test Product', price: 99.99 },
            order: { id: 1, userId: 1, productId: 1, quantity: 2 },
            response: { success: true, data: 'mock', timestamp: Date.now() }
        };
        return mockData[type as keyof typeof mockData] || { type, mock: true };
    },

    createMockResponse: (data: any, status = 200) => ({
        data,
        status,
        success: status >= 200 && status < 300,
        timestamp: Date.now()
    }),

    delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

    assertEnvironment: () => {
        if (process.env.NODE_ENV !== 'test') {
            throw new Error('Tests must run in NODE_ENV=test');
        }
    }
};

// Mock console methods for cleaner test output
const originalConsole = global.console;
global.console = {
    ...originalConsole,
    log: mock((...args: any[]) => {
        if (process.env.LOG_LEVEL !== 'error') {
            originalConsole.log(...args);
        }
    }),
    info: mock((...args: any[]) => {
        if (process.env.LOG_LEVEL !== 'error') {
            originalConsole.info(...args);
        }
    }),
    warn: mock((...args: any[]) => {
        if (process.env.LOG_LEVEL !== 'error') {
            originalConsole.warn(...args);
        }
    }),
    error: originalConsole.error, // Always show errors
    debug: mock((...args: any[]) => {
        if (process.env.LOG_LEVEL === 'debug') {
            originalConsole.debug(...args);
        }
    })
};

console.log('🎭 Comprehensive global mocks loaded');
console.log('   Environment variables set');
console.log('   External services mocked');
console.log('   Database operations mocked');
console.log('   Filesystem operations mocked');
console.log('   Network requests mocked');
