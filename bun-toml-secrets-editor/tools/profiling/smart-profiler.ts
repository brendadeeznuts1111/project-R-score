#!/usr/bin/env bun

// scripts/smart-profiler.js - Environment-adaptive profiling system

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import { join } from "node:path";
import { spawn } from "bun";

class SmartProfiler {
	constructor() {
		this.environment = this.detectEnvironment();
		this.config = this.generateConfig();
		this.isProfiling = false;
		this.profileCount = 0;
	}

	detectEnvironment() {
		const nodeEnv = process.env.NODE_ENV || "development";
		const isCI =
			process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";

		// Get available memory (simplified)
		const availableMemory = this.getAvailableMemory();
		const cpuCores = os.cpus().length;
		const platform = process.platform;

		return {
			nodeEnv,
			isProduction: nodeEnv === "production",
			isDevelopment: nodeEnv === "development",
			isCI,
			availableMemory,
			cpuCores,
			platform,
		};
	}

	getAvailableMemory() {
		try {
			const _totalMem = os.totalmem() / 1024 / 1024; // MB
			const freeMem = os.freemem() / 1024 / 1024; // MB
			return Math.floor(freeMem);
		} catch (error) {
			console.warn("Could not get memory info:", error.message);
			return 1024; // Default to 1GB
		}
	}

	generateConfig() {
		const baseConfig = {
			samplingInterval: 1000,
			maxSamples: 100000,
			heapInterval: 1024,
			enableSourceMaps: false,
			includeNodeModules: false,
			outputDir: "./profiles",
			autoThreshold: {
				cpu: 80,
				memory: 1024,
				responseTime: 500,
			},
		};

		// Adapt based on environment
		if (this.environment.isProduction) {
			return {
				...baseConfig,
				samplingInterval: 2000, // Less frequent in production
				maxSamples: 50000, // Fewer samples
				enableSourceMaps: false,
				includeNodeModules: false,
				outputDir: "./profiles/production",
				autoThreshold: {
					cpu: 90, // Higher threshold for production
					memory: 2048,
					responseTime: 1000,
				},
			};
		} else if (this.environment.isDevelopment) {
			return {
				...baseConfig,
				samplingInterval: 100, // Very frequent for development
				maxSamples: 200000, // More samples
				enableSourceMaps: true,
				includeNodeModules: true,
				outputDir: "./profiles/development",
				autoThreshold: {
					cpu: 70, // Lower threshold for development
					memory: 512,
					responseTime: 200,
				},
			};
		} else if (this.environment.isCI) {
			return {
				...baseConfig,
				samplingInterval: 500,
				maxSamples: 75000,
				enableSourceMaps: true,
				includeNodeModules: false,
				outputDir: "./profiles/ci",
				autoThreshold: {
					cpu: 85,
					memory: 1536,
					responseTime: 750,
				},
			};
		}

		// Adapt based on available resources
		if (this.environment.availableMemory < 2048) {
			baseConfig.maxSamples = Math.floor(baseConfig.maxSamples * 0.5);
			baseConfig.autoThreshold.memory = Math.floor(
				baseConfig.autoThreshold.memory * 0.5,
			);
		}

		if (this.environment.cpuCores < 4) {
			baseConfig.samplingInterval = baseConfig.samplingInterval * 2;
		}

		return baseConfig;
	}

	async createProfileDirectory() {
		// Use Bun shell with the fixed CWD handling
		const shell = Bun.shell();
		shell.cwd("."); // Now safely uses current directory thanks to Bun fix

		if (!existsSync(this.config.outputDir)) {
			mkdirSync(this.config.outputDir, { recursive: true });
			console.log(
				`📁 Created profile directory: ${shell.cwd(this.config.outputDir)}`,
			);
		} else {
			console.log(
				`📁 Using existing profile directory: ${shell.cwd(this.config.outputDir)}`,
			);
		}
	}

	generateProfileName(type) {
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const env = this.environment.nodeEnv;
		return `${type}-${env}-${timestamp}`;
	}

	async startCPUProfiling(targetScript = "src/main.ts") {
		if (this.isProfiling) {
			throw new Error("Profiling already in progress");
		}

		this.isProfiling = true;
		await this.createProfileDirectory();

		const profileName = this.generateProfileName("cpu-profile");
		const config = this.config;

		console.log(`🔥 Starting CPU profiling...`);
		console.log(`   Sampling: ${config.samplingInterval}μs`);
		console.log(`   Max samples: ${config.maxSamples}`);
		console.log(`   Output: ${config.outputDir}/${profileName}.md`);

		try {
			const args = [
				"--cpu-prof-md",
				`--cpu-prof-dir=${config.outputDir}`,
				`--cpu-prof-name=${profileName}`,
				`--cpu-prof-sampling-interval=${config.samplingInterval}`,
				`--cpu-prof-max-samples=${config.maxSamples}`,
				"--preserve-source-locations",
				config.includeNodeModules
					? "--include-node-modules"
					: "--exclude-node-modules",
				targetScript,
			];

			const proc = spawn({
				cmd: ["bun", ...args],
				stdout: "pipe",
				stderr: "pipe",
			});

			await proc.exited;
			this.isProfiling = false;
			this.profileCount++;

			console.log(
				`✅ CPU profiling completed: ${config.outputDir}/${profileName}.md`,
			);
			return `${config.outputDir}/${profileName}.md`;
		} catch (error) {
			console.error(`❌ Failed to start CPU profiling: ${error.message}`);
			throw error;
		}
	}

	async startHeapProfiling(targetScript = "src/main.ts") {
		if (this.isProfiling) {
			throw new Error("Profiling already in progress");
		}

		this.isProfiling = true;
		await this.createProfileDirectory();

		const profileName = this.generateProfileName("heap");
		const profilePath = join(this.config.outputDir, `${profileName}.md`);

		console.log(`🧠 Starting heap profiling...`);
		console.log(`   Environment: ${this.environment.nodeEnv}`);
		console.log(`   Heap interval: ${this.config.heapInterval} bytes`);
		console.log(`   Output: ${profilePath}`);

		const args = [
			"--heap-prof-md",
			"--heap-prof-name",
			profileName,
			"--heap-prof-dir",
			this.config.outputDir,
		];

		// Set environment variables
		process.env.BUN_HEAP_PROF_INTERVAL = this.config.heapInterval.toString();

		const proc = spawn(["bun", ...args, targetScript], {
			stdout: "inherit",
			stderr: "inherit",
		});

		await proc.exited;
		this.isProfiling = false;
		this.profileCount++;

		console.log(`✅ Heap profiling completed: ${profilePath}`);
		return profilePath;
	}

	async startAdaptiveProfiling(targetScript = "src/main.ts") {
		console.log(`🎯 Starting adaptive profiling based on environment...`);
		console.log(
			`   Detected: ${this.environment.nodeEnv} on ${this.environment.platform}`,
		);
		console.log(
			`   Memory: ${this.environment.availableMemory}MB, Cores: ${this.environment.cpuCores}`,
		);

		const results = await Promise.all([
			this.startCPUProfiling(targetScript),
			this.startHeapProfiling(targetScript),
		]);

		return {
			cpu: results[0],
			heap: results[1],
		};
	}

	generateConfigFile() {
		const configPath = join(this.config.outputDir, "profiling-config.json");
		const configData = {
			environment: this.environment,
			config: this.config,
			generated: new Date().toISOString(),
		};

		writeFileSync(configPath, JSON.stringify(configData, null, 2));
		console.log(`📝 Profiling config saved to: ${configPath}`);
	}

	printEnvironmentInfo() {
		console.log("\n🌍 Environment Detection Results:");
		console.log(`   Node Env: ${this.environment.nodeEnv}`);
		console.log(`   Production: ${this.environment.isProduction}`);
		console.log(`   Development: ${this.environment.isDevelopment}`);
		console.log(`   CI/CD: ${this.environment.isCI}`);
		console.log(`   Platform: ${this.environment.platform}`);
		console.log(`   Available Memory: ${this.environment.availableMemory}MB`);
		console.log(`   CPU Cores: ${this.environment.cpuCores}`);
		console.log("\n⚙️  Adaptive Profiling Configuration:");
		console.log(`   Sampling Interval: ${this.config.samplingInterval}μs`);
		console.log(`   Max Samples: ${this.config.maxSamples}`);
		console.log(`   Heap Interval: ${this.config.heapInterval} bytes`);
		console.log(`   Source Maps: ${this.config.enableSourceMaps}`);
		console.log(`   Include Node Modules: ${this.config.includeNodeModules}`);
		console.log(`   Output Directory: ${this.config.outputDir}`);
	}

	getStats() {
		return {
			profileCount: this.profileCount,
			environment: this.environment,
			config: this.config,
		};
	}
}

// CLI Interface
async function main() {
	const args = process.argv.slice(2);
	const profiler = new SmartProfiler();

	let command = "";
	let targetScript = "src/main.ts";
	let showConfig = false;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === "--cpu") {
			command = "cpu";
		} else if (arg === "--heap") {
			command = "heap";
		} else if (arg === "--adaptive") {
			command = "adaptive";
		} else if (arg === "--target") {
			targetScript = args[i + 1];
			i++;
		} else if (arg === "--config") {
			showConfig = true;
		} else if (arg === "--help") {
			console.log(`
🎯 Smart Profiler - Environment-adaptive profiling system

USAGE:
  bun smart-profiler.js <command> [options]

COMMANDS:
  cpu               Start CPU profiling with adaptive settings
  heap              Start heap profiling with adaptive settings
  adaptive          Start both CPU and heap profiling

OPTIONS:
  --target <script>    Target script to profile (default: src/main.ts)
  --config           Show environment detection and configuration
  --help             Show this help

ENVIRONMENT VARIABLES:
  BUN_CPU_PROF_SAMPLING_INTERVAL    CPU sampling interval in microseconds
  BUN_CPU_PROF_MAX_SAMPLES          Maximum CPU samples
  BUN_HEAP_PROF_INTERVAL            Heap sampling interval in bytes

EXAMPLES:
  bun smart-profiler.js --cpu
  bun smart-profiler.js --adaptive --target src/cli/duoplus-cli.ts
  bun smart-profiler.js --config

The profiler automatically adapts settings based on:
  - Environment (development/production/CI)
  - Available memory and CPU cores
  - Platform-specific optimizations
`);
			process.exit(0);
		}
	}

	if (showConfig) {
		profiler.printEnvironmentInfo();
		return;
	}

	if (!command) {
		console.error("❌ Please specify a command: --cpu, --heap, or --adaptive");
		process.exit(1);
	}

	try {
		profiler.generateConfigFile();

		switch (command) {
			case "cpu":
				await profiler.startCPUProfiling(targetScript);
				break;
			case "heap":
				await profiler.startHeapProfiling(targetScript);
				break;
			case "adaptive":
				await profiler.startAdaptiveProfiling(targetScript);
				break;
		}

		const stats = profiler.getStats();
		console.log(
			`📊 Profiling session complete. Total profiles: ${stats.profileCount}`,
		);
	} catch (error) {
		console.error(`❌ Profiling failed: ${error.message}`);
		process.exit(1);
	}
}

if (import.meta.main) {
	main().catch(console.error);
}

export { SmartProfiler };
