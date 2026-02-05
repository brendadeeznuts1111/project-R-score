#!/usr/bin/env bun

/**
 * Cross-Platform Environment Variables Test
 * Demonstrates environment variables across Windows, macOS, and Linux
 */

export {}; // Make this file a module

console.log("🌍 Cross-Platform Environment Variables");
console.log("=======================================");

// Detect platform
const platform = process.platform;
console.log(`🖥️  Platform: ${platform}`);

// Environment variable access (works on all platforms)
console.log("\n📋 Environment Variables:");
console.log(`FOO: ${Bun.env.FOO || process.env.FOO || "not set"}`);
console.log(`BAR: ${Bun.env.BAR || process.env.BAR || "not set"}`);
console.log(
	`NODE_ENV: ${Bun.env.NODE_ENV || process.env.NODE_ENV || "not set"}`,
);

// Platform-specific environment variables
console.log("\n🔍 Platform-Specific Variables:");

switch (platform) {
	case "win32":
		console.log("Windows detected");
		console.log(
			`USERNAME: ${Bun.env.USERNAME || process.env.USERNAME || "not set"}`,
		);
		console.log(
			`USERPROFILE: ${Bun.env.USERPROFILE || process.env.USERPROFILE || "not set"}`,
		);
		console.log(
			`${`PATH: ${Bun.env.PATH || process.env.PATH || "not set"}`.substring(
				0,
				50,
			)}...`,
		);
		break;

	case "darwin":
		console.log("macOS detected");
		console.log(`USER: ${Bun.env.USER || process.env.USER || "not set"}`);
		console.log(`HOME: ${Bun.env.HOME || process.env.HOME || "not set"}`);
		console.log(`SHELL: ${Bun.env.SHELL || process.env.SHELL || "not set"}`);
		break;

	case "linux":
		console.log("Linux detected");
		console.log(`USER: ${Bun.env.USER || process.env.USER || "not set"}`);
		console.log(`HOME: ${Bun.env.HOME || process.env.HOME || "not set"}`);
		console.log(`SHELL: ${Bun.env.SHELL || process.env.SHELL || "not set"}`);
		break;

	default:
		console.log(`Unknown platform: ${platform}`);
}

// CLI Configuration from environment
console.log("\n⚙️  CLI Configuration:");
const cliConfig = {
	foo: Bun.env.FOO || process.env.FOO || "default",
	bar: Bun.env.BAR || process.env.BAR || "default",
	nodeEnv: Bun.env.NODE_ENV || process.env.NODE_ENV || "development",
	platform: platform,
	isWindows: platform === "win32",
	isProduction: (Bun.env.NODE_ENV || process.env.NODE_ENV) === "production",
};

console.log("CLI Config:", cliConfig);

// Environment-specific behavior
console.log("\n🎯 Environment-Specific Behavior:");

if (cliConfig.foo) {
	console.log(`✅ FOO is set to: ${cliConfig.foo}`);
}

if (cliConfig.isWindows) {
	console.log("🪟 Windows-specific features enabled");
} else {
	console.log("🐧 Unix-like features enabled");
}

if (cliConfig.isProduction) {
	console.log("🚀 Production mode optimizations active");
} else {
	console.log("🛠️  Development mode features active");
}

// Cross-platform path handling
console.log("\n📁 Cross-Platform Paths:");
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

console.log("Paths:", paths);

// Environment validation for CLI
console.log("\n✅ CLI Environment Validation:");
const requiredVars = ["FOO"];
const missingVars = requiredVars.filter(
	(varName) => !(Bun.env[varName] || process.env[varName]),
);

if (missingVars.length === 0) {
	console.log("✅ All required CLI environment variables are set");
	console.log("🚀 CLI is ready to run!");
} else {
	console.log(`⚠️  Optional variables not set: ${missingVars.join(", ")}`);
	console.log("🔧 CLI will use defaults for missing variables");
}

// Show how to set variables on each platform
console.log("\n📖 How to Set Environment Variables:");
console.log("Windows CMD:");
console.log("  set FOO=helloworld && bun run demo-cross-platform-env.ts");
console.log("");
console.log("Windows PowerShell:");
console.log('  $env:FOO="helloworld"; bun run demo-cross-platform-env.ts');
console.log("");
console.log("macOS/Linux:");
console.log("  FOO=helloworld bun run demo-cross-platform-env.ts");
console.log("  # or");
console.log("  export FOO=helloworld && bun run demo-cross-platform-env.ts");

console.log("\n✅ Cross-platform environment test complete!");
