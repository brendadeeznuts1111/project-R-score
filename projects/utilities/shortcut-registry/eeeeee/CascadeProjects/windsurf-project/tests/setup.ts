// Vitest setup file for Sovereign Unit testing infrastructure
import { beforeAll, afterAll, vi } from 'vitest';

// Mock console methods to reduce noise during testing
const originalConsole = { ...console };
const mockConsole = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
};

// Global test setup
beforeAll(() => {
  // Use mocked console during tests unless explicitly testing console output
  if (!process.env.TEST_CONSOLE) {
    Object.assign(console, mockConsole);
  }

  // Set test environment
  process.env.NODE_ENV = 'test';

  console.log('🚀 Sovereign Unit Test Infrastructure Initialized');
});

// Global test teardown
afterAll(() => {
  // Restore original console
  Object.assign(console, originalConsole);

  console.log('✅ Sovereign Unit Test Infrastructure Shutdown');
});

// Mock global crypto if not available
if (!globalThis.crypto) {
  globalThis.crypto = {
    getRandomValues: (array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
    subtle: {
      digest: async (algorithm: string, data: Uint8Array) => {
        // Mock implementation
        const hash = new Uint8Array(32);
        for (let i = 0; i < hash.length; i++) {
          hash[i] = (data[i % data.length] + i) % 256;
        }
        return hash.buffer;
      },
      digestSync: (algorithm: string, data: Uint8Array) => {
        // Mock implementation
        const hash = new Uint8Array(32);
        for (let i = 0; i < hash.length; i++) {
          hash[i] = (data[i % data.length] + i) % 256;
        }
        return hash.buffer;
      }
    }
  } as any;
}

// Mock fetch if not available
if (!globalThis.fetch) {
  globalThis.fetch = vi.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('')
  })) as any;
}

// Mock Bun globals if not available
if (!globalThis.Bun) {
  globalThis.Bun = {
    sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
    file: vi.fn(() => ({
      text: () => Promise.resolve(''),
      write: () => Promise.resolve(),
      exists: () => Promise.resolve(false)
    })),
    $: vi.fn(() => ({
      text: () => Promise.resolve(''),
      quiet: () => Promise.resolve()
    }))
  } as any;
}

// Export test utilities
export const testUtils = {
  // Create mock file system operations
  mockFileSystem: () => ({
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(),
    mkdirSync: vi.fn()
  }),

  // Create mock ADB bridge
  mockAdbBridge: () => ({
    executeCommand: vi.fn(() => Promise.resolve('mock output')),
    captureScreenshot: vi.fn(() => Promise.resolve()),
    waitForScreen: vi.fn(() => Promise.resolve(true)),
    getDeviceInfo: vi.fn(() => Promise.resolve({})),
    getResourceUsage: vi.fn(() => Promise.resolve({ cpu: 0, memory: 0, storage: 0 })),
    clearApp: vi.fn(() => Promise.resolve())
  }),

  // Create mock telemetry
  mockTelemetry: () => ({
    startLogStream: vi.fn(() => Promise.resolve()),
    getAllStatuses: vi.fn(() => ({ activeStreams: [], totalDevices: 0 }))
  }),

  // Create mock crypto burner
  mockCryptoBurner: () => ({
    generateBurnerWallet: vi.fn(() => ({})),
    generateBatchBurners: vi.fn(() => Promise.resolve([])),
    saveWallets: vi.fn(() => Promise.resolve()),
    getWalletStats: vi.fn(() => ({
      totalWallets: 0,
      walletsByDevice: {},
      averageAge: 0,
      oldestWallet: 0,
      newestWallet: 0
    })),
    clearWallets: vi.fn()
  }),

  // Create mock reset controller
  mockResetController: () => ({
    executeInfinityReset: vi.fn(() => Promise.resolve({
      success: true,
      deviceId: 'mock-device',
      commandsExecuted: [],
      errors: [],
      duration: 0,
      timestamp: Date.now()
    })),
    executeQuickReset: vi.fn(() => Promise.resolve({
      success: true,
      deviceId: 'mock-device',
      commandsExecuted: [],
      errors: [],
      duration: 0,
      timestamp: Date.now()
    })),
    getResetStats: vi.fn(() => ({
      totalResets: 0,
      successfulResets: 0,
      averageDuration: 0,
      lastResetTime: 0,
      commonErrors: []
    }))
  })
};