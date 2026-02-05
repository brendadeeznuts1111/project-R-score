#!/usr/bin/env bun
/**
 * @fileoverview CPU Profiling Clean Script
 * @description Clean old profiles, keeping only the last N profiles
 */

import { CPUProfilingRegistry } from "../src/utils/cpu-profiling-registry";

const registry = new CPUProfilingRegistry();

const keepLast = process.argv[2] ? parseInt(process.argv[2]) : 10;

async function main() {
	console.log(`Cleaning profiles, keeping last ${keepLast}...`);
	const deleted = await registry.cleanProfiles(keepLast);
	console.log(`✅ Deleted ${deleted} old profiles`);
}

if (import.meta.main) {
	await main();
}
