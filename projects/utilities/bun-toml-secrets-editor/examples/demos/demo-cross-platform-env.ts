#!/usr/bin/env bun

/**
 * Cross-Platform Environment Variables Test
 * Demonstrates environment variables across Windows, macOS, and Linux
 */

export {}; // Make this file a module

console.info("🌍 Cross-Platform Environment Variables");
console.info("=======================================");

// Detect platform
const platform = process.platform;
console.info(`🖥️  Platform: ${platform}`);

// Environment variable access (works on all platforms)
console.info("\n📋 Environment Variables:");
console.info(`FOO: ${Bun.env.FOO || process.env.FOO || "not set"}`);
console.info(`BAR: ${Bun.env.BAR || process.env.BAR || "not set"}`);
console.info(
	`NODE_ENV: ${Bun.env.NODE_ENV || process.env.NODE_ENV || "not set"}`,
);

// Platform-specific environment variables
console.info("\n🔍 Platform-Specific Variables:");

switch (platform) {
	case "win32":
		console.info("Windows detected");
		console.info(
			`USERNAME: ${Bun.env.USERNAME || process.env.USERNAME || "not set"}`,
		);
		console.info(
			`USERPROFILE: ${Bun.env.USERPROFILE || process.env.USERPROFILE || "not set"}`,
		);
		console.info(
			`${`PATH: ${Bun.env.PATH || process.env.PATH || "not set"}`.substring(
				0,
				50,
			)}...`,
		);
		break;

	case "darwin":
		console.info("macOS detected");
		console.info(`USER: ${Bun.env.USER || process.env.USER || "not set"}`);
		console.info(`HOME: ${Bun.env.HOME || process.env.HOME || "not set"}`);
		console.info(`SHELL: ${Bun.env.SHELL || process.env.SHELL || "not set"}`);
		break;

	case "linux":
		console.info("Linux detected");
		console.info(`USER: ${Bun.env.USER || process.env.USER || "not set"}`);
		console.info(`HOME: ${Bun.env.HOME || process.env.HOME || "not set"}`);
		console.info(`SHELL: ${Bun.env.SHELL || process.env.SHELL || "not set"}`);
		break;

	default:
		console.info(`Unknown platform: ${platform}`);
}

// CLI Configuration from environment
console.info("\n⚙️  CLI Configuration:");
const cliConfig = {
	foo: Bun.env.FOO || process.env.FOO || "default",
	bar: Bun.env.BAR || process.env.BAR || "default",
	nodeEnv: Bun.env.NODE_ENV || process.env.NODE_ENV || "development",
	platform: platform,
	isWindows: platform === "win32",
	isProduction: (Bun.env.NODE_ENV || process.env.NODE_ENV) === "production",
};

console.info("CLI Config:", cliConfig);

// Environment-specific behavior
console.info("\n🎯 Environment-Specific Behavior:");

if (cliConfig.foo) {
	console.info(`✅ FOO is set to: ${cliConfig.foo}`);
}

if (cliConfig.isWindows) {
	console.info("🪟 Windows-specific features enabled");
} else {
	console.info("🐧 Unix-like features enabled");
}

if (cliConfig.isProduction) {
	console.info("🚀 Production mode optimizations active");
} else {
	console.info("🛠️  Development mode features active");
}

// Cross-platform path handling
console.info("\n📁 Cross-Platform Paths:");
const paths = {
	home:
		Bun.env.HOME ||
		process.env.HOME ||
		Bun.env.USERPROFILE ||
		process.env.USERPROFILE,
	temp: Bun.env.TEMP || process.env.TEMP || "/tmp",
	config:
		Bun.env.CONFIG ||
		process.env.CONFIG ||
		`${Bun.env.HOME || process.env.HOME}/.config`,
};

console.info("Paths:", paths);

// Environment validation for CLI
console.info("\n✅ CLI Environment Validation:");
const requiredVars = ["FOO"];
const missingVars = requiredVars.filter(
	(varName) => !(Bun.env[varName] || process.env[varName]),
);

if (missingVars.length === 0) {
	console.info("✅ All required CLI environment variables are set");
	console.info("🚀 CLI is ready to run!");
} else {
	console.info(`⚠️  Optional variables not set: ${missingVars.join(", ")}`);
	console.info("🔧 CLI will use defaults for missing variables");
}

// Show how to set variables on each platform
console.info("\n📖 How to Set Environment Variables:");
console.info("Windows CMD:");
console.info("  set FOO=helloworld && bun run demo-cross-platform-env.ts");
console.info("");
console.info("Windows PowerShell:");
console.info('  $env:FOO="helloworld"; bun run demo-cross-platform-env.ts');
console.info("");
console.info("macOS/Linux:");
console.info("  FOO=helloworld bun run demo-cross-platform-env.ts");
console.info("  # or");
console.info("  export FOO=helloworld && bun run demo-cross-platform-env.ts");

console.info("\n✅ Cross-platform environment test complete!");
