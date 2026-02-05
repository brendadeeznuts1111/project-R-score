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
	console.log("🚀 Enhanced Process Management & Console Demo");
	console.log("============================================\n");

	// Demo 1: Simple command execution
	console.log("1️⃣ Simple Command Execution");
	console.log("----------------------------");

	const processManager = new ProcessManager();

	// Execute a simple command
	const result = await processManager.execute({
		command: 'echo "Hello from ProcessManager!"',
	});
	console.log(`Exit Code: ${result.exitCode}`);
	console.log(`Output: ${result.stdout}`);
	console.log(`Duration: ${result.duration}ms\n`);

	// Demo 2: Process with arguments
	console.log("2️⃣ Process with Arguments");
	console.log("--------------------------");

	const result2 = await processManager.execute({
		command: "echo",
		args: ["Process", "Manager", "Demo"],
	});
	console.log(`Output: ${result2.stdout}`);

	// Demo 3: System information
	console.log("\n3️⃣ System Information");
	console.log("----------------------");

	const sysInfo = ProcessUtils.getSystemInfo();
	console.log(`Platform: ${sysInfo.platform}`);
	console.log(`Architecture: ${sysInfo.arch}`);
	console.log(`Node Version: ${sysInfo.nodeVersion}`);
	console.log(`PID: ${sysInfo.pid}`);
	console.log(`Uptime: ${sysInfo.uptime.toFixed(2)} seconds`);
	console.log(`CPU Cores: ${sysInfo.cpuCount}`);

	// Demo 4: Sleep utility
	console.log("\n4️⃣ Sleep Utility (with countdown)");
	console.log("-----------------------------------");

	console.log("Waiting 2 seconds...");
	for (let i = 2; i > 0; i--) {
		console.log(`  ${i}s...`);
		await ProcessUtils.sleep(1000);
	}
	console.log("Done! ✅");

	// Demo 5: Retry mechanism
	console.log("\n5️⃣ Retry Mechanism");
	console.log("------------------");

	let attempt = 0;
	const result3 = await ProcessUtils.retry(
		async () => {
			attempt++;
			console.log(`  Attempt ${attempt}`);
			if (attempt < 3) {
				throw new Error("Simulated failure");
			}
			return { success: true, message: "Success on attempt 3!" };
		},
		{ maxRetries: 3, baseDelay: 500 },
	);
	console.log(`Result: ${result3.message}`);

	// Demo 6: Console Reader - Simple input
	console.log("\n6️⃣ Console Reader - Simple Input");
	console.log("----------------------------------");

	const _reader = new ConsoleReader();
	console.log(
		"(Skipping interactive input - run demo-interactive.ts for this feature)",
	);
	console.log("Available methods:");
	console.log("  - readLine(prompt)");
	console.log("  - readUntil(delimiter)");
	console.log("  - readValidated(options)");
	console.log("  - readPassword(prompt)");
	console.log("  - readNumber(options)");
	console.log("  - readConfirmation(prompt)");
	console.log("  - readSelection(options)");

	// Demo 7: Process Manager Features
	console.log("\n7️⃣ Process Manager Features");
	console.log("---------------------------");
	console.log("Available operations:");
	console.log("  - execute(options): Promise<ProcessResult>");
	console.log(
		"  - executeStreaming(options, callbacks): Promise<ProcessResult>",
	);
	console.log("  - start(options): ProcessInfo");
	console.log("  - kill(pid, signal): boolean");
	console.log("  - getProcessInfo(pid): ProcessInfo | undefined");
	console.log("  - listProcesses(): ProcessInfo[]");
	console.log("  - waitFor(pid, timeout): Promise<ProcessResult>");

	// Demo 8: Background process example
	console.log("\n8️⃣ Background Process Example");
	console.log("------------------------------");

	const bgProcess = processManager.start({
		command: 'sleep 10 && echo "Background task complete"',
	});
	console.log(`Started background process: PID ${bgProcess.pid}`);
	console.log(`Command: ${bgProcess.command}`);
	console.log(`Status: ${bgProcess.status}`);

	// Wait a moment then kill it
	await ProcessUtils.sleep(1000);
	const killed = processManager.kill(bgProcess.pid);
	console.log(
		`Kill process ${bgProcess.pid}: ${killed ? "Success" : "Failed"}`,
	);

	// Demo 9: Interactive Shell
	console.log("\n9️⃣ Interactive Shell");
	console.log("--------------------");
	console.log("Run: bun run demo-interactive-shell.ts");
	console.log("Features:");
	console.log("  - exec <command>  - Execute command");
	console.log("  - start <command> - Start background process");
	console.log("  - kill <pid>      - Kill process");
	console.log("  - list            - List processes");
	console.log("  - help            - Show help");
	console.log("  - exit            - Exit shell");

	console.log("\n✅ Process Management Demo Complete!");
	console.log("====================================");
	console.log("\n📁 Key Files:");
	console.log("  - src/utils/process-manager.ts  - Main utilities");
	console.log("  - demo-interactive.ts          - Interactive console demo");
	console.log("  - demo-interactive-shell.ts    - Interactive shell demo");
}

main().catch(console.error);
