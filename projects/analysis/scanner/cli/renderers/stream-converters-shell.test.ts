// stream-converters-shell.test.ts — Bun.$ Integration Tests
import {test, expect, describe} from 'bun:test';
import {$} from 'bun';
import {BUN_CONVERTERS, calcR, BUN_DEFAULTS} from './stream-converters-enhanced';

describe('Shell Pipeline Integration (Bun.$)', () => {
	test('text() via shell pipe', async () => {
		const start = Bun.nanoseconds();
		const result =
			await $`echo "hello world" | ${Bun.which('bun')!} -e 'console.log(await Bun.readableStreamToText(Bun.stdin.stream()))'`.text();
		const latency = (Bun.nanoseconds() - start) / 1e6; // ms

		expect(result.trim()).toBe('hello world');
		expect(latency).toBeLessThan(500); // shell + subprocess overhead
	});

	test('bytes() via shell pipe with octal escapes', async () => {
		// POSIX-portable octal escapes (not \x hex)
		const result = await $`printf '\001\002\003' | ${Bun.which('bun')!} -e '
      const bytes = await Bun.readableStreamToBytes(Bun.stdin.stream());
      process.stdout.write(String(bytes.length));
    '`.text();

		expect(result.trim()).toBe('3');
	});

	test('JSON converter error handling', async () => {
		const result = await $`echo "invalid json" | ${Bun.which('bun')!} -e '
      try {
        await Bun.readableStreamToJSON(Bun.stdin.stream());
      } catch (e) {
        console.log("ERROR");
      }
    '`.text();

		expect(result.trim()).toBe('ERROR');
	});
});

describe('Risk Scoring', () => {
	test('all converters score below maxRiskScore', () => {
		for (const c of BUN_CONVERTERS) {
			const r = calcR(c.risk);
			expect(r).toBeLessThan(BUN_DEFAULTS.maxRiskScore);
		}
	});

	test('JSON has highest parsing risk', () => {
		const json = BUN_CONVERTERS.find(c => c.output === 'object')!;
		for (const c of BUN_CONVERTERS) {
			expect(json.risk.parsing).toBeGreaterThanOrEqual(c.risk.parsing);
		}
	});

	test('FormData has highest untrusted risk', () => {
		const form = BUN_CONVERTERS.find(c => c.output === 'FormData')!;
		for (const c of BUN_CONVERTERS) {
			expect(form.risk.untrusted).toBeGreaterThanOrEqual(c.risk.untrusted);
		}
	});

	test('text has lowest overall risk', () => {
		const textScore = calcR(BUN_CONVERTERS.find(c => c.output === 'string')!.risk);
		for (const c of BUN_CONVERTERS) {
			expect(textScore).toBeLessThanOrEqual(calcR(c.risk));
		}
	});

	test('maxRiskScore is 2.0', () => {
		expect(BUN_DEFAULTS.maxRiskScore).toBe(2.0);
	});

	test('weights sum to 2.0', () => {
		const {memory, parsing, untrusted} = BUN_DEFAULTS.weights;
		expect(memory + parsing + untrusted).toBe(2.0);
	});
});
