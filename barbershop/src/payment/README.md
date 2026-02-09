# Payment Routing Module

Production-ready payment routing system with modular architecture for the Barbershop application.

## Features

- ✅ **Modular Architecture** - Separated concerns with dedicated classes
- ✅ **Robust Error Handling** - Comprehensive error handling with proper HTTP status codes
- ✅ **Health Monitoring** - Health check endpoints for system monitoring
- ✅ **Configuration Management** - Centralized environment configuration
- ✅ **Improved Redis Integration** - Connection pooling, retry logic, and error handling
- ✅ **Enhanced Logging** - Structured logging with file output for production
- ✅ **Rate Limiting** - Protection against API abuse
- ✅ **Input Validation** - Validation for all payment routing operations
- ✅ **Developer Experience** - Useful CLI tools for development and operations

## Architecture

```
payment/
├── config.ts          # Centralized configuration with validation
├── logger.ts          # Structured logging with file output
├── redis-manager.ts   # Redis connection pooling and retry logic
├── validator.ts       # Input validation utilities
├── rate-limiter.ts    # Rate limiting middleware
├── errors.ts          # Custom error classes
├── api-handler.ts     # API route handlers
├── server.ts          # Main server entry point
└── index.ts           # Module exports
```

## Quick Start

### Start the Server

```bash
# Using the startup script
bun run scripts/start-payment-server.ts start

# Or directly
bun run src/payment/server.ts
```

### Environment Variables

```bash
# Server
PAYMENT_PORT=3001
PAYMENT_HOST=0.0.0.0
NODE_ENV=production

# Redis
REDIS_URL=redis://localhost:6379
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=/tmp/payment-routing.log

# Security
PAYMENT_API_KEY=your-secret-api-key
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

## API Endpoints

### Health Checks
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health with Redis stats

### Payment Routes
- `GET /payment/routes` - List all routes
- `POST /payment/routes` - Create a route
- `GET /payment/routes/:id` - Get route details
- `PUT /payment/routes/:id` - Update a route
- `DELETE /payment/routes/:id` - Delete a route
- `PUT /payment/routes/reorder` - Change route priority

### Fallback Plans
- `GET /payment/fallbacks` - List all fallback plans
- `POST /payment/fallbacks` - Create a fallback plan
- `GET /payment/fallbacks/:id` - Get fallback plan details

### Configuration
- `GET /payment/config` - Get routing configuration
- `PUT /payment/config` - Update configuration

### Payment Splits
- `GET /payment/splits/pending` - List pending splits
- `GET /payment/splits/:id` - Get split details
- `PUT /payment/splits/:id` - Update a split
- `POST /payment/splits/:id/process` - Process a split

## CLI Tool

### Installation
```bash
chmod +x scripts/payment-cli.ts
```

### Usage

```bash
# List routes
bun run scripts/payment-cli.ts list-routes

# Create a route
bun run scripts/payment-cli.ts create-route "Main Route" barber_123

# Reorder a route
bun run scripts/payment-cli.ts reorder-route route_123 5

# Get route details (JSON output)
bun run scripts/payment-cli.ts --json get-route route_123

# Check health
bun run scripts/payment-cli.ts health

# List pending splits
bun run scripts/payment-cli.ts list-pending-splits
```

## Server Management

```bash
# Start the server
bun run scripts/start-payment-server.ts start

# Check status
bun run scripts/start-payment-server.ts status

# Health check
bun run scripts/start-payment-server.ts health

# Restart
bun run scripts/start-payment-server.ts restart

# Stop
bun run scripts/start-payment-server.ts stop
```

## Error Handling

The module uses custom error classes with appropriate HTTP status codes:

- `BadRequestError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `ValidationError` (422)
- `RateLimitError` (429)
- `ServiceUnavailableError` (503)

## Rate Limiting

Rate limiting uses a sliding window algorithm with Redis for distributed rate limiting (falls back to local cache if Redis is unavailable):

- Default: 100 requests per minute per IP
- API keys: 1000 requests per minute

Headers returned:
- `X-RateLimit-Limit` - Request limit
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Reset timestamp
- `Retry-After` - Seconds to wait (on 429)

## Logging

Structured JSON logging with configurable levels:

```javascript
// Log levels: debug, info, warn, error
logger.info('Payment route created', { routeId: 'route_123' });
logger.error('Payment failed', error, { paymentId: 'pay_456' });
```

Logs are written to both file and console (configurable).

## Redis Connection Management

Features:
- Connection pooling
- Automatic retry with exponential backoff
- Health checks
- Graceful degradation (503 if Redis unavailable)

## Testing

```bash
# Start the server
bun run src/payment/server.ts &

# Test health endpoint
curl http://localhost:3001/health

# Create a route
curl -X POST http://localhost:3001/payment/routes \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Route","barberId":"barber_123","priority":100}'

# List routes
curl http://localhost:3001/payment/routes
```

## Development

```bash
# Watch mode
bun --watch run src/payment/server.ts

# With debug logging
LOG_LEVEL=debug bun run src/payment/server.ts
```

## Production Deployment

1. Set required environment variables
2. Configure Redis
3. Set API key for authentication
4. Use the startup script for process management
5. Monitor logs at `/tmp/payment-routing.log`

## License

MIT
