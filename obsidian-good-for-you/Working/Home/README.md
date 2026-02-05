# Apple ID Creator

A production-ready TypeScript system for creating Apple ID accounts via direct API integration.

## Features

### 🚀 Core Functionality
- **Direct API Integration**: Communicates with Apple's backend endpoints
- **Device Fingerprinting**: Mimics iOS device registration for authenticity
- **Account Creation Flow**: Complete signup process with verification
- **Session Management**: Handles authentication tokens and device sessions

### 🔒 Production Features
- **Input Validation**: Comprehensive validation for all profile data
- **Retry Logic**: Exponential backoff for failed requests (configurable)
- **Caching**: Session caching with TTL to improve performance
- **Metrics & Monitoring**: Built-in success rate and performance tracking
- **Logging**: Structured logging with configurable levels
- **Proxy Support**: Optional proxy configuration for requests

### ⚙️ Configuration
- **Environment Variables**: Support for runtime configuration
- **Custom Settings**: Override defaults via constructor
- **Type Safety**: Full TypeScript support with interfaces

## Installation

```bash
npm install
```

## Quick Start

```typescript
import { APIAppleIDCreator, ProfileData } from './readmeauth';

// Initialize with default configuration
const creator = new APIAppleIDCreator();

// Create an Apple ID
const profile: ProfileData = {
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: '+1-555-123-4567',
  demographic: {
    birthYear: 1990
  }
};

try {
  const appleID = await creator.createViaAPI(profile);
  console.log('✅ Apple ID created:', appleID.appleId);
} catch (error) {
  console.error('❌ Creation failed:', error.message);
}
```

## Configuration

### Environment Variables

```bash
# Retry configuration
APPLE_ID_MAX_RETRIES=5
APPLE_ID_BASE_DELAY=2000

# Request settings
APPLE_ID_REQUEST_TIMEOUT=60000
APPLE_ID_USER_AGENT="Custom User Agent"

# Regional settings
APPLE_ID_LOCALE="en_US"
APPLE_ID_TIMEZONE="America/New_York"

# Features
APPLE_ID_ENABLE_LOGGING=false
APPLE_ID_PROXY_URL="http://proxy.example.com:8080"
```

### Custom Configuration

```typescript
const creator = new APIAppleIDCreator({
  maxRetries: 5,
  baseDelay: 2000,
  enableLogging: true,
  proxyUrl: 'http://proxy.example.com:8080'
});
```

## Advanced Usage

### Batch Processing

```typescript
const profiles: ProfileData[] = [
  { firstName: 'Alice', lastName: 'Smith', phoneNumber: '+1-555-0001', demographic: { birthYear: 1985 } },
  { firstName: 'Bob', lastName: 'Johnson', phoneNumber: '+1-555-0002', demographic: { birthYear: 1992 } }
];

for (const profile of profiles) {
  try {
    const appleID = await creator.createViaAPI(profile);
    console.log(`✅ Created: ${appleID.appleId}`);
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
  }
}
```

### Monitoring & Metrics

```typescript
// Get current metrics
const metrics = creator.getMetrics();
console.log('Success Rate:', metrics.successRate.toFixed(2) + '%');
console.log('Average Response Time:', metrics.averageResponseTime + 'ms');
console.log('Cache Size:', metrics.cacheSize);

// Reset metrics
creator.resetMetrics();

// Clear cache
creator.clearCache();
```

## API Reference

### Classes

#### `APIAppleIDCreator`
Main class for creating Apple IDs.

**Constructor:**
```typescript
constructor(config?: Partial<AppleIDConfig>)
```

**Methods:**
- `createViaAPI(profile: ProfileData): Promise<AppleIDAccount>`
- `getMetrics(): Metrics`
- `clearCache(): void`
- `resetMetrics(): void`

### Interfaces

#### `ProfileData`
```typescript
interface ProfileData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  demographic: {
    birthYear: number;
  };
}
```

#### `AppleIDAccount`
```typescript
interface AppleIDAccount {
  appleId: string;
  status: string;
  verificationRequired: boolean;
}
```

#### `AppleIDConfig`
```typescript
interface AppleIDConfig {
  maxRetries: number;
  baseDelay: number;
  requestTimeout: number;
  enableLogging: boolean;
  proxyUrl?: string;
  userAgent: string;
  locale: string;
  timezone: string;
}
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Development

```bash
# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Lint code
npm run lint

# Format code
npm run format
```

## Security Considerations

⚠️ **Important**: This tool is for educational and testing purposes only. When using in production:

1. **Rate Limiting**: Implement proper rate limiting to avoid IP bans
2. **Proxy Rotation**: Use rotating proxies for high-volume operations
3. **Data Privacy**: Ensure compliance with data protection regulations
4. **Terms of Service**: Respect Apple's terms of service and API limits

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Profile Data  │───▶│  Input Validation│───▶│  Session Cache  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Metrics       │◀───│  API Integration │◀───│  Retry Logic    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Disclaimer

This software is provided for educational and testing purposes. Users are responsible for ensuring compliance with applicable laws, terms of service, and API usage policies.
