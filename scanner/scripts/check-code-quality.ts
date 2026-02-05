#!/usr/bin/env bun
/**
 * Code quality checker - runs formatting and linting checks
 *
 * Usage:
 *   bun scripts/check-code-quality.ts [--fix]
 *
 * Options:
 *   --fix    Auto-fix issues (format + lint:fix)
 *   --check  Only check, don't fix (default)
 */

import {spawnSync} from 'bun';

const args = process.argv.slice(2);
const shouldFix = args.includes('--fix');
const _shouldCheck = args.includes('--check') || !shouldFix;

function runCommand(cmd: string[], description: string): boolean {
	console.log(`\n${description}...`);
	const proc = spawnSync(cmd, {
		cwd: import.meta.dir + '/..',
		stdio: 'inherit',
	});

	if (proc.exitCode !== 0) {
		console.error(`❌ ${description} failed`);
		return false;
	}

	console.log(`✓ ${description} passed`);
	return true;
}

function main(): void {
	console.log('🔍 Code Quality Check\n');

	if (shouldFix) {
		console.log('Mode: Auto-fix enabled\n');

		// Format files
		if (!runCommand(['bunx', 'prettier', '--write', '.'], 'Formatting files')) {
			process.exit(1);
		}

		// Fix linting issues
		if (!runCommand(['bunx', 'eslint', '.', '--fix'], 'Auto-fixing linting issues')) {
			process.exit(1);
		}

		// Final check
		if (!runCommand(['bunx', 'eslint', '.'], 'Checking for remaining issues')) {
			console.log('\n⚠️  Some issues remain that require manual fixes');
			process.exit(1);
		}

		console.log('\n✅ All issues fixed!');
	} else {
		console.log('Mode: Check only (use --fix to auto-fix)\n');

		// Check formatting
		if (!runCommand(['bunx', 'prettier', '--check', '.'], 'Checking formatting')) {
			console.log("\n💡 Run 'bun run format' to fix formatting issues");
			process.exit(1);
		}

		// Check linting
		if (!runCommand(['bunx', 'eslint', '.'], 'Checking linting')) {
			console.log("\n💡 Run 'bun run lint:fix' to auto-fix linting issues");
			process.exit(1);
		}

		console.log('\n✅ All checks passed!');
	}
}

if (import.meta.main) {
	main();
}
