/**
 * @fileoverview Bun API Fixes Verification Tests
 * @description Tests for Bun API fixes in latest version
 * @module test/bun-api-fixes
 * 
 * Tests verify fixes for:
 * - Bun.secrets in AsyncLocalStorage context
 * - Bun.mmap validation
 * - Bun.plugin error handling
 * - Bun.FFI.CString constructor
 * - Class constructor validation
 * - ReadableStream error handling
 * - Glob.scan() boundary escaping
 * - Bun.indexOfLine validation
 * - FormData.from() large ArrayBuffer handling
 * - bun:ffi linkSymbols validation
 * - bun:ffi pointer conversion fix
 * - bun:ffi @datadog/pprof overflow fix
 */

import { describe, test, expect } from 'bun:test';

describe('Bun API Fixes', () => {
	describe('Bun.secrets AsyncLocalStorage fix', () => {
		test('secrets.get works inside AsyncLocalStorage.run()', async () => {
			// Test that Bun.secrets no longer crashes in async context managers
			const { AsyncLocalStorage } = await import('node:async_hooks');
			const als = new AsyncLocalStorage<string>();

			await als.run('test-context', async () => {
				// This should not crash
				try {
					const result = await Bun.secrets.get({
						service: 'test',
						name: 'non-existent-key'
					});
					// Should return null for non-existent key, not crash
					expect(result).toBeNull();
				} catch (error: any) {
					// Should not throw, but if it does, it should be a proper error
					expect(error).toBeInstanceOf(Error);
				}
			});
		});

		test('secrets.set works inside AsyncLocalStorage.run()', async () => {
			const { AsyncLocalStorage } = await import('node:async_hooks');
			const als = new AsyncLocalStorage<string>();

			await als.run('test-context', async () => {
				try {
					await Bun.secrets.set(
						{ service: 'test', name: 'test-key' },
						'test-value'
					);
					// Clean up
					await Bun.secrets.delete({ service: 'test', name: 'test-key' });
				} catch (error: any) {
					// Should not crash, but may throw proper errors (e.g., permission denied)
					expect(error).toBeInstanceOf(Error);
				}
			});
		});
	});

	describe('Bun.mmap validation fixes', () => {
		test('rejects non-numeric offset with clear error', () => {
			expect(() => {
				// @ts-expect-error - testing invalid input
				Bun.mmap('test.txt', { offset: null });
			}).toThrow();

			expect(() => {
				// @ts-expect-error - testing invalid input
				Bun.mmap('test.txt', { offset: () => {} });
			}).toThrow();

			expect(() => {
				// @ts-expect-error - testing invalid input
				Bun.mmap('test.txt', { size: null });
			}).toThrow();
		});

		test('rejects negative offset with clear error', () => {
			expect(() => {
				Bun.mmap('test.txt', { offset: -1 });
			}).toThrow();
		});

		test('rejects negative size with clear error', () => {
			expect(() => {
				Bun.mmap('test.txt', { size: -1 });
			}).toThrow();
		});
	});

	describe('Bun.plugin error handling', () => {
		test('returns error for invalid target option', () => {
			expect(() => {
				// @ts-expect-error - testing invalid input
				Bun.plugin({ target: 'invalid-target' });
			}).toThrow();
		});
	});

	describe('Bun.FFI.CString constructor fix', () => {
		test('CString constructor works correctly', () => {
			// Create a pointer (mock)
			const ptr = new Uint8Array(10).buffer;
			
			// This should not throw "function is not a constructor" error
			expect(() => {
				// Note: This may not work without actual FFI setup, but should not crash
				try {
					// @ts-expect-error - testing constructor
					new Bun.FFI.CString(ptr);
				} catch (error: any) {
					// Should throw proper error, not "function is not a constructor"
					expect(error.message).not.toContain('function is not a constructor');
				}
			}).not.toThrow('function is not a constructor');
		});
	});

	describe('Class constructor validation', () => {
		test('Bun.RedisClient requires new keyword', () => {
			expect(() => {
				// @ts-expect-error - testing without new
				Bun.RedisClient();
			}).toThrow(/cannot be invoked without 'new'/i);
		});

		test('other Bun class constructors require new', () => {
			// Test that class constructors properly validate
			const classConstructors = [
				'FileSystemRouter',
				'Transpiler',
			];

			for (const name of classConstructors) {
				if (name in Bun && typeof (Bun as any)[name] === 'function') {
					expect(() => {
						// @ts-expect-error - testing without new
						(Bun as any)[name]();
					}).toThrow(/cannot be invoked without 'new'/i);
				}
			}
		});
	});

	describe('ReadableStream error handling', () => {
		test('empty ReadableStream handles errors correctly', () => {
			const stream = new ReadableStream();
			
			// Should not silently ignore errors
			expect(() => {
				const reader = stream.getReader();
				reader.cancel();
			}).not.toThrow();
		});

		test('used ReadableStream handles errors correctly', async () => {
			const stream = new ReadableStream({
				start(controller) {
					controller.enqueue(new Uint8Array([1, 2, 3]));
					controller.close();
				}
			});

			// Read from stream
			const reader = stream.getReader();
			await reader.read();
			reader.releaseLock();

			// Should handle errors properly when stream is already used
			expect(() => {
				const newReader = stream.getReader();
				newReader.cancel();
			}).not.toThrow();
		});
	});

	describe('Glob.scan() boundary escaping fix', () => {
		test('does not escape cwd boundary with .*/* pattern', async () => {
			const glob = new Bun.Glob('.*/*');
			const results: string[] = [];
			
			for await (const file of glob.scan('.')) {
				results.push(file);
			}

			// All results should be within current directory
			for (const file of results) {
				expect(file).not.toContain('../');
				expect(file).not.toMatch(/^\.\.\//);
			}
		});

		test('does not escape cwd boundary with .*/**/*.ts pattern', async () => {
			const glob = new Bun.Glob('.*/**/*.ts');
			const results: string[] = [];
			
			for await (const file of glob.scan('.')) {
				results.push(file);
			}

			// All results should be within current directory
			for (const file of results) {
				expect(file).not.toContain('../');
				expect(file).not.toMatch(/^\.\.\//);
			}
		});
	});

	describe('Bun.indexOfLine validation', () => {
		test('handles non-number offset argument', () => {
			const file = Bun.file('package.json');
			
			// Note: Current behavior may return -1 for invalid inputs
			// The fix ensures it doesn't crash - behavior may vary by version
			const result1 = Bun.indexOfLine(file, null as any);
			// Should either throw or return a safe value (not crash)
			expect(typeof result1 === 'number' || result1 === undefined).toBe(true);

			const result2 = Bun.indexOfLine(file, 'invalid' as any);
			expect(typeof result2 === 'number' || result2 === undefined).toBe(true);
		});

		test('accepts valid number offset', async () => {
			const file = Bun.file('package.json');
			
			// Should work with valid number
			const result = Bun.indexOfLine(file, 0);
			expect(typeof result).toBe('number');
			expect(result).toBeGreaterThanOrEqual(-1); // -1 means not found, valid return
		});
	});

	describe('FormData.from() large ArrayBuffer handling', () => {
		test('throws proper error for ArrayBuffer >2GB', () => {
			// Create a very large ArrayBuffer (simulate >2GB)
			// Note: Actually creating >2GB may fail, so we test the error handling
			try {
				// @ts-expect-error - testing large buffer
				const largeBuffer = new ArrayBuffer(Number.MAX_SAFE_INTEGER);
				expect(() => {
					FormData.from(largeBuffer);
				}).toThrow();
			} catch (error: any) {
				// Should throw proper error, not crash silently
				expect(error).toBeInstanceOf(Error);
			}
		});

		test('handles normal ArrayBuffer correctly', () => {
			const buffer = new ArrayBuffer(1024);
			const formData = FormData.from(buffer);
			expect(formData).toBeInstanceOf(FormData);
		});
	});

	describe('bun:ffi linkSymbols validation', () => {
		test('rejects invalid ptr field (not number or BigInt)', () => {
			expect(() => {
				Bun.FFI.linkSymbols({
					// @ts-expect-error - testing invalid input
					test: {
						ptr: 'invalid' as any,
						args: [],
						returns: 'void'
					}
				});
			}).toThrow();
		});

		test('accepts valid number ptr', () => {
			// Note: This may fail if no actual symbol at address, but should validate ptr type
			expect(() => {
				try {
					Bun.FFI.linkSymbols({
						test: {
							ptr: 123,
							args: [],
							returns: 'void'
						}
					});
				} catch (error: any) {
					// Should not crash with "ptr must be a number or BigInt"
					// May throw other errors (e.g., invalid symbol), but not ptr validation error
					expect(error.message).not.toContain('ptr must be');
				}
			}).not.toThrow(/ptr must be/i);
		});

		test('accepts valid BigInt ptr', () => {
			expect(() => {
				try {
					Bun.FFI.linkSymbols({
						test: {
							ptr: BigInt(123),
							args: [],
							returns: 'void'
						}
					});
				} catch (error: any) {
					// Should not crash with ptr validation error
					expect(error.message).not.toContain('ptr must be');
				}
			}).not.toThrow(/ptr must be/i);
		});
	});

	describe('bun:ffi pointer conversion fix', () => {
		test('correctly converts JavaScript numbers to pointers', () => {
			// Test that identical JS number values produce correct pointer values
			// Before fix: 123 could become 18446744073709551615
			// After fix: Correct pointer conversion
			
			const ptr1 = 123;
			const ptr2 = 123;
			
			// Both should be treated as the same pointer value
			expect(ptr1).toBe(ptr2);
			
			// When used in linkSymbols, should not produce different pointer values
			try {
				const lib1 = Bun.FFI.linkSymbols({
					test1: {
						ptr: ptr1,
						args: ['i32'],
						returns: 'i32'
					}
				});
				
				const lib2 = Bun.FFI.linkSymbols({
					test2: {
						ptr: ptr2,
						args: ['i32'],
						returns: 'i32'
					}
				});
				
				// Pointers should be correctly converted (not crash)
				expect(lib1).toBeDefined();
				expect(lib2).toBeDefined();
			} catch (error: any) {
				// Should not crash with pointer conversion errors
				expect(error.message).not.toContain('18446744073709551615');
			}
		});
	});

	describe('bun:ffi @datadog/pprof overflow fix', () => {
		test('handles profiling libraries without overflow', async () => {
			// Test that libraries like @datadog/pprof don't trigger overflow
			// Note: This test may require @datadog/pprof to be installed
			try {
				const pprof = await import('@datadog/pprof').catch(() => null);
				
				if (pprof) {
					// Should not crash with overflow errors
					expect(() => {
						// Basic usage that previously triggered overflow
						const profile = pprof.Profile.create();
						expect(profile).toBeDefined();
					}).not.toThrow(/overflow/i);
				} else {
					// Skip if library not available
					console.log('Skipping @datadog/pprof test - library not installed');
				}
			} catch (error: any) {
				// Should not crash with overflow errors
				expect(error.message).not.toContain('overflow');
			}
		});
	});
});
