# @duoplus/core

Enterprise-grade dependency injection and performance monitoring framework for Bun.js applications.

## Features

- 🔗 **Dependency Injection**: Production-hardened DI system with mock detection
- 📊 **Performance Monitoring**: Real-time metrics with circular buffer storage
- 🧪 **Testing Utilities**: Comprehensive mock dependency helpers
- 🚀 **Bun Native**: Optimized for Bun.js runtime

## Installation

```bash
bun add @duoplus/core
```

## Quick Start

```typescript
import { createMockDeps, PROD_DEPS, diMonitor } from '@duoplus/core';

// Use production dependencies
const deps = PROD_DEPS;
await deps.s3Write('bucket', 'key', data);

// Use mock dependencies for testing
const mockDeps = createMockDeps();
await mockDeps.s3Write('bucket', 'key', data);

// Monitor performance
diMonitor.record('myFunction', () => {
  // Your code here
});
```

## Packages

- `@duoplus/core/di` - Dependency injection framework
- `@duoplus/core/monitoring` - Performance monitoring
- `@duoplus/core/testing` - Testing utilities

## Documentation

See the [full documentation](https://duoplus.com/core) for detailed usage examples.

## License

MIT © DuoPlus Enterprise Team
