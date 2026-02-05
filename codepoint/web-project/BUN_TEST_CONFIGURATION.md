# 🎯 **Comprehensive Bun Test Configuration**

## 📋 **Configuration Overview**

This guide demonstrates the complete configuration of Bun's test runner for our WebSocket Proxy API project, showcasing all available configuration options and best practices.

## 🔧 **Complete bunfig.toml Configuration**

```toml title="bunfig.toml"
[install]
# Install settings inherited by tests
registry = "https://registry.npmjs.org/"
exact = true
prefer = "offline"

[test]
# Test Discovery
root = "src"
preload = ["./test-setup.ts", "./global-mocks.ts"]

# Execution Settings
timeout = 10000
smol = true
randomize = true
seed = 2444615283
rerunEach = 1

# Coverage Configuration
coverage = true
coverageReporter = ["text", "lcov", "html"]
coverageDir = "./coverage"
coverageThreshold = { lines = 0.85, functions = 0.90, statements = 0.80, branches = 0.75 }
coverageSkipTestFiles = true
coveragePathIgnorePatterns = [
  "**/*.spec.ts",
  "**/*.test.ts",
  "**/*.e2e.ts",
  "*.config.js",
  "*.config.ts",
  "webpack.config.*",
  "vite.config.*",
  "dist/**",
  "build/**",
  ".next/**",
  "generated/**",
  "**/*.generated.ts",
  "vendor/**",
  "third-party/**",
  "src/utils/constants.ts",
  "src/types/**"
]
coverageIgnoreSourcemaps = false

# Concurrent Execution
concurrentTestGlob = "**/concurrent-*.test.ts"

# Reporter Configuration
[test.reporter]
junit = "./reports/junit.xml"

# CI-specific configuration
[test.ci]
coverage = true
coverageThreshold = { lines = 0.90, functions = 0.95, statements = 0.85, branches = 0.80 }
timeout = 30000
rerunEach = 3
smol = false
```

## 📁 **Test Setup Files**

### **test-setup.ts**
```typescript title="test-setup.ts"
#!/usr/bin/env bun

/**
 * Global test setup for WebSocket Proxy API
 * Configures test environment and shared utilities
 */

import { beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { BunProxyServer, ProxyServerConfig } from "./index";

// Global test state
let testServers: BunProxyServer[] = [];
let testConfigs: ProxyServerConfig[] = [];

// Test environment configuration
const TEST_ENVIRONMENT = {
  NODE_ENV: "test",
  API_URL: "http://localhost:3001",
  DATABASE_URL: "postgresql://localhost:5432/test_db",
  LOG_LEVEL: "error",
  WS_PORT: 3002,
  MAX_CONNECTIONS: 100,
};

beforeAll(async () => {
  console.log("🚀 Setting up global test environment...");

  // Set environment variables
  Object.entries(TEST_ENVIRONMENT).forEach(([key, value]) => {
    process.env[key] = value;
  });

  // Set up test database
  await setupTestDatabase();

  // Initialize test fixtures
  await initializeTestFixtures();

  console.log("✅ Global test environment ready");
});

afterAll(async () => {
  console.log("🧹 Cleaning up global test environment...");

  // Clean up test servers
  for (const server of testServers) {
    if (server.isRunning()) {
      await server.stop();
    }
  }
  testServers = [];

  // Clean up test configurations
  testConfigs = [];

  // Clean up database
  await cleanupTestDatabase();

  // Reset environment variables
  Object.keys(TEST_ENVIRONMENT).forEach(key => {
    delete process.env[key];
  });

  console.log("✅ Global test environment cleaned up");
});

beforeEach(() => {
  // Reset test state before each test
  testServers = [];
  testConfigs = [];
});

afterEach(async () => {
  // Clean up after each test
  for (const server of testServers) {
    if (server.isRunning()) {
      await server.stop();
    }
  }
  testServers = [];
  testConfigs = [];
});

// Helper functions for test setup
async function setupTestDatabase() {
  // Mock database setup for WebSocket proxy testing
  console.log("📊 Setting up test database...");
}

async function cleanupTestDatabase() {
  // Mock database cleanup
  console.log("📊 Cleaning up test database...");
}

async function initializeTestFixtures() {
  // Initialize test data and fixtures
  console.log("📦 Initializing test fixtures...");
}

// Export utilities for use in tests
export const testUtils = {
  createTestServer: (config?: Partial<ProxyServerConfig>) => {
    const defaultConfig = {
      targetUrl: "ws://localhost:8080/ws",
      listenPort: parseInt(process.env.WS_PORT || "3002"),
      debug: true,
      maxConnections: parseInt(process.env.MAX_CONNECTIONS || "100"),
      idleTimeout: 60000,
    };

    const finalConfig = new ProxyServerConfig({ ...defaultConfig, ...config });
    const server = new BunProxyServer(finalConfig);

    testConfigs.push(finalConfig);
    testServers.push(server);

    return { server, config: finalConfig };
  },

  getTestEnvironment: () => TEST_ENVIRONMENT,

  resetTestState: () => {
    testServers = [];
    testConfigs = [];
  },
};
```

### **global-mocks.ts**
```typescript title="global-mocks.ts"
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
    { model: "Test CPU", speed: 2400, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0, total: 0 } }
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
    mock.module.mockClear();
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
```

## 📊 **Environment Configuration**

### **.env.test**
```ini title=".env.test"
NODE_ENV=test
API_URL=http://localhost:3001
WS_PORT=3002
DATABASE_URL=postgresql://localhost:5432/test_db
LOG_LEVEL=error
MAX_CONNECTIONS=100
IDLE_TIMEOUT=60000
HEARTBEAT_INTERVAL=30000
DEBUG=true
COVERAGE_ENABLED=true
```

### **.env.ci**
```ini title=".env.ci"
NODE_ENV=test
API_URL=http://localhost:3001
WS_PORT=3002
DATABASE_URL=postgresql://test-postgres:5432/ci_test_db
LOG_LEVEL=error
MAX_CONNECTIONS=50
IDLE_TIMEOUT=30000
HEARTBEAT_INTERVAL=15000
DEBUG=false
COVERAGE_ENABLED=true
CI=true
PARALLEL_TESTS=true
```

## 🚀 **Test Execution Scripts**

### **package.json Scripts**
```json title="package.json"
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "test:ci": "bun test --config=ci --coverage --reporter=junit --reporter-outfile=./reports/junit.xml",
    "test:concurrent": "bun test --concurrent",
    "test:debug": "bun test --debug --verbose",
    "test:smol": "bun test --smol",
    "test:random": "bun test --randomize",
    "test:retry": "bun test --rerun-each=3",
    "test:specific": "bun test enhanced-naming.test.ts",
    "test:preload": "bun test --preload ./test-setup.ts --preload ./global-mocks.ts",
    "test:env": "bun test --env-file=.env.test",
    "test:timeout": "bun test --timeout 15000",
    "test:report": "bun test --reporter=junit --reporter-outfile=./reports/test-results.xml",
    "test:coverage-html": "bun test --coverage --coverage-reporter=html --coverage-dir=./coverage",
    "test:coverage-threshold": "bun test --coverage --coverage-threshold=80",
    "test:dry-run": "bun test --dry-run",
    "test:verbose": "bun test --verbose",
    "test:only": "bun test --only",
    "test:todo": "bun test --todo",
    "test:update-snapshots": "bun test --update-snapshots"
  }
}
```

## 📈 **Coverage Configuration**

### **Coverage Threshold Strategy**

```typescript title="coverage-config.ts"
/**
 * Coverage configuration and thresholds
 */

export const COVERAGE_THRESHOLDS = {
  // Development environment - more lenient
  development: {
    lines: 0.70,
    functions: 0.75,
    statements: 0.70,
    branches: 0.65,
  },

  // CI environment - stricter requirements
  ci: {
    lines: 0.90,
    functions: 0.95,
    statements: 0.85,
    branches: 0.80,
  },

  // Production environment - strictest requirements
  production: {
    lines: 0.95,
    functions: 0.98,
    statements: 0.95,
    branches: 0.90,
  },
};

export const getCoverageThreshold = (environment: string) => {
  return COVERAGE_THRESHOLDS[environment as keyof typeof COVERAGE_THRESHOLDS] || COVERAGE_THRESHOLDS.development;
};
```

### **Coverage Ignore Patterns**

```typescript title="coverage-ignore-patterns.ts"
/**
 * Coverage ignore patterns for different file types
 */

export const COVERAGE_IGNORE_PATTERNS = [
  // Test files
  "**/*.test.ts",
  "**/*.test.js",
  "**/*.spec.ts",
  "**/*.spec.js",
  "**/*.e2e.ts",
  "**/*.e2e.js",

  // Configuration files
  "*.config.ts",
  "*.config.js",
  "webpack.config.*",
  "vite.config.*",
  "rollup.config.*",
  "tsconfig.json",
  "bunfig.toml",

  // Build outputs
  "dist/**",
  "build/**",
  ".next/**",
  ".nuxt/**",
  "out/**",

  // Generated code
  "generated/**",
  "**/*.generated.ts",
  "**/*.d.ts",

  // Third-party and vendor
  "node_modules/**",
  "vendor/**",
  "third-party/**",

  // Documentation and examples
  "docs/**",
  "examples/**",
  "**/*.md",

  // Utilities that don't need testing
  "src/utils/constants.ts",
  "src/types/**",
  "src/interfaces/**",

  // Mock and test utilities
  "**/mocks/**",
  "**/fixtures/**",
  "**/test-utils/**",
];
```

## 🔄 **CI/CD Integration**

### **GitHub Actions Configuration**
```yaml title=".github/workflows/test.yml"
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
    - uses: actions/checkout@v3

    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest

    - name: Install dependencies
      run: bun install --frozen-lockfile

    - name: Run tests with coverage
      run: bun test:ci

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella

    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results
        path: |
          ./reports/
          ./coverage/
```

### **Docker Test Configuration**
```dockerfile title="Dockerfile.test"
FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Set test environment
ENV NODE_ENV=test
ENV LOG_LEVEL=error

# Run tests with coverage
RUN bun test --coverage --coverage-reporter=lcov --coverage-threshold=80

# Expose coverage reports
VOLUME ["/app/coverage"]
```

## 🔍 **Debugging and Troubleshooting**

### **Test Debugging Commands**
```bash
# Show effective configuration
bun test --dry-run

# Verbose output to see configuration loading
bun test --verbose

# Debug specific test file
bun test --debug enhanced-naming.test.ts

# Run with memory profiling
bun test --smol --verbose

# Check coverage details
bun test --coverage --coverage-reporter=text --coverage-threshold=80
```

### **Common Issues and Solutions**

#### **1. Path Resolution Issues**
```toml
# Correct - relative to config file
preload = ["./test-setup.ts"]

# Incorrect - might not resolve correctly
preload = ["test-setup.ts"]
```

#### **2. Coverage Threshold Not Met**
```bash
# Check current coverage
bun test --coverage --coverage-reporter=text

# Update thresholds appropriately
# Edit bunfig.toml coverageThreshold values
```

#### **3. Memory Issues in CI**
```toml
# Enable smol mode for memory-constrained environments
[test.ci]
smol = true
timeout = 60000
rerunEach = 1
```

#### **4. Test Discovery Problems**
```toml
# Specify explicit test root
[test]
root = "src"

# Or use preload to ensure proper setup
preload = ["./test-setup.ts"]
```

## 📚 **Best Practices**

### **Configuration Management**
1. **Environment-specific configs** - Use `[test.ci]`, `[test.dev]` sections
2. **Path consistency** - Use relative paths from config file location
3. **Type safety** - Ensure numeric values aren't quoted
4. **Documentation** - Comment complex configuration options

### **Coverage Strategy**
1. **Gradual thresholds** - Start lenient, increase over time
2. **Meaningful ignores** - Exclude truly untestable code
3. **Branch coverage** - Focus on critical paths
4. **Integration coverage** - Test real-world scenarios

### **Test Organization**
1. **Logical grouping** - Use `describe` blocks effectively
2. **Clear naming** - Descriptive test and suite names
3. **Setup/teardown** - Proper use of lifecycle hooks
4. **Mock management** - Centralized mock configuration

### **Performance Optimization**
1. **Concurrent testing** - Use `concurrentTestGlob` for safe parallelization
2. **Memory management** - Enable `smol` mode when needed
3. **Timeout tuning** - Appropriate timeouts for test complexity
4. **Selective testing** - Use `--only` for focused debugging

## 🎯 **Configuration Validation**

### **Configuration Check Script**
```typescript title="validate-config.ts"
#!/usr/bin/env bun

/**
 * Validate bunfig.toml test configuration
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface TestConfig {
  root?: string;
  preload?: string[];
  timeout?: number;
  smol?: boolean;
  coverage?: boolean;
  coverageThreshold?: number | Record<string, number>;
  coveragePathIgnorePatterns?: string[];
  concurrentTestGlob?: string;
  randomize?: boolean;
  seed?: number;
  rerunEach?: number;
}

function validateConfig(config: TestConfig) {
  const errors: string[] = [];

  // Validate timeout
  if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
    errors.push("Timeout should be between 1000ms and 300000ms");
  }

  // Validate coverage threshold
  if (config.coverageThreshold) {
    if (typeof config.coverageThreshold === "number") {
      if (config.coverageThreshold < 0 || config.coverageThreshold > 1) {
        errors.push("Coverage threshold must be between 0 and 1");
      }
    } else {
      Object.values(config.coverageThreshold).forEach(value => {
        if (value < 0 || value > 1) {
          errors.push("All coverage thresholds must be between 0 and 1");
        }
      });
    }
  }

  // Validate preload files
  if (config.preload) {
    config.preload.forEach(file => {
      try {
        readFileSync(resolve(file));
      } catch {
        errors.push(`Preload file not found: ${file}`);
      }
    });
  }

  return errors;
}

// Run validation
try {
  const configContent = readFileSync("bunfig.toml", "utf-8");
  // Simple TOML parsing (in real implementation, use a proper TOML parser)
  const config = parseToml(configContent);
  const errors = validateConfig(config.test || {});

  if (errors.length > 0) {
    console.error("❌ Configuration validation failed:");
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  } else {
    console.log("✅ Configuration validation passed");
  }
} catch (error) {
  console.error("❌ Failed to validate configuration:", error);
  process.exit(1);
}
```

This comprehensive configuration provides a professional, production-ready testing setup for our WebSocket Proxy API project! 🎯
