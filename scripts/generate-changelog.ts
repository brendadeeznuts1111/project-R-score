#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/file-io — Bun.write
/**
 * @fileoverview Generate changelog from git commits
 * @module scripts/generate-changelog
 *
 * @description
 * Generates a changelog from conventional git commits.
 * Categorizes commits by type (feat, fix, docs, etc.).
 *
 * @example
 * ```bash
 * bun run changelog
 * ```
 *
 * @see {@link https://www.conventionalcommits.org/} Conventional Commits
 * @see {@link ../config/r2-env.ts} Cloudflare / R2 / registry URL SSOT
 */

import { $ } from 'bun';
import { factoryWagerRegistryUrlFromEnv, r2BucketUrlFromEnv } from '../config/r2-env.ts';

/** Changelog filename */
const CHANGELOG_FILE = 'CHANGELOG.md';

/** FactoryWager registry URL */
const REGISTRY_URL = factoryWagerRegistryUrlFromEnv();

/** R2 bucket URL */
const R2_BUCKET_URL = r2BucketUrlFromEnv();

/** Commit categories */
interface CommitCategories {
  feat: string[];
  fix: string[];
  docs: string[];
  refactor: string[];
  test: string[];
  chore: string[];
  other: string[];
}

/**
 * Categorize commits by type
 * @param commits - Array of commit messages
 * @returns Categorized commits
 */
function categorizeCommits(commits: string[]): CommitCategories {
  const categories: CommitCategories = {
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
    if (msg.startsWith('- feat')) categories.feat.push(commit);
    else if (msg.startsWith('- fix')) categories.fix.push(commit);
    else if (msg.startsWith('- docs')) categories.docs.push(commit);
    else if (msg.startsWith('- refactor')) categories.refactor.push(commit);
    else if (msg.startsWith('- test')) categories.test.push(commit);
    else if (msg.startsWith('- chore')) categories.chore.push(commit);
    else categories.other.push(commit);
  }

  return categories;
}

/**
 * Generate changelog entry
 * @param version - Package version
 * @param categories - Categorized commits
 * @returns Changelog entry string
 */
function generateEntry(version: string, categories: CommitCategories): string {
  const date = new Date().toISOString().split('T')[0];
  let newEntry = `## [${version}] - ${date}\n\n`;

  const sections: [string, keyof CommitCategories][] = [
    ['### ✨ Features\n', 'feat'],
    ['### 🐛 Bug Fixes\n', 'fix'],
    ['### 📚 Documentation\n', 'docs'],
    ['### ♻️ Refactoring\n', 'refactor'],
    ['### 🧪 Tests\n', 'test'],
    ['### 🔧 Chores\n', 'chore'],
  ];

  for (const [header, key] of sections) {
    const items = categories[key];
    if (items.length > 0) {
      newEntry += header + items.join('\n') + '\n\n';
    }
  }

  return newEntry.trim();
}

/**
 * Main changelog function
 */
async function main(): Promise<void> {
  console.info('📝 Generating changelog...\n');
  console.info(`   Registry: ${REGISTRY_URL}`);
  console.info(`   R2 Store: ${R2_BUCKET_URL}\n`);

  // Get package version
  const pkg = await Bun.file('package.json').json();
  const version = pkg.version;

  // Get commits since last tag
  let commits: string[];
  try {
    const result =
      await $`git log $(git describe --tags --abbrev=0 2>/dev/null || echo HEAD~50)..HEAD --pretty=format:"- %s (%h)"`.text();
    commits = result.split('\n').filter(Boolean);
  } catch {
    const result = await $`git log --oneline -20 --pretty=format:"- %s (%h)"`.text();
    commits = result.split('\n').filter(Boolean);
  }

  if (commits.length === 0) {
    console.info('⚠️  No new commits found');
    return;
  }

  // Categorize commits
  const categories = categorizeCommits(commits);

  // Generate entry
  const newEntry = generateEntry(version, categories);

  // Read existing changelog
  let existingChangelog = '';
  try {
    existingChangelog = await Bun.file(CHANGELOG_FILE).text();
  } catch {
    existingChangelog = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n`;
    existingChangelog += `📦 Registry: ${REGISTRY_URL}\n`;
    existingChangelog += `☁️  R2 Store: ${R2_BUCKET_URL}\n\n`;
  }

  // Insert new entry after header
  const lines = existingChangelog.split('\n');
  let insertIndex = lines.findIndex(l => l.startsWith('## ['));
  if (insertIndex === -1) insertIndex = lines.length;

  const updatedChangelog = [
    ...lines.slice(0, insertIndex),
    newEntry,
    '',
    ...lines.slice(insertIndex),
  ].join('\n');

  await Bun.write(CHANGELOG_FILE, updatedChangelog);
  console.info(`✅ Updated ${CHANGELOG_FILE} with v${version}`);
  console.info(`\n📝 Changes by category:`);
  console.info(`   Features: ${categories.feat.length}`);
  console.info(`   Fixes: ${categories.fix.length}`);
  console.info(`   Docs: ${categories.docs.length}`);
  console.info(`   Refactors: ${categories.refactor.length}`);
  console.info(`   Tests: ${categories.test.length}`);
  console.info(`   Chores: ${categories.chore.length}`);
}

if (import.meta.main) {
  await main();
}
