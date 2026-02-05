#!/usr/bin/env bun
/**
 * Postinstall script to set up platform-specific binary
 * This runs after npm/bun install to symlink the correct binary
 */

import {
	chmodSync,
	existsSync,
	lstatSync,
	readlinkSync,
	symlinkSync,
	unlinkSync,
} from "node:fs";
import { join } from "node:path";

const platform = process.platform;
const arch = process.arch;

// Map Node.js arch to our binary naming
const archMap: Record<string, string> = {
	x64: "x64",
	arm64: "arm64",
};

// Map Node.js platform to our binary naming
const platformMap: Record<string, string> = {
	darwin: "darwin",
	linux: "linux",
	win32: "win32",
};

const targetArch = archMap[arch] || "x64";
const targetPlatform = platformMap[platform] || "linux";

// Determine binary name
const binaryName =
	platform === "win32"
		? `secrets-guard-${targetPlatform}-${targetArch}.exe`
		: `secrets-guard-${targetPlatform}-${targetArch}`;

const distPath = join(process.cwd(), "dist");
const binaryPath = join(distPath, binaryName);
const symlinkPath = join(distPath, "secrets-guard");

// Check if binary exists
if (!existsSync(binaryPath)) {
	console.warn(`⚠️  Platform-specific binary not found: ${binaryName}`);
	console.warn(`   Platform: ${platform}, Arch: ${arch}`);
	console.warn(`   Expected: ${binaryPath}`);
	console.warn(`   Run 'bun run build:all' to build all platform binaries`);
	process.exit(0); // Don't fail install if binary missing
}

// Make binary executable (Unix-like systems)
if (platform !== "win32") {
	try {
		chmodSync(binaryPath, 0o755);
	} catch (_err) {
		// Ignore chmod errors
	}
}

// Create symlink to platform-specific binary
try {
	// Remove existing symlink if it exists and points to wrong binary
	if (existsSync(symlinkPath)) {
		try {
			const stats = lstatSync(symlinkPath);
			if (stats.isSymbolicLink()) {
				const currentTarget = readlinkSync(symlinkPath);
				if (currentTarget !== binaryPath) {
					unlinkSync(symlinkPath);
				} else {
					// Already pointing to correct binary
					console.log(`✅ Symlink already points to correct binary`);
					process.exit(0);
				}
			} else {
				// Regular file exists, remove it to create symlink
				unlinkSync(symlinkPath);
			}
		} catch (_err) {
			// Ignore errors, try to create symlink anyway
		}
	}

	// Create symlink (or copy on Windows)
	if (platform === "win32") {
		// Windows doesn't support symlinks well, so we'll just document the binary location
		console.log(`✅ Binary available at: ${binaryPath}`);
		console.log(`   Use this binary directly or add dist/ to your PATH`);
	} else {
		symlinkSync(binaryPath, symlinkPath);
		console.log(`✅ Linked ${binaryName} -> secrets-guard`);
	}
} catch (error) {
	console.warn(`⚠️  Could not create symlink: ${error}`);
	console.warn(`   Binary is available at: ${binaryPath}`);
}
