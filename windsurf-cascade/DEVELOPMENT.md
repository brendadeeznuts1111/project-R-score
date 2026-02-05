# Development Guidelines

This document outlines the development standards, best practices, and guidelines for the Odds Protocol project.

## 🎯 Core Principles

### 1. Performance First
- **Target**: 700k+ messages/second WebSocket throughput
- **Latency**: Sub-millisecond response times
- **Memory**: Efficient memory usage with proper cleanup
- **CPU**: Optimize for Bun's performance characteristics

### 2. Type Safety
- **Strict TypeScript**: Enable all strict type checks
- **No `any` Types**: Use specific types or `unknown`
- **Interface Definitions**: Comprehensive type definitions
- **Generic Types**: Leverage generics for reusable code

### 3. Code Quality
- **Readability**: Code should be self-documenting
- **Maintainability**: Easy to modify and extend
- **Testability**: Designed for comprehensive testing
- **Documentation**: Clear, concise documentation

### 4. Security
- **Input Validation**: Validate all external inputs
- **Error Handling**: Secure error handling practices
- **Authentication**: Proper authentication and authorization
- **Data Protection**: Protect sensitive data

## 🏗️ Architecture Standards

### Package Structure

```
packages/package-name/
├── src/
│   ├── index.ts          # Main entry point
│   ├── core/             # Core business logic
│   ├── utils/            # Utility functions
│   ├── types/            # Type definitions
│   ├── errors/           # Error classes
│   ├── config/           # Configuration
│   └── tests/            # Test files
├── dist/                 # Compiled output
├── docs/                 # Documentation
├── examples/             # Usage examples
├── package.json          # Package configuration
├── tsconfig.json         # TypeScript configuration
└── README.md             # Package documentation
```

### Module Organization

#### **Core Modules**
```typescript
// Core business logic
export class OddsCalculator {
  calculate(input: OddsInput): OddsResult {
    // Implementation
  }
}

// Utility functions
export const formatOdds = (odds: number): string => {
  // Implementation
};

// Type definitions
export interface OddsInput {
  home: number;
  away: number;
  draw?: number;
}

// Error handling
export class OddsCalculationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}
```

#### **Index File Structure**
```typescript
// src/index.ts
export { OddsCalculator, formatOdds } from './core';
export { OddsInput, OddsResult } from './types';
export { OddsCalculationError } from './errors';
export * from './utils';
```

## 📝 Code Standards

### TypeScript Guidelines

#### **Type Definitions**
```typescript
// ✅ Good: Specific types with validation
interface WebSocketMessage {
  type: 'odds_update' | 'event_start' | 'event_end';
  timestamp: number;
  data: unknown;
}

// ❌ Bad: Using any
function handleMessage(message: any) {
  // Implementation
}

// ✅ Good: Generic types for reusability
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
```

#### **Function Signatures**
```typescript
// ✅ Good: Clear parameter and return types
async function fetchOdds(
  eventId: string,
  options?: FetchOptions
): Promise<ApiResponse<OddsData>> {
  // Implementation
}

// ✅ Good: Union types for specific values
type SportType = 'soccer' | 'basketball' | 'tennis' | 'hockey';

// ✅ Good: Branded types for validation
type EventId = string & { readonly brand: unique symbol };
```

#### **Error Handling**
```typescript
// ✅ Good: Specific error types
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response?: Response
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

// ✅ Good: Result type for error handling
type Result<T, E = Error> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

async function safeFetch<T>(url: string): Promise<Result<T>> {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

### Performance Guidelines

#### **Memory Management**
```typescript
// ✅ Good: Proper cleanup
class ConnectionManager {
  private connections = new Map<string, WebSocket>();

  addConnection(id: string, ws: WebSocket) {
    this.connections.set(id, ws);
    
    // Set up cleanup
    ws.addEventListener('close', () => {
      this.connections.delete(id);
    });
  }

  cleanup() {
    for (const [id, ws] of this.connections) {
      ws.close();
      this.connections.delete(id);
    }
  }
}
```

#### **Async Patterns**
```typescript
// ✅ Good: Proper async/await usage
async function processBatch<T>(items: T[]): Promise<T[]> {
  const results = await Promise.all(
    items.map(item => processItem(item))
  );
  return results;
}

// ✅ Good: Streaming for large datasets
async function processLargeFile(filePath: string): Promise<void> {
  const stream = fs.createReadStream(filePath);
  
  for await (const chunk of stream) {
    await processChunk(chunk);
  }
}
```

#### **Caching Strategies**
```typescript
// ✅ Good: LRU cache for expensive operations
class OddsCache {
  private cache = new Map<string, { data: OddsData; expiry: number }>();
  private readonly ttl = 5000; // 5 seconds

  get(key: string): OddsData | null {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  set(key: string, data: OddsData): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.ttl
    });
  }
}
```

## 🧪 Testing Standards

### Test Structure

```typescript
// Test file: src/tests/odds-calculator.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { OddsCalculator } from '../core/odds-calculator';

describe('OddsCalculator', () => {
  let calculator: OddsCalculator;

  beforeEach(() => {
    calculator = new OddsCalculator();
  });

  afterEach(() => {
    calculator.cleanup();
  });

  describe('calculate', () => {
    it('should calculate correct odds for valid input', () => {
      const input = { home: 2.0, away: 3.5, draw: 2.8 };
      const result = calculator.calculate(input);

      expect(result.homeWin).toBeCloseTo(0.36, 2);
      expect(result.awayWin).toBeCloseTo(0.21, 2);
      expect(result.draw).toBeCloseTo(0.26, 2);
      expect(result.total).toBeCloseTo(1.0, 2);
    });

    it('should handle edge cases', () => {
      expect(() => calculator.calculate({ home: 0, away: 0 }))
        .toThrow('Invalid odds values');
    });

    it('should maintain mathematical properties', () => {
      const results = Array.from({ length: 100 }, () => {
        const input = {
          home: Math.random() * 5 + 1,
          away: Math.random() * 5 + 1,
          draw: Math.random() * 5 + 1
        };
        return calculator.calculate(input);
      });

      results.forEach(result => {
        expect(result.total).toBeLessThanOrEqual(1.01);
        expect(result.total).toBeGreaterThanOrEqual(0.99);
      });
    });
  });
});
```

### Property-Based Testing

```typescript
import { fc } from 'fast-check';

describe('OddsCalculator Properties', () => {
  it('should maintain probability conservation', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1.01, max: 10 }),
        fc.float({ min: 1.01, max: 10 }),
        fc.float({ min: 1.01, max: 10 }),
        (home, away, draw) => {
          const calculator = new OddsCalculator();
          const result = calculator.calculate({ home, away, draw });
          
          return result.total >= 0.99 && result.total <= 1.01;
        }
      ),
      { numRuns: 1000, seed: 42 }
    );
  });
});
```

### Performance Testing

```typescript
describe('Performance', () => {
  it('should handle 100k calculations within time limit', () => {
    const calculator = new OddsCalculator();
    const input = { home: 2.0, away: 3.5, draw: 2.8 };
    
    const start = performance.now();
    
    for (let i = 0; i < 100000; i++) {
      calculator.calculate(input);
    }
    
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(1000); // 1 second
    calculator.cleanup();
  });

  it('should maintain memory efficiency', () => {
    const calculator = new OddsCalculator();
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Perform many operations
    for (let i = 0; i < 10000; i++) {
      calculator.calculate({
        home: Math.random() * 5 + 1,
        away: Math.random() * 5 + 1,
        draw: Math.random() * 5 + 1
      });
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Should not increase by more than 10MB
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    calculator.cleanup();
  });
});
```

## 🔒 Security Guidelines

### Input Validation

```typescript
// ✅ Good: Comprehensive input validation
import { z } from 'zod';

const OddsInputSchema = z.object({
  home: z.number().min(1.01).max(10),
  away: z.number().min(1.01).max(10),
  draw: z.number().min(1.01).max(10).optional(),
});

export function validateOddsInput(input: unknown): OddsInput {
  return OddsInputSchema.parse(input);
}
```

### Authentication & Authorization

```typescript
// ✅ Good: JWT-based authentication
export class AuthMiddleware {
  async authenticate(token: string): Promise<User | null> {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!);
      return await this.getUserById(payload.sub);
    } catch (error) {
      return null;
    }
  }

  authorize(user: User, requiredRole: Role): boolean {
    return user.roles.includes(requiredRole);
  }
}
```

## 📊 Monitoring & Logging

### Structured Logging

```typescript
import { createLogger } from 'winston';

export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});

// Usage
logger.info('Odds calculated', {
  eventId,
  input,
  result,
  duration: performance.now() - start
});
```

### Performance Monitoring

```typescript
export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  recordOperation(name: string, duration: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);
  }

  getStats(name: string) {
    const measurements = this.metrics.get(name) || [];
    if (measurements.length === 0) return null;

    return {
      count: measurements.length,
      avg: measurements.reduce((a, b) => a + b) / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      p95: this.percentile(measurements, 0.95)
    };
  }

  private percentile(values: number[], p: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }
}
```

## 📋 Code Review Checklist

### Functionality
- [ ] Code implements the requirements correctly
- [ ] Edge cases are handled properly
- [ ] Error handling is comprehensive
- [ ] Performance requirements are met

### Code Quality
- [ ] Code is readable and maintainable
- [ ] Follows project coding standards
- [ ] Proper TypeScript types are used
- [ ] No code duplication

### Testing
- [ ] Tests cover all functionality
- [ ] Tests are well-structured and clear
- [ ] Performance tests are included where relevant
- [ ] Property tests for complex algorithms

### Security
- [ ] Input validation is implemented
- [ ] No security vulnerabilities
- [ ] Sensitive data is protected
- [ ] Authentication/authorization is proper

### Documentation
- [ ] Code is well-documented
- [ ] API documentation is updated
- [ ] README files are updated
- [ ] Examples are provided

## 🚀 Deployment Guidelines

### Build Process
```bash
# Development build
bun run build

# Production build
bun run build:prod

# Standalone binary
bun run build:standalone
```

### Environment Configuration
```typescript
// config/production.ts
export const productionConfig = {
  server: {
    port: parseInt(process.env.API_PORT || '3000'),
    host: '0.0.0.0'
  },
  database: {
    url: process.env.DATABASE_URL,
    pool: {
      min: 10,
      max: 20
    }
  },
  logging: {
    level: 'warn',
    format: 'json'
  }
};
```

### Health Checks
```typescript
export class HealthChecker {
  async checkHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkWebSocket()
    ]);

    return {
      status: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'unhealthy',
      checks: checks.map((c, i) => ({
        name: ['database', 'redis', 'websocket'][i],
        status: c.status === 'fulfilled' ? 'pass' : 'fail',
        error: c.status === 'rejected' ? c.reason.message : undefined
      })),
      timestamp: new Date().toISOString()
    };
  }
}
```

---

These guidelines ensure high-quality, performant, and maintainable code for the Odds Protocol project.
