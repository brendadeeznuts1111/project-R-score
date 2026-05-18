#!/usr/bin/env bun

/**
 * Demo: Environment Variables in Bun
 * Shows how to use FOO=hello BAR=world with Bun.env and process.env
 */

export {}; // Make this file a module

console.info("🌍 Environment Variables Demo");
console.info("============================");

// Access environment variables using both methods
console.info("\n📋 Environment Variable Access:");
console.info(`FOO (Bun.env): ${Bun.env.FOO || "undefined"}`);
console.info(`FOO (process.env): ${process.env.FOO || "undefined"}`);
console.info(`BAR (Bun.env): ${Bun.env.BAR || "undefined"}`);
console.info(`BAR (process.env): ${process.env.BAR || "undefined"}`);

// Demonstrate string interpolation
console.info("\n🔗 String Interpolation:");
const greeting = `${Bun.env.FOO} ${process.env.BAR}!`;
console.info(`Combined: ${greeting}`);

// Configuration object from environment
console.info("\n⚙️  Configuration from Environment:");
const config = {
	foo: Bun.env.FOO || "default_foo",
	bar: process.env.BAR || "default_bar",
	combined: `${Bun.env.FOO || "hello"} ${process.env.BAR || "world"}`,
	debug: Bun.env.DEBUG === "true",
	version: process.env.VERSION || "1.0.0",
};

console.info("Config object:", config);

// Environment variable validation
console.info("\n✅ Environment Validation:");
const requiredVars = ["FOO", "BAR"];
const missingVars = requiredVars.filter((varName) => !Bun.env[varName]);

if (missingVars.length === 0) {
	console.info("✅ All required environment variables are set");
} else {
	console.info(`❌ Missing variables: ${missingVars.join(", ")}`);
}

// Type conversion examples
console.info("\n🔢 Type Conversion:");
const numericEnv = {
	port: parseInt(Bun.env.PORT || "3000", 10),
	timeout: parseInt(process.env.TIMEOUT || "5000", 10),
	debug: Bun.env.DEBUG === "true",
	count: parseInt(process.env.COUNT || "0", 10),
};

console.info("Numeric config:", numericEnv);

// Environment-dependent behavior
console.info("\n🎯 Environment-Dependent Behavior:");

if (Bun.env.FOO?.toLowerCase() === "hello") {
	console.info("👋 Hello mode detected!");
}

if (process.env.BAR?.toLowerCase() === "world") {
	console.info("🌍 World mode activated!");
}

if (Bun.env.DEBUG === "true") {
	console.info("🐛 Debug mode enabled - showing detailed info");
	console.info("   All environment variables:", Object.keys(Bun.env));
}

// Environment variable formatting
console.info("\n📝 Formatted Output:");
const formatted = {
	message: `${Bun.env.FOO || "Hello"} ${process.env.BAR || "World"}!`,
	settings: `Port: ${numericEnv.port}, Timeout: ${numericEnv.timeout}ms`,
	status: `Debug: ${numericEnv.debug ? "ON" : "OFF"}`,
};

console.table(formatted);

console.info("\n✅ Environment variables demo complete!");

// Example of how our CLI would use these
console.info("\n🚀 CLI Integration Example:");
const cliConfig = {
	greeting: Bun.env.FOO || "Hi",
	target: process.env.BAR || "User",
	debug: Bun.env.DEBUG === "true",
	port: parseInt(Bun.env.PORT || "3000", 10),
};

console.info(`CLI would start with: ${cliConfig.greeting} ${cliConfig.target}!`);
console.info(`Debug mode: ${cliConfig.debug ? "enabled" : "disabled"}`);
console.info(`Server port: ${cliConfig.port}`);
