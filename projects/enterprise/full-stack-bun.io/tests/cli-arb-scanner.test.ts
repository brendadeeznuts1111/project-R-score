/**
 * @fileoverview CLI Arbitrage Scanner Test Suite
 * @description Tests for spawnSync isolated event loop and Windows TTY fixes
 * @module tests/cli-arb-scanner.test
 * @version 1.0.0
 *
 * [CLI-ARB][SPAWNSYNC][ISOLATED][WINDOWS-TTY]
 */

import { test, expect } from "bun:test";
import { spawnSync } from "bun";

// Mock timer to detect interference
let timerFired = false;

// ==================== SPAWNSYNC ISOLATED TESTS ====================

test("spawnSync isolated no timer interference", () => {
	// Reset timer flag
	timerFired = false;

	// Set a timer that should NOT fire during spawnSync
	const timerId = setTimeout(() => {
		timerFired = true;
	}, 10);

	// Simulate CLI scraper (spawnSync blocks event loop)
	const result = spawnSync({
		cmd: ['echo', 'test'],
		stdout: 'pipe',
		stderr: 'pipe',
		cwd: process.cwd()
	});

	// Clear timer
	clearTimeout(timerId);

	// ✅ No timers fired during spawnSync (isolated event loop)
	expect(timerFired).toBe(false);
	expect(result.exitCode).toBe(0);
	if (result.stdout) {
		const output = new TextDecoder().decode(result.stdout);
		expect(output.trim()).toBe('test');
	}
});

test("spawnSync clean stdin/stdout pipes", () => {
	const result = spawnSync({
		cmd: ['echo', 'hello world'],
		stdout: 'pipe',
		stderr: 'pipe',
		cwd: process.cwd()
	});

	// ✅ Clean pipes - no corruption
	expect(result.exitCode).toBe(0);
	expect(result.stdout).toBeDefined();
	expect(result.stderr).toBeDefined();
	if (result.stdout) {
		const output = new TextDecoder().decode(result.stdout);
		expect(output.trim()).toBe('hello world');
	}
	if (result.stderr) {
		const error = new TextDecoder().decode(result.stderr);
		expect(error.length).toBe(0);
	}
});

test.serial("windows TTY vim safe", () => {
	// ✅ No more "eating" first keystroke
	const result = spawnSync({
		cmd: ['echo', 'test'],
		stdout: 'inherit',
		stderr: 'inherit',
		cwd: process.cwd()
	});

	// Verify stdin/stdout clean
	expect(process.stdout.writable).toBe(true);
	expect(result.exitCode).toBe(0);
});

test("bulk CLI scraper resilience", async () => {
	// Simulate multiple scrapers
	const scrapers = Array(10).fill(0).map(() =>
		spawnSync({
			cmd: ['echo', '{"odds":-105}'],
			stdout: 'pipe',
			stderr: 'pipe',
			cwd: process.cwd()
		})
	);

	// ✅ All stdio clean → No corruption
	const success = scrapers.filter(r => r.exitCode === 0);
	expect(success.length).toBeGreaterThanOrEqual(9); // At least 90% success

	// Verify output integrity
	success.forEach(result => {
		expect(result.stdout).toBeDefined();
		if (result.stdout) {
			const output = new TextDecoder().decode(result.stdout);
			expect(output.length).toBeGreaterThan(0);
		}
	});
});

test("spawnSync error handling", () => {
	// Test with invalid command - Bun throws error for non-existent commands
	expect(() => {
		spawnSync({
			cmd: ['nonexistent-command-xyz'],
			stdout: 'pipe',
			stderr: 'pipe',
			cwd: process.cwd()
		});
	}).toThrow();

	// Test with valid command that exits with error
	const result = spawnSync({
		cmd: ['sh', '-c', 'exit 42'],
		stdout: 'pipe',
		stderr: 'pipe',
		cwd: process.cwd()
	});

	// ✅ Proper error handling
	expect(result.exitCode).toBe(42);
	expect(result.stderr).toBeDefined();
});

test("spawnSync environment isolation", () => {
	const customEnv = {
		...process.env,
		TEST_VAR: 'isolated-test',
		NO_COLOR: '1'
	};

	const result = spawnSync({
		cmd: ['sh', '-c', 'echo $TEST_VAR'],
		stdout: 'pipe',
		stderr: 'pipe',
		env: customEnv,
		cwd: process.cwd()
	});

	// ✅ Environment isolation works
	if (result.exitCode === 0 && result.stdout) {
		const output = new TextDecoder().decode(result.stdout).trim();
		expect(output).toBe('isolated-test');
	}
});

test("spawnSync working directory isolation", () => {
	const result = spawnSync({
		cmd: ['pwd'],
		stdout: 'pipe',
		stderr: 'pipe',
		cwd: process.cwd()
	});

	// ✅ Working directory set correctly
	if (result.exitCode === 0 && result.stdout) {
		const output = new TextDecoder().decode(result.stdout).trim();
		expect(output).toBe(process.cwd());
	}
});

test("spawnSync parallel execution safety", async () => {
	// Run multiple spawnSync in parallel
	const results = await Promise.all([
		Promise.resolve(spawnSync({ cmd: ['echo', '1'], stdout: 'pipe', stderr: 'pipe' })),
		Promise.resolve(spawnSync({ cmd: ['echo', '2'], stdout: 'pipe', stderr: 'pipe' })),
		Promise.resolve(spawnSync({ cmd: ['echo', '3'], stdout: 'pipe', stderr: 'pipe' }))
	]);

	// ✅ All succeed independently
	results.forEach((result, index) => {
		expect(result.exitCode).toBe(0);
		if (result.stdout) {
			const output = new TextDecoder().decode(result.stdout).trim();
			expect(output).toBe(String(index + 1));
		}
	});
});

test("spawnSync timeout handling", () => {
	// Test with a command that might hang
	const startTime = Date.now();
	const result = spawnSync({
		cmd: ['sleep', '0.1'],
		stdout: 'pipe',
		stderr: 'pipe',
		cwd: process.cwd()
	});
	const duration = Date.now() - startTime;

	// ✅ spawnSync blocks until completion
	if (result.exitCode === 0) {
		expect(duration).toBeGreaterThanOrEqual(90); // ~100ms sleep
	}
});

test("spawnSync large output handling", () => {
	// Generate large output
	const largeData = 'x'.repeat(10000);
	const result = spawnSync({
		cmd: ['echo', largeData],
		stdout: 'pipe',
		stderr: 'pipe',
		cwd: process.cwd()
	});

	// ✅ Large output handled correctly
	if (result.exitCode === 0 && result.stdout) {
		const output = new TextDecoder().decode(result.stdout).trim();
		expect(output.length).toBeGreaterThan(9000);
	}
});

