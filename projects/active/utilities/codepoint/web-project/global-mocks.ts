#!/usr/bin/env bun

/**
 * Global mocks for WebSocket Proxy API testing
 * Sets up common mocks and stubs for consistent test environment
 */

import { mock } from "bun:test";

// Mock environment variables
process.env.NODE_ENV = "test";
process.env.API_URL = "http://localhost:3001";
process.env.WS_PORT = "3002";
process.env.LOG_LEVEL = "error";

// Mock external dependencies
mock.module("ws", () => ({
  WebSocket: mock(() => ({
    readyState: 1,
    send: mock(() => {}),
    close: mock(() => {}),
    on: mock(() => {}),
    off: mock(() => {}),
  })),
}));

mock.module("node:fs", () => ({
  readFileSync: mock(() => Buffer.from("mock file content")),
  writeFileSync: mock(() => {}),
  existsSync: mock(() => true),
  mkdirSync: mock(() => {}),
  rmSync: mock(() => {}),
}));

mock.module("node:path", () => ({
  join: mock((...paths: string[]) => paths.join("/")),
  resolve: mock((...paths: string[]) => paths.join("/")),
  dirname: mock((path: string) => path.split("/").slice(0, -1).join("/")),
}));

// Mock network operations
mock.module("node:http", () => ({
  createServer: mock(() => ({
    listen: mock(() => {}),
    close: mock(() => {}),
    on: mock(() => {}),
  })),
}));

mock.module("node:https", () => ({
  createServer: mock(() => ({
    listen: mock(() => {}),
    close: mock(() => {}),
    on: mock(() => {}),
  })),
}));

// Mock performance monitoring
mock.module("node:os", () => ({
  cpus: mock(() => [
    {
      model: "Test CPU",
      speed: 2400,
      times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0, total: 0 },
    },
  ]),
  totalmem: mock(() => 8000000000),
  freemem: mock(() => 4000000000),
  loadavg: mock(() => [0.5, 0.5, 0.5]),
  uptime: mock(() => 3600),
}));

// Mock process metrics
mock.module("node:process", () => ({
  hrtime: mock(() => [0, 1000000]),
  memoryUsage: mock(() => ({
    rss: 50000000,
    heapTotal: 30000000,
    heapUsed: 20000000,
    external: 5000000,
    arrayBuffers: 1000000,
  })),
  cpuUsage: mock(() => ({
    user: 100000,
    system: 50000,
  })),
}));

// Mock console for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: mock((...args: any[]) => {
    if (process.env.LOG_LEVEL === "debug") {
      originalConsole.log(...args);
    }
  }),
  warn: mock((...args: any[]) => {
    if (process.env.LOG_LEVEL !== "error") {
      originalConsole.warn(...args);
    }
  }),
  error: mock((...args: any[]) => {
    originalConsole.error(...args);
  }),
};

// Export mock utilities
export const mockUtils = {
  resetAllMocks: () => {
    // Clear all mocks - in Bun this is handled automatically
    // This is a placeholder for mock reset functionality
  },

  createMockWebSocket: () => ({
    readyState: 1,
    send: mock(() => {}),
    close: mock(() => {}),
    on: mock(() => {}),
    off: mock(() => {}),
    addEventListener: mock(() => {}),
    removeEventListener: mock(() => {}),
  }),

  createMockServer: () => ({
    listen: mock(() => {}),
    close: mock(() => {}),
    on: mock(() => {}),
    address: mock(() => ({ port: 3002, address: "127.0.0.1" })),
  }),
};
