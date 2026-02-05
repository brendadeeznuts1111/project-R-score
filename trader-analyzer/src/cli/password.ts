#!/usr/bin/env bun
/**
 * @fileoverview Password CLI - Hash and verify passwords using Bun.password
 * @description Command-line interface for password hashing and verification
 * @module cli/password
 *
 * Bun 1.3 Features Used:
 * - Bun.password.hash() - Argon2id password hashing
 * - Bun.password.verify() - Password verification
 * - Bun.argv for CLI args
 */

import {
	hashPassword,
	verifyPassword,
	isPasswordHash,
	getHashAlgorithm,
} from "../utils/password";
import { colors } from "../utils/bun";

// ANSI color codes
const c = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	magenta: "\x1b[35m",
	blue: "\x1b[34m",
};

/**
 * Hash a password
 */
async function cmdHash(
	password: string,
	algorithm: "argon2id" | "bcrypt" | "scrypt" = "argon2id",
): Promise<void> {
	console.log(`${c.cyan}Hashing password with ${algorithm}...${c.reset}\n`);

	const hash = await hashPassword(password, { algorithm });

	console.log(`${c.green}${c.bold}Hash:${c.reset}`);
	console.log(`${hash}\n`);
	console.log(
		`${c.dim}Algorithm: ${getHashAlgorithm(hash) || "unknown"}${c.reset}`,
	);
}

/**
 * Verify a password
 */
async function cmdVerify(password: string, hash: string): Promise<void> {
	console.log(`${c.cyan}Verifying password...${c.reset}\n`);

	if (!isPasswordHash(hash)) {
		console.error(`${c.red}Error: Invalid hash format${c.reset}`);
		console.error(
			`${c.dim}Expected hash starting with $argon2id$, $2a$, $2b$, $2y$, or $scrypt$${c.reset}`,
		);
		process.exit(1);
	}

	const isValid = await verifyPassword(password, hash);
	const algorithm = getHashAlgorithm(hash);

	if (isValid) {
		console.log(`${c.green}${c.bold}✓ Password is valid${c.reset}`);
		console.log(`${c.dim}Algorithm: ${algorithm || "unknown"}${c.reset}\n`);
	} else {
		console.log(`${c.red}${c.bold}✗ Password is invalid${c.reset}\n`);
		process.exit(1);
	}
}

/**
 * Check hash format
 */
function cmdCheck(hash: string): void {
	console.log(`${c.cyan}Checking hash format...${c.reset}\n`);

	const isValid = isPasswordHash(hash);
	const algorithm = getHashAlgorithm(hash);

	if (isValid) {
		console.log(`${c.green}${c.bold}✓ Valid password hash${c.reset}`);
		console.log(`${c.dim}Algorithm: ${algorithm || "unknown"}${c.reset}\n`);
	} else {
		console.log(`${c.red}${c.bold}✗ Invalid hash format${c.reset}`);
		console.log(
			`${c.dim}Expected hash starting with $argon2id$, $2a$, $2b$, $2y$, or $scrypt$${c.reset}\n`,
		);
		process.exit(1);
	}
}

// ============ CLI ============
const HELP = `
${c.cyan}${c.bold}Password CLI - Hash and verify passwords using Bun.password${c.reset}

${c.yellow}Commands:${c.reset}
  hash <password> [algorithm]              Hash a password
  verify <password> <hash>                 Verify a password against a hash
  check <hash>                             Check if a string is a valid password hash

${c.yellow}Algorithms:${c.reset}
  argon2id  (default) - Modern, secure, recommended
  bcrypt               - Widely supported, legacy
  scrypt               - Memory-hard, good for high-security

${c.yellow}Examples:${c.reset}
  bun run password hash "myPassword123"
  bun run password hash "myPassword123" argon2id
  bun run password hash "myPassword123" bcrypt
  bun run password verify "myPassword123" "\$argon2id\$v=19\$..."
  bun run password check "\$argon2id\$v=19\$..."

${c.yellow}Security Notes:${c.reset}
  - Never store plain text passwords
  - Use argon2id for new applications (default)
  - Hashes include algorithm and cost parameters
  - Verification is constant-time to prevent timing attacks

${c.dim}Requires: Bun 1.3+ with Bun.password API${c.reset}
`;

async function main(): Promise<void> {
	// Bun.argv format: [ '/path/to/bun', '/path/to/cli.ts', '--flag1', '--flag2', 'value' ]
	// Skip first two elements (bun executable and script path)
	const args = Bun.argv.slice(2);
	const [cmd, ...rest] = args;

	if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
		console.log(HELP);
		return;
	}

	try {
		switch (cmd) {
			case "hash":
				if (rest.length < 1) {
					console.error(`${c.red}Usage: hash <password> [algorithm]${c.reset}`);
					process.exit(1);
				}
				const password = rest[0];
				const algorithm =
					(rest[1] as "argon2id" | "bcrypt" | "scrypt") || "argon2id";
				if (!["argon2id", "bcrypt", "scrypt"].includes(algorithm)) {
					console.error(`${c.red}Invalid algorithm: ${algorithm}${c.reset}`);
					console.error(
						`${c.dim}Valid algorithms: argon2id, bcrypt, scrypt${c.reset}`,
					);
					process.exit(1);
				}
				await cmdHash(password, algorithm);
				break;

			case "verify":
				if (rest.length < 2) {
					console.error(`${c.red}Usage: verify <password> <hash>${c.reset}`);
					process.exit(1);
				}
				await cmdVerify(rest[0], rest[1]);
				break;

			case "check":
				if (rest.length < 1) {
					console.error(`${c.red}Usage: check <hash>${c.reset}`);
					process.exit(1);
				}
				cmdCheck(rest[0]);
				break;

			default:
				console.error(`${c.red}Unknown command: ${cmd}${c.reset}`);
				console.log(HELP);
				process.exit(1);
		}
	} catch (error) {
		console.error(
			`${c.red}Error: ${error instanceof Error ? error.message : String(error)}${c.reset}`,
		);
		if (error instanceof Error && error.stack) {
			console.error(`${c.dim}${error.stack}${c.reset}`);
		}
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}
