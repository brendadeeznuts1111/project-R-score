#!/usr/bin/env bun
/**
 * [DUOPLUS][GIT][REMEDIATION][#REF:TAG-REMEDY][BUN:6.1-NATIVE]
 * Remediation scripts for DuoPlus Tag Enforcement v6.1
 */

import { $ } from "bun";
import { randomBytes } from "crypto";

const args = process.argv.slice(2);
const command = args[0];

async function fileExists(path: string): Promise<boolean> {
  return await Bun.file(path).exists();
}

async function filterExistingFiles(files: string[], pattern: RegExp): Promise<string[]> {
  const result: string[] = [];
  for (const f of files) {
    if (f && pattern.test(f) && await fileExists(f)) {
      result.push(f);
    }
  }
  return result;
}

async function generateTags(stagedOnly = true) {
  console.log("🛠️ Generating mandatory tags for code blocks...");
  const rawFiles = stagedOnly
    ? (await $`git diff --cached --name-only`.text()).trim().split('\n')
    : (await $`git ls-files`.text()).trim().split('\n');

  const files = await filterExistingFiles(rawFiles, /\.(ts|tsx|js|jsx)$/);

  for (const file of files) {
    const content = await Bun.file(file).text();
    if (!content.includes('[#REF:')) {
      const ref = `AUTO-${randomBytes(4).toString('hex').toUpperCase()}`;
      const tag = `// [DUOPLUS][CODE][GENERATE][NORMAL][#REF:${ref}]\n`;
      await Bun.write(file, tag + content);
      console.log(`✅ Added tag to ${file} (#REF:${ref})`);
    }
  }
}

async function regenerateRefs() {
  console.log("🔄 Regenerating duplicate #REFs...");
  const rawFiles = (await $`git ls-files`.text()).trim().split('\n');
  const files = await filterExistingFiles(rawFiles, /\.(ts|tsx|js|jsx)$/);
  const seenRefs = new Set<string>();

  for (const file of files) {
    const content = await Bun.file(file).text();
    const updatedContent = content.replace(/\[#REF:([A-Z0-9_-]+)\]/gi, (match, ref) => {
      if (seenRefs.has(ref)) {
        const newRef = `FIX-${randomBytes(4).toString('hex').toUpperCase()}`;
        console.log(`⚠️ Duplicate ref ${ref} found in ${file}, fixing to ${newRef}`);
        return `[#REF:${newRef}]`;
      }
      seenRefs.add(ref);
      return match;
    });

    if (content !== updatedContent) {
      await Bun.write(file, updatedContent);
    }
  }
}

async function syncTypes() {
  console.log("📦 Syncing @types/bun...");
  await $`bun add -d @types/bun@latest`;
  console.log("✅ Types synced.");
}

async function main() {
  switch (command) {
    case 'generate':
      await generateTags(args.includes('--staged'));
      break;
    case 'ref':
      await regenerateRefs();
      break;
    case 'sync-types':
      await syncTypes();
      break;
    default:
      console.log(`
Usage:
  bun run scripts/git/tag-remediation.ts generate [--staged]
  bun run scripts/git/tag-remediation.ts ref
  bun run scripts/git/tag-remediation.ts sync-types
      `);
  }
}

main();
