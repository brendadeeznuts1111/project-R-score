/**
 * Tests: Bun native API replacements used in scan.ts
 *
 * Validates correctness of:
 *   1. Bun.stripANSI — https://bun.com/docs/api/utils#bun-stripansi
 *   2. proc.stdout.text() / proc.stderr.text() — https://bun.com/docs/api/spawn#reading-stdout
 *   3. Bun.fileURLToPath — https://bun.com/docs/api/utils#bun-fileurltopath
 *
 * Run: bun test benchmarks/bun-native-api.test.ts
 */

import {describe, test, expect} from 'bun:test';

// ── 1. Bun.stripANSI ───────────────────────────────────────────────
// Ref: https://bun.com/docs/api/utils#bun-stripansi
// ~6-57x faster strip-ansi alternative (vs npm package). Strips all ANSI escape codes.

describe('Bun.stripANSI', () => {
	test('strips basic SGR color codes', () => {
		expect(Bun.stripANSI('\x1b[31mred\x1b[0m')).toBe('red');
		expect(Bun.stripANSI('\x1b[32mgreen\x1b[0m')).toBe('green');
		expect(Bun.stripANSI('\x1b[1m\x1b[34mbold blue\x1b[0m')).toBe('bold blue');
	});

	test('strips compound SGR sequences (semicolons)', () => {
		// e.g. \x1b[1;31m = bold + red
		expect(Bun.stripANSI('\x1b[1;31mbold red\x1b[0m')).toBe('bold red');
		expect(Bun.stripANSI('\x1b[38;5;196m256-color\x1b[0m')).toBe('256-color');
	});

	test('returns plain text unchanged', () => {
		expect(Bun.stripANSI('hello world')).toBe('hello world');
		expect(Bun.stripANSI('')).toBe('');
		expect(Bun.stripANSI('no codes')).toBe('no codes');
	});

	test('handles multiple codes in one string', () => {
		const input = '\x1b[1m\x1b[32mfoo\x1b[0m bar \x1b[31merror\x1b[0m baz';
		expect(Bun.stripANSI(input)).toBe('foo bar error baz');
	});

	test('strips cursor movement and erase sequences', () => {
		// CSI sequences beyond SGR (cursor, erase)
		expect(Bun.stripANSI('\x1b[2Jcleared')).toBe('cleared');
		expect(Bun.stripANSI('\x1b[Hhome')).toBe('home');
	});

	test('handles unicode content around ANSI codes', () => {
		expect(Bun.stripANSI('\x1b[32m日本語\x1b[0m')).toBe('日本語');
		expect(Bun.stripANSI('café \x1b[1mbold\x1b[0m naïve')).toBe('café bold naïve');
	});

	test('matches regex behavior for scan.ts parsing patterns', () => {
		// This is the exact regex that was replaced in scan.ts
		const regex = /\x1b\[[0-9;]*m/g;
		const inputs = [
			'\x1b[1m\x1b[32mfoo\x1b[0m bar',
			'| lodash | dependencies | 4.17.20 | 4.17.21 | 4.17.21 |',
			'\x1b[36m[12:34:56]\x1b[0m scanning...',
			'plain text no codes',
		];
		for (const input of inputs) {
			expect(Bun.stripANSI(input)).toBe(input.replace(regex, ''));
		}
	});
});

// ── 2. proc.stdout.text() / proc.stderr.text() ─────────────────────
// Ref: https://bun.com/docs/api/spawn#reading-stdout
// Bun.spawn stdout is a ReadableStream with .text(), .json(), .bytes() methods.
// proc.stdout defaults to "pipe" (ReadableStream), proc.stderr defaults to "inherit" (null).
// Must set stderr: "pipe" to read it.

describe('proc.stdout.text() / proc.stderr.text()', () => {
	test('proc.stdout.text() reads stdout directly', async () => {
		const proc = Bun.spawn(['echo', 'hello from stdout'], {
			stdout: 'pipe',
			stderr: 'pipe',
		});
		const text = await proc.stdout.text();
		await proc.exited;
		expect(text.trim()).toBe('hello from stdout');
	});

	test('proc.stderr.text() reads stderr directly', async () => {
		// sh -c 'echo ... >&2' writes to stderr
		const proc = Bun.spawn(['sh', '-c', "echo 'error output' >&2"], {
			stdout: 'pipe',
			stderr: 'pipe',
		});
		const stderr = await proc.stderr.text();
		await proc.exited;
		expect(stderr.trim()).toBe('error output');
	});

	test('proc.stdout.text() matches new Response(proc.stdout).text()', async () => {
		const proc1 = Bun.spawn(['echo', 'consistency check'], {
			stdout: 'pipe',
			stderr: 'pipe',
		});
		const direct = await proc1.stdout.text();
		await proc1.exited;

		const proc2 = Bun.spawn(['echo', 'consistency check'], {
			stdout: 'pipe',
			stderr: 'pipe',
		});
		const wrapped = await new Response(proc2.stdout).text();
		await proc2.exited;

		expect(direct).toBe(wrapped);
	});

	test('proc.stderr is undefined when stderr is not piped', async () => {
		// stderr defaults to "inherit" per Bun docs — runtime returns undefined (not null)
		const proc = Bun.spawn(['echo', 'test'], {
			stdout: 'pipe',
			// stderr not set — defaults to "inherit"
		});
		await proc.stdout.text();
		await proc.exited;
		expect(proc.stderr).toBeUndefined();
	});

	test('handles empty stdout', async () => {
		const proc = Bun.spawn(['true'], {
			stdout: 'pipe',
			stderr: 'pipe',
		});
		const text = await proc.stdout.text();
		await proc.exited;
		expect(text).toBe('');
	});

	test('handles multiline output', async () => {
		const proc = Bun.spawn(['sh', '-c', 'echo line1; echo line2; echo line3'], {
			stdout: 'pipe',
			stderr: 'pipe',
		});
		const text = await proc.stdout.text();
		await proc.exited;
		expect(text).toBe('line1\nline2\nline3\n');
	});

	test('Bun.spawn stdout ReadableStream has .text() method', async () => {
		// Bun.spawn stdout ReadableStream includes .text(), .json(), .bytes() methods.
		// Manually constructed ReadableStreams may also have these in newer Bun versions.
		const proc = Bun.spawn(['echo', 'mixin check'], {
			stdout: 'pipe',
			stderr: 'pipe',
		});
		expect(typeof proc.stdout.text).toBe('function');
		expect(typeof proc.stderr.text).toBe('function');
		const text = await proc.stdout.text();
		await proc.exited;
		expect(text.trim()).toBe('mixin check');
	});

	test('ReadableStream.text() returns correct content', async () => {
		const content = 'keychain error output\n';
		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(new TextEncoder().encode(content));
				controller.close();
			},
		});
		const text = await stream.text();
		expect(text).toBe(content);
	});
});

// ── 3. Bun.fileURLToPath ────────────────────────────────────────────
// Ref: https://bun.com/docs/api/utils#bun-fileurltopath
// Converts file:// URLs to absolute filesystem paths.
// Observed: correctly decodes percent-encoded characters (confirmed by tests below).

describe('Bun.fileURLToPath', () => {
	test('converts simple file URL to path', () => {
		expect(Bun.fileURLToPath('file:///foo/bar.txt')).toBe('/foo/bar.txt');
	});

	test('accepts URL object', () => {
		const url = new URL('file:///foo/bar.txt');
		expect(Bun.fileURLToPath(url)).toBe('/foo/bar.txt');
	});

	test('resolves relative URL with base', () => {
		const url = new URL('./scan-worker.ts', 'file:///Users/test/project/');
		expect(Bun.fileURLToPath(url)).toBe('/Users/test/project/scan-worker.ts');
	});

	test('decodes percent-encoded spaces (%20)', () => {
		const path = Bun.fileURLToPath('file:///Users/test/my%20project/scan.ts');
		expect(path).toBe('/Users/test/my project/scan.ts');
		expect(path.includes(' ')).toBe(true);
	});

	test('URL.pathname does NOT decode %20 (the bug we fixed)', () => {
		const pathname = new URL('file:///Users/test/my%20project/scan.ts').pathname;
		// URL.pathname preserves percent-encoding
		expect(pathname).toBe('/Users/test/my%20project/scan.ts');
		expect(pathname.includes('%20')).toBe(true);
		expect(pathname.includes(' ')).toBe(false);

		// Bun.fileURLToPath correctly decodes
		const decoded = Bun.fileURLToPath('file:///Users/test/my%20project/scan.ts');
		expect(decoded.includes(' ')).toBe(true);
		expect(decoded.includes('%20')).toBe(false);
	});

	test('handles unicode paths', () => {
		const path = Bun.fileURLToPath('file:///Users/tëst/日本語/scan.ts');
		expect(path).toContain('tëst');
		expect(path).toContain('日本語');
	});

	test('handles deeply nested paths', () => {
		const url = new URL('./worker.ts', 'file:///a/b/c/d/e/f/g/');
		expect(Bun.fileURLToPath(url)).toBe('/a/b/c/d/e/f/g/worker.ts');
	});

	test('matches import.meta.url resolution pattern from scan.ts', () => {
		// This is the exact pattern used in scanProjectsViaIPC:
		//   const workerPath = Bun.fileURLToPath(new URL("./scan-worker.ts", import.meta.url));
		const fakeImportMetaUrl = 'file:///Users/nolarose/Projects/scanner/scan.ts';
		const workerUrl = new URL('./scan-worker.ts', fakeImportMetaUrl);
		const workerPath = Bun.fileURLToPath(workerUrl);
		expect(workerPath).toBe('/Users/nolarose/Projects/scanner/scan-worker.ts');
	});

	test('companion: Bun.pathToFileURL roundtrips', () => {
		const original = '/Users/test/my project/scan.ts';
		const fileUrl = Bun.pathToFileURL(original);
		const roundtripped = Bun.fileURLToPath(fileUrl);
		expect(roundtripped).toBe(original);
	});
});
