// Test fixtures for T3-Lattice Registry testing
// Shared test data and utilities

// Mock DNS cache entries
export const mockDNSEntries = [
  {
    hostname: 'api.github.com',
    addresses: ['192.30.255.112', '192.30.255.113'],
    timestamp: Date.now() - 10000, // 10 seconds ago
    hits: 5
  },
  {
    hostname: 'registry.npmjs.org',
    addresses: ['104.16.18.35', '104.16.19.35'],
    timestamp: Date.now() - 300000, // 5 minutes ago
    hits: 2
  },
  {
    hostname: 'bun.sh',
    addresses: ['104.18.32.99', '104.18.33.99'],
    timestamp: Date.now() - 600000, // 10 minutes ago (expired)
    hits: 1
  }
];

// Mock DNS config
export const mockDNSConfig = {
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  prefetchInterval: 30 * 1000, // 30 seconds
  maxPrefetchHosts: 10,
  minHitsForPrefetch: 3,
  enablePeriodicPrefetch: true,
  additionalHosts: ['cdn.jsdelivr.net', 'api.cloudflare.com']
};

// Mock HTTP responses
export const mockFetchResponses = {
  success: {
    ok: true,
    status: 200,
    json: async () => ({ data: 'success' })
  },
  error: {
    ok: false,
    status: 404,
    json: async () => ({ error: 'not found' })
  }
};

// Mock WebSocket messages
export const mockWebSocketData = {
  binaryMessage: new Uint8Array([1, 2, 3, 4, 5]),
  textMessage: JSON.stringify({ type: 'update', data: { components: 42 } }),
  controlMessage: JSON.stringify({ type: 'ping', timestamp: Date.now() })
};

// Mock component registry data
export const mockComponents = [
  {
    id: 'react-component',
    name: 'React Button',
    version: '1.0.0',
    category: 'ui',
    dependencies: ['react', 'react-dom']
  },
  {
    id: 'vue-component',
    name: 'Vue Card',
    version: '2.1.0',
    category: 'ui',
    dependencies: ['vue']
  },
  {
    id: 'utility-lib',
    name: 'Utility Library',
    version: '1.5.0',
    category: 'utils',
    dependencies: []
  }
];

// Mock security audit data
export const mockSecurityAudit = {
  requestId: 'req-12345',
  timestamp: Date.now(),
  method: 'POST',
  path: '/api/components',
  ip: '192.168.1.100',
  userAgent: 'Mozilla/5.0 (Test Browser)',
  threatLevel: 'low',
  actions: ['csrf_check_passed', 'rate_limit_ok']
};

// Mock performance metrics
export const mockPerformanceMetrics = {
  totalRequests: 1250,
  averageResponseTime: 45, // ms
  errorRate: 0.02, // 2%
  throughput: 456.7, // req/sec
  slaCompliance: 98.5 // %
};

// Utility functions for tests
export function createMockResponse(data: any, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
    url: 'http://localhost:3000',
    redirected: false,
    statusText: 'OK',
    type: 'basic' as ResponseType,
    body: null,
    bodyUsed: false,
    clone: () => createMockResponse(data, status),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData()
  } as Response;
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Mock DNS lookup function
export function mockDNSLookup(hostname: string): string[] {
  const mockIPs: Record<string, string[]> = {
    'localhost': ['127.0.0.1'],
    'api.github.com': ['192.30.255.112', '192.30.255.113'],
    'registry.npmjs.org': ['104.16.18.35', '104.16.19.35'],
    'bun.sh': ['104.18.32.99', '104.18.33.99'],
    'cdn.jsdelivr.net': ['104.16.20.35']
  };

  return mockIPs[hostname] || ['192.168.1.1'];
}