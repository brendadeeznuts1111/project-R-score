#!/usr/bin/env bun
/**
 * Display commit summary
 */

import { $ } from "bun";

const lastCommit = await $`cd /Users/nolarose/wind/eeeeee/CascadeProjects/windsurf-project && git log -1 --pretty=format:"%h|%s|%an|%ar"`.text();
const [hash, subject, author, date] = lastCommit.trim().split('|');

const stats = await $`cd /Users/nolarose/wind/eeeeee/CascadeProjects/windsurf-project && git show --stat --oneline HEAD`.text();
const statLines = stats.split('\n').filter(l => l.includes('|'));

console.log("\n╔════════════════════════════════════════════════════════════════════════════════════════╗");
console.log("║                              COMMIT SUMMARY                                            ║");
console.log("╚════════════════════════════════════════════════════════════════════════════════════════╝\n");

const commitInfo = [
    {
        "Field": "Hash",
        "Value": hash,
        "Description": "Commit identifier"
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
        "Field": "Date",
        "Value": date,
        "Description": "Time since commit"
    }
];

console.log(Bun.inspect.table(commitInfo, undefined, { colors: true }));

if (statLines.length > 0) {
    console.log("\n📊 Files Changed:\n");
    const fileStats = statLines.map(line => {
        const parts = line.trim().split('|');
        return {
            "File": parts[0].trim(),
            "Changes": parts[1].trim()
        };
    });
    console.log(Bun.inspect.table(fileStats, undefined, { colors: true }));
}

console.log("\n✅ Commit created successfully!\n");
