#!/usr/bin/env bun
/**
 * Project Profiler - CPU profiling with project-specific output files
 * Uses Bun.main to generate unique profile names per project
 */

import { profile } from "bun:jsc";

interface ProfileResult {
  timeline: any[];
  summary: any;
}

// Generate profile output filename based on Bun.main
function getProfileFilename(): string {
  const mainPath = Bun.main;
  // Replace slashes with dashes, remove .ts extension, add timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = mainPath
    .split('/')
    .pop()
    ?.replace(/\.ts$/, '') || 'profile';
  return `${mainPath}-${baseName}-${timestamp}.json`;
}

// Profile a function and save results
async function profileAndSave<T>(fn: () => T | Promise<T>): Promise<T> {
  console.log(`Starting profiling for: ${Bun.main}`);

  const result = await profile(fn) as ProfileResult;

  const outputFile = getProfileFilename();
  await Bun.write(outputFile, JSON.stringify(result, null, 2));

  console.log(`Profile saved to: ${outputFile}`);
  console.log(`Top spending functions:`);

  if (result.summary && result.summary.functions) {
    const sortedFunctions = Object.entries(result.summary.functions)
      .sort(([, a], [, b]) => (b as any).selfTime - (a as any).selfTime)
      .slice(0, 5);

    sortedFunctions.forEach(([name, data]: [string, any], idx) => {
      console.log(`  ${idx + 1}. ${name}: ${data.selfTime}ms (self)`);
    });
  }

  return result as any as T;
}

// Example workload to profile
async function exampleWorkload() {
  console.log("Running example workload...");

  // Simulate some async work
  await new Promise(resolve => setTimeout(resolve, 100));

  // Some CPU work
  let sum = 0;
  for (let i = 0; i < 100000; i++) {
    sum += i;
  }

  console.log(`Workload complete. Sum: ${sum}`);
  return sum;
}

// CLI interface
const args = Bun.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Project Profiler - CPU profiling with project-specific outputs

Usage:
  bun profiler.ts [options]

Options:
  --run            Run example workload with profiling
  --output <file>  Specify custom output filename (still prefixed with Bun.main)

Examples:
  bun profiler.ts --run              # Profile example workload
  bun profiler.ts --output custom    # Save to ${Bun.main}-custom-<timestamp>.json

Note: Profile files are saved relative to the current working directory
      but named using Bun.main for project separation.
`);
  Bun.exit(0);
}

if (args.includes('--run')) {
  profileAndSave(exampleWorkload)
    .then(() => {
      console.log("Profiling complete!");
      Bun.exit(0);
    })
    .catch(err => {
      console.error("Profiling error:", err);
      Bun.exit(1);
    });
} else {
  console.log(`
Project Profiler ready.

Run with --run to profile the example workload.
Or import profileAndSave() in your own code:

  import { profileAndSave } from './profiler.ts';

  await profileAndSave(async () => {
    // Your code to profile
  });
`);
}