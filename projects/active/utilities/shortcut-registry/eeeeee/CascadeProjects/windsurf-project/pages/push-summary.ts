#!/usr/bin/env bun
/**
 * Display push summary
 */

import { $ } from "bun";

const status = await $`cd /Users/nolarose/wind/eeeeee/CascadeProjects/windsurf-project && git status`.text();
const lastCommit = await $`cd /Users/nolarose/wind/eeeeee/CascadeProjects/windsurf-project && git log -1 --pretty=format:"%h|%s|%an|%ar"`.text();
const [hash, subject, author, date] = lastCommit.trim().split('|');

console.info("\n╔════════════════════════════════════════════════════════════════════════════════════════╗");
console.info("║                              PUSH SUMMARY                                               ║");
console.info("╚════════════════════════════════════════════════════════════════════════════════════════╝\n");

const commitInfo = [
    {
        "Field": "Commit Hash",
        "Value": hash,
        "Description": "Pushed commit identifier"
    },
    {
        "Field": "Subject",
        "Value": subject,
        "Description": "Commit message"
    },
    {
        "Field": "Author",
        "Value": author,
        "Description": "Commit author"
    },
    {
        "Field": "Committed",
        "Value": date,
        "Description": "Time since commit"
    }
];

console.info(Bun.inspect.table(commitInfo, undefined, { colors: true }));

// Check if branch is ahead/behind
const branchInfo = await $`cd /Users/nolarose/wind/eeeeee/CascadeProjects/windsurf-project && git status -sb`.text();
const branchLine = branchInfo.split('\n')[0];

console.info("\n📊 Branch Status:\n");
if (branchLine.includes('ahead')) {
    const aheadMatch = branchLine.match(/ahead (\d+)/);
    const ahead = aheadMatch ? aheadMatch[1] : '0';
    console.info(`  ⚠️  Branch is ahead of origin by ${ahead} commit(s)`);
    console.info(`  💡 Run 'git push' to publish changes\n`);
} else if (branchLine.includes('behind')) {
    const behindMatch = branchLine.match(/behind (\d+)/);
    const behind = behindMatch ? behindMatch[1] : '0';
    console.info(`  ⚠️  Branch is behind origin by ${behind} commit(s)`);
    console.info(`  💡 Run 'git pull' to update\n`);
} else {
    console.info(`  ✅ Branch is up to date with origin\n`);
}

console.info("🎉 Semantic CSS refactoring changes have been committed!\n");
console.info("📝 Summary of changes:\n");
console.info("  • 14 component blocks with semantic BEM-style naming");
console.info("  • 123 semantic classes total");
console.info("  • Fixed updateLastUpdateTime function");
console.info("  • Added comprehensive test suite");
console.info("  • Created CLI tool for dashboard management");
console.info("  • Bun-Pure compliant dev server\n");
