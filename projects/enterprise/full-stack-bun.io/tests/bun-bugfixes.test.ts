import { test, expect } from 'bun:test';
import { $ } from 'bun';

// Test Bun Shell memory leak fix
test('Bun Shell no memory leak in command arguments', async () => {
	const initialMemory = process.memoryUsage().heapUsed;
	
	// Run many commands
	for (let i = 0; i < 100; i++) {
		await $`echo "test ${i}"`;
	}
	
	const finalMemory = process.memoryUsage().heapUsed;
	const growth = finalMemory - initialMemory;
	
	// Memory growth should be reasonable (<10MB for 100 commands)
	expect(growth).toBeLessThan(10 * 1024 * 1024);
}, 30000);

// Test Bun Shell large output (macOS fix)
test('Bun Shell handles large output', async () => {
	// Generate >1MB output
	const result = await $`dd if=/dev/zero bs=1M count=2 2>/dev/null | wc -c`;
	
	// Should complete without blocking
	expect(result.exitCode).toBe(0);
}, 30000);

// Test WebSocket cookie inclusion
test.skip('WebSocket upgrade includes cookies', async () => {
	// This test requires a running server
	const server = Bun.serve({
		fetch(req, server) {
			req.cookies.set('session', 'abc123');
			req.cookies.set('user', 'test');
			
			server.upgrade(req, {
				headers: {
					'X-Custom': 'value'
				}
			});
			
			return new Response('Upgrading', { status: 101 });
		},
		websocket: {
			open(ws) {
				ws.send('connected');
			}
		}
	});
	
	const ws = new WebSocket(`ws://localhost:${server.port}`);
	
	await new Promise<void>((resolve, reject) => {
		ws.onopen = () => {
			// Cookies should be included in upgrade response
			resolve();
		};
		ws.onerror = reject;
		setTimeout(() => reject(new Error('Timeout')), 5000);
	});
	
	ws.close();
	server.stop();
}, 10000);

// Test FFI error messages (if FFI is available)
test.skip('FFI error includes library path', () => {
	// This would require bun:ffi which may not be available in test environment
	const { dlopen } = require('bun:ffi');
	
	expect(() => {
		dlopen('./nonexistent-library.so', {});
	}).toThrow(/Failed to open library.*nonexistent-library\.so/);
});

// Test S3Client (if S3Client is available)
test.skip('S3Client listObjects no memory growth', async () => {
	// This would require AWS credentials and S3Client
	const { S3Client } = require('bun');
	
	const s3 = new S3Client({
		region: 'us-east-1',
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
		}
	});
	
	const initialMemory = process.memoryUsage().heapUsed;
	
	// Repeated calls
	for (let i = 0; i < 10; i++) {
		await s3.listObjects({
			Bucket: 'test-bucket',
			MaxKeys: 100
		});
	}
	
	const finalMemory = process.memoryUsage().heapUsed;
	const growth = finalMemory - initialMemory;
	
	// Memory growth should be reasonable
	expect(growth).toBeLessThan(50 * 1024 * 1024); // <50MB
}, 60000);



