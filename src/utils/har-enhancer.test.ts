// Tests for har-enhancer.ts
import {
  HarBuilder,
  validateHar,
  calculateHarStats,
  enhanceHarWithSecurity,
  enhanceHarWithPerformanceMetrics,
  filterHarEntries,
  sortHarEntries,
  getCompressionFromHeaders,
  detectResourceType,
  diffHar,
  detectRegressions,
  analyzeCookies,
  generateWaterfall,
  lintHar,
} from './har-enhancer';
import { describe, test, expect } from 'bun:test';

// Sample HAR for testing
const sampleHar = {
  log: {
    version: '1.2',
    creator: { name: 'Test', version: '1.0' },
    entries: [
      {
        startedDateTime: '2024-01-15T10:00:00.000Z',
        time: 100,
        request: {
          method: 'GET',
          url: 'https://example.com/api/data',
          httpVersion: 'HTTP/2',
          headers: [
            { name: 'accept', value: 'application/json' },
          ],
          cookies: [],
          queryString: [],
          headersSize: 100,
          bodySize: 0,
        },
        response: {
          status: 200,
          statusText: 'OK',
          httpVersion: 'HTTP/2',
          headers: [
            { name: 'content-type', value: 'application/json' },
            { name: 'content-encoding', value: 'gzip' },
            { name: 'strict-transport-security', value: 'max-age=31536000' },
          ],
          cookies: [],
          content: {
            size: 1000,
            mimeType: 'application/json',
          },
          redirectURL: '',
          headersSize: 150,
          bodySize: 500,
          _transferSize: 600,
        },
        cache: {},
        timings: {
          blocked: 0,
          dns: 10,
          ssl: 20,
          connect: 15,
          send: 5,
          wait: 30,
          receive: 20,
        },
      },
      {
        startedDateTime: '2024-01-15T10:00:01.000Z',
        time: 200,
        request: {
          method: 'GET',
          url: 'http://example.com/image.png',
          httpVersion: 'HTTP/1.1',
          headers: [],
          cookies: [],
          queryString: [],
          headersSize: 50,
          bodySize: 0,
        },
        response: {
          status: 404,
          statusText: 'Not Found',
          httpVersion: 'HTTP/1.1',
          headers: [
            { name: 'content-type', value: 'image/png' },
          ],
          cookies: [],
          content: {
            size: 0,
            mimeType: 'image/png',
          },
          redirectURL: '',
          headersSize: 100,
          bodySize: 0,
        },
        cache: {},
        timings: {
          blocked: 5,
          dns: 10,
          ssl: 0,
          connect: 15,
          send: 5,
          wait: 100,
          receive: 65,
        },
      },
    ],
  },
};

describe('HarBuilder', () => {
  test('creates HAR with creator', () => {
    const builder = new HarBuilder({ name: 'Test', version: '1.0' });
    const har = builder.build();
    
    expect(har.log.version).toBe('1.2');
    expect(har.log.creator.name).toBe('Test');
    expect(har.log.entries).toHaveLength(0);
  });

  test('adds entries and pages', () => {
    const builder = new HarBuilder({ name: 'Test', version: '1.0' });
    const har = builder
      .addPage({
        startedDateTime: new Date().toISOString(),
        id: 'page_1',
        title: 'Test Page',
        pageTimings: { onContentLoad: 100, onLoad: 200 },
      })
      .addEntry(sampleHar.log.entries[0])
      .build();
    
    expect(har.log.pages).toHaveLength(1);
    expect(har.log.entries).toHaveLength(1);
  });
});

describe('validateHar', () => {
  test('validates correct HAR', () => {
    const result = validateHar(sampleHar);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('invalidates null', () => {
    const result = validateHar(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('HAR must be an object');
  });

  test('invalidates missing log', () => {
    const result = validateHar({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing or invalid "log" property');
  });

  test('invalidates missing version', () => {
    const result = validateHar({ log: { creator: { name: 'Test', version: '1.0' }, entries: [] } });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing or invalid "log.version"');
  });
});

describe('calculateHarStats', () => {
  test('calculates stats correctly', () => {
    const stats = calculateHarStats(sampleHar);
    
    expect(stats.totalRequests).toBe(2);
    expect(stats.totalSize).toBe(1000);
    expect(stats.secureRequests).toBe(1);
    expect(stats.errorRequests).toBe(1);
    expect(stats.domains.has('example.com')).toBe(true);
  });

  test('handles empty HAR', () => {
    const stats = calculateHarStats({ log: { version: '1.2', creator: { name: 'Test', version: '1.0' }, entries: [] } });
    
    expect(stats.totalRequests).toBe(0);
    expect(stats.totalSize).toBe(0);
  });
});

describe('enhanceHarWithSecurity', () => {
  test('adds security info to entries', () => {
    const enhanced = enhanceHarWithSecurity(sampleHar);
    
    expect(enhanced.log.entries[0]._security).toBeDefined();
    expect(enhanced.log.entries[0]._security.secure).toBe(true);
    expect(enhanced.log.entries[0]._security.hsts).toBe(true);
    expect(enhanced.log.entries[1]._security.secure).toBe(false);
  });
});

describe('enhanceHarWithPerformanceMetrics', () => {
  test('adds performance metrics', () => {
    const enhanced = enhanceHarWithPerformanceMetrics(sampleHar);
    
    expect(enhanced.log.entries[0]._performance).toBeDefined();
    expect(enhanced.log.entries[0]._performance.ttfb).toBeGreaterThan(0);
    expect(enhanced.log.entries[0]._performance.ttfbGrade).toBeDefined();
    expect(enhanced.log.entries[0]._performance.sizeGrade).toBeDefined();
  });
});

describe('filterHarEntries', () => {
  test('filters by status code', () => {
    const entries = filterHarEntries(sampleHar, { statusCodes: [200] });
    expect(entries).toHaveLength(1);
    expect(entries[0].response.status).toBe(200);
  });

  test('filters by min time', () => {
    const entries = filterHarEntries(sampleHar, { minTime: 150 });
    expect(entries).toHaveLength(1);
    expect(entries[0].time).toBe(200);
  });

  test('filters by secure only', () => {
    const entries = filterHarEntries(sampleHar, { secureOnly: true });
    expect(entries).toHaveLength(1);
    expect(entries[0].request.url.startsWith('https:')).toBe(true);
  });
});

describe('sortHarEntries', () => {
  test('sorts by time desc', () => {
    const sorted = sortHarEntries(sampleHar.log.entries, 'time', 'desc');
    expect(sorted[0].time).toBe(200);
    expect(sorted[1].time).toBe(100);
  });

  test('sorts by time asc', () => {
    const sorted = sortHarEntries(sampleHar.log.entries, 'time', 'asc');
    expect(sorted[0].time).toBe(100);
    expect(sorted[1].time).toBe(200);
  });

  test('sorts by status', () => {
    const sorted = sortHarEntries(sampleHar.log.entries, 'status', 'asc');
    expect(sorted[0].response.status).toBe(200);
    expect(sorted[1].response.status).toBe(404);
  });
});

describe('detectResourceType', () => {
  test('detects JSON as xhr', () => {
    const type = detectResourceType(sampleHar.log.entries[0]);
    expect(type).toBe('xhr');
  });

  test('detects PNG as image', () => {
    const type = detectResourceType(sampleHar.log.entries[1]);
    expect(type).toBe('image');
  });
});

describe('diffHar', () => {
  test('detects added entries', () => {
    const baseline = { log: { version: '1.2', creator: { name: 'Test', version: '1.0' }, entries: [sampleHar.log.entries[0]] } };
    const current = sampleHar;
    
    const diff = diffHar(baseline, current);
    
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].request.url).toBe('http://example.com/image.png');
  });

  test('detects removed entries', () => {
    const baseline = sampleHar;
    const current = { log: { version: '1.2', creator: { name: 'Test', version: '1.0' }, entries: [sampleHar.log.entries[0]] } };
    
    const diff = diffHar(baseline, current);
    
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0].request.url).toBe('http://example.com/image.png');
  });

  test('detects modified entries', () => {
    const baseline = JSON.parse(JSON.stringify(sampleHar));
    const current = JSON.parse(JSON.stringify(sampleHar));
    current.log.entries[0].response.status = 500;
    current.log.entries[0].time = 500;
    
    const diff = diffHar(baseline, current);
    
    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0].changes.some((c: any) => c.field === 'response.status')).toBe(true);
  });
});

describe('detectRegressions', () => {
  test('detects latency regression', () => {
    const baseline = JSON.parse(JSON.stringify(sampleHar));
    const current = JSON.parse(JSON.stringify(sampleHar));
    current.log.entries[0].time = 500; // Significant increase
    
    const result = detectRegressions(baseline, current);
    
    expect(result.hasRegression).toBe(true);
    expect(result.issues.some(i => i.type === 'latency')).toBe(true);
  });

  test('no regression when similar', () => {
    const result = detectRegressions(sampleHar, sampleHar);
    
    expect(result.hasRegression).toBe(false);
    expect(result.severity).toBe('none');
  });
});

describe('analyzeCookies', () => {
  const harWithCookies = {
    log: {
      version: '1.2',
      creator: { name: 'Test', version: '1.0' },
      entries: [{
        ...sampleHar.log.entries[0],
        response: {
          ...sampleHar.log.entries[0].response,
          cookies: [
            { name: 'session', value: 'abc123', httpOnly: true, secure: true, sameSite: 'Strict' },
            { name: 'tracker', value: 'xyz', httpOnly: false, secure: false },
          ],
        },
      }],
    },
  };

  test('counts cookies correctly', () => {
    const analysis = analyzeCookies(harWithCookies);
    
    expect(analysis.totalCookies).toBe(2);
    expect(analysis.secureCookies).toBe(1);
    expect(analysis.httpOnlyCookies).toBe(1);
    expect(analysis.sameSiteCookies).toBe(1);
  });

  test('detects security issues', () => {
    const analysis = analyzeCookies(harWithCookies);
    
    expect(analysis.warnings.length).toBeGreaterThan(0);
    expect(analysis.warnings.some(w => w.includes('Secure flag'))).toBe(true);
  });
});

describe('generateWaterfall', () => {
  test('generates waterfall string', () => {
    const waterfall = generateWaterfall(sampleHar.log.entries);
    
    expect(waterfall).toContain('█');
    expect(waterfall).toContain('ms');
    expect(waterfall).toContain('/api/data');
  });

  test('handles empty entries', () => {
    const waterfall = generateWaterfall([]);
    
    expect(waterfall).toBe('');
  });
});

describe('lintHar', () => {
  test('detects slow responses', () => {
    const slowHar = JSON.parse(JSON.stringify(sampleHar));
    slowHar.log.entries[0].time = 2000; // Very slow
    
    const result = lintHar(slowHar);
    
    expect(result.issues.some(i => i.rule === 'slow-response')).toBe(true);
  });

  test('detects error responses', () => {
    const result = lintHar(sampleHar);
    
    expect(result.issues.some(i => i.rule === 'error-status')).toBe(true);
  });

  test('detects missing compression', () => {
    const noCompressionHar = JSON.parse(JSON.stringify(sampleHar));
    // Remove compression header and increase size to trigger the rule (>1024 bytes)
    noCompressionHar.log.entries[0].response.headers = noCompressionHar.log.entries[0].response.headers.filter(
      (h: any) => h.name !== 'content-encoding'
    );
    noCompressionHar.log.entries[0].response.content.size = 2000;
    
    const result = lintHar(noCompressionHar);
    
    expect(result.issues.some(i => i.rule === 'no-compression')).toBe(true);
  });

  test('generates summary', () => {
    const result = lintHar(sampleHar);
    
    expect(result.summary.total).toBeGreaterThan(0);
    expect(result.summary.errors).toBeGreaterThan(0);
  });
});

console.log('✅ HAR Enhancer tests loaded');
