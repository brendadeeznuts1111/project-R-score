#!/usr/bin/env bun

/**
 * Project File Watcher
 *
 * Watches project files for changes and sends notifications to topics.
 * Supports pattern-based routing for different file types.
 */

import { $ } from "bun";
import { watch } from "fs/promises";
import { join, relative } from "path";
import { parse } from "yaml";
import { appendToFile, readTextFile, streamLines } from "./lib/bytes.ts";

const PROJECTS_CONFIG = `${import.meta.dir}/../config/project-topics.yaml`;

interface ProjectConfig {
	path: string;
	default_topic: number;
	file_patterns?: Record<string, number>;
	watch_dirs?: string[];
	ignore?: string[];
}

interface Config {
	projects: Record<string, ProjectConfig>;
}

const DEBOUNCE_MS = 500;
const batchQueue: Map<
	string,
	{ count: number; files: Set<string>; lastUpdate: number }
> = new Map();

async function loadConfig(): Promise<Config> {
	const content = await readTextFile(PROJECTS_CONFIG);
	if (!content) throw new Error("Failed to load projects config");
	return parse(content) as Config;
}

function getTopicForFile(filePath: string, project: ProjectConfig): number {
	const patterns = project.file_patterns || {
		"\\.ts$": 7, // TypeScript → Development
		"\\.test\\.": 7, // Tests → Development
		"\\.md$": 1, // Markdown → General
		"\\.yaml$": 5, // YAML → Logs
		"\\.json$": 5, // JSON → Logs
		"\\.sh$": 5, // Shell → Logs
	};

	for (const [pattern, topicId] of Object.entries(patterns)) {
		const regex = new RegExp(pattern, "i");
		if (regex.test(filePath)) {
			return topicId;
		}
	}

	return project.default_topic;
}

async function sendBatchNotification(projectName: string) {
	const data = batchQueue.get(projectName);
	if (!data || data.files.size === 0) return;

	const config = await loadConfig();
	const project = config.projects[projectName];

	// Group files by topic
	const topicFiles: Map<number, string[]> = new Map();

	for (const file of data.files) {
		const topicId = getTopicForFile(file, project);
		if (!topicFiles.has(topicId)) {
			topicFiles.set(topicId, []);
		}
		topicFiles.get(topicId)!.push(file);
	}

	// Send notifications per topic
	const topicNames: Record<number, string> = {
		1: "General 📢",
		2: "Alerts 🚨",
		5: "Logs 📊",
		7: "Development 💻",
	};

	for (const [topicId, files] of topicFiles) {
		console.log(`\n📁 ${projectName} → Topic ${topicId} (${topicNames[topicId]}):`);
		console.log(`   ${files.length} file(s) changed`);
		files.slice(0, 5).forEach((f) => console.log(`   • ${f}`));
		if (files.length > 5) {
			console.log(`   ... and ${files.length - 5} more`);
		}

		// Log to file
		const logEntry = {
			timestamp: new Date().toISOString(),
			type: "file_change",
			project: projectName,
			topic: topicId,
			files: files.slice(0, 10),
			totalFiles: files.length,
		};

		const logFile = `${import.meta.dir}/../logs/file-watch.jsonl`;
		await appendToFile(logFile, JSON.stringify(logEntry) + "\n", {
			rotate: true,
			maxSize: 10 * 1024 * 1024,
		});
	}

	// Clear queue
	batchQueue.set(projectName, { count: 0, files: new Set(), lastUpdate: Date.now() });
}

async function watchProject(projectName: string, project: ProjectConfig) {
	const watchDirs = project.watch_dirs || ["."];
	const ignorePatterns = project.ignore || [
		"node_modules",
		".git",
		"dist",
		"build",
		".cache",
	];

	console.log(`👁️  Watching ${projectName} at ${project.path}`);
	console.log(`   Directories: ${watchDirs.join(", ")}`);
	console.log(`   Ignoring: ${ignorePatterns.join(", ")}`);

	// Initialize batch queue
	batchQueue.set(projectName, { count: 0, files: new Set(), lastUpdate: Date.now() });

	// Start batch processor
	setInterval(async () => {
		const data = batchQueue.get(projectName);
		if (data && data.files.size > 0 && Date.now() - data.lastUpdate > DEBOUNCE_MS) {
			await sendBatchNotification(projectName);
		}
	}, DEBOUNCE_MS);

	// Watch each directory
	for (const dir of watchDirs) {
		const fullPath = join(project.path, dir);

		try {
			const watcher = watch(fullPath, { recursive: true });

			for await (const event of watcher) {
				const { filename } = event;
				if (!filename) continue;

				// Check ignore patterns
				const shouldIgnore = ignorePatterns.some((pattern) =>
					filename.includes(pattern),
				);

				if (shouldIgnore) continue;

				// Add to batch queue
				const data = batchQueue.get(projectName);
				if (data) {
					data.files.add(filename);
					data.count++;
					data.lastUpdate = Date.now();
				}
			}
		} catch (err) {
			console.error(`❌ Error watching ${fullPath}:`, err);
		}
	}
}

async function watchAll() {
	const config = await loadConfig();

	console.log("🚀 Starting Project File Watcher");
	console.log("=".repeat(60));

	const watchers = Object.entries(config.projects).map(([name, project]) =>
		watchProject(name, project),
	);

	await Promise.all(watchers);
}

async function watchSingle(projectName: string) {
	const config = await loadConfig();
	const project = config.projects[projectName];

	if (!project) {
		console.error(`❌ Project ${projectName} not found`);
		process.exit(1);
	}

	await watchProject(projectName, project);
}

async function showStatus() {
	const config = await loadConfig();
	const logFile = `${import.meta.dir}/../logs/file-watch.jsonl`;

	console.log("📊 File Watch Status");
	console.log("=".repeat(60));

	// Count recent events
	const eventCounts: Record<string, number> = {};

	try {
		const oneHourAgo = Date.now() - 3600000;

		// Stream lines for memory efficiency
		for await (const line of streamLines(logFile, { maxLines: 1000 })) {
			if (!line.trim()) continue;

			try {
				const entry = JSON.parse(line);
				if (new Date(entry.timestamp).getTime() > oneHourAgo) {
					eventCounts[entry.project] = (eventCounts[entry.project] || 0) + 1;
				}
			} catch {
				// Skip invalid lines
			}
		}
	} catch {
		// No log file yet
	}

	for (const [name, project] of Object.entries(config.projects)) {
		const events = eventCounts[name] || 0;
		console.log(`${name}:`);
		console.log(`   Path: ${project.path}`);
		console.log(`   Default Topic: ${project.default_topic}`);
		console.log(`   Recent Events: ${events} (last hour)`);
		console.log();
	}
}

// CLI
const [, , command, ...args] = process.argv;

switch (command) {
	case "start":
		if (args[0]) {
			watchSingle(args[0]);
		} else {
			watchAll();
		}
		break;

	case "status":
		await showStatus();
		break;

	default:
		console.log(`
Project File Watcher

Usage:
  project-watch start [project]    Start watching project(s)
  project-watch status             Show watch status

Arguments:
  project    Project name (optional, defaults to all)

Examples:
  project-watch start              Watch all projects
  project-watch start nolarose-mcp-config  Watch specific project
`);
}
