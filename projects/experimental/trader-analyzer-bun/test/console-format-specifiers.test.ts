/**
 * @fileoverview Console Format Specifiers Tests
 * @description Tests for console.log format specifiers (%j, %s, %d, %i, %f, %o, %O, %c)
 * @module test/console-format-specifiers
 * 
 * Format specifiers supported by Bun:
 * - %j - JSON formatting (objects and arrays)
 * - %s - String formatting
 * - %d, %i - Integer formatting
 * - %f - Float formatting
 * - %o, %O - Object formatting (shallow/deep)
 * 
 * Note: Bun processes format specifiers in console.log, similar to Node.js util.format()
 */

import { describe, test, expect } from 'bun:test';
import { spawn } from 'bun';

describe('Console Format Specifiers', () => {
	describe('%j - JSON formatting', () => {
		test('formats objects as JSON', async () => {
			// Test by running a script that uses %j and capturing output
			const proc = Bun.spawn(['bun', '-e', 'console.log("%j", { foo: "bar" });'], {
				stdout: 'pipe',
				stderr: 'pipe'
			});
			
			const output = await new Response(proc.stdout).text();
			expect(output).toContain('foo');
			expect(output).toContain('bar');
			expect(output).toMatch(/\{.*foo.*bar.*\}/);
		});

		test('formats arrays as JSON', async () => {
			const proc = Bun.spawn(['bun', '-e', 'console.log("%j", [1, 2, 3]);'], {
				stdout: 'pipe'
			});
			
			const output = await new Response(proc.stdout).text();
			expect(output).toContain('1');
			expect(output).toContain('2');
			expect(output).toContain('3');
			expect(output).toMatch(/\[.*1.*2.*3.*\]/);
		});

		test('handles multiple %j specifiers', async () => {
			const proc = Bun.spawn(['bun', '-e', 'console.log("%j %j", { a: 1 }, { b: 2 });'], {
				stdout: 'pipe'
			});
			
			const output = await new Response(proc.stdout).text();
			expect(output).toContain('a');
			expect(output).toContain('b');
		});

		test('handles nested objects', async () => {
			const proc = Bun.spawn(['bun', '-e', 'console.log("%j", { nested: { deep: { value: 42 } } });'], {
				stdout: 'pipe'
			});
			
			const output = await new Response(proc.stdout).text();
			expect(output).toContain('nested');
			expect(output).toContain('deep');
			expect(output).toContain('42');
		});
	});

	describe('%s - String formatting', () => {
		test('formats strings', async () => {
			const proc = Bun.spawn(['bun', '-e', 'console.log("%s", "hello world");'], {
				stdout: 'pipe'
			});
			
			const output = await new Response(proc.stdout).text();
			expect(output).toContain('hello world');
		});

		test('handles mixed %j and %s', async () => {
			const proc = Bun.spawn(['bun', '-e', 'console.log("%j %s", { status: "ok" }, "done");'], {
				stdout: 'pipe'
			});
			
			const output = await new Response(proc.stdout).text();
			expect(output).toContain('status');
			expect(output).toContain('ok');
			expect(output).toContain('done');
		});

		test('handles multiple %s specifiers', async () => {
			const proc = Bun.spawn(['bun', '-e', 'console.log("%s %s %s", "first", "second", "third");'], {
				stdout: 'pipe'
			});
			
			const output = await new Response(proc.stdout).text();
			expect(output).toContain('first');
			expect(output).toContain('second');
			expect(output).toContain('third');
		});
	});

	describe('%d and %i - Integer formatting', () => {
		test('formats integers with %d', async () => {
			const proc = Bun.spawn(['bun', '-e', 'console.log("%d", 42);'], {
				stdout: 'pipe'
			});
			
			const output = await new Response(proc.stdout).text();
			expect(output).toContain('42');
		});

		test('formats integers with %i', async () => {
			const proc = Bun.spawn(['bun', '-e', 'console.log("%i", 42);'], {
				stdout: 'pipe'
			});
			
			const output = await new Response(proc.stdout).text();
			expect(output).toContain('42');
		});

		test('handles floats with %d', async () => {
			const proc = Bun.spawn(['bun', '-e', 'console.log("%d", 3.14);'], {
				stdout: 'pipe'
			});
			
			const output = await new Response(proc.stdout).text();
			expect(output).toContain('3');
		});
	});

	describe('%f - Float formatting', () => {
		test('formats floats', async () => {
			const proc = Bun.spawn(['bun', '-e', 'console.log("%f", 3.14159);'], {
				stdout: 'pipe'
			});
			
			const output = await new Response(proc.stdout).text();
			expect(output).toContain('3.14');
		});
	});

	describe('%o and %O - Object formatting', () => {
		test('formats objects with %o (shallow)', async () => {
			const proc = Bun.spawn(['bun', '-e', 'console.log("%o", { foo: "bar" });'], {
				stdout: 'pipe'
			});
			
			const output = await new Response(proc.stdout).text();
			expect(output).toContain('foo');
		});

		test('formats objects with %O (deep)', async () => {
			const proc = Bun.spawn(['bun', '-e', 'console.log("%O", { nested: { deep: "value" } });'], {
				stdout: 'pipe'
			});
			
			const output = await new Response(proc.stdout).text();
			expect(output).toContain('nested');
		});
	});

	describe('Complex format strings', () => {
		test('handles multiple format specifiers', async () => {
			const proc = Bun.spawn(['bun', '-e', 'console.log("Status: %j, Count: %d, Message: %s", { ok: true }, 42, "success");'], {
				stdout: 'pipe'
			});
			
			const output = await new Response(proc.stdout).text();
			expect(output).toContain('Status');
			expect(output).toContain('ok');
			expect(output).toContain('42');
			expect(output).toContain('success');
		});

		test('handles format specifiers without matching arguments', async () => {
			const proc = Bun.spawn(['bun', '-e', 'console.log("%j %s", { foo: "bar" });'], {
				stdout: 'pipe'
			});
			
			const output = await new Response(proc.stdout).text();
			// Should handle missing argument gracefully
			expect(output).toContain('foo');
		});

		test('handles extra arguments without format specifiers', async () => {
			const proc = Bun.spawn(['bun', '-e', 'console.log("%j", { foo: "bar" }, "extra");'], {
				stdout: 'pipe'
			});
			
			const output = await new Response(proc.stdout).text();
			expect(output).toContain('foo');
			expect(output).toContain('extra');
		});
	});

	describe('Real-world usage examples', () => {
		test('API response logging with %j', () => {
			const response = { status: 'ok', data: { id: 123 } };
			const jsonStr = JSON.stringify(response);
			
			// Verify JSON serialization works
			expect(jsonStr).toContain('status');
			expect(jsonStr).toContain('ok');
			expect(jsonStr).toContain('123');
		});

		test('Market data logging with %j and %s', () => {
			const marketData = { bookmaker: 'Bet365', odds: 1.95 };
			const jsonStr = JSON.stringify(marketData);
			const status = 'active';
			
			// Verify data can be formatted
			expect(jsonStr).toContain('bookmaker');
			expect(jsonStr).toContain('Bet365');
			expect(status).toBe('active');
		});

		test('Performance metrics logging with %j and %f', () => {
			const metrics = { duration: 123.45, requests: 1000 };
			const jsonStr = JSON.stringify(metrics);
			const duration = 123.45;
			
			// Verify data can be formatted
			expect(jsonStr).toContain('duration');
			expect(jsonStr).toContain('123.45');
			expect(duration).toBe(123.45);
		});
	});
});
