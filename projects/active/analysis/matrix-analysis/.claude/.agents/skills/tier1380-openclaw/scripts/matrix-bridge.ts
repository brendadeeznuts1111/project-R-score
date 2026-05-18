#!/usr/bin/env bun
/**
 * Matrix Agent ↔ OpenClaw Bridge Script
 * Integrates Matrix Agent with OpenClaw via the bridge
 */

import { $ } from "bun";
import { homedir } from "os";
import { join } from "path";

const PROJECT_BRIDGE = join(
	homedir(),
	"nolarose-mcp-config",
	"matrix-agent",
	"integrations",
	"openclaw-bridge.ts",
);

class MatrixOpenClawBridge {
	async status(): Promise<void> {
		console.info("🌉 Matrix ↔ OpenClaw Bridge");
		console.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

		// Check components
		const openclawExists = await this.fileExists(join(homedir(), "openclaw"));
		const matrixExists = await this.fileExists(join(homedir(), ".matrix"));
		const bridgeExists = await this.fileExists(PROJECT_BRIDGE);

		console.info(`OpenClaw: ${openclawExists ? "✅" : "❌"} ~/openclaw`);
		console.info(`Matrix Agent: ${matrixExists ? "✅" : "❌"} ~/.matrix`);
		console.info(`Bridge: ${bridgeExists ? "✅" : "❌"} ${PROJECT_BRIDGE}`);

		if (!openclawExists || !matrixExists) {
			console.info("\n⚠️  Missing components. Ensure both are installed.");
			return;
		}

		// Try to get Matrix status
		try {
			const result = await $`bun ${homedir()}/.matrix/matrix-agent.ts status`
				.nothrow()
				.quiet();
			console.info(
				`\nMatrix Agent: ${result.exitCode === 0 ? "✅ Running" : "⚠️  Not running"}`,
			);
		} catch {
			console.info("\nMatrix Agent: ⚠️  Could not check status");
		}
	}

	async proxy(command: string, args: string[]): Promise<void> {
		console.info(`🔄 Proxying to OpenClaw: ${command} ${args.join(" ")}`);

		try {
			const result =
				await $`cd ${homedir()}/openclaw && bun openclaw.mjs ${command} ${args}`.nothrow();
			console.info(result.stdout.toString());
			if (result.stderr.toString()) {
				console.error(result.stderr.toString());
			}
		} catch (error) {
			console.error("Proxy failed:", error);
		}
	}

	async matrixProxy(command: string, args: string[]): Promise<void> {
		console.info(`🔄 Proxying to Matrix: ${command} ${args.join(" ")}`);

		try {
			const result =
				await $`bun ${homedir()}/.matrix/matrix-agent.ts ${command} ${args}`.nothrow();
			console.info(result.stdout.toString());
		} catch (error) {
			console.error("Matrix proxy failed:", error);
		}
	}

	private async fileExists(path: string): Promise<boolean> {
		try {
			await $`test -e ${path}`.quiet();
			return true;
		} catch {
			return false;
		}
	}
}

// CLI
async function main() {
	const bridge = new MatrixOpenClawBridge();
	const args = Bun.argv.slice(2);
	const command = args[0];

	switch (command) {
		case "status":
			await bridge.status();
			break;
		case "proxy":
			await bridge.proxy(args[1], args.slice(2));
			break;
		case "matrix":
			await bridge.matrixProxy(args[1], args.slice(2));
			break;
		default:
			console.info("Usage: matrix-bridge.ts <status|proxy|matrix> [args]");
			break;
	}
}

if (import.meta.main) {
	main();
}
