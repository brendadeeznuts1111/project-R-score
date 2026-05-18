// stream-converter-scanner.test.ts
import {test, expect, describe} from 'bun:test';
import {StreamConverterScanner, BUN_STREAM_CONVERTER_RULES, BUN_DETECTION_PATTERNS} from './stream-converter-scanner';

const scanner = new StreamConverterScanner();

describe('BUN_STREAM_CONVERTER_RULES', () => {
	test('5 migration rules defined', () => {
		expect(BUN_STREAM_CONVERTER_RULES.length).toBe(5);
	});

	test('all rules have unique ids', () => {
		const ids = BUN_STREAM_CONVERTER_RULES.map(r => r.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	test('all rScores are >= 0.95', () => {
		for (const rule of BUN_STREAM_CONVERTER_RULES) {
			expect(rule.rScore).toBeGreaterThanOrEqual(0.95);
		}
	});

	test('all telemetry has positive performanceGain', () => {
		for (const rule of BUN_STREAM_CONVERTER_RULES) {
			expect(rule.telemetry.performanceGain).toBeGreaterThan(0);
			expect(rule.telemetry.memoryReduction).toBeGreaterThan(0);
			expect(rule.telemetry.securityImprovement).toBe(100);
		}
	});

	test('all rules have documentation URLs', () => {
		for (const rule of BUN_STREAM_CONVERTER_RULES) {
			expect(rule.documentation).toStartWith('https://bun.com/docs/api/streams');
		}
	});
});

describe('BUN_DETECTION_PATTERNS', () => {
	test('4 detection patterns defined', () => {
		expect(BUN_DETECTION_PATTERNS.length).toBe(4);
	});
});

describe('StreamConverterScanner', () => {
	test('detects new Response().text() pattern', () => {
		const code = 'const text = await new Response(stream).text();';
		const matches = scanner.scan(code);
		expect(matches.length).toBe(1);
		expect(matches[0].rule).toBe('ResponseConstructor');
		expect(matches[0].converter).toBe('readableStreamToText');
	});

	test('detects Buffer.concat pattern', () => {
		const code = 'const buf = Buffer.concat(chunks);';
		const matches = scanner.scan(code);
		expect(matches.length).toBe(1);
		expect(matches[0].rule).toBe('BufferConcat');
		expect(matches[0].converter).toBe('readableStreamToBytes');
	});

	test('detects new TextDecoder pattern', () => {
		const code = 'const dec = new TextDecoder(); const text = dec.decode(chunk);';
		const matches = scanner.scan(code);
		expect(matches.length).toBe(1);
		expect(matches[0].rule).toBe('TextDecoder');
		expect(matches[0].converter).toBe('readableStreamToText');
	});

	test('detects JSON.parse with stream reference', () => {
		const code = 'const obj = JSON.parse(await streamToText(stream));';
		const matches = scanner.scan(code);
		expect(matches.length).toBe(1);
		expect(matches[0].rule).toBe('JSONParse');
		expect(matches[0].converter).toBe('readableStreamToJSON');
	});

	test('detects multiple patterns in one file', () => {
		const code = `
      const a = await new Response(s1).text();
      const b = Buffer.concat(chunks);
      const c = new TextDecoder();
    `;
		const matches = scanner.scan(code);
		expect(matches.length).toBe(3);
	});

	test('returns empty for clean code', () => {
		const code = 'const text = await Bun.readableStreamToText(stream);';
		const matches = scanner.scan(code);
		expect(matches.length).toBe(0);
	});

	test('match includes line and column', () => {
		const code = 'line1\nconst x = new Response(s).text();\nline3';
		const matches = scanner.scan(code);
		expect(matches.length).toBe(1);
		expect(matches[0].line).toBe(2);
		expect(matches[0].column).toBeGreaterThan(0);
	});

	test('match includes context window', () => {
		const code = 'const text = await new Response(stream).text();';
		const matches = scanner.scan(code);
		expect(matches[0].context.length).toBeGreaterThan(0);
		expect(matches[0].context).toContain('Response');
	});

	test('rScore is populated from migration matrix', () => {
		const code = 'const text = await new Response(stream).text();';
		const matches = scanner.scan(code);
		expect(matches[0].rScore).toBe(1.0);
	});
});

describe('StreamConverterScanner.report()', () => {
	test('report aggregates matches', () => {
		const code = `
      const a = await new Response(s1).text();
      const b = await new Response(s2).json();
    `;
		const report = scanner.report('test.ts', code);
		expect(report.file).toBe('test.ts');
		expect(report.totalOpportunities).toBe(2);
		expect(report.estimatedSpeedup).toBeGreaterThan(0);
		expect(report.estimatedMemorySaved).toBeGreaterThan(0);
	});

	test('report for clean file', () => {
		const report = scanner.report('clean.ts', 'const x = 1;');
		expect(report.totalOpportunities).toBe(0);
		expect(report.estimatedSpeedup).toBe(0);
		expect(report.estimatedMemorySaved).toBe(0);
	});
});
