#!/usr/bin/env bun

/**
 * Demo: Enhanced Process Management and Console Reading
 * Showcases advanced process control and interactive console features
 */

import {
	ConsoleReader,
	ProcessManager,
	ProcessUtils,
} from "../../src/utils/process-manager";

async function main() {
	console.info("🚀 Enhanced Process Management & Console Demo");
	console.info("============================================\n");

	// Demo 1: Simple command execution
	console.info("1️⃣ Simple Command Execution");
	console.info("----------------------------");

	const processManager = new ProcessManager();

	// Execute a simple command
	const result = await processManager.execute({
		command: 'echo "Hello from ProcessManager!"',
	});
	console.info(`Exit Code: ${result.exitCode}`);
	console.info(`Output: ${result.stdout}`);
	console.info(`Duration: ${result.duration}ms\n`);

	// Demo 2: Process with arguments
	console.info("2️⃣ Process with Arguments");
	console.info("--------------------------");

	const result2 = await processManager.execute({
		command: "echo",
		args: ["Process", "Manager", "Demo"],
	});
	console.info(`Output: ${result2.stdout}`);

	// Demo 3: System information
	console.info("\n3️⃣ System Information");
	console.info("----------------------");

	const sysInfo = ProcessUtils.getSystemInfo();
	console.info(`Platform: ${sysInfo.platform}`);
	console.info(`Architecture: ${sysInfo.arch}`);
	console.info(`Node Version: ${sysInfo.nodeVersion}`);
	console.info(`PID: ${sysInfo.pid}`);
	console.info(`Uptime: ${sysInfo.uptime.toFixed(2)} seconds`);
	console.info(`CPU Cores: ${sysInfo.cpuCount}`);

	// Demo 4: Sleep utility
	console.info("\n4️⃣ Sleep Utility (with countdown)");
	console.info("-----------------------------------");

	console.info("Waiting 2 seconds...");
	for (let i = 2; i > 0; i--) {
		console.info(`  ${i}s...`);
		await ProcessUtils.sleep(1000);
	}
	console.info("Done! ✅");

	// Demo 5: Retry mechanism
	console.info("\n5️⃣ Retry Mechanism");
	console.info("------------------");

	let attempt = 0;
	const result3 = await ProcessUtils.retry(
		async () => {
			attempt++;
			console.info(`  Attempt ${attempt}`);
			if (attempt < 3) {
				throw new Error("Simulated failure");
			}
			return { success: true, message: "Success on attempt 3!" };
		},
		{ maxRetries: 3, baseDelay: 500 },
	);
	console.info(`Result: ${result3.message}`);

	// Demo 6: Console Reader - Simple input
	console.info("\n6️⃣ Console Reader - Simple Input");
	console.info("----------------------------------");

	const _reader = new ConsoleReader();
	console.info(
		"(Skipping interactive input - run demo-interactive.ts for this feature)",
	);
	console.info("Available methods:");
	console.info("  - readLine(prompt)");
	console.info("  - readUntil(delimiter)");
	console.info("  - readValidated(options)");
	console.info("  - readPassword(prompt)");
	console.info("  - readNumber(options)");
	console.info("  - readConfirmation(prompt)");
	console.info("  - readSelection(options)");

	// Demo 7: Process Manager Features
	console.info("\n7️⃣ Process Manager Features");
	console.info("---------------------------");
	console.info("Available operations:");
	console.info("  - execute(options): Promise<ProcessResult>");
	console.info(
		"  - executeStreaming(options, callbacks): Promise<ProcessResult>",
	);
	console.info("  - start(options): ProcessInfo");
	console.info("  - kill(pid, signal): boolean");
	console.info("  - getProcessInfo(pid): ProcessInfo | undefined");
	console.info("  - listProcesses(): ProcessInfo[]");
	console.info("  - waitFor(pid, timeout): Promise<ProcessResult>");

	// Demo 8: Background process example
	console.info("\n8️⃣ Background Process Example");
	console.info("------------------------------");

	const bgProcess = processManager.start({
		command: 'sleep 10 && echo "Background task complete"',
	});
	console.info(`Started background process: PID ${bgProcess.pid}`);
	console.info(`Command: ${bgProcess.command}`);
	console.info(`Status: ${bgProcess.status}`);

	// Wait a moment then kill it
	await ProcessUtils.sleep(1000);
	const killed = processManager.kill(bgProcess.pid);
	console.info(
		`Kill process ${bgProcess.pid}: ${killed ? "Success" : "Failed"}`,
	);

	// Demo 9: Interactive Shell
	console.info("\n9️⃣ Interactive Shell");
	console.info("--------------------");
	console.info("Run: bun run demo-interactive-shell.ts");
	console.info("Features:");
	console.info("  - exec <command>  - Execute command");
	console.info("  - start <command> - Start background process");
	console.info("  - kill <pid>      - Kill process");
	console.info("  - list            - List processes");
	console.info("  - help            - Show help");
	console.info("  - exit            - Exit shell");

	console.info("\n✅ Process Management Demo Complete!");
	console.info("====================================");
	console.info("\n📁 Key Files:");
	console.info("  - src/utils/process-manager.ts  - Main utilities");
	console.info("  - demo-interactive.ts          - Interactive console demo");
	console.info("  - demo-interactive-shell.ts    - Interactive shell demo");
}

main().catch(console.error);
