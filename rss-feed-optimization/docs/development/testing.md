# Testing Guide

This guide provides comprehensive information about testing the RSS Feed Optimization project, including unit tests, integration tests, performance tests, and testing best practices.

## Overview

The RSS Feed Optimization project uses Bun's built-in test runner for comprehensive testing. This guide covers all aspects of testing, from basic unit tests to advanced performance testing.

## Test Structure

### Test Organization

```
tests/
├── unit/                 # Unit tests
│   ├── rss-generator.test.js
│   ├── r2-client.test.js
│   ├── utils/
│   │   ├── buffer-optimization.test.js
│   │   ├── error-handler.test.js
│   │   ├── metrics.test.js
│   │   └── performance-tracker.test.js
│   └── middleware/
│       ├── rate-limit.test.js
│       └── error-handler.test.js
├── integration/          # Integration tests
│   ├── api.test.js
│   ├── rss-generation.test.js
│   └── r2-storage.test.js
├── performance/          # Performance tests
│   ├── benchmark.js
│   └── load-test.js
└── fixtures/             # Test data
    ├── posts/
    ├── rss/
    └── config/
```

### Test Categories

#### 1. Unit Tests
- Test individual functions and classes
- Mock external dependencies
- Fast execution
- High code coverage

#### 2. Integration Tests
- Test component interactions
- Use real dependencies when possible
- Slower but more comprehensive
- Test end-to-end workflows

#### 3. Performance Tests
- Benchmark critical operations
- Monitor performance regressions
- Load testing
- Memory usage testing

## Writing Tests

### Basic Test Structure

```javascript
// tests/unit/example.test.js
import { test, expect } from 'bun:test';

test.describe('Example Test Suite', () => {
  test('basic test', () => {
    expect(2 + 2).toBe(4);
  });

  test('async test', async () => {
    const result = await someAsyncFunction();
    expect(result).toBeDefined();
  });

  test('test with setup and teardown', async () => {
    // Setup
    const testInstance = new TestClass();

    // Test
    const result = testInstance.someMethod();
    expect(result).toBe('expected');

    // Teardown
    testInstance.cleanup();
  });
});
```

### Unit Test Example

```javascript
// tests/unit/rss-generator.test.js
import { test, expect } from 'bun:test';
import { RSSGenerator } from '../../src/rss-generator.js';

test.describe('RSSGenerator', () => {
  let generator;

  test.beforeEach(() => {
    generator = new RSSGenerator({
      title: 'Test Blog',
      baseUrl: 'https://example.com',
      description: 'Test blog description'
    });
  });

  test('generates valid RSS feed', async () => {
    const posts = [
      {
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        author: 'Test Author',
        publishedAt: new Date().toISOString(),
        tags: ['test']
      }
    ];

    const rss = await generator.generate(posts);
    
    expect(rss).toContain('<rss');
    expect(rss).toContain('<channel>');
    expect(rss).toContain('Test Post');
    expect(rss).toContain('Test content');
    expect(rss).toContain('Test Author');
  });

  test('handles empty posts array', async () => {
    const rss = await generator.generate([]);
    expect(rss).toContain('<channel>');
    expect(rss).not.toContain('<item>');
  });

  test('generates valid XML', async () => {
    const posts = [
      {
        title: 'XML Test Post',
        slug: 'xml-test-post',
        content: '<p>Content with <strong>HTML</strong></p>',
        author: 'Test Author',
        publishedAt: new Date().toISOString(),
        tags: ['xml', 'test']
      }
    ];

    const rss = await generator.generate(posts);
    
    // Should properly escape XML
    expect(rss).toContain('<p>');
    expect(rss).toContain('<strong>');
  });
});
```

### Integration Test Example

```javascript
// tests/integration/api.test.js
import { test, expect } from 'bun:test';
import { serve } from 'bun';
import { createApp } from '../../src/server.js';

test.describe('API Integration', () => {
  let server;
  let baseURL;

  test.beforeAll(async () => {
    const app = createApp();
    server = serve({
      port: 0,
      fetch: app.fetch
    });
    baseURL = `http://localhost:${server.port}`;
  });

  test.afterAll(() => {
    server.stop();
  });

  test('GET /api/v1/posts returns posts list', async () => {
    const response = await fetch(`${baseURL}/api/v1/posts`);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.data).toBeArray();
    expect(data.pagination).toBeObject();
  });

  test('GET /api/v1/posts/:slug returns single post', async () => {
    const response = await fetch(`${baseURL}/api/v1/posts/test-post`);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.data).toBeObject();
    expect(data.data.slug).toBe('test-post');
  });

  test('POST /api/v1/posts creates new post', async () => {
    const postData = {
      title: 'New Test Post',
      slug: 'new-test-post',
      content: 'Test content',
      author: 'Test Author'
    };

    const response = await fetch(`${baseURL}/api/v1/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(postData)
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data.title).toBe(postData.title);
  });
});
```

### Performance Test Example

```javascript
// tests/performance/benchmark.js
import { test, expect } from 'bun:test';
import { PerformanceTracker } from '../../src/utils/performance-tracker.js';
import { RSSGenerator } from '../../src/rss-generator.js';

test.describe('Performance Tests', () => {
  let tracker;
  let generator;

  test.beforeEach(() => {
    tracker = new PerformanceTracker();
    generator = new RSSGenerator({
      title: 'Performance Test Blog',
      baseUrl: 'https://example.com'
    });
  });

  test('RSS generation performance', async () => {
    const posts = Array.from({ length: 1000 }, (_, i) => ({
      title: `Post ${i}`,
      slug: `post-${i}`,
      content: `Content for post ${i}`,
      author: 'Test Author',
      publishedAt: new Date().toISOString(),
      tags: ['performance', 'test']
    }));

    const result = await tracker.track('rss_generation', async () => {
      return await generator.generate(posts);
    });

    // Performance assertions
    expect(result.duration).toBeLessThan(1000); // Under 1 second
    expect(result.memory).toBeLessThan(50 * 1024 * 1024); // Under 50MB
  });

  test('DNS prefetching performance', async () => {
    const hosts = [
      'feeds.feedburner.com',
      'medium.com',
      'dev.to',
      'github.com'
    ];

    const result = await tracker.track('dns_prefetch', async () => {
      const { DNSOptimizer } = await import('../../src/utils/dns-optimizer.js');
      const dns = new DNSOptimizer();
      await dns.prefetch(hosts);
    });

    // DNS prefetching should be very fast
    expect(result.duration).toBeLessThan(100); // Under 100ms
  });

  test('Buffer operations performance', async () => {
    const { BufferOptimizer } = await import('../../src/utils/buffer-optimization.js');
    const optimizer = new BufferOptimizer();

    const result = await tracker.track('buffer_operations', async () => {
      const buffer = optimizer.createOptimizedBuffer([1, 2, 3, 4, 5]);
      return buffer.length;
    });

    expect(result.duration).toBeLessThan(10); // Under 10ms
  });
});
```

## Test Utilities

### Mocking and Stubbing

```javascript
// tests/utils/mock-utils.js
import { mock } from 'bun:test';

export class MockUtils {
  static createMockR2Client() {
    return {
      listObjectsV2: mock(async () => ({
        Contents: [
          { Key: 'posts/test-post.json', LastModified: new Date() }
        ]
      })),
      getObject: mock(async () => ({
        Body: JSON.stringify({
          title: 'Test Post',
          content: 'Test content'
        })
      })),
      putObject: mock(async () => ({})),
      deleteObject: mock(async () => ({}))
    };
  }

  static createMockFetch() {
    return mock(async (url) => {
      if (url.includes('rss')) {
        return new Response(`
          <rss version="2.0">
            <channel>
              <title>Test Feed</title>
              <item>
                <title>Test Item</title>
                <description>Test description</description>
              </item>
            </channel>
          </rss>
        `);
      }
      return new Response('Not found', { status: 404 });
    });
  }

  static createMockPerformanceTracker() {
    return {
      track: mock(async (operation, fn) => {
        const start = Date.now();
        const result = await fn();
        const duration = Date.now() - start;
        return {
          operation,
          duration,
          memory: 1024,
          result
        };
      })
    };
  }
}
```

### Test Fixtures

```javascript
// tests/fixtures/posts.js
export const testPosts = [
  {
    id: '1',
    title: 'First Test Post',
    slug: 'first-test-post',
    content: '# First Test Post\n\nThis is the content of the first test post.',
    author: 'Test Author',
    tags: ['test', 'first'],
    publishedAt: '2025-01-27T10:30:00.000Z',
    updatedAt: '2025-01-27T10:30:00.000Z',
    readTime: 2,
    wordCount: 50
  },
  {
    id: '2',
    title: 'Second Test Post',
    slug: 'second-test-post',
    content: '# Second Test Post\n\nThis is the content of the second test post.',
    author: 'Test Author',
    tags: ['test', 'second'],
    publishedAt: '2025-01-26T10:30:00.000Z',
    updatedAt: '2025-01-26T10:30:00.000Z',
    readTime: 3,
    wordCount: 75
  }
];

export const emptyPost = {
  title: '',
  slug: '',
  content: '',
  author: '',
  tags: [],
  publishedAt: '',
  updatedAt: ''
};

export const invalidPost = {
  title: 'x'.repeat(5), // Too short
  slug: 'x'.repeat(5),  // Too short
  content: 'x'.repeat(5), // Too short
  author: '',
  tags: [],
  publishedAt: 'invalid-date',
  updatedAt: 'invalid-date'
};
```

### Test Helpers

```javascript
// tests/utils/test-helpers.js
export class TestHelpers {
  static async waitFor(condition, timeout = 5000) {
    const start = Date.now();
    while (!condition() && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!condition()) {
      throw new Error(`Condition not met within ${timeout}ms`);
    }
  }

  static async createTestServer(app) {
    const server = serve({
      port: 0,
      fetch: app.fetch
    });
    return {
      server,
      baseURL: `http://localhost:${server.port}`,
      cleanup: () => server.stop()
    };
  }

  static async createTestPost(storage, postData = {}) {
    const defaultPost = {
      title: 'Test Post',
      slug: 'test-post',
      content: 'Test content',
      author: 'Test Author',
      tags: ['test'],
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const post = { ...defaultPost, ...postData };
    return await storage.uploadPost(post);
  }

  static async cleanupTestPosts(storage) {
    const posts = await storage.listPosts();
    for (const post of posts) {
      await storage.deletePost(post.Key);
    }
  }

  static generateLargePostSet(count = 100) {
    return Array.from({ length: count }, (_, i) => ({
      id: `test-post-${i}`,
      title: `Test Post ${i}`,
      slug: `test-post-${i}`,
      content: `Content for test post ${i}`.repeat(10),
      author: 'Test Author',
      tags: ['test', `tag-${i % 5}`],
      publishedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      readTime: Math.floor(Math.random() * 10) + 1,
      wordCount: Math.floor(Math.random() * 1000) + 100
    }));
  }
}
```

## Running Tests

### Basic Test Commands

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/unit/rss-generator.test.js

# Run tests with pattern
bun test --grep "RSS"

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage

# Run specific test suite
bun test --testNamePattern="Performance"
```

### Test Configuration

```javascript
// tests/config.js
export const testConfig = {
  timeout: 10000,
  retries: 2,
  parallel: true,
  coverage: {
    include: ['src/**/*.js'],
    exclude: ['src/**/*.test.js', 'src/**/*.spec.js']
  }
};

export const testEnvironment = {
  NODE_ENV: 'test',
  BLOG_TITLE: 'Test Blog',
  BLOG_URL: 'http://localhost:3000',
  ADMIN_TOKEN: 'test-token',
  ENABLE_CACHE: false,
  ENABLE_DNS_PREFETCH: false,
  ENABLE_PRECONNECT: false
};
```

### Performance Testing

```bash
# Run performance benchmarks
bun test tests/performance/benchmark.js

# Run load tests
bun test tests/performance/load-test.js

# Generate performance report
bun test --reporter=performance
```

### Continuous Integration

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test
      - run: bun test --coverage
```

## Testing Best Practices

### 1. Test Organization

```javascript
// Good: Organized test structure
test.describe('RSSGenerator', () => {
  test.describe('generate method', () => {
    test('handles empty posts', async () => {
      // Test implementation
    });

    test('generates valid RSS', async () => {
      // Test implementation
    });

    test('escapes XML properly', async () => {
      // Test implementation
    });
  });

  test.describe('error handling', () => {
    test('throws error for invalid input', async () => {
      // Test implementation
    });
  });
});
```

### 2. Test Isolation

```javascript
// Good: Each test is independent
test.describe('Cache Tests', () => {
  test('caches values correctly', async () => {
    const cache = new Cache();
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  test('expires old values', async () => {
    const cache = new Cache(1000); // 1 second TTL
    cache.set('key', 'value');
    await new Promise(resolve => setTimeout(resolve, 1500));
    expect(cache.get('key')).toBeNull();
  });
});
```

### 3. Mocking External Dependencies

```javascript
// Good: Mock external dependencies
test.describe('R2 Storage Tests', () => {
  test('uploads post to R2', async () => {
    const mockR2 = MockUtils.createMockR2Client();
    const storage = new R2BlogStorage(mockR2);

    const post = { title: 'Test Post', content: 'Test content' };
    const result = await storage.uploadPost(post);

    expect(mockR2.putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: expect.any(String),
        Key: expect.any(String),
        Body: expect.any(String)
      })
    );
  });
});
```

### 4. Performance Testing

```javascript
// Good: Performance assertions
test('RSS generation is fast', async () => {
  const posts = TestHelpers.generateLargePostSet(1000);
  const start = Date.now();
  
  const rss = await generator.generate(posts);
  const duration = Date.now() - start;

  expect(duration).toBeLessThan(1000); // Under 1 second
  expect(rss.length).toBeGreaterThan(1000); // Generated content
});
```

### 5. Error Testing

```javascript
// Good: Test error conditions
test('handles R2 errors gracefully', async () => {
  const mockR2 = {
    listObjectsV2: mock(async () => {
      throw new Error('R2 connection failed');
    })
  };

  const storage = new R2BlogStorage(mockR2);

  await expect(storage.listPosts()).rejects.toThrow('R2 connection failed');
});
```

## Test Coverage

### Coverage Configuration

```javascript
// tests/coverage.config.js
export const coverageConfig = {
  include: [
    'src/**/*.js'
  ],
  exclude: [
    'src/**/*.test.js',
    'src/**/*.spec.js',
    'src/**/*.d.ts',
    'src/scripts/**',
    'src/cli.js'
  ],
  thresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    src/services/: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};
```

### Coverage Reports

```bash
# Generate coverage report
bun test --coverage

# View coverage in browser
open coverage/lcov-report/index.html

# Generate text report
bun test --coverage --coverageReporters=text
```

## Debugging Tests

### Debug Mode

```bash
# Enable debug mode
DEBUG=true bun test

# Run specific test with debug
DEBUG=true bun test tests/unit/rss-generator.test.js --testNamePattern="generates valid RSS"
```

### Test Logging

```javascript
// Add debug logging to tests
test('debug test', async () => {
  console.log('Starting test...');
  
  const result = await someFunction();
  console.log('Result:', result);
  
  expect(result).toBeDefined();
  
  console.log('Test completed successfully');
});
```

### Test Snapshots

```javascript
// Use snapshots for complex data structures
test('RSS feed snapshot', async () => {
  const posts = [testPosts[0]];
  const rss = await generator.generate(posts);
  
  expect(rss).toMatchSnapshot();
});
```

## Common Testing Patterns

### 1. Setup and Teardown

```javascript
test.describe('Database Tests', () => {
  let db;

  test.beforeAll(async () => {
    db = await setupTestDatabase();
  });

  test.afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  test.beforeEach(async () => {
    await db.clear();
  });

  test.afterEach(async () => {
    await db.rollback();
  });

  test('CRUD operations', async () => {
    // Test implementation
  });
});
```

### 2. Parameterized Tests

```javascript
test.describe.each([
  ['rss', 'application/rss+xml'],
  ['atom', 'application/atom+xml'],
  ['json', 'application/json']
])('Feed format %s', (format, contentType) => {
  test(`returns ${contentType} content type`, async () => {
    const response = await fetch(`/api/v1/feed.${format}`);
    expect(response.headers.get('content-type')).toBe(contentType);
  });
});
```

### 3. Async Testing

```javascript
test('async operations complete', async () => {
  const promise = someAsyncOperation();
  
  // Wait for promise to resolve
  await expect(promise).resolves.toBeDefined();
  
  // Or wait for specific value
  await expect(promise).resolves.toBe('expected value');
});
```

### 4. Error Testing

```javascript
test('throws error for invalid input', async () => {
  await expect(() => {
    someFunction(null);
  }).toThrow('Invalid input');

  await expect(async () => {
    await someAsyncFunction(null);
  }).rejects.toThrow('Invalid input');
});
```

This comprehensive testing guide provides everything needed to write, run, and maintain high-quality tests for the RSS Feed Optimization project.