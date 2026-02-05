#!/usr/bin/env bun
/**
 * @fileoverview Benchmark Organizer
 * @description Create and organize benchmarks with metadata
 * @module scripts/benchmarks/create-benchmark
 */

import { $ } from "bun";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { basename, extname, join } from "path";

interface BenchmarkMetadata {
	id: string;
	name: string;
	description?: string;
	createdAt: string;
	gitCommit: string;
	gitBranch?: string;
	system?: {
		os: string;
		arch: string;
		nodeVersion: string;
		cpu?: string;
		memory?: string;
	};
	profile: {
		type: "cpu" | "heap";
		file: string;
		durationMs?: number;
		sampleCount?: number;
	};
	analysis?: {
		file: string;
		hotspots?: string[];
		recommendations?: string[];
	};
	tags?: string[];
	relatedBenchmarks?: string[];
}

/**
 * Get system information
 */
async function getSystemInfo(): Promise<BenchmarkMetadata["system"]> {
	const os = process.platform;
	const arch = process.arch;
	const nodeVersion = `bun/${Bun.version}`;

	let cpu: string | undefined;
	let memory: string | undefined;

	try {
		// Try to get CPU info (platform-specific)
		if (os === "darwin") {
			const cpuInfo = await $`sysctl -n machdep.cpu.brand_string`.quiet();
			cpu = cpuInfo.stdout.toString().trim();
		} else if (os === "linux") {
			const cpuInfo = await $`grep "model name" /proc/cpuinfo | head -1 | cut -d: -f2`.quiet();
			cpu = cpuInfo.stdout.toString().trim();
		}
	} catch {
		// Ignore errors
	}

	try {
		// Get memory info
		if (os === "darwin") {
			const memInfo = await $`sysctl -n hw.memsize`.quiet();
			const memBytes = parseInt(memInfo.stdout.toString().trim(), 10);
			memory = `${Math.round(memBytes / 1024 / 1024 / 1024)}GB`;
		} else if (os === "linux") {
			const memInfo = await $`grep MemTotal /proc/meminfo | awk '{print $2}'`.quiet();
			const memKB = parseInt(memInfo.stdout.toString().trim(), 10);
			memory = `${Math.round(memKB / 1024 / 1024)}GB`;
		}
	} catch {
		// Ignore errors
	}

	return {
		os,
		arch,
		nodeVersion,
		cpu,
		memory,
	};
}

/**
 * Get git information
 */
async function getGitInfo(): Promise<{ commit: string; branch?: string }> {
	try {
		const commit = await $`git rev-parse --short HEAD`.quiet();
		const branch = await $`git rev-parse --abbrev-ref HEAD`.quiet();
		return {
			commit: commit.stdout.toString().trim(),
			branch: branch.stdout.toString().trim(),
		};
	} catch {
		return { commit: "unknown" };
	}
}

/**
 * Parse profile file to extract basic info
 */
function parseProfileInfo(profilePath: string): {
	durationMs?: number;
	sampleCount?: number;
} {
	try {
		const content = readFileSync(profilePath, "utf-8");
		const profile = JSON.parse(content);

		const durationMs =
			profile.endTime && profile.startTime
				? (profile.endTime - profile.startTime) / 1000 // Convert microseconds to ms
				: undefined;

		const sampleCount = profile.samples?.length;

		return { durationMs, sampleCount };
	} catch {
		return {};
	}
}

/**
 * Generate benchmark ID from name
 */
function generateId(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

/**
 * Create benchmark from profile
 */
async function createBenchmark(options: {
	profile: string;
	name: string;
	description?: string;
	tags?: string[];
	relatedBenchmarks?: string[];
}): Promise<void> {
	const { profile: profilePath, name, description, tags = [], relatedBenchmarks = [] } = options;

	// Validate profile exists
	if (!existsSync(profilePath)) {
		throw new Error(`Profile file not found: ${profilePath}`);
	}

	// Determine profile type from extension
	const ext = extname(profilePath);
	const profileType: "cpu" | "heap" = ext === ".cpuprofile" ? "cpu" : "heap";

	// Get git info
	const gitInfo = await getGitInfo();

	// Get system info
	const systemInfo = await getSystemInfo();

	// Parse profile info
	const profileInfo = parseProfileInfo(profilePath);

	// Generate benchmark ID
	const id = generateId(name);

	// Create benchmark filename
	const profileBasename = basename(profilePath);
	const benchmarkProfileName = `${id}${ext}`;
	const benchmarkProfilePath = join("benchmarks", profileType === "cpu" ? "cpu-profiles" : "heap-snapshots", benchmarkProfileName);

	// Create directories
	mkdirSync(join("benchmarks", profileType === "cpu" ? "cpu-profiles" : "heap-snapshots"), { recursive: true });
	mkdirSync("benchmarks/metadata", { recursive: true });

	// Copy profile to benchmarks directory
	copyFileSync(profilePath, benchmarkProfilePath);
	console.log(`✅ Copied profile to ${benchmarkProfilePath}`);

	// Check if analysis file exists (same name with _analysis.json suffix)
	const analysisPath = profilePath.replace(ext, "_analysis.json");
	let analysis: BenchmarkMetadata["analysis"] | undefined;

	if (existsSync(analysisPath)) {
		const analysisBasename = basename(analysisPath);
		const benchmarkAnalysisName = `${id}_analysis.json`;
		const benchmarkAnalysisPath = join("benchmarks", "analysis", benchmarkAnalysisName);

		mkdirSync("benchmarks/analysis", { recursive: true });
		copyFileSync(analysisPath, benchmarkAnalysisPath);
		console.log(`✅ Copied analysis to ${benchmarkAnalysisPath}`);

		try {
			const analysisContent = JSON.parse(readFileSync(analysisPath, "utf-8"));
			analysis = {
				file: `analysis/${benchmarkAnalysisName}`,
				hotspots: analysisContent.hotspots?.map((h: any) => h.function || h.name) || [],
				recommendations: analysisContent.recommendations || [],
			};
		} catch {
			analysis = {
				file: `analysis/${benchmarkAnalysisName}`,
			};
		}
	}

	// Create metadata
	const metadata: BenchmarkMetadata = {
		id,
		name,
		description,
		createdAt: new Date().toISOString(),
		gitCommit: gitInfo.commit,
		gitBranch: gitInfo.branch,
		system: systemInfo,
		profile: {
			type: profileType,
			file: `${profileType === "cpu" ? "cpu-profiles" : "heap-snapshots"}/${benchmarkProfileName}`,
			...profileInfo,
		},
		analysis,
		tags: tags.length > 0 ? tags : undefined,
		relatedBenchmarks: relatedBenchmarks.length > 0 ? relatedBenchmarks : undefined,
	};

	// Write metadata
	const metadataPath = join("benchmarks", "metadata", `${id}.json`);
	writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + "\n");
	console.log(`✅ Created metadata at ${metadataPath}`);

	console.log(`\n🎉 Benchmark "${name}" created successfully!`);
	console.log(`\n📋 Summary:`);
	console.log(`   ID: ${id}`);
	console.log(`   Profile: ${benchmarkProfilePath}`);
	console.log(`   Metadata: ${metadataPath}`);
	if (analysis) {
		console.log(`   Analysis: ${analysis.file}`);
	}
}

// CLI argument parser
function getArg(args: string[], key: string): string | undefined {
	// Try --key=value format first
	const keyValue = args.find((a) => a.startsWith(`--${key}=`));
	if (keyValue) {
		return keyValue.split("=").slice(1).join("="); // Handle values with = in them
	}
	// Try --key value format
	const keyIndex = args.indexOf(`--${key}`);
	if (keyIndex !== -1 && keyIndex + 1 < args.length) {
		return args[keyIndex + 1];
	}
	return undefined;
}

const args = process.argv.slice(2);
const profile = getArg(args, "profile");
const name = getArg(args, "name");
const description = getArg(args, "description");
const tagsStr = getArg(args, "tags");
const relatedStr = getArg(args, "related");

if (!profile || !name) {
	console.error("Usage: bun run scripts/benchmarks/create-benchmark.ts \\");
	console.error("  --profile=<path> \\");
	console.error("  --name=<name> \\");
	console.error("  [--description=<description>] \\");
	console.error("  [--tags=<tag1,tag2,...>] \\");
	console.error("  [--related=<id1,id2,...>]");
	process.exit(1);
}

const tags = tagsStr ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean) : [];
const relatedBenchmarks = relatedStr ? relatedStr.split(",").map((r) => r.trim()).filter(Boolean) : [];

createBenchmark({
	profile,
	name,
	description,
	tags,
	relatedBenchmarks,
}).catch((error) => {
	console.error("Error creating benchmark:", error);
	process.exit(1);
});
