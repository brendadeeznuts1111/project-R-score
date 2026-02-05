#!/usr/bin/env bun
// scripts/enhanced-logging.js - Advanced logging with Bun.JSONL and Bun.wrapAnsi()

import { appendFileSync, writeFileSync } from "node:fs";

/**
 * Enhanced logging system leveraging Bun v1.3.7 features:
 * - Bun.JSONL for structured log streaming
 * - Bun.wrapAnsi() for better terminal output
 * - Real-time log processing and filtering
 */

class EnhancedLogger {
	constructor(options = {}) {
		this.logFile = options.logFile || "./logs/profiling.jsonl";
		this.terminal = options.terminal !== false;
		this.level = options.level || "info";
		this.colors = {
			reset: "\x1b[0m",
			bright: "\x1b[1m",
			dim: "\x1b[2m",
			red: "\x1b[31m",
			green: "\x1b[32m",
			yellow: "\x1b[33m",
			blue: "\x1b[34m",
			magenta: "\x1b[35m",
			cyan: "\x1b[36m",
			white: "\x1b[37m",
		};

		this.initializeLogFile();
	}

	initializeLogFile() {
		try {
			// Ensure log directory exists
			const logDir = this.logFile.substring(0, this.logFile.lastIndexOf("/"));
			if (logDir && !require("node:fs").existsSync(logDir)) {
				require("node:fs").mkdirSync(logDir, { recursive: true });
			}

			// Write header to JSONL file
			const header = {
				timestamp: new Date().toISOString(),
				type: "log_session_start",
				version: "1.0.0",
				bun_version: process.version,
				node_env: process.env.NODE_ENV || "development",
			};

			appendFileSync(this.logFile, `${JSON.stringify(header)}\n`);
		} catch (error) {
			console.error("Failed to initialize log file:", error.message);
		}
	}

	// Enhanced ANSI wrapping using Bun v1.3.7
	colorize(text, color) {
		if (!this.terminal) return text;
		return Bun.wrapAnsi(`${this.colors[color]}${text}${this.colors.reset}`);
	}

	// Structured logging with Bun.JSONL
	log(level, message, metadata = {}) {
		const logEntry = {
			timestamp: new Date().toISOString(),
			level: level.toUpperCase(),
			message,
			metadata,
			pid: process.pid,
			memory: process.memoryUsage(),
			uptime: process.uptime(),
		};

		// Write to JSONL file
		this.writeToJSONL(logEntry);

		// Enhanced terminal output
		this.writeToTerminal(logEntry);
	}

	writeToJSONL(logEntry) {
		try {
			appendFileSync(this.logFile, `${JSON.stringify(logEntry)}\n`);
		} catch (error) {
			console.error("Failed to write to JSONL log:", error.message);
		}
	}

	writeToTerminal(logEntry) {
		if (!this.terminal) return;

		const { level, message, timestamp, metadata } = logEntry;
		const time = new Date(timestamp).toLocaleTimeString();

		let coloredLevel = level;
		let coloredMessage = message;

		switch (level.toLowerCase()) {
			case "error":
				coloredLevel = this.colorize(level, "red");
				coloredMessage = this.colorize(message, "red");
				break;
			case "warn":
				coloredLevel = this.colorize(level, "yellow");
				coloredMessage = this.colorize(message, "yellow");
				break;
			case "info":
				coloredLevel = this.colorize(level, "cyan");
				coloredMessage = this.colorize(message, "cyan");
				break;
			case "debug":
				coloredLevel = this.colorize(level, "dim");
				coloredMessage = this.colorize(message, "dim");
				break;
			case "success":
				coloredLevel = this.colorize(level, "green");
				coloredMessage = this.colorize(message, "green");
				break;
		}

		// Format: [TIME] LEVEL MESSAGE
		const formattedOutput = `${this.colorize(`[${time}]`, "dim")} ${coloredLevel} ${coloredMessage}`;

		console.log(formattedOutput);

		// Print metadata if present
		if (Object.keys(metadata).length > 0) {
			const metadataStr =
				this.colorize("   Metadata: ", "dim") +
				this.colorize(JSON.stringify(metadata, null, 2), "blue");
			console.log(metadataStr);
		}
	}

	// Convenience methods
	debug(message, metadata) {
		this.log("debug", message, metadata);
	}

	info(message, metadata) {
		this.log("info", message, metadata);
	}

	warn(message, metadata) {
		this.log("warn", message, metadata);
	}

	error(message, metadata) {
		this.log("error", message, metadata);
	}

	success(message, metadata) {
		this.log("success", message, metadata);
	}

	// Profiling-specific logging
	profileStart(type, options = {}) {
		this.info(`🔥 Starting ${type} profiling`, {
			type,
			options,
			startTime: Date.now(),
			memory: process.memoryUsage(),
		});
	}

	profileComplete(type, results = {}) {
		this.success(`✅ ${type} profiling completed`, {
			type,
			results,
			endTime: Date.now(),
			memory: process.memoryUsage(),
		});
	}

	profileError(type, error) {
		this.error(`❌ ${type} profiling failed`, {
			type,
			error: error.message,
			stack: error.stack,
			timestamp: Date.now(),
		});
	}

	// System metrics logging
	logMetrics(metrics) {
		this.info("📊 System metrics", {
			cpu: metrics.cpu,
			memory: metrics.memory,
			activeProfiles: metrics.activeProfiles,
			responseTime: metrics.responseTime,
			uptime: metrics.uptime,
		});
	}

	// Alert logging
	logAlert(alert) {
		const level =
			alert.level === "critical"
				? "error"
				: alert.level === "warning"
					? "warn"
					: "info";

		this.log(level, `🚨 ${alert.type}`, {
			alertId: alert.id,
			message: alert.message,
			level: alert.level,
			timestamp: alert.timestamp,
			metadata: alert.metadata,
		});
	}

	// Performance logging
	logPerformance(operation, duration, metadata = {}) {
		const level = duration > 1000 ? "warn" : duration > 500 ? "info" : "debug";

		this.log(level, `⚡ ${operation}`, {
			duration: `${duration}ms`,
			operation,
			...metadata,
		});
	}

	// Read and parse JSONL logs
	async readLogs(filter = {}) {
		try {
			const content = await Bun.file(this.logFile).text();
			const lines = content.trim().split("\n");

			return lines
				.map((line) => {
					try {
						return JSON.parse(line);
					} catch {
						return null;
					}
				})
				.filter((entry) => entry !== null)
				.filter((entry) => {
					if (filter.level && entry.level !== filter.level.toUpperCase())
						return false;
					if (
						filter.since &&
						new Date(entry.timestamp) < new Date(filter.since)
					)
						return false;
					if (filter.type && entry.type !== filter.type) return false;
					return true;
				});
		} catch (error) {
			this.error("Failed to read logs", { error: error.message });
			return [];
		}
	}

	// Stream logs in real-time
	async streamLogs(callback, filter = {}) {
		let lastPosition = 0;

		const checkForNewLogs = async () => {
			try {
				const file = Bun.file(this.logFile);
				const size = file.size;

				if (size > lastPosition) {
					const content = await file.slice(lastPosition, size).text();
					const lines = content.trim().split("\n");

					for (const line of lines) {
						if (line.trim()) {
							try {
								const entry = JSON.parse(line);

								// Apply filter
								if (filter.level && entry.level !== filter.level.toUpperCase())
									continue;
								if (
									filter.since &&
									new Date(entry.timestamp) < new Date(filter.since)
								)
									continue;
								if (filter.type && entry.type !== filter.type) continue;

								callback(entry);
							} catch (_error) {
								// Ignore malformed lines
							}
						}
					}

					lastPosition = size;
				}
			} catch (error) {
				this.error("Failed to stream logs", { error: error.message });
			}
		};

		// Check for new logs every second
		const interval = setInterval(checkForNewLogs, 1000);

		return () => {
			clearInterval(interval);
		};
	}

	// Archive old logs using Bun.Archive API
	async archiveLogs(outputPath) {
		try {
			this.info("📦 Archiving logs...", { outputPath });

			// Create archive with Bun.Archive (v1.3.6)
			const archive = new Bun.Archive();

			// Add current log file
			archive.addFile(this.logFile, "profiling.jsonl");

			// Write archive
			await archive.write(outputPath);

			this.success("✅ Logs archived successfully", {
				outputPath,
				size: `${await Bun.file(outputPath).size} bytes`,
			});

			// Clear current log file
			writeFileSync(this.logFile, "");
			this.initializeLogFile();
		} catch (error) {
			this.error("Failed to archive logs", { error: error.message });
		}
	}
}

// Export for use in other modules
export { EnhancedLogger };

// CLI interface
if (import.meta.main) {
	const logger = new EnhancedLogger();

	// Demo logging capabilities
	logger.debug("Debug message", { debug: true });
	logger.info("Info message", { info: true });
	logger.warn("Warning message", { warning: true });
	logger.error("Error message", { error: true });
	logger.success("Success message", { success: true });

	// Demo profiling logs
	logger.profileStart("cpu", { sampling: 1000 });
	setTimeout(() => {
		logger.profileComplete("cpu", { samples: 1000, duration: 2000 });
	}, 1000);

	// Demo metrics
	logger.logMetrics({
		cpu: 45.2,
		memory: 512,
		activeProfiles: 2,
		responseTime: 120,
		uptime: 3600,
	});

	// Demo alert
	logger.logAlert({
		id: "alert-001",
		type: "High CPU Usage",
		message: "CPU usage exceeded 80% threshold",
		level: "warning",
		timestamp: new Date().toISOString(),
		metadata: { cpu: 85.3, threshold: 80 },
	});

	console.log("\n📋 Enhanced logging demo complete!");
	console.log("📁 Check the JSONL log file for structured logs");
}
