#!/usr/bin/env bun
/**
 * Display git status in a formatted table
 */

import { $ } from "bun";

const statusOutput = await $`cd /Users/nolarose/wind/eeeeee/CascadeProjects/windsurf-project && git status --short`.text();
const lines = statusOutput.trim().split('\n').filter(l => l);

const modified = lines.filter(l => l.startsWith(' M')).map(l => l.substring(3));
const untracked = lines.filter(l => l.startsWith('??')).map(l => l.substring(3));

console.log("\n╔════════════════════════════════════════════════════════════════════════════════════════╗");
console.log("║                              GIT STATUS SUMMARY                                       ║");
console.log("╚════════════════════════════════════════════════════════════════════════════════════════╝\n");

if (modified.length > 0) {
    console.log("📝 Modified Files:\n");
    const modifiedTable = modified.map((file, idx) => ({
        "#": idx + 1,
        "File": file,
        "Status": "Modified"
    }));
    console.log(Bun.inspect.table(modifiedTable, undefined, { colors: true }));
}

if (untracked.length > 0) {
    console.log("\n\n📁 Untracked Files:\n");
    
    // Group by directory
    const grouped: Record<string, string[]> = {};
    untracked.forEach(file => {
        const dir = file.includes('/') ? file.split('/')[0] : 'root';
        if (!grouped[dir]) grouped[dir] = [];
        grouped[dir].push(file);
    });
    
    const untrackedTable = untracked.slice(0, 50).map((file, idx) => ({
        "#": idx + 1,
        "File": file,
        "Status": "Untracked"
    }));
    
    console.log(Bun.inspect.table(untrackedTable, undefined, { colors: true }));
    
    if (untracked.length > 50) {
        console.log(`\n... and ${untracked.length - 50} more files\n`);
    }
}

console.log("\n📊 Summary:\n");
const summary = [
    {
        "Category": "Modified Files",
        "Count": modified.length,
        "Action": "git add <file> or git restore <file>"
    },
    {
        "Category": "Untracked Files",
        "Count": untracked.length,
        "Action": "git add <file> to stage"
    },
    {
        "Category": "Total Changes",
        "Count": modified.length + untracked.length,
        "Action": "Review and commit"
    }
];

console.log(Bun.inspect.table(summary, undefined, { colors: true }));

// Show key files related to today's work
console.log("\n🎯 Key Files from Today's Work:\n");
const keyFiles = [
    {
        "File": "pages/dashboard.html",
        "Changes": "Semantic CSS refactoring (BEM-style)",
        "Status": modified.includes('pages/dashboard.html') ? "✅ Modified" : "❌ Not modified"
    },
    {
        "File": "pages/assets/css/main.css",
        "Changes": "Complete semantic class system",
        "Status": untracked.some(f => f.includes('assets/css/main.css')) ? "✅ New" : "❌ Not found"
    },
    {
        "File": "pages/assets/js/main.js",
        "Changes": "updateLastUpdateTime fix + semantic classes",
        "Status": untracked.some(f => f.includes('assets/js/main.js')) ? "✅ New" : "❌ Not found"
    },
    {
        "File": "cli/dashboard/dashboard-cli.ts",
        "Changes": "CLI tool with Bun detection, env vars, --define",
        "Status": untracked.some(f => f.includes('cli/dashboard')) ? "✅ New" : "❌ Not found"
    }
];

console.log(Bun.inspect.table(keyFiles, undefined, { colors: true }));

console.log("\n💡 Next Steps:\n");
console.log("  1. Review changes: git diff");
console.log("  2. Stage files: git add <files>");
console.log("  3. Commit: git commit -m 'refactor(css): semantic BEM-style naming'");
console.log("  4. Push: git push\n");
