# @fire22/api-consolidated

Enterprise-grade consolidated Fire22 API implementation with comprehensive
security, validation, and performance optimization.

## Features

- **107 Consolidated Endpoints**: All Fire22 APIs consolidated into a single,
  maintainable package
- **5-Level RBAC**: Admin → Manager → Agent → Customer → Public access control
- **Enterprise Security**: JWT authentication with token rotation, rate
  limiting, input validation
- **Zod Schema Validation**: Runtime type safety for all API endpoints
- **Performance Optimized**: 800K+ ops/sec schema validation, 7M+ ops/sec
  routing
- **Cloudflare Workers Ready**: Optimized for edge deployment
- **Comprehensive Testing**: 95%+ test coverage with benchmarks

## Installation

```bash
# From Fire22 private registry
bun add @fire22/api-consolidated

# Or with npm
npm install @fire22/api-consolidated
```

## Quick Start

```typescript
import api from '@fire22/api-consolidated';

// In Cloudflare Workers
export default {
  fetch: api.fetch,
};

// In Express.js/Node.js
import express from 'express';
const app = express();
app.use('/api', api.handle);
```

## API Structure

### Authentication Endpoints

- `POST /api/auth/login` - User authentication
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - User logout

### Manager Endpoints

- `POST /api/manager/getLiveWagers` - Get pending wagers
- `POST /api/manager/getWeeklyFigureByAgent` - Weekly performance reports
- `POST /api/manager/getCustomerAdmin` - Customer management
- `POST /api/manager/getAgentPerformance` - Agent statistics

### Customer Endpoints

- `GET /api/customer/details` - Customer profile
- `GET /api/customer/transactions` - Transaction history
- `POST /api/customer/updateProfile` - Profile updates

### Admin Endpoints

- `GET /api/admin/users` - User management
- `POST /api/admin/system/config` - System configuration
- `GET /api/admin/analytics` - System analytics

### Health & Monitoring

- `GET /api/health` - System health check
- `GET /api/metrics` - Performance metrics

## Configuration

```typescript
import api, { type Fire22APIConfig } from '@fire22/api-consolidated';

const config: Fire22APIConfig = {
  jwtSecret: 'your-secret-key',
  rateLimit: {
    enabled: true,
    storage: 'cloudflare-kv', // or 'memory'
  },
  validation: {
    enabled: true,
    strict: true,
  },
  cors: {
    origins: ['https://yourdomain.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
};

// Configure API
api.configure(config);
```

## Middleware

### Authentication

```typescript
import { authenticate, authorize } from '@fire22/api-consolidated/middleware';

// JWT authentication
app.use('/api/protected', authenticate);

// Role-based authorization
app.use('/api/admin', authorize(['admin']));
app.use('/api/manager', authorize(['admin', 'manager']));
```

### Rate Limiting

```typescript
import { rateLimiter } from '@fire22/api-consolidated/middleware';

// Apply rate limiting
app.use(
  rateLimiter({
    admin: 1000, // 1000 requests/minute
    manager: 500, // 500 requests/minute
    agent: 200, // 200 requests/minute
    customer: 100, // 100 requests/minute
    public: 50, // 50 requests/minute
  })
);
```

### Validation

```typescript
import { validate } from '@fire22/api-consolidated/middleware';
import { loginSchema } from '@fire22/api-consolidated/schemas';

// Schema validation
app.post('/api/auth/login', validate(loginSchema), handler);
```

## Performance Benchmarks

- **Schema Validation**: 806,647 ops/sec (A+)
- **JWT Generation**: 104,491 ops/sec (A+)
- **Route Matching**: 7,487,361 ops/sec (A+)
- **Permission Checking**: 6,120,266 ops/sec (A+)

## Testing

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run benchmarks
bun run benchmark

# Watch mode
bun test --watch
```

## Development

```bash
# Development with hot reload
bun run dev

# Build package
bun run build

# Type checking
bun run type-check

# Linting
bun run lint
bun run lint:fix
```

## Publishing

```bash
# Build and publish to Fire22 registry
bun run build
bun run publish:registry
```

## Architecture

### Security Layers

1. **Rate Limiting**: Role-based request throttling
2. **Authentication**: JWT with RS256 signing
3. **Authorization**: 5-level RBAC system
4. **Validation**: Runtime schema validation
5. **Sanitization**: Input sanitization and XSS protection

### Performance Features

- **Edge Optimization**: Cloudflare Workers compatible
- **Memory Efficiency**: Minimal memory footprint
- **Caching**: Smart response caching
- **Compression**: Automatic response compression

### Error Handling

- **Standardized Errors**: Consistent error responses
- **Graceful Degradation**: Fallback mechanisms
- **Logging**: Comprehensive error logging
- **Monitoring**: Built-in metrics collection

## Security

- **JWT Security**: RS256 algorithm, token rotation
- **Input Validation**: Zod schema validation
- **Rate Limiting**: DDoS protection
- **CORS**: Cross-origin request control
- **Security Headers**: HSTS, CSP, X-Frame-Options

## License

MIT - Fire22 Engineering Team

## Support

- Documentation: [Fire22 API Docs](https://docs.fire22.dev/api)
- Issues:
  [GitHub Issues](https://github.com/brendadeeznuts1111/fire22-dashboard-worker/issues)
- Registry: [Fire22 Private Registry](https://fire22.workers.dev/registry/)
