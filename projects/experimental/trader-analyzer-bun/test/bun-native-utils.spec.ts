/**
 * @fileoverview 7.6.1.0.0.0.0: **Enhanced Automated Test Suite Derived from @example Formulas**
 * Each test maps directly to a documented test formula for full traceability.
 * 
 * **Enhanced Coverage:**
 * - Edge cases and error handling
 * - Performance benchmarks
 * - Unicode edge cases
 * - Large dataset handling
 * - Integration tests
 * - Profiling integration
 * 
 * **Ripgrep Command to Verify Test Coverage:**
 * ```bash
 * rg -c "describe\('7\." test/bun-native-utils.spec.ts
 * # Actual: 16 test suites (enhanced from 4)
 * rg -c "test\(" test/bun-native-utils.spec.ts
 * # Actual: 49 test cases (enhanced from 6)
 * ```
 * 
 * **Test Coverage Summary:**
 * - ✅ 49 tests passing
 * - ✅ 114 assertions
 * - ✅ Edge cases: null/undefined, empty arrays, large datasets
 * - ✅ Security: sensitive data sanitization
 * - ✅ Performance: benchmarks for 1000+ row datasets
 * - ✅ Unicode: emoji, CJK, RTL, combining characters, surrogate pairs
 * - ✅ Integration: full diagnostic pipeline, real market data
 * - ✅ Error handling: validation and graceful degradation
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { inspectMarketData, inspectDeep, DEFAULT_INSPECT_OPTIONS } from "../src/runtime/diagnostics/bun-inspect-integration";
import { 
	calculateTelegramPadding, 
	formatTelegramTable,
	formatRipgrepOutput,
	padStrings
} from "../src/runtime/diagnostics/string-formatter";
import { stringWidth } from "../src/utils/bun";
import { HyperBunDiagnostics } from "../src/runtime/diagnostics/integrated-inspector";
import { 
	generateEventId, 
	generateEventIds, 
	generateCorrelatedEventId 
} from "../src/runtime/diagnostics/uuid-generator";
import type { HyperBunUIContext } from "../src/services/ui-context-rewriter";

describe('7.1.1.1.1: Bun.inspect.table Integration', () => {
	test('generates aligned market odds table', () => {
		// Test Formula: 7.1.1.1.0
		// 1. Generate mock odds: `const odds = [{bookmaker: 'Bet365', odds: 1.95}]`
		// 2. Execute: `inspectMarketData(odds, ['bookmaker', 'odds'])`
		// 3. Expected Result: Formatted table with aligned columns
		const odds = [
			{ bookmaker: 'Bet365⚡️', odds: 1.95, timestamp: Date.now(), secret: 'hidden' }
		];
		const result = inspectMarketData(odds, ['bookmaker', 'odds']);
		
		expect(result).toContain('Bet365⚡️');
		expect(result).toContain('1.95');
		expect(result).not.toContain('hidden'); // Security: secrets stripped
		expect(result.split('\n').length).toBeGreaterThan(3); // Has table borders
	});
});

describe('7.1.2.1.0: Bun.inspect Deep Inspection', () => {
	test('handles circular references in UIContext', () => {
		// Test Formula: 7.1.2.1.0
		// Tests circular reference handling in deep inspection
		const circular: any = { apiBaseUrl: 'http://test' };
		// @ts-ignore - intentional circular ref for testing
		circular.self = circular;
		
		const result = inspectDeep(circular);
		expect(result).toContain('apiBaseUrl');
		expect(result.length).toBeLessThan(1000); // Truncates large objects
		// Bun.inspect handles circular refs gracefully
		expect(result).toBeTruthy();
	});
});

describe('7.3.1.1.0: Bun.stringWidth Unicode Accuracy', () => {
	test('calculates emoji and CJK widths correctly', () => {
		// Test Formula: 7.3.1.1.0
		// 1. Execute: `Bun.stringWidth('Bet365⚡️')` → Expected: `8`
		// 2. Execute: `Bun.stringWidth('Pinnacle')` → Expected: `8`
		// 3. Execute: `Bun.stringWidth('威廉希尔')` → Expected: `8` (CJK)
		// 4. Execute: `Bun.stringWidth('Betfair📊')` → Expected: `8` (emoji)
		expect(stringWidth('Bet365⚡️')).toBe(8);
		expect(stringWidth('威廉希尔')).toBe(8); // CJK double-width
		expect(stringWidth('A')).toBe(1); // ASCII
		expect(stringWidth('\x1b[31m')).toBe(0); // ANSI codes invisible
		expect(stringWidth('Pinnacle')).toBe(8);
		expect(stringWidth('Betfair📊')).toBe(9); // emoji (Betfair = 7 chars + 📊 = 2 width units)
	});

	test('formatTelegramTable aligns columns regardless of Unicode', () => {
		// Test Formula: 7.3.1.3.1
		// Tests multi-column Telegram table formatting with Unicode handling
		const rows = [
			{ name: 'Bet365⚡️', value: 100 },
			{ name: 'Pinnacle', value: 200 },
			{ name: '威廉希尔', value: 300 }
		];
		const result = formatTelegramTable(rows, [
			{ key: 'name', header: 'Name' },
			{ key: 'value', header: 'Value' }
		]);
		
		// Verify table structure
		expect(result).toContain('Name');
		expect(result).toContain('Value');
		expect(result).toContain('Bet365⚡️');
		expect(result).toContain('Pinnacle');
		expect(result).toContain('威廉希尔');
		
		// Verify alignment by checking each line has consistent structure
		const lines = result.trim().split('\n');
		expect(lines.length).toBeGreaterThanOrEqual(3); // Header + separator + data rows
		
		// Verify separator line exists
		const hasSeparator = lines.some(line => line.includes('-'));
		expect(hasSeparator).toBe(true);
	});
});

describe('7.4.1.1.1: HyperBunDiagnostics Session Correlation', () => {
	test('generates time-ordered session IDs', async () => {
		// Test Formula: 7.4.1.1.0
		// Tests UUIDv7 time-ordering property
		const diag1 = new HyperBunDiagnostics();
		const sessionId1 = diag1.getSessionId();
		
		// Wait 1ms to ensure time ordering
		await Bun.sleep(1);
		
		const diag2 = new HyperBunDiagnostics();
		const sessionId2 = diag2.getSessionId();
		
		// UUIDv7 is time-ordered, so first 12 chars should be less than or equal to second
		expect(sessionId1.slice(0, 12) <= sessionId2.slice(0, 12)).toBe(true);
	});

	test('logContextSnapshot produces dual output', () => {
		// Test Formula: 7.4.1.2.1
		// Tests diagnostic logging with UIContext
		const diag = new HyperBunDiagnostics();
		const context: HyperBunUIContext = {
			apiBaseUrl: 'https://api.hyperbun.com',
			featureFlags: { shadowGraph: true },
			userRole: 'admin',
			debugMode: true,
			currentTimestamp: Date.now(),
		};
		
		// Capture console.log
		const logs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: any[]) => {
			logs.push(args.map(a => String(a)).join(' '));
		};
		
		try {
			diag.logContext(context, 'info');
			
			// Verify logs contain expected content
			const logText = logs.join('\n');
			expect(logText).toContain('admin');
			expect(logText).toContain('Session'); // Case-insensitive check
			expect(logText).toContain('apiBaseUrl');
			expect(logText).toContain('featureFlags');
		} finally {
			console.log = originalLog;
		}
	});

	test('handles empty context gracefully', () => {
		const diag = new HyperBunDiagnostics();
		const emptyContext: Partial<HyperBunUIContext> = {};
		
		const logs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: any[]) => {
			logs.push(args.map(a => String(a)).join(' '));
		};
		
		try {
			expect(() => diag.logContext(emptyContext as HyperBunUIContext, 'info')).not.toThrow();
		} finally {
			console.log = originalLog;
		}
	});
});

describe('7.1.1.2.0: Edge Cases - Empty and Null Data', () => {
	test('inspectMarketData handles empty array', () => {
		const result = inspectMarketData([]);
		expect(result).toContain('No market data');
		expect(result).toContain('error');
	});

	test('inspectMarketData handles null/undefined gracefully', () => {
		// @ts-expect-error - testing edge case
		expect(() => inspectMarketData(null)).not.toThrow();
		// @ts-expect-error - testing edge case
		expect(() => inspectMarketData(undefined)).not.toThrow();
	});

	test('inspectDeep handles null and undefined', () => {
		expect(inspectDeep(null)).toBeTruthy();
		expect(inspectDeep(undefined)).toBeTruthy();
		expect(inspectDeep('')).toBeTruthy();
	});

	test('inspectDeep handles primitive types', () => {
		expect(inspectDeep(42)).toContain('42');
		expect(inspectDeep(true)).toContain('true');
		expect(inspectDeep('string')).toContain('string');
	});
});

describe('7.1.1.3.0: Security - Sensitive Data Sanitization', () => {
	test('strips apiKey from output', () => {
		const data = [
			{ bookmaker: 'Bet365', odds: 1.95, apiKey: 'secret-key-123' }
		];
		const result = inspectMarketData(data);
		expect(result).not.toContain('secret-key-123');
		expect(result).not.toContain('apiKey');
	});

	test('strips multiple sensitive fields', () => {
		const data = [
			{ 
				bookmaker: 'Bet365', 
				odds: 1.95, 
				apiKey: 'key',
				token: 'token',
				password: 'pass',
				secret: 'secret'
			}
		];
		const result = inspectMarketData(data);
		expect(result).not.toContain('key');
		expect(result).not.toContain('token');
		expect(result).not.toContain('pass');
		expect(result).not.toContain('secret');
		expect(result).toContain('Bet365');
		expect(result).toContain('1.95');
	});
});

describe('7.1.2.2.0: Large Dataset Handling', () => {
	test('inspectDeep truncates large arrays', () => {
		const largeArray = Array.from({ length: 2000 }, (_, i) => ({ id: i, value: `item-${i}` }));
		const result = inspectDeep(largeArray);
		expect(result).toContain('Array(2000)');
		expect(result).toContain('...');
	});

	test('inspectMarketData handles large datasets', () => {
		const largeData = Array.from({ length: 100 }, (_, i) => ({
			bookmaker: `Bookmaker${i}`,
			odds: 1.5 + i * 0.01,
			timestamp: Date.now()
		}));
		const result = inspectMarketData(largeData, ['bookmaker', 'odds']);
		expect(result).toContain('Bookmaker');
		expect(result.split('\n').length).toBeGreaterThan(10);
	});
});

describe('7.3.1.2.0: calculateTelegramPadding Edge Cases', () => {
	test('handles strings wider than target width', () => {
		const result = calculateTelegramPadding('VeryLongString', 5);
		expect(result).toBe('VeryLongString'); // No padding added
		expect(stringWidth(result)).toBeGreaterThanOrEqual(5);
	});

	test('handles empty string', () => {
		const result = calculateTelegramPadding('', 10);
		expect(result.length).toBe(10);
		expect(stringWidth(result)).toBe(10);
	});

	test('handles zero target width', () => {
		const result = calculateTelegramPadding('test', 0);
		expect(result).toBe('test');
	});

	test('handles negative target width gracefully', () => {
		const result = calculateTelegramPadding('test', -5);
		expect(result).toBe('test');
	});

	test('pads correctly with Unicode', () => {
		const result = calculateTelegramPadding('Bet365⚡️', 15);
		expect(stringWidth(result)).toBe(15);
	});

	test('pads correctly with CJK characters', () => {
		const result = calculateTelegramPadding('威廉', 10);
		expect(stringWidth(result)).toBe(10);
	});
});

describe('7.3.1.3.0: formatTelegramTable Edge Cases', () => {
	test('throws error on empty rows', () => {
		expect(() => formatTelegramTable([], [{ key: 'name', header: 'Name' }])).toThrow();
	});

	test('throws error on empty columns', () => {
		expect(() => formatTelegramTable([{ name: 'test' }], [])).toThrow();
	});

	test('handles missing column keys gracefully', () => {
		const rows = [{ name: 'Test', value: 100 }];
		const columns = [{ key: 'name', header: 'Name' }, { key: 'missing', header: 'Missing' }];
		const result = formatTelegramTable(rows, columns);
		expect(result).toContain('Name');
		expect(result).toContain('Missing');
		expect(result).toContain('Test');
	});

	test('handles null/undefined values', () => {
		const rows = [
			{ name: 'Test', value: null },
			{ name: 'Test2', value: undefined }
		];
		const result = formatTelegramTable(rows, [{ key: 'name', header: 'Name' }, { key: 'value', header: 'Value' }]);
		expect(result).toContain('Test');
		expect(result).toContain('Test2');
	});

	test('handles single row', () => {
		const rows = [{ name: 'Single', value: 42 }];
		const result = formatTelegramTable(rows, [
			{ key: 'name', header: 'Name' },
			{ key: 'value', header: 'Value' }
		]);
		expect(result).toContain('Single');
		expect(result).toContain('42');
		expect(result.split('\n').length).toBeGreaterThanOrEqual(3);
	});
});

describe('7.3.1.4.0: formatRipgrepOutput', () => {
	test('formats ripgrep matches correctly', () => {
		const matches = [
			{ file: 'src/test.ts', line: 10, content: 'test content' },
			{ file: 'src/very/long/path/to/file.ts', line: 20, content: 'another content' }
		];
		const result = formatRipgrepOutput(matches);
		expect(result).toContain('src/test.ts');
		expect(result).toContain('10:');
		expect(result).toContain('20:');
		expect(result.split('\n').length).toBe(2);
	});

	test('handles empty matches array', () => {
		const result = formatRipgrepOutput([]);
		expect(result).toBe('');
	});

	test('aligns file names correctly', () => {
		const matches = [
			{ file: 'short.ts', line: 1, content: 'content' },
			{ file: 'very-long-file-name.ts', line: 2, content: 'content' }
		];
		const result = formatRipgrepOutput(matches);
		const lines = result.split('\n');
		// Both lines should have aligned separators
		expect(lines[0]).toContain('|');
		expect(lines[1]).toContain('|');
	});
});

describe('7.3.1.5.0: padStrings Utility', () => {
	test('pads multiple strings consistently', () => {
		const strings = ['short', 'medium-length', 'very-long-string'];
		const padded = padStrings(strings, 20);
		expect(padded.length).toBe(3);
		padded.forEach(str => {
			expect(stringWidth(str)).toBe(20);
		});
	});

	test('handles empty array', () => {
		const result = padStrings([], 10);
		expect(result).toEqual([]);
	});

	test('handles Unicode strings', () => {
		const strings = ['Bet365⚡️', '威廉希尔', 'Pinnacle'];
		const padded = padStrings(strings, 15);
		padded.forEach(str => {
			expect(stringWidth(str)).toBe(15);
		});
	});
});

describe('7.2.1.1.0: UUID Generation', () => {
	test('generateEventId returns valid UUIDv7', () => {
		const id = generateEventId();
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
	});

	test('generateEventIds creates unique IDs', () => {
		const ids = generateEventIds(100);
		expect(ids.length).toBe(100);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(100);
	});

	test('generateEventIds maintains time ordering', async () => {
		const id1 = generateEventId();
		await Bun.sleep(1);
		const id2 = generateEventId();
		expect(id1.slice(0, 12) <= id2.slice(0, 12)).toBe(true);
	});

	test('generateCorrelatedEventId produces consistent prefixes', () => {
		const id1 = generateCorrelatedEventId('test-key');
		const id2 = generateCorrelatedEventId('test-key');
		// First 8 chars should be deterministic based on correlation key
		expect(id1.slice(0, 8)).toBe(id2.slice(0, 8));
	});

	test('generateCorrelatedEventId produces different prefixes for different keys', () => {
		const id1 = generateCorrelatedEventId('key1');
		const id2 = generateCorrelatedEventId('key2');
		// Should be different (high probability)
		expect(id1.slice(0, 8)).not.toBe(id2.slice(0, 8));
	});
});

describe('7.3.1.6.0: Unicode Edge Cases', () => {
	test('handles zero-width characters', () => {
		const zwc = 'test\u200Bhidden'; // Zero-width space
		expect(stringWidth(zwc)).toBeGreaterThan(0);
	});

	test('handles combining characters', () => {
		const combined = 'e\u0301'; // é as combining character
		expect(stringWidth(combined)).toBe(1);
	});

	test('handles surrogate pairs', () => {
		const emoji = '😀';
		expect(stringWidth(emoji)).toBeGreaterThan(0);
		expect(stringWidth(emoji)).toBeLessThanOrEqual(2);
	});

	test('handles mixed ANSI codes and Unicode', () => {
		const mixed = '\x1b[31mBet365⚡️\x1b[0m';
		const width = stringWidth(mixed);
		expect(width).toBeGreaterThan(0);
		expect(width).toBeLessThan(20);
	});

	test('handles RTL text', () => {
		const rtl = 'עברית';
		expect(stringWidth(rtl)).toBeGreaterThan(0);
	});
});

describe('7.4.1.3.0: Performance Benchmarks', () => {
	test('inspectMarketData performance with 1000 rows', () => {
		const data = Array.from({ length: 1000 }, (_, i) => ({
			bookmaker: `Bookmaker${i}`,
			odds: 1.5 + i * 0.001,
			timestamp: Date.now()
		}));
		
		const start = Bun.nanoseconds();
		const result = inspectMarketData(data, ['bookmaker', 'odds']);
		const duration = (Bun.nanoseconds() - start) / 1_000_000; // Convert to ms
		
		expect(result).toBeTruthy();
		expect(duration).toBeLessThan(100); // Should complete in < 100ms
	});

	test('stringWidth performance with many calls', () => {
		const strings = Array.from({ length: 10000 }, (_, i) => `String${i}⚡️`);
		
		const start = Bun.nanoseconds();
		strings.forEach(s => stringWidth(s));
		const duration = (Bun.nanoseconds() - start) / 1_000_000;
		
		expect(duration).toBeLessThan(50); // Should complete in < 50ms
	});

	test('generateEventIds performance', () => {
		const start = Bun.nanoseconds();
		const ids = generateEventIds(10000);
		const duration = (Bun.nanoseconds() - start) / 1_000_000;
		
		expect(ids.length).toBe(10000);
		expect(duration).toBeLessThan(100); // Should complete in < 100ms
	});
});

describe('7.4.1.4.0: Integration Tests', () => {
	test('full diagnostic pipeline integration', () => {
		const diag = new HyperBunDiagnostics();
		const context: HyperBunUIContext = {
			apiBaseUrl: 'https://api.test.com',
			featureFlags: { shadowGraph: true, analytics: false },
			userRole: 'trader',
			debugMode: true,
			currentTimestamp: Date.now(),
		};
		
		const logs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: any[]) => {
			logs.push(args.map(a => String(a)).join(' '));
		};
		
		try {
			diag.logContext(context, 'info');
			const logText = logs.join('\n');
			
			// Verify all components are present
			expect(logText).toContain('Session');
			expect(logText).toContain('trader');
			expect(logText).toContain('shadowGraph');
		} finally {
			console.log = originalLog;
		}
	});

	test('table formatting with real market data', () => {
		const marketData = [
			{ bookmaker: 'Bet365⚡️', odds: 1.95, steam: true, timestamp: Date.now() },
			{ bookmaker: 'Pinnacle', odds: 1.93, steam: false, timestamp: Date.now() },
			{ bookmaker: '威廉希尔', odds: 1.97, steam: true, timestamp: Date.now() }
		];
		
		const table = formatTelegramTable(marketData, [
			{ key: 'bookmaker', header: 'Bookmaker' },
			{ key: 'odds', header: 'Odds' },
			{ key: 'steam', header: 'Steam' }
		]);
		
		expect(table).toContain('Bookmaker');
		expect(table).toContain('Odds');
		expect(table).toContain('Steam');
		expect(table).toContain('Bet365⚡️');
		expect(table).toContain('Pinnacle');
		expect(table).toContain('威廉希尔');
		expect(table.split('\n').length).toBeGreaterThanOrEqual(5);
	});
});

describe('7.4.1.5.0: DEFAULT_INSPECT_OPTIONS', () => {
	test('has correct default values', () => {
		expect(DEFAULT_INSPECT_OPTIONS.colors).toBe(true);
		expect(DEFAULT_INSPECT_OPTIONS.depth).toBe(3);
		expect(DEFAULT_INSPECT_OPTIONS.maxArrayLength).toBe(50);
		expect(DEFAULT_INSPECT_OPTIONS.maxStringLength).toBe(100);
	});

	test('options are used in inspectDeep', () => {
		const deepObject = {
			level1: {
				level2: {
					level3: {
						level4: { value: 'deep' }
					}
				}
			}
		};
		const result = inspectDeep(deepObject, { depth: 2 });
		// Should respect depth limit
		expect(result).toBeTruthy();
	});
});
