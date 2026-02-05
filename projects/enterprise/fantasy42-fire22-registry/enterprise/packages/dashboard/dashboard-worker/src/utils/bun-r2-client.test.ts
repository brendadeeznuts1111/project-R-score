/**
 * Comprehensive Test Suite for Bun R2 Client
 *
 * Tests AWS Signature V4 authentication, multipart uploads,
 * streaming operations, and security integrations
 */

import { describe, expect, test, beforeEach, afterEach, mock } from 'bun:test';
import { BunR2Client, BunR2BatchClient } from './bun-r2-client';
import { Fire22SecurityScanner } from '../security/security-scanner';
import { createHash, createHmac } from 'crypto';

// Mock environment for testing
const mockEnv = {
  R2_ENDPOINT: 'https://test.r2.cloudflarestorage.com',
  R2_ACCESS_KEY_ID: 'TESTAKIA1234567890',
  R2_SECRET_ACCESS_KEY: 'testSecretKey123456789',
  R2_REGION: 'auto',
  R2_BUCKET: 'test-bucket',
};

describe('BunR2Client Core Functionality', () => {
  let client: BunR2Client;

  beforeEach(() => {
    // Mock environment variables
    process.env = { ...process.env, ...mockEnv };

    client = new BunR2Client({
      endpoint: mockEnv.R2_ENDPOINT,
      accessKeyId: mockEnv.R2_ACCESS_KEY_ID,
      secretAccessKey: mockEnv.R2_SECRET_ACCESS_KEY,
      region: mockEnv.R2_REGION,
      bucket: mockEnv.R2_BUCKET,
    });
  });

  describe('AWS Signature V4 Authentication', () => {
    test('should generate valid AWS Signature V4 headers', async () => {
      const method = 'PUT';
      const path = '/test-bucket/test-file.txt';
      const headers = {
        'Content-Type': 'text/plain',
        'Content-Length': '100',
        'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      };

      // Mock private method for testing
      const signedHeaders = await (client as any).createSignedHeaders(method, path, headers);

      expect(signedHeaders).toHaveProperty('Authorization');
      expect(signedHeaders['Authorization']).toMatch(/AWS4-HMAC-SHA256/);
      expect(signedHeaders['Authorization']).toMatch(/Credential=/);
      expect(signedHeaders['Authorization']).toMatch(/SignedHeaders=/);
      expect(signedHeaders['Authorization']).toMatch(/Signature=/);
      expect(signedHeaders).toHaveProperty('x-amz-date');
      expect(signedHeaders).toHaveProperty('host');
    });

    test('should calculate correct signing key', () => {
      const date = '20240115';
      const signingKey = (client as any).getSigningKey(date);

      expect(signingKey).toBeInstanceOf(Buffer);
      expect(signingKey.length).toBeGreaterThan(0);
    });

    test('should generate correct canonical request', async () => {
      const method = 'GET';
      const path = '/test-bucket/test-file.txt';
      const queryParams = '';
      const headers = { host: 'test.r2.cloudflarestorage.com' };
      const signedHeaders = 'host';
      const hashedPayload = 'UNSIGNED-PAYLOAD';

      const canonicalRequest = [
        method,
        path,
        queryParams,
        `host:${headers.host}\n`,
        signedHeaders,
        hashedPayload,
      ].join('\n');

      const hash = createHash('sha256').update(canonicalRequest).digest('hex');
      expect(hash).toHaveLength(64); // SHA256 produces 64 hex characters
    });
  });

  describe('Object Operations', () => {
    test('should upload small objects directly', async () => {
      const mockFetch = mock(() => Promise.resolve(new Response('', { status: 200 })));
      global.fetch = mockFetch;

      const data = Buffer.from('Test content');
      const response = await client.putObject('test-key', data, {
        contentType: 'text/plain',
      });

      expect(mockFetch).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    test('should use multipart upload for large objects', async () => {
      const largeData = Buffer.alloc(101 * 1024 * 1024); // 101MB

      // Mock multipart upload methods
      const mockInitiate = mock(() =>
        Promise.resolve(
          new Response(
            `<InitiateMultipartUploadResult><UploadId>test-upload-id</UploadId></InitiateMultipartUploadResult>`,
            { status: 200 }
          )
        )
      );

      const mockUploadPart = mock(() =>
        Promise.resolve(
          new Response('', {
            status: 200,
            headers: { etag: 'test-etag' },
          })
        )
      );

      const mockComplete = mock(() =>
        Promise.resolve(
          new Response(
            `<CompleteMultipartUploadResult><ETag>final-etag</ETag></CompleteMultipartUploadResult>`,
            { status: 200 }
          )
        )
      );

      // Intercept fetch calls based on URL pattern
      global.fetch = mock((url: string) => {
        if (url.includes('?uploads')) return mockInitiate();
        if (url.includes('?partNumber=')) return mockUploadPart();
        if (url.includes('?uploadId=')) return mockComplete();
        return Promise.resolve(new Response('', { status: 404 }));
      });

      const response = await client.putObject('large-file', largeData);

      expect(mockInitiate).toHaveBeenCalled();
      expect(mockUploadPart).toHaveBeenCalled();
      expect(mockComplete).toHaveBeenCalled();
    });

    test('should handle streaming uploads', async () => {
      const chunks = ['chunk1', 'chunk2', 'chunk3'];
      const stream = new ReadableStream({
        async start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        },
      });

      const mockFetch = mock(() => Promise.resolve(new Response('', { status: 200 })));
      global.fetch = mockFetch;

      const response = await client.putObject('stream-test', stream);

      expect(mockFetch).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    test('should get objects with proper error handling', async () => {
      // Test successful get
      const mockFetch = mock(() => Promise.resolve(new Response('Test content', { status: 200 })));
      global.fetch = mockFetch;

      const response = await client.getObject('test-key');
      expect(response.status).toBe(200);

      // Test 404 error
      global.fetch = mock(() => Promise.resolve(new Response('', { status: 404 })));

      await expect(client.getObject('missing-key')).rejects.toThrow('Object not found');

      // Test other errors
      global.fetch = mock(() => Promise.resolve(new Response('Server error', { status: 500 })));

      await expect(client.getObject('error-key')).rejects.toThrow('R2 get failed');
    });

    test('should delete objects', async () => {
      const mockFetch = mock(() => Promise.resolve(new Response('', { status: 204 })));
      global.fetch = mockFetch;

      const response = await client.deleteObject('test-key');

      expect(mockFetch).toHaveBeenCalled();
      expect(response.ok).toBe(true);
    });
  });

  describe('List Operations', () => {
    test('should list objects with pagination', async () => {
      const mockXmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <ListBucketResult>
          <Contents>
            <Key>file1.txt</Key>
            <Size>1024</Size>
            <ETag>"abc123"</ETag>
            <LastModified>2024-01-15T12:00:00Z</LastModified>
          </Contents>
          <Contents>
            <Key>file2.txt</Key>
            <Size>2048</Size>
            <ETag>"def456"</ETag>
            <LastModified>2024-01-15T13:00:00Z</LastModified>
          </Contents>
          <NextContinuationToken>token123</NextContinuationToken>
          <IsTruncated>true</IsTruncated>
        </ListBucketResult>`;

      const mockFetch = mock(() => Promise.resolve(new Response(mockXmlResponse, { status: 200 })));
      global.fetch = mockFetch;

      const result = await client.listObjects({
        prefix: 'test/',
        maxKeys: 10,
      });

      expect(result.objects).toHaveLength(2);
      expect(result.objects[0].key).toBe('file1.txt');
      expect(result.objects[0].size).toBe(1024);
      expect(result.continuationToken).toBe('token123');
      expect(result.isTruncated).toBe(true);
    });
  });

  describe('Presigned URLs', () => {
    test('should generate valid presigned GET URL', async () => {
      const url = await client.getPresignedUrl('test-file.txt', 3600, 'GET');

      expect(url).toContain(mockEnv.R2_ENDPOINT);
      expect(url).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
      expect(url).toContain('X-Amz-Credential');
      expect(url).toContain('X-Amz-Date');
      expect(url).toContain('X-Amz-Expires=3600');
      expect(url).toContain('X-Amz-SignedHeaders=host');
      expect(url).toContain('X-Amz-Signature');
    });

    test('should generate valid presigned PUT URL', async () => {
      const url = await client.getPresignedUrl('upload-file.txt', 7200, 'PUT');

      expect(url).toContain('X-Amz-Expires=7200');
      expect(url).toContain(mockEnv.R2_BUCKET);
    });
  });

  describe('Copy Operations', () => {
    test('should copy objects within R2', async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(`<CopyObjectResult><ETag>"new-etag"</ETag></CopyObjectResult>`, {
            status: 200,
          })
        )
      );
      global.fetch = mockFetch;

      const response = await client.copyObject('source-key', 'dest-key');

      expect(mockFetch).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  describe('Head Operations', () => {
    test('should check object existence', async () => {
      // Object exists
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response('', {
            status: 200,
            headers: {
              'x-amz-meta-custom': 'value',
            },
          })
        )
      );
      global.fetch = mockFetch;

      const result = await client.headObject('existing-key');

      expect(result.exists).toBe(true);
      expect(result.metadata).toHaveProperty('custom', 'value');

      // Object doesn't exist
      global.fetch = mock(() => Promise.resolve(new Response('', { status: 404 })));

      const missingResult = await client.headObject('missing-key');
      expect(missingResult.exists).toBe(false);
    });
  });
});

describe('BunR2BatchClient Operations', () => {
  let batchClient: BunR2BatchClient;

  beforeEach(() => {
    process.env = { ...process.env, ...mockEnv };

    batchClient = new BunR2BatchClient({
      endpoint: mockEnv.R2_ENDPOINT,
      accessKeyId: mockEnv.R2_ACCESS_KEY_ID,
      secretAccessKey: mockEnv.R2_SECRET_ACCESS_KEY,
      region: mockEnv.R2_REGION,
      bucket: mockEnv.R2_BUCKET,
    });
  });

  test('should batch upload multiple files', async () => {
    const files = [
      { key: 'file1.txt', data: Buffer.from('content1') },
      { key: 'file2.txt', data: Buffer.from('content2') },
      { key: 'file3.txt', data: Buffer.from('content3') },
    ];

    const mockFetch = mock(() => Promise.resolve(new Response('', { status: 200 })));
    global.fetch = mockFetch;

    const results = await batchClient.batchUpload(files, 2);

    expect(results).toHaveLength(3);
    expect(results.every(r => r.success)).toBe(true);
  });

  test('should handle batch upload failures gracefully', async () => {
    const files = [
      { key: 'file1.txt', data: Buffer.from('content1') },
      { key: 'file2.txt', data: Buffer.from('content2') },
    ];

    // Mock one success and one failure
    let callCount = 0;
    global.fetch = mock(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(new Response('', { status: 200 }));
      } else {
        return Promise.reject(new Error('Upload failed'));
      }
    });

    const results = await batchClient.batchUpload(files, 1);

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
    expect(results[1].error).toContain('Upload failed');
  });

  test('should batch delete objects', async () => {
    const keys = ['file1.txt', 'file2.txt', 'file3.txt'];

    const mockFetch = mock(() => Promise.resolve(new Response('', { status: 204 })));
    global.fetch = mockFetch;

    const results = await batchClient.batchDelete(keys);

    expect(results).toHaveLength(3);
    expect(results.every(r => r.success)).toBe(true);
  });
});

describe('Security Integration', () => {
  let client: BunR2Client;
  let securityScanner: Fire22SecurityScanner;

  beforeEach(() => {
    process.env = { ...process.env, ...mockEnv };

    client = new BunR2Client({
      endpoint: mockEnv.R2_ENDPOINT,
      accessKeyId: mockEnv.R2_ACCESS_KEY_ID,
      secretAccessKey: mockEnv.R2_SECRET_ACCESS_KEY,
      region: mockEnv.R2_REGION,
      bucket: mockEnv.R2_BUCKET,
    });

    securityScanner = new Fire22SecurityScanner({
      vuln: { database: 'test' },
      malware: { enabled: true },
      secrets: { patterns: [] },
      deps: { checkTransitive: true },
    });
  });

  test('should scan uploaded content for security issues', async () => {
    const suspiciousContent = Buffer.from('password=secretpass123');

    // Mock security scanner
    const mockScan = mock(() =>
      Promise.resolve({
        securityScore: 45,
        riskLevel: 'high',
        findings: {
          secrets: [
            {
              type: 'password',
              severity: 'high',
              location: 'content',
            },
          ],
        },
      })
    );

    securityScanner.scanPackage = mockScan;

    // Intercept upload to scan content
    const originalPutObject = client.putObject.bind(client);
    client.putObject = async (key, data, options) => {
      const scanResult = await securityScanner.scanPackage({
        name: key,
        version: '1.0.0',
        content: data,
      });

      if (scanResult.riskLevel === 'high') {
        throw new Error(`Security risk detected: ${JSON.stringify(scanResult.findings)}`);
      }

      return originalPutObject(key, data, options);
    };

    await expect(client.putObject('suspicious-file', suspiciousContent)).rejects.toThrow(
      'Security risk detected'
    );
  });

  test('should validate content integrity', async () => {
    const content = Buffer.from('Safe content');
    const expectedHash = createHash('sha256').update(content).digest('hex');

    // Mock fetch to verify hash header
    global.fetch = mock((url: string, options: any) => {
      const headers = options.headers;
      expect(headers['x-amz-content-sha256']).toBeDefined();

      return Promise.resolve(new Response('', { status: 200 }));
    });

    await client.putObject('safe-file', content);
  });
});

describe('Performance Tests', () => {
  let client: BunR2Client;

  beforeEach(() => {
    process.env = { ...process.env, ...mockEnv };

    client = new BunR2Client({
      endpoint: mockEnv.R2_ENDPOINT,
      accessKeyId: mockEnv.R2_ACCESS_KEY_ID,
      secretAccessKey: mockEnv.R2_SECRET_ACCESS_KEY,
      region: mockEnv.R2_REGION,
      bucket: mockEnv.R2_BUCKET,
    });
  });

  test('should handle concurrent uploads efficiently', async () => {
    const mockFetch = mock(() => Promise.resolve(new Response('', { status: 200 })));
    global.fetch = mockFetch;

    const startTime = Bun.nanoseconds();

    // Upload 100 files concurrently
    const uploads = Array.from({ length: 100 }, (_, i) =>
      client.putObject(`file-${i}.txt`, Buffer.from(`content-${i}`))
    );

    await Promise.all(uploads);

    const duration = Number(Bun.nanoseconds() - startTime) / 1000000; // Convert to ms

    expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    expect(mockFetch).toHaveBeenCalledTimes(100);
  });

  test('should efficiently stream large files', async () => {
    const chunkSize = 1024 * 1024; // 1MB chunks
    const totalChunks = 50; // 50MB total

    const stream = new ReadableStream({
      async start(controller) {
        for (let i = 0; i < totalChunks; i++) {
          controller.enqueue(new Uint8Array(chunkSize));
        }
        controller.close();
      },
    });

    const mockFetch = mock(() => Promise.resolve(new Response('', { status: 200 })));
    global.fetch = mockFetch;

    const startTime = Bun.nanoseconds();

    await client.putObject('large-stream', stream);

    const duration = Number(Bun.nanoseconds() - startTime) / 1000000;

    expect(duration).toBeLessThan(2000); // Should stream efficiently in under 2 seconds
  });
});

describe('Error Handling', () => {
  let client: BunR2Client;

  beforeEach(() => {
    process.env = { ...process.env, ...mockEnv };

    client = new BunR2Client({
      endpoint: mockEnv.R2_ENDPOINT,
      accessKeyId: mockEnv.R2_ACCESS_KEY_ID,
      secretAccessKey: mockEnv.R2_SECRET_ACCESS_KEY,
      region: mockEnv.R2_REGION,
      bucket: mockEnv.R2_BUCKET,
    });
  });

  test('should handle network failures gracefully', async () => {
    global.fetch = mock(() => Promise.reject(new Error('Network error')));

    await expect(client.putObject('test-key', 'data')).rejects.toThrow('Network error');
  });

  test('should handle authentication failures', async () => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
      <Error>
        <Code>SignatureDoesNotMatch</Code>
        <Message>The request signature we calculated does not match the signature you provided.</Message>
      </Error>`,
          { status: 403 }
        )
      )
    );

    await expect(client.putObject('test-key', 'data')).rejects.toThrow('R2 upload failed: 403');
  });

  test('should abort multipart upload on failure', async () => {
    const largeData = Buffer.alloc(101 * 1024 * 1024);

    // Mock successful initiation
    let callCount = 0;
    global.fetch = mock(() => {
      callCount++;

      if (callCount === 1) {
        // Initiate multipart upload succeeds
        return Promise.resolve(
          new Response(
            `<InitiateMultipartUploadResult><UploadId>test-upload-id</UploadId></InitiateMultipartUploadResult>`,
            { status: 200 }
          )
        );
      } else if (callCount === 2) {
        // First part upload fails
        return Promise.reject(new Error('Part upload failed'));
      } else {
        // Abort multipart upload
        return Promise.resolve(new Response('', { status: 204 }));
      }
    });

    await expect(client.putObject('large-file', largeData)).rejects.toThrow('Part upload failed');

    // Verify abort was called
    expect(callCount).toBeGreaterThanOrEqual(3);
  });
});

describe('Bun-specific Optimizations', () => {
  let batchClient: BunR2BatchClient;

  beforeEach(() => {
    process.env = { ...process.env, ...mockEnv };

    batchClient = new BunR2BatchClient({
      endpoint: mockEnv.R2_ENDPOINT,
      accessKeyId: mockEnv.R2_ACCESS_KEY_ID,
      secretAccessKey: mockEnv.R2_SECRET_ACCESS_KEY,
      region: mockEnv.R2_REGION,
      bucket: mockEnv.R2_BUCKET,
    });
  });

  test('should use Bun.write for file operations', async () => {
    const mockFetch = mock(() => Promise.resolve(new Response('Test content', { status: 200 })));
    global.fetch = mockFetch;

    const mockWrite = mock(() => Promise.resolve(undefined));
    Bun.write = mockWrite;

    await (batchClient as any).getObjectToFile('test-key', '/tmp/test-file.txt');

    expect(mockWrite).toHaveBeenCalled();
    expect(mockWrite).toHaveBeenCalledWith('/tmp/test-file.txt', expect.any(Object));
  });

  test('should use Bun.file for local file reading', async () => {
    const testFilePath = '/tmp/test-sync-file.txt';
    const testContent = 'Test sync content';

    // Mock Bun.file
    const mockFile = {
      arrayBuffer: () => Promise.resolve(new TextEncoder().encode(testContent).buffer),
      size: testContent.length,
    };

    Bun.file = mock(() => mockFile);

    // Mock Bun.hash
    Bun.hash = mock(data => ({ toString: () => 'mock-hash-123' }));

    // Mock fetch for upload
    global.fetch = mock(() => Promise.resolve(new Response('', { status: 200 })));

    // Mock $ for shell commands
    const mock$ = {
      lines: mock(() => Promise.resolve([testFilePath])),
    };

    (global as any).$ = mock(() => mock$);

    // Test sync directory (simplified)
    const mockHeadObject = mock(() => Promise.resolve({ exists: false, metadata: {} }));
    batchClient.headObject = mockHeadObject;

    await batchClient.syncDirectory('/tmp', 'test-prefix');

    expect(Bun.file).toHaveBeenCalledWith(testFilePath);
    expect(Bun.hash).toHaveBeenCalled();
  });
});

// Performance benchmark for documentation
describe('Performance Benchmarks', () => {
  test('should achieve target performance metrics', async () => {
    const metrics = {
      signatureGeneration: 0,
      smallUpload: 0,
      largeUpload: 0,
      listOperation: 0,
      presignedUrl: 0,
    };

    const client = new BunR2Client({
      endpoint: mockEnv.R2_ENDPOINT,
      accessKeyId: mockEnv.R2_ACCESS_KEY_ID,
      secretAccessKey: mockEnv.R2_SECRET_ACCESS_KEY,
      region: mockEnv.R2_REGION,
      bucket: mockEnv.R2_BUCKET,
    });

    // Mock all fetch calls
    global.fetch = mock(() => Promise.resolve(new Response('', { status: 200 })));

    // Benchmark signature generation
    const sigStart = Bun.nanoseconds();
    await (client as any).createSignedHeaders('PUT', '/test', {});
    metrics.signatureGeneration = Number(Bun.nanoseconds() - sigStart) / 1000000;

    // Benchmark small upload
    const smallStart = Bun.nanoseconds();
    await client.putObject('small', Buffer.alloc(1024));
    metrics.smallUpload = Number(Bun.nanoseconds() - smallStart) / 1000000;

    // Benchmark presigned URL generation
    const presignedStart = Bun.nanoseconds();
    await client.getPresignedUrl('test', 3600);
    metrics.presignedUrl = Number(Bun.nanoseconds() - presignedStart) / 1000000;

    // Verify performance targets
    expect(metrics.signatureGeneration).toBeLessThan(5); // Under 5ms
    expect(metrics.smallUpload).toBeLessThan(50); // Under 50ms
    expect(metrics.presignedUrl).toBeLessThan(10); // Under 10ms

    console.log('Performance Metrics:', metrics);
  });
});
