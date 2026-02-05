#!/usr/bin/env bun
/**
 * Bun.init Global Configuration for RSS Feed Optimization
 * https://bun.com/docs/runtime/templating/init#global-configuration-%26-context
 */

import type { InitContext, InitTemplate } from "bun";

// Global configuration for bun init
export default {
	// Template metadata
	name: "rss-feed-optimization",
	version: "1.0.0",
	description:
		"High-performance RSS feed optimization system built with Bun.js",

	// Template source
	source: ".bun-create/rss-feed-template",

	// Pre-install hook - runs before dependencies are installed
	async preinstall(ctx: InitContext) {
		console.log("🚀 Initializing RSS Feed Optimization...");
		console.log(`📁 Project: ${ctx.projectName}`);
		console.log(`📂 Directory: ${ctx.projectDir}`);

		// Check for environment variables
		const hasR2Creds =
			process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID;
		if (hasR2Creds) {
			console.log("✅ R2 credentials detected in environment");
		}

		return {
			message: "Pre-install complete",
			credentialsDetected: hasR2Creds,
		};
	},

	// Post-install hook - runs after dependencies are installed
	async postinstall(
		ctx: InitContext,
		preinstallResult?: { credentialsDetected?: boolean },
	) {
		console.log("\n📦 Dependencies installed");

		if (preinstallResult?.credentialsDetected) {
			console.log("🔧 Auto-configuring R2 credentials...");
		}

		// Run setup script
		const setupProc = Bun.spawn(["bun", "run", "setup-template"], {
			cwd: ctx.projectDir,
			stdout: "inherit",
			stderr: "inherit",
		});

		await setupProc.exited;

		console.log("\n✅ RSS Feed Optimization initialized successfully!");
		console.log("\nNext steps:");
		console.log(`  cd ${ctx.projectName}`);
		console.log("  bun dev");

		return {
			success: true,
			projectDir: ctx.projectDir,
		};
	},

	// Validation hook - validate project configuration
	async validate(ctx: InitContext) {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Check Bun version
		const bunVersion = Bun.version;
		const minVersion = "1.3.7";

		if (bunVersion < minVersion) {
			errors.push(`Bun v${minVersion}+ required, found v${bunVersion}`);
		}

		// Check for R2 credentials in environment
		const requiredEnvVars = [
			"R2_ACCOUNT_ID",
			"R2_ACCESS_KEY_ID",
			"R2_SECRET_ACCESS_KEY",
		];
		const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

		if (missingVars.length > 0) {
			warnings.push(`Missing R2 credentials: ${missingVars.join(", ")}`);
			warnings.push("You will need to configure these in .env after setup");
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
			bunVersion,
		};
	},

	// Template context - passed to template files
	context: {
		// Default values
		defaults: {
			port: 3000,
			hostname: "0.0.0.0",
			blogTitle: "My RSS Blog",
			blogUrl: "http://localhost:3000",
			theme: "light",
		},

		// Environment variable mapping
		env: {
			R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
			R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
			R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
			R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
			ADMIN_TOKEN: process.env.ADMIN_TOKEN,
			PORT: process.env.PORT,
			BLOG_TITLE: process.env.BLOG_TITLE,
			BLOG_URL: process.env.BLOG_URL,
		},

		// Feature flags
		features: {
			dnsOptimization: true,
			connectionPooling: true,
			circuitBreaker: true,
			widgets: true,
			metrics: true,
			webSub: true,
		},
	},

	// Template transforms
	transforms: {
		// Transform package.json name
		"package.json": (content: string, ctx: InitContext) => {
			const pkg = JSON.parse(content);
			pkg.name = ctx.projectName;
			return JSON.stringify(pkg, null, 2);
		},

		// Transform .env.example to .env with context
		".env.example": (content: string, ctx: InitContext) => {
			let env = content;

			// Replace with context values if available
			if (ctx.context?.env?.R2_ACCOUNT_ID) {
				env = env.replace(
					/R2_ACCOUNT_ID=.*/,
					`R2_ACCOUNT_ID=${ctx.context.env.R2_ACCOUNT_ID}`,
				);
			}
			if (ctx.context?.env?.R2_ACCESS_KEY_ID) {
				env = env.replace(
					/R2_ACCESS_KEY_ID=.*/,
					`R2_ACCESS_KEY_ID=${ctx.context.env.R2_ACCESS_KEY_ID}`,
				);
			}
			if (ctx.context?.env?.R2_SECRET_ACCESS_KEY) {
				env = env.replace(
					/R2_SECRET_ACCESS_KEY=.*/,
					`R2_SECRET_ACCESS_KEY=${ctx.context.env.R2_SECRET_ACCESS_KEY}`,
				);
			}
			if (ctx.context?.env?.R2_BUCKET_NAME) {
				env = env.replace(
					/R2_BUCKET_NAME=.*/,
					`R2_BUCKET_NAME=${ctx.context.env.R2_BUCKET_NAME}`,
				);
			}
			if (ctx.context?.defaults?.port) {
				env = env.replace(/PORT=.*/, `PORT=${ctx.context.defaults.port}`);
			}
			if (ctx.context?.env?.BLOG_TITLE) {
				env = env.replace(
					/BLOG_TITLE=.*/,
					`BLOG_TITLE="${ctx.context.env.BLOG_TITLE}"`,
				);
			}
			if (ctx.context?.env?.BLOG_URL) {
				env = env.replace(
					/BLOG_URL=.*/,
					`BLOG_URL="${ctx.context.env.BLOG_URL}"`,
				);
			}

			return env;
		},
	},
} satisfies InitTemplate;

// Export individual hooks for direct use
export const preinstall = async (ctx: InitContext) => {
	console.log(`Setting up ${ctx.projectName}...`);
	return { success: true };
};

export const postinstall = async (ctx: InitContext) => {
	console.log(`Setup complete for ${ctx.projectName}`);
	return { success: true };
};

export const validate = async (ctx: InitContext) => {
	return {
		valid: true,
		errors: [],
		warnings: [],
	};
};

// Help documentation
export const help = {
	name: "RSS Feed Optimization",
	description:
		"High-performance RSS feed optimization system built with Bun.js",
	version: "1.0.0",
	usage: "bun create rss-feed-optimization <project-name>",
	options: [
		{
			flag: "--help, -h",
			description: "Show this help message",
		},
		{
			flag: "--yes, -y",
			description: "Accept all defaults without prompting",
		},
		{
			flag: "--minimal",
			description: "Create minimal project structure",
		},
		{
			flag: "--react",
			description: "Include React dependencies",
		},
		{
			flag: "--cwd <dir>",
			description: "Create project in specific directory",
		},
		{
			flag: "--env KEY=value",
			description: "Set environment variable",
		},
	],
	examples: [
		{
			command: "bun create rss-feed-optimization my-blog",
			description: "Create a new RSS feed project",
		},
		{
			command: "bun create rss-feed-optimization my-blog --yes",
			description: "Create with defaults, no prompts",
		},
		{
			command: "bun create rss-feed-optimization my-blog --minimal",
			description: "Create minimal setup",
		},
		{
			command: "bun create rss-feed-optimization my-blog --env PORT=8080",
			description: "Create with custom port",
		},
	],
	environment: {
		description: "The following environment variables are auto-detected:",
		variables: [
			{ name: "R2_ACCOUNT_ID", description: "Cloudflare R2 account ID" },
			{ name: "R2_ACCESS_KEY_ID", description: "R2 access key" },
			{ name: "R2_SECRET_ACCESS_KEY", description: "R2 secret key" },
			{ name: "R2_BUCKET_NAME", description: "R2 bucket name" },
			{ name: "ADMIN_TOKEN", description: "Admin API token" },
			{ name: "PORT", description: "Server port (default: 3000)" },
			{ name: "BLOG_TITLE", description: "Blog title" },
			{ name: "BLOG_URL", description: "Blog URL" },
		],
	},
	nextSteps: [
		"cd <project-name>",
		"bun install (if not already done)",
		"Update .env with your credentials",
		"bun dev (start development server)",
		"bun test (run tests)",
	],
	features: [
		"DNS optimization with prefetching",
		"Connection pooling and preconnect",
		"Circuit breaker pattern for resilience",
		"Embeddable RSS feed widgets",
		"WebSub (PubSubHubbub) support",
		"Performance metrics and profiling",
		"Cloudflare R2 integration",
		"Bun.js v1.3.7+ optimized",
	],
};

// Print help message
export function printHelp(): void {
	console.log(`
${help.name} v${help.version}
${help.description}

Usage:
  ${help.usage}

Options:
${help.options.map((opt) => `  ${opt.flag.padEnd(20)} ${opt.description}`).join("\n")}

Examples:
${help.examples.map((ex) => `  ${ex.command.padEnd(45)} # ${ex.description}`).join("\n")}

${help.environment.description}
${help.environment.variables.map((v) => `  ${v.name.padEnd(25)} ${v.description}`).join("\n")}

Features:
${help.features.map((f) => `  • ${f}`).join("\n")}

Next Steps:
${help.nextSteps.map((step) => `  ${step}`).join("\n")}
`);
}
