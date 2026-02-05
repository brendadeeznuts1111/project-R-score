#!/usr/bin/env bun

// [UTILITIES][TOOLS][UT-TO-1CE][v1.3][ACTIVE]

// Grep Assistant – Fast, smart, beautiful search in guide.md
// Run with: bunx https://raw.githubusercontent.com/your/repo/main/grep-assistant.ts <query> [options]

import { $, fs } from "bun";

// ANSI color codes
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;
const magenta = (text: string) => `\x1b[35m${text}\x1b[0m`;
const gray = (text: string) => `\x1b[90m${text}\x1b[0m`;
const dim = (text: string) => `\x1b[2m${text}\x1b[0m`;

// === Config ===
const GUIDE = "guide.md";
const MAX_PREVIEW = 3;
const MAX_RESULTS = 20;

// === Emojis ===
const Search = "🔍";
const Book = "📚";
const Rocket = "🚀";
const Lightning = "⚡";
const Eyes = "👁️";
const Wrench = "🔧";
const Mag = "🔍";
const Sparkles = "✨";
const Fire = "🔥";

// === Helpers ===
const log = (msg: string, icon: string = "", color = cyan) => {
  console.log(color(`${icon} ${msg}`));
};

const error = (msg: string) => log(msg, "❌", red);
const success = (msg: string) => log(msg, "✅", green);
const info = (msg: string) => log(msg, "ℹ️", blue);

// === Pattern Database ===
interface Pattern {
  emoji: string;
  title: string;
  keywords: string[];
  line: number;
  section: string;
}

let patterns: Pattern[] = [];

// Auto-generate patterns from guide.md content
async function buildPatternIndex(): Promise<void> {
  try {
    const file = Bun.file(GUIDE);
    if (!(await file.exists())) {
      throw new Error(`${GUIDE} not found`);
    }

    const content = await fs.readFile(GUIDE, "utf-8");
    const lines = content.split("\n");
    const result: Pattern[] = [];
    let currentSection = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect sections
      if (line.startsWith("## ")) {
        currentSection = line.slice(3).trim();
        continue;
      }

      // Detect list items with emoji
      const match = line.match(/^\s*[-*•]\s*\*\*([^*]+)\*\*\s*[-–—]\s*(.+)$/);
      if (match) {
        const [, title, desc] = match;
        const emoji = getEmojiFromTitle(title);
        const keywords = [
          ...title.toLowerCase().split(" "),
          ...desc.toLowerCase().split(" "),
          currentSection.toLowerCase(),
        ].filter(Boolean);

        result.push({ emoji, title: title.trim(), keywords, line: i + 1, section: currentSection });
      }
    }

    patterns = result;
  } catch (err) {
    error(`Failed to build index: ${err.message}`);
    process.exit(1);
  }
}

function getEmojiFromTitle(title: string): string {
  const map: Record<string, string> = {
    bun: "🍞",
    node: "🟨",
    postgresql: "🐘",
    redis: "🟥",
    api: "🔑",
    connection: "🔗",
    performance: "⚡",
    reliability: "🛡️",
    health: "❤️",
    architecture: "🏗️",
    metrics: "📊",
    code: "📏",
    design: "🔄",
    intelligence: "🧠",
    control: "📱",
    observability: "🔍",
    extensibility: "🛠️",
  };

  const key = title.toLowerCase().split(" ")[0];
  return map[key] || "🔍";
}

// === Fuzzy Search ===
function fuzzyScore(haystack: string, needle: string): number {
  if (!needle) return 1;
  haystack = haystack.toLowerCase();
  needle = needle.toLowerCase();
  let score = 0;
  let i = 0;
  for (const c of needle) {
    i = haystack.indexOf(c, i) + 1;
    if (i > 0) score += i;
    else return 0;
  }
  return score > 0 ? 1 / score : 0;
}

function searchPatterns(query: string): Pattern[] {
  if (!query) return patterns;

  return patterns
    .map(p => ({
      ...p,
      score: Math.max(
        fuzzyScore(p.title, query),
        fuzzyScore(p.section, query),
        ...p.keywords.map(k => fuzzyScore(k, query))
      )
    }))
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);
}

// === Preview with ripgrep ===
async function getPreview(line: number, context = MAX_PREVIEW): Promise<string> {
  try {
    const result = await $`rg -C ${context} --line-number "^.{0,200}$" ${GUIDE}`.quiet();
    const lines = result.stdout.toString().split("\n");
    const start = lines.findIndex(l => l.startsWith(`${line}:`) || l.startsWith(`${line}-`));
    if (start === -1) return dim("  [context unavailable]");
    return lines.slice(Math.max(0, start - context), start + context + 1)
      .map(l => l.replace(/^(\d+)[-|]/, gray("$1|")))
      .join("\n");
  } catch {
    return dim("  [preview failed - install ripgrep: brew install ripgrep]");
  }
}

// === CLI ===
async function main() {
  const args = process.argv.slice(2);
  const [query, ...flags] = args.length > 0 ? args : ["--help"];

  if (flags.includes("--help") || flags.includes("-h") || query === "--help") {
    console.log(`
${cyan("Grep Assistant")} – Search ${GUIDE} with ${Lightning} speed

${yellow("Usage:")}
  ${green("bunx https://raw.githubusercontent.com/your/repo/main/grep-assistant.ts")} ${blue("<query>")} [options]

${yellow("Options:")}
  ${blue("-p, --preview")}     Show 3-line context
  ${blue("-l, --lines")}       Show line numbers
  ${blue("-c, --count")}       Show match count only
  ${blue("-a, --all")}         Show all results
  ${blue("--list")}            List all indexed patterns

${yellow("Examples:")}
  bunx https://.../grep-assistant.ts code
  bunx https://.../grep-assistant.ts db --preview
  bunx https://.../grep-assistant.ts setup -l
  bunx https://.../grep-assistant.ts --list

${Sparkles} Requires: ripgrep (install with: brew install ripgrep)
${Sparkles} Powered by Bun + TypeScript
`);
    process.exit(0);
  }

  await buildPatternIndex();

  if (query === "--list" || flags.includes("--list")) {
    log(`Indexed ${patterns.length} patterns:`, Book, yellow);
    patterns.forEach(p => {
      console.log(`  ${p.emoji} ${cyan(p.title)} ${dim(`→ L${p.line} in ${p.section}`)}`);
    });
    process.exit(0);
  }

  const results = searchPatterns(query);
  const showPreview = flags.includes("--preview") || flags.includes("-p");
  const showLines = flags.includes("--lines") || flags.includes("-l");
  const showCount = flags.includes("--count") || flags.includes("-c");
  const showAll = flags.includes("--all") || flags.includes("-a");

  if (results.length === 0) {
    error(`No matches for "${query}"`);
    log(`Try: --list to see all patterns`, "", yellow);
    process.exit(1);
  }

  if (showCount) {
    success(`Found ${results.length} match${results.length > 1 ? "es" : ""}`);
    process.exit(0);
  }

  log(`Found ${results.length} match${results.length > 1 ? "es" : ""} for "${query}"`, Search, green);

  const toShow = showAll ? results : results.slice(0, MAX_RESULTS);

  for (const [i, r] of toShow.entries()) {
    const prefix = showLines ? dim(`${r.line.toString().padStart(3)}|`) : "  ";
    console.log(`${prefix} ${r.emoji} ${cyan(r.title)}`);
    if (showPreview) {
      const preview = await getPreview(r.line);
      console.log(preview.split("\n").map(l => `    ${l}`).join("\n"));
    }
    if (!showAll && i < toShow.length - 1 && i < MAX_RESULTS - 1) {
      console.log("");
    }
  }

  if (!showAll && results.length > MAX_RESULTS) {
    log(`... and ${results.length - MAX_RESULTS} more. Use --all to see all.`, "", dim);
  }
}

// Run it!
if (import.meta.main) {
  main().catch(err => {
    error(`Fatal error: ${err.message}`);
    process.exit(1);
  });
}
