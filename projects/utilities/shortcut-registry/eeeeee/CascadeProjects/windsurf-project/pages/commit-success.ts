#!/usr/bin/env bun
/**
 * Display successful commit summary
 */

import { $ } from "bun";

const lastCommit = await $`cd /Users/nolarose/wind/eeeeee/CascadeProjects/windsurf-project && git log -1 --pretty=format:"%h|%s|%an|%ar"`.text();
const [hash, subject, author, date] = lastCommit.trim().split('|');

const stats = await $`cd /Users/nolarose/wind/eeeeee/CascadeProjects/windsurf-project && git show --stat --oneline HEAD`.text();
const statLines = stats.split('\n').filter(l => l.includes('|'));

console.log("\n╔════════════════════════════════════════════════════════════════════════════════════════╗");
console.log("║                         ✅ COMMIT SUCCESSFUL                                           ║");
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
        const file = parts[0].trim();
        const changes = parts[1].trim();
        const [additions, deletions] = changes.split(',').map(s => {
            const match = s.match(/(\d+)/);
            return match ? parseInt(match[1]) : 0;
        });
        return {
            "File": file,
            "Additions": additions > 0 ? `+${additions}` : "-",
            "Deletions": deletions > 0 ? `-${deletions}` : "-",
            "Net": additions - deletions > 0 ? `+${additions - deletions}` : `${additions - deletions}`
        };
    });
    console.log(Bun.inspect.table(fileStats, undefined, { colors: true }));
}

// Calculate totals
const totals = statLines.reduce((acc, line) => {
    const parts = line.trim().split('|');
    const changes = parts[1].trim();
    const [additions, deletions] = changes.split(',').map(s => {
        const match = s.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
    });
    return {
        additions: acc.additions + additions,
        deletions: acc.deletions + deletions,
        files: acc.files + 1
    };
}, { additions: 0, deletions: 0, files: 0 });

console.log("\n📈 Summary:\n");
const summary = [
    {
        "Metric": "Files Changed",
        "Value": totals.files,
        "Description": "Total files in commit"
    },
    {
        "Metric": "Lines Added",
        "Value": `+${totals.additions}`,
        "Description": "New code added"
    },
    {
        "Metric": "Lines Deleted",
        "Value": `-${totals.deletions}`,
        "Description": "Code removed"
    },
    {
        "Metric": "Net Change",
        "Value": totals.additions - totals.deletions > 0 ? `+${totals.additions - totals.deletions}` : `${totals.additions - totals.deletions}`,
        "Description": "Overall change"
    }
];

console.log(Bun.inspect.table(summary, undefined, { colors: true }));

console.log("\n🎯 Key Changes:\n");
const keyChanges = [
    {
        "Component": "CSS Refactoring",
        "Files": "pages/assets/css/main.css, pages/dashboard.html",
        "Impact": "123 semantic classes, 14 components"
    },
    {
        "Component": "JavaScript Updates",
        "Files": "pages/assets/js/main.js, pages/assets/js/main.test.ts",
        "Impact": "Fixed updateLastUpdateTime, added tests"
    },
    {
        "Component": "CLI Tool",
        "Files": "cli/dashboard/dashboard-cli.ts",
        "Impact": "Dashboard management CLI"
    },
    {
        "Component": "Dev Server",
        "Files": "pages/dev-server.ts",
        "Impact": "Bun-Pure compliant file serving"
    }
];

console.log(Bun.inspect.table(keyChanges, undefined, { colors: true }));

console.log("\n✅ Commit created successfully!\n");
console.log("💡 Next step: git push\n");
