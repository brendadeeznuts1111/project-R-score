import { test, expect } from 'bun:test';

// Mock DebugArsenal for testing
class DebugArsenal {
	static inspectCustomOdds(data: any) {
		return {
			markets: data.markets?.length || 0,
			avgEdge: data.avg_profit_pct?.toFixed(2) + '%',
			value: '$' + (data.total_value_usd?.toLocaleString() || '0'),
			[Bun.inspect.custom]: () => {
				return `OddsDebug {
  markets: ${data.markets?.length || 0},
  avgEdge: ${data.avg_profit_pct?.toFixed(2)}%,
  value: $${data.total_value_usd?.toLocaleString() || '0'}
}`;
			}
		};
	}
}

test('multi-format stream debug', async () => {
	const testData = '{"nfl":4.2}';
	
	// Create separate streams from same data
	const createStream = () => new ReadableStream({
		start(c) {
			c.enqueue(new TextEncoder().encode(testData));
			c.close();
		}
	});

	const stream1 = createStream();
	const stream2 = createStream();
	const stream3 = createStream();

	const [arrayBuffer, bytes, json] = await Promise.all([
		Bun.readableStreamToArrayBuffer(stream1),
		Bun.readableStreamToBytes(stream2),
		Bun.readableStreamToJSON(stream3)
	]);

	expect(arrayBuffer.byteLength).toBeGreaterThan(0);
	expect(bytes.length).toBeGreaterThan(0);
	expect(json).toEqual({ nfl: 4.2 });
});

test('custom inspect odds', () => {
	const customOdds = DebugArsenal.inspectCustomOdds({
		markets: [{ id: 1 }], // Array with 1 item = length 1
		avg_profit_pct: 0.042,
		total_value_usd: 1250000
	});

	const inspected = Bun.inspect(customOdds);
	expect(inspected).toContain('OddsDebug');
	expect(inspected).toContain('0.04%'); // Formatted as decimal
	expect(inspected).toContain('1,250,000');
});

test('Bun.inspect.table renders correctly', () => {
	const tableData = [
		{ league: 'nfl', profit: '5.82%', value: '$378K' },
		{ league: 'nba', profit: '4.37%', value: '$214K' }
	];

	const tableOutput = Bun.inspect.table(tableData, ['league', 'profit', 'value']);
	
	expect(tableOutput).toContain('nfl');
	expect(tableOutput).toContain('5.82%');
	expect(tableOutput).toContain('nba');
	expect(tableOutput).toContain('4.37%');
});

test('stripANSI cleans metrics', () => {
	const ansiValue = '\u001b[32m5670\u001b[0m';
	const cleanValue = Bun.stripANSI(ansiValue);
	
	expect(cleanValue).toBe('5670');
	expect(cleanValue).not.toContain('\u001b');
});

test('buffer inspect shows correct format', () => {
	const buffer = new Uint8Array([123, 34, 110, 102, 108]);
	const inspected = Bun.inspect(buffer);
	
	expect(inspected).toContain('Uint8Array');
	expect(inspected).toContain('[ 123, 34, 110, 102, 108 ]');
});

test('multi-format stream handles errors gracefully', async () => {
	const invalidData = 'invalid json';
	
	// Create separate streams
	const createInvalidStream = () => new ReadableStream({
		start(c) {
			c.enqueue(new TextEncoder().encode(invalidData));
			c.close();
		}
	});

	const stream1 = createInvalidStream();
	const stream2 = createInvalidStream();

	const [json, text] = await Promise.all([
		Bun.readableStreamToJSON(stream1).catch(() => null),
		Bun.readableStreamToText(stream2)
	]);

	expect(json).toBeNull();
	expect(text).toBe('invalid json');
});

test('inspect.table handles empty data', () => {
	const emptyData: any[] = [];
	const tableOutput = Bun.inspect.table(emptyData, ['league', 'profit']);
	
	expect(tableOutput).toBeDefined();
});

test('custom inspect returns formatted string', () => {
	const customOdds = DebugArsenal.inspectCustomOdds({
		markets: [{ id: 1 }, { id: 2 }], // Array with 2 items
		avg_profit_pct: 0.05,
		total_value_usd: 500000
	});

	const inspected = Bun.inspect(customOdds);
	
	expect(inspected).toContain('OddsDebug');
	expect(inspected).toContain('markets: 2'); // Array length is 2
	expect(inspected).toContain('0.05%'); // Formatted as decimal percentage
	expect(inspected).toContain('500,000');
});

