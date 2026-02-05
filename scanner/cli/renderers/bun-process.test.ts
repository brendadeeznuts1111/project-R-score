// bun-process.test.ts
import {test, expect, describe} from 'bun:test';

describe('Process Management', () => {
	test('Bun.argv contains CLI arguments', () => {
		expect(Array.isArray(Bun.argv)).toBe(true);
	});

	test('Bun.env snapshot works', () => {
		const env = Bun.env;
		expect(typeof env).toBe('object');
	});

	test('Bun.nanoseconds returns high-res timestamp', () => {
		const ns = Bun.nanoseconds();
		expect(typeof ns).toBe('number');
		expect(ns).toBeGreaterThan(0);
	});

	test('spawn reads stdout', async () => {
		const proc = Bun.spawn(['echo', 'test']);
		const output = await proc.stdout.text();
		expect(output).toContain('test');
	});

	test('spawn reads stderr', async () => {
		const proc = Bun.spawn(['sh', '-c', 'echo error >&2'], {stderr: 'pipe'});
		const err = await proc.stderr.text();
		expect(err).toContain('error');
	});
});
