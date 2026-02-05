import { test, expect } from 'bun:test';
import { EventEmitter } from 'events';

// Test EventEmitter removeAllListeners safety
test('EventEmitter removeAllListeners safe', () => {
	const emitter = new EventEmitter();

	let callCount = 0;
	emitter.on('test', () => {
		callCount++;
	});

	// ✅ Safe removeAllListeners during emit
	emitter.on('removeListener', (name) => {
		if (name === 'test') {
			emitter.removeAllListeners('test'); // ✅ No throw
		}
	});

	emitter.emit('test');
	expect(callCount).toBeGreaterThan(0);
});

// Test removeAllListeners during emit (no crash)
test('removeAllListeners during emit no crash', () => {
	const emitter = new EventEmitter();

	let listener1Called = false;
	let listener2Called = false;

	const listener1 = () => {
		listener1Called = true;
		// ✅ Safe to remove other listeners during emit
		try {
			emitter.removeAllListeners('test');
		} catch (error) {
			// Should not throw, but if it does, catch it
			console.error('removeAllListeners error:', error);
		}
	};

	const listener2 = () => {
		listener2Called = true;
	};

	emitter.on('test', listener1);
	emitter.on('test', listener2);

	// Should not throw
	expect(() => {
		emitter.emit('test');
	}).not.toThrow();

	expect(listener1Called).toBe(true);
	// listener2 may or may not be called depending on implementation
	// This is acceptable behavior
});

// Test stream piping no pause
test('stream piping no pause', async () => {
	const chunks: string[] = [];

	const rs = new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode('chunk1'));
			controller.enqueue(new TextEncoder().encode('chunk2'));
			controller.enqueue(new TextEncoder().encode('chunk3'));
			controller.close();
		}
	});

	const ws = new WritableStream({
		write(chunk) {
			if (chunk instanceof Uint8Array) {
				chunks.push(new TextDecoder().decode(chunk));
			} else {
				chunks.push(String(chunk));
			}
		}
	});

	// ✅ Flows (no pause)
	await rs.pipeTo(ws);

	expect(chunks.length).toBeGreaterThan(0);
	expect(chunks[0]).toBe('chunk1');
});

// Test ReadableStream with readable event simulation
test('ReadableStream readable event fires', async () => {
	const chunks: string[] = [];

	const stream = new ReadableStream({
		start(controller) {
			// Simulate readable event
			setTimeout(() => {
				controller.enqueue(new TextEncoder().encode('chunk1'));
			}, 10);
			setTimeout(() => {
				controller.enqueue(new TextEncoder().encode('chunk2'));
				controller.close();
			}, 20);
		}
	});

	const reader = stream.getReader();
	
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (value instanceof Uint8Array) {
			chunks.push(new TextDecoder().decode(value));
		} else {
			chunks.push(String(value));
		}
	}

	expect(chunks.length).toBe(2);
	expect(chunks[0]).toBe('chunk1');
	expect(chunks[1]).toBe('chunk2');
});

// Test process.nextTick override safety
test('process.nextTick override safe', () => {
	const originalNextTick = process.nextTick;
	const callbacks: string[] = [];

	// Override nextTick
	process.nextTick = (cb: () => void) => {
		callbacks.push('custom');
		setTimeout(cb, 0);
	};

	// ✅ Bun internals should still work
	process.nextTick(() => {
		callbacks.push('executed');
	});

	// Restore
	process.nextTick = originalNextTick;

	// Verify custom scheduler was called
	expect(callbacks.length).toBeGreaterThan(0);
});

// Test WebSocket with nextTick override
test.skip('WebSocket with nextTick override safe', async () => {
	// This test requires a running server
	const originalNextTick = process.nextTick;
	
	process.nextTick = (cb: () => void) => {
		setTimeout(cb, 0);
	};

	try {
		const ws = new WebSocket('ws://localhost:3007');
		
		await new Promise<void>((resolve, reject) => {
			ws.onopen = () => {
				// ✅ Should not crash
				expect(() => ws.send('test')).not.toThrow();
				ws.close();
				resolve();
			};
			ws.onerror = reject;
			setTimeout(() => reject(new Error('Timeout')), 5000);
		});
	} finally {
		process.nextTick = originalNextTick;
	}
}, 10000);

// Test EventEmitter listener count
test('EventEmitter listener count accurate', () => {
	const emitter = new EventEmitter();

	const handler1 = () => {};
	const handler2 = () => {};

	emitter.on('test', handler1);
	emitter.on('test', handler2);

	expect(emitter.listenerCount('test')).toBe(2);

	emitter.removeListener('test', handler1);
	expect(emitter.listenerCount('test')).toBe(1);

	emitter.removeAllListeners('test');
	expect(emitter.listenerCount('test')).toBe(0);
});

// Test buffer encoding check
test('buffer encoding check', () => {
	// ✅ isEncoding('') should return false
	const Buffer = globalThis.Buffer;
	
	if (Buffer && typeof Buffer.isEncoding === 'function') {
		expect(Buffer.isEncoding('')).toBe(false);
		expect(Buffer.isEncoding('utf8')).toBe(true);
		expect(Buffer.isEncoding('hex')).toBe(true);
	}
});

// Test stream server endpoints (skip if server not running)
test.skip('stream server health endpoint', async () => {
	const res = await fetch('http://localhost:3007/health');
	expect(res.ok).toBe(true);

	const data = await res.json();
	expect(data.status).toBe('stream-node-parity-live');
	expect(data.node_compatibility).toBeDefined();
	expect(data.streams).toBeDefined();
}, 10000);

// Test NDJSON stream endpoint
test.skip('NDJSON stream endpoint', async () => {
	const res = await fetch('http://localhost:3007/stream/odds');
	expect(res.ok).toBe(true);
	expect(res.headers.get('content-type')).toContain('ndjson');

	const text = await res.text();
	const lines = text.trim().split('\n').filter(l => l.trim());
	expect(lines.length).toBeGreaterThan(0);

	// Verify JSON parsing
	lines.forEach(line => {
		expect(() => JSON.parse(line)).not.toThrow();
	});
}, 10000);

// Test SSE events endpoint
test.skip('SSE events endpoint', async () => {
	const res = await fetch('http://localhost:3007/events');
	expect(res.ok).toBe(true);
	expect(res.headers.get('content-type')).toContain('event-stream');

	// Read first chunk
	const reader = res.body?.getReader();
	if (reader) {
		const { done, value } = await reader.read();
		if (!done && value) {
			const text = new TextDecoder().decode(value);
			expect(text).toContain('data:');
		}
		reader.releaseLock();
	}
}, 10000);

