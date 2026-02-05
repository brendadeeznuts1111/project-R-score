#!/usr/bin/env bun
/**
 * backup-skills.ts
 * Archive all skill configs into a compressed backup
 * Usage: bun run backup-skills.ts [--output backup.tar.gz]
 */

import { parseArgs } from "util";
import skills from "./skills.json";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    output: { type: "string", short: "o", default: `skills-backup-${new Date().toISOString().split("T")[0]}.tar.gz` },
    verbose: { type: "boolean", short: "v", default: false },
  },
});

const log = (msg: string) => values.verbose && console.log(msg);

// Gather all skill SKILL.md files
const skillFiles: Record<string, string> = {};
for (const skill of skills.skills) {
  const skillPath = `./${skill.name}/SKILL.md`;
  const file = Bun.file(skillPath);
  if (await file.exists()) {
    skillFiles[`skills/${skill.name}/SKILL.md`] = await file.text();
    log(`  + ${skill.name}/SKILL.md`);
  }
}

// Generate env template from missing env vars
const envVars = new Set<string>();
skills.skills.forEach(s => {
  s.missing.forEach(m => {
    const match = m.match(/env:\s*(.+)/);
    if (match) match[1].split(",").forEach(v => envVars.add(v.trim()));
  });
});

const envTemplate = `# Required Environment Variables for Clawdbot Skills
# Generated: ${new Date().toISOString()}

${[...envVars].sort().map(v => `${v}=`).join("\n")}
`;

// Generate install script for missing binaries
const missingBins = new Set<string>();
skills.skills.forEach(s => {
  s.missing.forEach(m => {
    const match = m.match(/bins?:\s*(.+)/);
    if (match) match[1].split(",").forEach(b => missingBins.add(b.trim()));
  });
});

const installScript = `#!/bin/bash
# Install missing skill dependencies
# Generated: ${new Date().toISOString()}

set -e

echo "Installing missing skill binaries..."

# Homebrew binaries
BREW_BINS=(${[...missingBins].filter(b => !b.includes("_")).join(" ")})

for bin in "\${BREW_BINS[@]}"; do
  if ! command -v "$bin" &> /dev/null; then
    echo "  Installing $bin..."
    brew install "$bin" 2>/dev/null || echo "    (not in brew, try manual install)"
  else
    echo "  $bin already installed"
  fi
done

echo "Done!"
`;

// Create archive
console.log(`Creating backup: ${values.output}`);
log("Contents:");

const archive = new Bun.Archive({
  "skills.json": JSON.stringify(skills, null, 2),
  "env-template.env": envTemplate,
  "install-deps.sh": installScript,
  "manifest.json": JSON.stringify({
    version: skills.meta.version,
    created: new Date().toISOString(),
    total: skills.meta.total,
    ready: skills.meta.ready,
    missing: skills.meta.missing,
    categories: Object.keys(skills.categories),
    tags: Object.keys(skills.tags),
  }, null, 2),
  ...skillFiles,
}, { compress: "gzip", level: 9 });

await Bun.write(values.output, archive);

// Generate CRC32 checksum (hardware-accelerated, 20x faster)
const archiveBytes = await Bun.file(values.output).bytes();
const checksum = Bun.hash.crc32(archiveBytes);
const checksumHex = checksum.toString(16).padStart(8, "0");

// Write checksum file
const checksumFile = values.output.replace(/\.(tar\.gz|tgz)$/, ".crc32");
await Bun.write(checksumFile, `${checksumHex}  ${values.output}\n`);

const stat = await Bun.file(values.output).stat();
console.log(`Backup created: ${values.output} (${(stat.size / 1024).toFixed(2)} KB)`);
console.log(`  Skills: ${skills.meta.total}`);
console.log(`  Ready: ${skills.meta.ready}`);
console.log(`  Missing: ${skills.meta.missing}`);
console.log(`  CRC32: ${checksumHex}`);
