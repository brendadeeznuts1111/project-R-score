// lib/http/index.ts — HTTP utilities barrel export

// Health endpoint with HSL color coding
export {
  createHealthEndpoint,
  createBunHealthEndpoint,
  type HealthCheck,
  type HealthCheckResult,
  type HealthStatus,
  type HealthEndpointConfig,
} from './health-endpoint';

// RSC (React Server Components) support
export { RSCEnhancedHandler, createRSCEnhancedHandler } from './rsc-enhanced';
export { RSCMultiplexer } from './rsc-multiplexer';

// HTTP/2 multiplexer
export { HTTP2Multiplexer } from './http2-multiplexer';

// Hardened fetch with security features
export { hardenedFetch, createHardenedFetch } from './hardened-fetch';
