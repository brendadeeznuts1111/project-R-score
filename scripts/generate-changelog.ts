#!/usr/bin/env bun
/**
 * Generate changelog from git commits
 */
import { $ } from "bun";

console.log("📝 Generating changelog...\n");

const CHANGELOG_FILE = "CHANGELOG.md";

// Get package version
const pkg = await Bun.file("package.json").json();
const version = pkg.version;
const date = new Date().toISOString().split("T")[0];

// Get commits since last tag
let commits: string[];
try {
  const result = await $`git log $(git describe --tags --abbrev=0 2>/dev/null || echo HEAD~50)..HEAD --pretty=format:"- %s (%h)"`.text();
  commits = result.split("\n").filter(Boolean);
} catch {
  const result = await $`git log --oneline -20 --pretty=format:"- %s (%h)"`.text();
  commits = result.split("\n").filter(Boolean);
}

// Categorize commits
const categories: Record<string, string[]> = {
  feat: [],
  fix: [],
  docs: [],
  refactor: [],
  test: [],
  chore: [],
  other: [],
};

for (const commit of commits) {
  const msg = commit.toLowerCase();
  if (msg.startsWith("- feat")) categories.feat.push(commit);
  else if (msg.startsWith("- fix")) categories.fix.push(commit);
  else if (msg.startsWith("- docs")) categories.docs.push(commit);
  else if (msg.startsWith("- refactor")) categories.refactor.push(commit);
  else if (msg.startsWith("- test")) categories.test.push(commit);
  else if (msg.startsWith("- chore")) categories.chore.push(commit);
  else categories.other.push(commit);
}

// Generate entry
let newEntry = `## [${version}] - ${date}\n\n`;
const sections: [string, string, string[]][] = [
  ["### ✨ Features\n", "feat", categories.feat],
  ["### 🐛 Bug Fixes\n", "fix", categories.fix],
  ["### 📚 Documentation\n", "docs", categories.docs],
  ["### ♻️ Refactoring\n", "refactor", categories.refactor],
  ["### 🧪 Tests\n", "test", categories.test],
  ["### 🔧 Chores\n", "chore", categories.chore],
];

for (const [header, _, items] of sections) {
  if (items.length > 0) {
    newEntry += header + items.join("\n") + "\n\n";
  }
}

// Read existing changelog
let existingChangelog = "";
try {
  existingChangelog = await Bun.file(CHANGELOG_FILE).text();
} catch {
  existingChangelog = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n`;
}

// Insert new entry after header
const lines = existingChangelog.split("\n");
let insertIndex = lines.findIndex((l) => l.startsWith("## ["));
if (insertIndex === -1) insertIndex = lines.length;

const updatedChangelog = [
  ...lines.slice(0, insertIndex),
  newEntry.trim(),
  "",
  ...lines.slice(insertIndex),
].join("\n");

await Bun.write(CHANGELOG_FILE, updatedChangelog);
console.log(`✅ Updated ${CHANGELOG_FILE} with v${version}`);
