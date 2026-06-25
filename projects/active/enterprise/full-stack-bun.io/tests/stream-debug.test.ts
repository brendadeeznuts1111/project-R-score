import { test, expect } from 'bun:test';

test('Bun.inspect Uint8Array perfect', () => {
	const oddsBytes = new Uint8Array([123, 34, 110, 102, 108]); // {"nfl"
	const inspected = Bun.inspect(oddsBytes);
	
	expect(inspected).toContain('Uint8Array');
	expect(inspected).toContain('[ 123, 34, 110, 102, 108 ]');
});

test('readableStreamTo multi-format', async () => {
	const testData = { test: true, value: 42 };
	const testJson = JSON.stringify(testData);
	
	const testStream = new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode(testJson));
			controller.close();
		}
	});

	const stream1 = testStream.clone();
	const stream2 = testStream.clone();
	const stream3 = testStream.clone();
	const stream4 = testStream.clone();
	const stream5 = testStream.clone();

	const [json, text, bytes, arrayBuffer, blob] = await Promise.all([
		Bun.readableStreamToJSON(stream1),
		Bun.readableStreamToText(stream2),
		Bun.readableStreamToBytes(stream3),
		Bun.readableStreamToArrayBuffer(stream4),
		Bun.readableStreamToBlob(stream5)
	]);

	expect(json).toEqual(testData);
	expect(text).toBe(testJson);
	expect(bytes[0]).toBe(123); // {
	expect(arrayBuffer.byteLength).toBeGreaterThan(0);
	expect(blob.size).toBeGreaterThan(0);
});

test('stripANSI SIEM clean', () => {
	const colored = '\u001b[31mERROR: Pinnacle timeout\u001b[0m';
	const clean = Bun.stripANSI(colored);
	
	expect(clean).toBe('ERROR: Pinnacle timeout'); // SIEM perfect
	expect(clean).not.toContain('\u001b');
});

test('stripANSI handles multiple ANSI codes', () => {
	const complexColored = '\u001b[1m\u001b[31mBOLD RED\u001b[0m\u001b[32mGREEN\u001b[0m';
	const clean = Bun.stripANSI(complexColored);
	
	expect(clean).toBe('BOLD REDGREEN');
	expect(clean).not.toContain('\u001b');
});

test('Uint8Array hex conversion for debugging', () => {
	const oddsBuffer = new Uint8Array([123, 34, 110, 102, 108, 34, 58, 123]); // {"nfl":{
	// Convert to hex manually (hexSlice might not be available)
	const hex = Array.from(oddsBuffer.slice(0, 8))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');
	
	expect(hex).toBe('7b226e666c223a7b');
	expect(hex.length).toBe(16); // 8 bytes * 2 hex chars
});

test('readableStreamTo handles empty stream', async () => {
	const emptyStream1 = new ReadableStream({
		start(controller) {
			controller.close();
		}
	});
	const emptyStream2 = new ReadableStream({
		start(controller) {
			controller.close();
		}
	});

	const text = await Bun.readableStreamToText(emptyStream1);
	const bytes = await Bun.readableStreamToBytes(emptyStream2);
	
	expect(text).toBe('');
	expect(bytes.length).toBe(0);
});

test('readableStreamTo handles large stream', async () => {
	const largeData = 'x'.repeat(100000);
	const stream1 = new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode(largeData));
			controller.close();
		}
	});
	const stream2 = new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode(largeData));
			controller.close();
		}
	});

	const text = await Bun.readableStreamToText(stream1);
	const bytes = await Bun.readableStreamToBytes(stream2);
	
	expect(text.length).toBe(100000);
	expect(bytes.length).toBe(100000);
});

test('Bun.inspect shows correct Uint8Array size', () => {
	const smallBuffer = new Uint8Array([1, 2, 3]);
	const largeBuffer = new Uint8Array(1000);
	
	const smallInspected = Bun.inspect(smallBuffer);
	const largeInspected = Bun.inspect(largeBuffer);
	
	expect(smallInspected).toContain('Uint8Array(3)');
	expect(largeInspected).toContain('Uint8Array(1000)');
});

test('readableStreamToJSON handles invalid JSON gracefully', async () => {
	const invalidStream = new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode('invalid json'));
			controller.close();
		}
	});

	try {
		await Bun.readableStreamToJSON(invalidStream);
		expect(false).toBe(true); // Should throw
	} catch (error) {
		expect(error).toBeDefined();
	}
});

test('stripANSI preserves non-ANSI text', () => {
	const plainText = 'Hello World';
	const cleaned = Bun.stripANSI(plainText);
	
	expect(cleaned).toBe(plainText);
});

test('hex conversion handles bounds correctly', () => {
	const buffer = new Uint8Array([1, 2, 3, 4, 5]);
	
	const toHex = (arr: Uint8Array) => Array.from(arr)
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');
	
	const hex1 = toHex(buffer.slice(0, 3));
	const hex2 = toHex(buffer.slice(2, 10)); // Beyond bounds
	
	expect(hex1).toBe('010203');
	expect(hex2).toBe('030405'); // Should only return available bytes
});

