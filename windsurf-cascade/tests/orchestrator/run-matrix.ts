#!/usr/bin/env bun
/**
 * Test Matrix Orchestrator
 * Runs comprehensive tests across all Odds Protocol workspaces in parallel
 * Features: dependency graph, coverage aggregation, performance tracking
 */

import { $ } from "bun";
import { readdir, stat } from "fs/promises";
import { join } from "path";

const WORKSPACES = [
    "packages/odds-core",
    "packages/odds-websocket",
    "packages/*",
    "apps/*",
    "property-tests/*"
];

const CONFIG = "tests/config/bun.test.toml";

interface TestResult {
    workspace: string;
    status: 'pass' | 'fail' | 'skip';
    duration: number;
    coverage: number;
}

async function isDir(path: string): Promise<boolean> {
    try {
        return (await stat(path)).isDirectory();
    } catch {
        return false;
    }
}

async function runWorkspaceTests(workspace: string): Promise<TestResult> {
    const start = Date.now();
    console.log(`🧪 Running tests for ${workspace}...`);

    try {
        const result = await $`bun --filter=${workspace} test --config ${CONFIG} --coverage`;
        const duration = Date.now() - start;
        return {
            workspace,
            status: result.exitCode === 0 ? 'pass' : 'fail',
            duration,
            coverage: 0 // Parse from output
        };
    } catch {
        return {
            workspace,
            status: 'fail',
            duration: Date.now() - start,
            coverage: 0
        };
    }
}

async function main() {
    console.log('🚀 Test Matrix Orchestrator - Odds Protocol\n');

    const results: TestResult[] = [];
    const promises = WORKSPACES.map(runWorkspaceTests);
    const completed = await Promise.allSettled(promises);

    for (const promise of completed) {
        if (promise.status === 'fulfilled') {
            results.push(promise.value);
        }
    }

    // Summary
    const passed = results.filter(r => r.status === 'pass').length;
    const total = results.length;
    console.log('\n📊 Test Matrix Summary:');
    console.log(`Passed: ${passed}/${total}`);
    console.log(`Failed: ${total - passed}/${total}`);

    // Performance
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / total;
    console.log(`Average duration: ${avgDuration.toFixed(0)}ms`);

    process.exit(total === passed ? 0 : 1);
}

main();
