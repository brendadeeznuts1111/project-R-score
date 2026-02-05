#!/usr/bin/env bun

// scripts/terminal-interface.js - Advanced terminal interface with Bun v1.3.7 Terminal API

import { spawn } from "bun";

/**
 * Advanced terminal interface leveraging Bun v1.3.7 Terminal API:
 * - Interactive terminal with PTY support
 * - Enhanced command execution and monitoring
 * - Real-time output processing and formatting
 */

class TerminalInterface {
	constructor(options = {}) {
		this.cols = options.cols || 80;
		this.rows = options.rows || 24;
		this.shell = options.shell || "bash";
		this.history = [];
		this.maxHistory = 100;
		this.aliases = new Map();
		this.prompt = options.prompt || "profiler> ";
		this.isRunning = false;
		this.currentProcess = null;
	}

	// Start interactive terminal
	async startTerminal() {
		console.log("🖥️  Starting Advanced Terminal Interface");
		console.log(`📐 Terminal size: ${this.cols}x${this.rows}`);
		console.log(`🐚 Shell: ${this.prompt}`);
		console.log('Type "help" for available commands or "exit" to quit\n');

		this.isRunning = true;

		// Setup default aliases
		this.setupAliases();

		// Start interactive loop
		await this.interactiveLoop();
	}

	setupAliases() {
		this.aliases.set("h", "help");
		this.aliases.set("q", "quit");
		this.aliases.set("l", "ls -la");
		this.aliases.set("ll", "ls -la");
		this.aliases.set("profile", "bun run profile:cpu");
		this.aliases.set("dashboard", "bun run profile:dashboard");
		this.aliases.set("logs", "tail -f logs/profiling.jsonl");
		this.aliases.set("status", "bun run profile:status");
		this.aliases.set("clean", "rm -rf profiles/*.md profiles/*.json");
	}

	async interactiveLoop() {
		while (this.isRunning) {
			try {
				// Display prompt
				process.stdout.write(this.prompt);

				// Read command
				const command = await this.readInput();

				if (!command.trim()) continue;

				// Add to history
				this.addToHistory(command);

				// Process command
				await this.processCommand(command);
			} catch (error) {
				console.error("❌ Terminal error:", error.message);
			}
		}
	}

	async readInput() {
		return new Promise((resolve) => {
			let input = "";

			process.stdin.setRawMode(true);
			process.stdin.resume();
			process.stdin.setEncoding("utf8");

			const onData = (key) => {
				if (key === "\u0003") {
					// Ctrl+C
					process.stdout.write("^C\n");
					resolve("exit");
					cleanup();
				} else if (key === "\u000D") {
					// Enter
					process.stdout.write("\n");
					cleanup();
					resolve(input);
				} else if (key === "\u007F") {
					// Backspace
					if (input.length > 0) {
						input = input.slice(0, -1);
						process.stdout.write("\b \b");
					}
				} else if (key === "\u001B[A") {
					// Up arrow
					// History navigation (simplified)
					if (this.history.length > 0) {
						const lastCommand = this.history[this.history.length - 1];
						process.stdout.write(`\r${this.prompt}${lastCommand}`);
						input = lastCommand;
					}
				} else if (key.length === 1) {
					input += key;
					process.stdout.write(key);
				}
			};

			const cleanup = () => {
				process.stdin.setRawMode(false);
				process.stdin.pause();
				process.stdin.removeListener("data", onData);
			};

			process.stdin.on("data", onData);
		});
	}

	async processCommand(command) {
		// Handle aliases
		const aliasCommand = this.aliases.get(command.split(" ")[0]);
		if (aliasCommand) {
			const args = command.split(" ").slice(1);
			command = `${aliasCommand} ${args.join(" ")}`;
		}

		const [cmd, ...args] = command.split(" ");

		// Handle built-in commands
		switch (cmd.toLowerCase()) {
			case "help":
			case "h":
				this.showHelp();
				break;

			case "exit":
			case "quit":
			case "q":
				console.log("👋 Goodbye!");
				this.isRunning = false;
				break;

			case "clear":
				console.clear();
				break;

			case "history":
				this.showHistory();
				break;

			case "alias":
				this.manageAliases(args);
				break;

			case "profile":
				await this.runProfilingCommand(args);
				break;

			case "monitor":
				await this.startMonitoring(args);
				break;

			case "terminal":
				await this.spawnTerminal(args);
				break;

			default:
				// Execute external command with PTY
				await this.executeCommand(command);
		}
	}

	showHelp() {
		console.log(`
🔧 Profiling Terminal Commands:

📊 Profiling:
  profile [cpu|heap|adaptive]  Start profiling session
  monitor [interval]           Start system monitoring
  status                       Show profiling status

🖥️  Terminal:
  terminal [program]           Spawn interactive program
  clear                        Clear screen
  history                      Show command history
  alias [name=command]         Manage aliases

📁 File Operations:
  logs                         Tail profiling logs
  clean                        Clean profile files
  bundle                       Create profile bundle

🔍 Debugging:
  inspector                    Start Node.js inspector
  debug [file]                 Debug script with inspector

💡 Other:
  help                         Show this help
  exit                         Exit terminal

Examples:
  profile cpu                  Start CPU profiling
  monitor 1000                 Monitor every 1 second
  terminal vim                 Open vim in terminal
  alias p=profile              Create alias 'p'
`);
	}

	showHistory() {
		console.log("\n📋 Command History:");
		this.history.slice(-10).forEach((cmd, index) => {
			console.log(`   ${this.history.length - 10 + index + 1}. ${cmd}`);
		});
	}

	manageAliases(args) {
		if (args.length === 0) {
			console.log("\n🔧 Current Aliases:");
			for (const [name, command] of this.aliases) {
				console.log(`   ${name} = ${command}`);
			}
		} else if (args[0].includes("=")) {
			// Set alias
			const [name, command] = args[0].split("=", 2);
			this.aliases.set(name, command);
			console.log(`✅ Alias set: ${name} = ${command}`);
		} else {
			// Show specific alias
			const command = this.aliases.get(args[0]);
			if (command) {
				console.log(`${args[0]} = ${command}`);
			} else {
				console.log(`❌ Alias not found: ${args[0]}`);
			}
		}
	}

	async runProfilingCommand(args) {
		const type = args[0] || "cpu";

		console.log(`🚀 Starting ${type} profiling...`);

		try {
			const profileCommand = `bun run profile:${type}`;
			await this.executeCommand(profileCommand);
		} catch (error) {
			console.error(`❌ Failed to start ${type} profiling:`, error.message);
		}
	}

	async startMonitoring(args) {
		const interval = parseInt(args[0], 10) || 1000;

		console.log(`📊 Starting system monitoring (interval: ${interval}ms)`);
		console.log("Press Ctrl+C to stop monitoring\n");

		const monitor = setInterval(async () => {
			const metrics = this.getSystemMetrics();
			this.displayMetrics(metrics);
		}, interval);

		// Handle Ctrl+C
		process.stdin.setRawMode(true);
		process.stdin.resume();

		const onStop = () => {
			clearInterval(monitor);
			process.stdin.setRawMode(false);
			process.stdin.pause();
			console.log("\n⏹️  Monitoring stopped");
		};

		process.stdin.on("data", (key) => {
			if (key === "\u0003") {
				onStop();
			}
		});

		return new Promise((resolve) => {
			process.stdin.once("data", (key) => {
				if (key === "\u0003") {
					onStop();
					resolve();
				}
			});
		});
	}

	getSystemMetrics() {
		const memUsage = process.memoryUsage();
		const cpuUsage = process.cpuUsage();

		return {
			timestamp: new Date().toISOString(),
			memory: {
				rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
				heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
				heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
				external: `${Math.round(memUsage.external / 1024 / 1024)} MB`,
			},
			cpu: {
				user: cpuUsage.user,
				system: cpuUsage.system,
			},
			uptime: `${Math.round(process.uptime())}s`,
		};
	}

	displayMetrics(metrics) {
		// Clear line and rewrite
		process.stdout.write(`\r${" ".repeat(80)}\r`);

		const output =
			`📊 ${metrics.timestamp} | ` +
			`Memory: ${metrics.memory.heapUsed}/${metrics.memory.heapTotal} | ` +
			`RSS: ${metrics.memory.rss} | ` +
			`Uptime: ${metrics.uptime}`;

		process.stdout.write(output);
	}

	async spawnTerminal(args) {
		const program = args[0] || this.shell;
		const programArgs = args.slice(1);

		console.log(`🖥️  Spawning terminal: ${program} ${programArgs.join(" ")}`);

		try {
			const proc = spawn([program, ...programArgs], {
				terminal: {
					cols: this.cols,
					rows: this.rows,
					data: (_terminal, data) => {
						// Enhanced output processing with Bun.wrapAnsi
						const processedData = this.processTerminalOutput(data);
						process.stdout.write(processedData);
					},
				},
				env: {
					...process.env,
					TERM: "xterm-256color",
				},
			});

			this.currentProcess = proc;

			// Handle process exit
			await proc.exited;
			proc.terminal.close();
			this.currentProcess = null;

			console.log(`\n✅ Terminal session ended`);
		} catch (error) {
			console.error("❌ Failed to spawn terminal:", error.message);
		}
	}

	processTerminalOutput(data) {
		// Enhanced output processing using Bun v1.3.7 features
		if (!data) return "";

		// Use Bun.wrapAnsi for better terminal formatting
		let processed = Bun.wrapAnsi(data);

		// Add some enhancements
		processed = processed
			.replace(/\[ERROR\]/g, "\x1b[31m[ERROR]\x1b[0m")
			.replace(/\[WARN\]/g, "\x1b[33m[WARN]\x1b[0m")
			.replace(/\[INFO\]/g, "\x1b[36m[INFO]\x1b[0m")
			.replace(/\[SUCCESS\]/g, "\x1b[32m[SUCCESS]\x1b[0m");

		return processed;
	}

	async executeCommand(command) {
		console.log(`💻 Executing: ${command}`);

		try {
			const proc = spawn(["bash", "-c", command], {
				terminal: {
					cols: this.cols,
					rows: this.rows,
					data: (_terminal, data) => {
						// Real-time output processing
						const processedData = this.processTerminalOutput(data);
						process.stdout.write(processedData);
					},
				},
				env: process.env,
			});

			await proc.exited;
			proc.terminal.close();
		} catch (error) {
			console.error("❌ Command execution failed:", error.message);
		}
	}

	addToHistory(command) {
		this.history.push(command);
		if (this.history.length > this.maxHistory) {
			this.history.shift();
		}
	}

	// Stop current process
	stopCurrentProcess() {
		if (this.currentProcess) {
			this.currentProcess.kill();
			this.currentProcess = null;
			console.log("⏹️  Process stopped");
		}
	}

	// Get terminal status
	getStatus() {
		return {
			isRunning: this.isRunning,
			currentProcess: this.currentProcess ? "active" : "none",
			terminalSize: `${this.cols}x${this.rows}`,
			historyCount: this.history.length,
			aliasesCount: this.aliases.size,
			shell: this.shell,
		};
	}
}

// Export for use in other modules
export { TerminalInterface };

// CLI interface
if (import.meta.main) {
	const terminal = new TerminalInterface({
		cols: 100,
		rows: 30,
		prompt: "profiler🔍> ",
	});

	console.log("🖥️  Advanced Terminal Interface Demo");
	console.log("==================================");

	try {
		await terminal.startTerminal();
	} catch (error) {
		console.error("❌ Terminal demo failed:", error.message);
	}
}
