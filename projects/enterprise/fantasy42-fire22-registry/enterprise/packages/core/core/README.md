# Crystal Clear Architecture - Core DDD Infrastructure

## Overview

This document describes the core Domain-Driven Design (DDD) infrastructure that
provides standardized patterns for error handling, logging, and testing across
the entire Crystal Clear Architecture system.

## 🏗️ Architecture Components

### 1. Error Handling System (`errors/domain-errors.ts`)

**Purpose**: Standardized error handling with domain context and severity
levels.

#### Key Features:

- **Domain-Specific Errors**: Context-aware error classes
- **Error Codes**: Standardized error classification
- **HTTP Mapping**: Automatic HTTP status code conversion
- **Error Boundaries**: Graceful error handling patterns

#### Usage Example:

```typescript
import {
  DomainError,
  ValidationError,
  BusinessRuleViolationError,
} from './errors/domain-errors';

// Create domain-specific errors
const errorFactory = new DomainErrorFactory('vip');

try {
  // Business logic
  if (amount <= 0) {
    throw errorFactory.validationError(
      'Amount must be positive',
      'amount',
      amount
    );
  }

  if (userTier === 'bronze') {
    throw errorFactory.businessRuleViolation(
      'Platinum tier required',
      'tier_restriction'
    );
  }
} catch (error) {
  // Error is automatically logged and handled
  await ErrorHandler.getInstance().handle(error);
}
```

#### Error Classes:

- `DomainError` - Base error class
- `ValidationError` - Input validation failures
- `EntityNotFoundError` - Missing entities
- `BusinessRuleViolationError` - Business rule violations
- `InfrastructureError` - External service failures
- `AuthenticationError` - Auth failures
- `AuthorizationError` - Permission failures

### 2. Logging System (`logging/domain-logger.ts`)

**Purpose**: Structured, domain-aware logging with context and categorization.

#### Key Features:

- **Domain Context**: Automatic domain tagging
- **Log Categories**: Business, Infrastructure, Security, Performance, Audit
- **Multiple Transports**: Console, File, Buffer
- **Performance Tracking**: Timing and metrics
- **Correlation IDs**: Request tracing

#### Usage Example:

```typescript
import { DomainLogger, LoggerFactory } from './logging/domain-logger';

// Create domain-specific logger
const logger = LoggerFactory.create('vip');

// Business logging
await logger.business('VIP client created', {
  operation: 'createVipClient',
  entityId: clientId,
  userId: userId,
});

// Performance tracking
const result = await logger.withTiming(
  () => vipService.calculateCommission(clientId, amount),
  'calculateCommission',
  { entityId: clientId }
);

// Error logging
await logger.infrastructureError('Database connection failed', dbError, {
  operation: 'saveVipClient',
});
```

#### Log Categories:

- **Business**: Domain operations and events
- **Infrastructure**: External services and databases
- **Security**: Authentication and authorization
- **Performance**: Timing and metrics
- **Audit**: Important state changes
- **System**: General system operations

### 3. Testing Infrastructure (`testing/test-infrastructure.ts`)

**Purpose**: Testing-ready code with comprehensive mocking and assertion
utilities.

#### Key Features:

- **Test Setup**: Pre-configured test environments
- **Mock Services**: Database, HTTP, Event Bus
- **Domain Fixtures**: Pre-built test data
- **Custom Assertions**: Domain-specific validations
- **Error Testing**: Easy error scenario testing

#### Usage Example:

```typescript
import {
  TestSetup,
  TestFixtures,
  DomainAssertions,
} from './testing/test-infrastructure';

describe('VipService', () => {
  let testSetup: TestSetup;
  let vipService: VipService;

  beforeEach(() => {
    testSetup = new TestSetup('vip');
    vipService = VipServiceFactory.create(testSetup.database);
  });

  it('should create VIP client successfully', async () => {
    // Arrange
    const clientData = TestFixtures.createVipClient({
      userId: 'test-user',
      tier: 'gold',
    });

    // Act
    const result = await testSetup.expectAsync(() =>
      vipService.createVipClient(clientData)
    );

    // Assert
    expect(result.tier).toBe('gold');
    testSetup.expectLog('VIP client created successfully');
    testSetup.expectEvent('vip.client.created');
  });

  it('should handle validation errors', async () => {
    // Act & Assert
    await testSetup.expectAsync(
      () => vipService.createVipClient(invalidData),
      undefined,
      ErrorCode.VALIDATION_ERROR
    );

    // Verify error details
    const error = testSetup.errorHandler.getLastError();
    expect(error?.details?.field).toBe('commission');
  });
});
```

## 🎯 DDD Patterns Implementation

### 1. Error Handling Patterns

#### Error Boundary Pattern:

```typescript
// Graceful error handling with automatic logging
const result = await ErrorBoundary.execute(
  () => vipService.createVipClient(clientData),
  { domain: 'vip', operation: 'createVipClient' }
);
```

#### Error Factory Pattern:

```typescript
// Consistent error creation across domains
const errorFactory = new DomainErrorFactory('vip');

// Standardized error messages and codes
throw errorFactory.businessRuleViolation(
  'Tier upgrade required',
  'tier_constraint'
);
```

### 2. Logging Patterns

#### Domain Logger Pattern:

```typescript
// Domain-specific logging with context
const logger = LoggerFactory.create('vip');

await logger.business('Operation completed', {
  entityId: clientId,
  userId: userId,
  duration: 150, // ms
});
```

#### Performance Tracking Pattern:

```typescript
// Automatic timing and metrics
const result = await logger.withTiming(
  () => expensiveOperation(),
  'expensiveOperation',
  { entityId: id }
);
```

### 3. Testing Patterns

#### Test Setup Pattern:

```typescript
// Pre-configured test environment
const testSetup = new TestSetup('vip');
// Includes: logger, errorHandler, database, httpClient, eventBus
```

#### Domain Assertions Pattern:

```typescript
// Domain-specific validation
DomainAssertions.assertValidEmail(email);
DomainAssertions.assertPositiveAmount(amount);
DomainAssertions.assertValidDate(startTime);
```

## 📋 Implementation Guide

### 1. Setting Up a New Domain

```typescript
// 1. Create domain directory
src/domains/your-domain/

// 2. Implement domain service
import { DomainLogger, LoggerFactory } from '../../core/logging/domain-logger';
import { DomainErrorFactory } from '../../core/errors/domain-errors';

export class YourDomainService {
  private logger = LoggerFactory.create('your-domain');
  private errorFactory = new DomainErrorFactory('your-domain');

  async yourBusinessOperation(data: any) {
    return await ErrorBoundary.execute(async () => {
      await this.logger.business('Starting operation', {
        operation: 'yourBusinessOperation',
        data: data.id
      });

      // Business logic with proper error handling
      if (!this.isValid(data)) {
        throw this.errorFactory.validationError('Invalid data', 'data', data);
      }

      const result = await this.process(data);

      await this.logger.business('Operation completed', {
        operation: 'yourBusinessOperation',
        result: result.id
      });

      return result;
    }, {
      domain: 'your-domain',
      operation: 'yourBusinessOperation',
      entityId: data.id
    });
  }
}
```

### 2. Writing Domain Tests

```typescript
import {
  TestSetup,
  TestFixtures,
} from '../../core/testing/test-infrastructure';

describe('YourDomainService', () => {
  let testSetup: TestSetup;
  let service: YourDomainService;

  beforeEach(() => {
    testSetup = new TestSetup('your-domain');
    service = new YourDomainService(testSetup.database);
  });

  it('should handle success case', async () => {
    const testData = TestFixtures.createYourEntity();

    const result = await testSetup.expectAsync(() =>
      service.yourBusinessOperation(testData)
    );

    expect(result).toBeDefined();
    testSetup.expectLog('Operation completed');
  });

  it('should handle error case', async () => {
    await testSetup.expectAsync(
      () => service.yourBusinessOperation(invalidData),
      undefined,
      ErrorCode.VALIDATION_ERROR
    );
  });
});
```

### 3. Configuring Logging

```typescript
import { DomainLogger, LoggerConfig } from './core/logging/domain-logger';

// Development setup
LoggerConfig.setupDevelopment();

// Production setup
LoggerConfig.setupProduction('./logs/app.log');
```

## 🔧 Configuration

### Environment Variables

```bash
# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/app.log
LOG_FORMAT=json

# Error Handling
ERROR_HANDLING_ENABLED=true
ERROR_LOGGING_ENABLED=true
ERROR_METRICS_ENABLED=true
```

### Logger Configuration

```typescript
// Configure transports
const logger = DomainLogger.getInstance();
logger.addTransport(new ConsoleTransport());
logger.addTransport(new FileTransport('./logs/app.log'));

// Set logging level
logger.setMinLevel(LogLevel.INFO);

// Set global context
logger.setDefaultContext({
  environment: process.env.NODE_ENV || 'development',
  service: 'crystal-clear-architecture',
});
```

## 📊 Monitoring & Metrics

### Error Metrics

- Total errors by domain
- Error rate by severity
- Most common error types
- Error resolution time

### Performance Metrics

- Operation duration by domain
- Success/failure rates
- Resource usage patterns
- Peak usage times

### Business Metrics

- Domain operation frequency
- Business rule violations
- User journey completion rates
- System utilization patterns

## 🎯 Best Practices

### 1. Error Handling

- Always use domain-specific error factories
- Provide detailed context in error messages
- Use appropriate error severity levels
- Log errors with correlation IDs

### 2. Logging

- Use domain-specific loggers
- Include relevant context in log entries
- Use appropriate log categories
- Track performance metrics for critical operations

### 3. Testing

- Use TestSetup for consistent test environments
- Test both success and error scenarios
- Verify logging behavior
- Use domain fixtures for test data

### 4. Performance

- Use `withTiming` for performance-critical operations
- Monitor error rates and response times
- Implement circuit breakers for external services
- Cache frequently accessed data

## 🚀 Advanced Features

### Custom Error Handlers

```typescript
import { ErrorHandler } from './core/errors/domain-errors';

ErrorHandler.getInstance().registerHandler(
  ErrorCode.EXTERNAL_SERVICE_ERROR,
  async error => {
    // Custom retry logic
    await retryWithBackoff(error.context.operation);
  }
);
```

### Custom Log Transports

```typescript
import { LogTransport } from './core/logging/domain-logger';

class DatabaseTransport implements LogTransport {
  async write(entry: LogEntry): Promise<void> {
    // Store logs in database for analysis
    await db.insert('logs', entry);
  }
}
```

### Custom Test Utilities

```typescript
import { TestHttpClient } from './core/testing/test-infrastructure';

class CustomHttpClient extends TestHttpClient {
  // Add domain-specific mocking capabilities
  mockVipApi(): void {
    this.mockResponse('/api/vip/clients', [{ id: 'vip-1', tier: 'platinum' }]);
  }
}
```

## 📚 Examples in Codebase

- **VIP Service**: Complete DDD implementation example
- **Error Handling**: Comprehensive error patterns
- **Logging**: Domain-aware logging examples
- **Testing**: Full test suite with best practices

## 🔗 Related Documentation

- [Domain Models](./domains/README.md)
- [API Design](./api/README.md)
- [Testing Guide](./testing/README.md)
- [Performance Monitoring](./monitoring/README.md)

---

**Crystal Clear Architecture - DDD Infrastructure v1.0**

_Standardized patterns for scalable, maintainable domain-driven systems_
