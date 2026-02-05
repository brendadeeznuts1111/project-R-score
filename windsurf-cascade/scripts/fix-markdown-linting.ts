#!/usr/bin/env bun

/**
 * 🛠️ Markdown Linting Fix Script
 * 
 * Automatically fixes common markdown linting issues:
 * - MD022: Headings should be surrounded by blank lines
 * - MD031: Fenced code blocks should be surrounded by blank lines
 * - MD032: Lists should be surrounded by blank lines
 */

import { readFileSync, writeFileSync } from "fs";

const markdownFile = "/Users/nolarose/CascadeProjects/windsurf-project/Odds-mono-map/config/examples/bun-v1.3.1-yaml-fixes-summary.md";

function fixMarkdownLinting(content: string): string {
    let fixed = content;

    // Fix MD022: Headings should be surrounded by blank lines
    // Ensure headings have blank lines before them (except at start of file)
    fixed = fixed.replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2');

    // Fix MD031: Fenced code blocks should be surrounded by blank lines
    // Ensure code blocks have blank lines before and after
    fixed = fixed.replace(/([^\n])\n```/g, '$1\n\n```');
    fixed = fixed.replace(/```\n([^\n])/g, '```\n\n$1');

    // Fix MD032: Lists should be surrounded by blank lines
    // Ensure lists have blank lines before them
    fixed = fixed.replace(/([^\n])\n(- |\* |\+ |\d+\. )/g, '$1\n\n$2');

    // Clean up excessive blank lines (more than 2 consecutive)
    fixed = fixed.replace(/\n{3,}/g, '\n\n');

    // Ensure file ends with single newline
    fixed = fixed.replace(/\n*$/, '\n');

    return fixed;
}

try {
    const content = readFileSync(markdownFile, "utf-8");
    const fixed = fixMarkdownLinting(content);

    if (content !== fixed) {
        writeFileSync(markdownFile, fixed);
        console.log("✅ Markdown linting issues fixed successfully");
    } else {
        console.log("ℹ️  No markdown linting issues found");
    }
} catch (error) {
    console.error("❌ Error fixing markdown linting:", error);
    process.exit(1);
}
