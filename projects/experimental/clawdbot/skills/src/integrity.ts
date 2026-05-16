#!/usr/bin/env bun
/**
 * src/integrity.ts
 * Skill integrity checking with CRC32 and binary detection
 */

import type { Skill } from "./skills";

export interface SkillChecksum {
  id: number;
  name: string;
  crc32: string;
  size: number;
  timestamp: number;
}

export interface BinaryStatus {
  name: string;
  binary: string;
  found: boolean;
  path: string | null;
  version: string | null;
}

export interface IntegrityReport {
  timestamp: string;
  totalSkills: number;
  checksums: SkillChecksum[];
  binaries: BinaryStatus[];
  masterChecksum: string;
  computeTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CRC32 Integrity
// ═══════════════════════════════════════════════════════════════════════════

const checksumCache = new Map<number, SkillChecksum>();

export function computeChecksum(skill: Skill): SkillChecksum {
  const cached = checksumCache.get(skill.id);
  if (cached && cached.timestamp > Date.now() - 60000) {
    return cached;
  }

  const data = JSON.stringify(skill);
  const bytes = new TextEncoder().encode(data);
  const crc = Bun.hash.crc32(bytes);

  const checksum: SkillChecksum = {
    id: skill.id,
    name: skill.name,
    crc32: crc.toString(16).padStart(8, "0"),
    size: bytes.length,
    timestamp: Date.now(),
  };

  checksumCache.set(skill.id, checksum);
  return checksum;
}

export function computeAllChecksums(skills: Skill[]): SkillChecksum[] {
  return skills.map(computeChecksum);
}

export function computeMasterChecksum(skills: Skill[]): string {
  const allData = JSON.stringify(skills);
  const bytes = new TextEncoder().encode(allData);
  return Bun.hash.crc32(bytes).toString(16).padStart(8, "0");
}

export function verifyChecksum(skill: Skill, expected: string): boolean {
  const current = computeChecksum(skill);
  return current.crc32 === expected;
}

// ═══════════════════════════════════════════════════════════════════════════
// Binary Detection
// ═══════════════════════════════════════════════════════════════════════════

export function checkBinary(skill: Skill): BinaryStatus {
  const binary = skill.path?.split("/").pop() || skill.name;

  const whichResult = Bun.spawnSync(["which", binary]);
  const found = whichResult.exitCode === 0;
  const path = found ? whichResult.stdout.toString().trim() : null;

  let version: string | null = null;
  if (found) {
    const versionResult = Bun.spawnSync([binary, "--version"], {
      timeout: 2000,
    });
    if (versionResult.exitCode === 0) {
      version = versionResult.stdout.toString().trim().split("\n")[0].slice(0, 50);
    }
  }

  return {
    name: skill.name,
    binary,
    found,
    path,
    version,
  };
}

export function checkAllBinaries(skills: Skill[]): BinaryStatus[] {
  const binarySkills = skills.filter(s => s.path || s.status === "bin");
  return binarySkills.map(checkBinary);
}

// ═══════════════════════════════════════════════════════════════════════════
// Full Integrity Report
// ═══════════════════════════════════════════════════════════════════════════

export function generateIntegrityReport(skills: Skill[]): IntegrityReport {
  const start = performance.now();

  const checksums = computeAllChecksums(skills);
  const binaries = checkAllBinaries(skills);
  const masterChecksum = computeMasterChecksum(skills);

  return {
    timestamp: new Date().toISOString(),
    totalSkills: skills.length,
    checksums,
    binaries,
    masterChecksum,
    computeTimeMs: performance.now() - start,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Display Functions
// ═══════════════════════════════════════════════════════════════════════════

export function displayChecksums(skills: Skill[], limit = 10) {
  const checksums = computeAllChecksums(skills.slice(0, limit));

  const data = checksums.map(c => ({
    "#": c.id,
    "Skill": c.name,
    "CRC32": c.crc32,
    "Size": `${c.size}B`,
  }));

  console.log("\n🔐 Skill Checksums");
  console.log("─".repeat(50));
  console.log(Bun.inspect.table(data, { colors: true }));

  if (skills.length > limit) {
    console.log(`  ... and ${skills.length - limit} more`);
  }

  const master = computeMasterChecksum(skills);
  console.log(`\n  Master checksum: ${master}`);
}

export function displayBinaryStatus(skills: Skill[]) {
  const binaries = checkAllBinaries(skills);

  const data = binaries.map(b => ({
    "Skill": b.name,
    "Binary": b.binary,
    "Found": b.found ? "✅" : "❌",
    "Version": b.version?.slice(0, 25) || "—",
  }));

  const found = binaries.filter(b => b.found).length;

  console.log("\n🔍 Binary Status");
  console.log("─".repeat(50));
  console.log(Bun.inspect.table(data, { colors: true }));
  console.log(`\n  Found: ${found}/${binaries.length} binaries`);
}

export function displayIntegrityReport(skills: Skill[]) {
  const report = generateIntegrityReport(skills);

  console.log("\n" + "═".repeat(60));
  console.log("🛡️  INTEGRITY REPORT");
  console.log("═".repeat(60));
  console.log(`  Generated: ${report.timestamp}`);
  console.log(`  Skills: ${report.totalSkills}`);
  console.log(`  Master CRC32: ${report.masterChecksum}`);
  console.log(`  Compute time: ${report.computeTimeMs.toFixed(2)}ms`);

  const binFound = report.binaries.filter(b => b.found).length;
  console.log(`  Binaries: ${binFound}/${report.binaries.length} found`);

  // Summary table
  const summary = [
    { Metric: "Total Skills", Value: report.totalSkills.toString() },
    { Metric: "Master Checksum", Value: report.masterChecksum },
    { Metric: "Binaries Found", Value: `${binFound}/${report.binaries.length}` },
    { Metric: "Compute Time", Value: `${report.computeTimeMs.toFixed(2)}ms` },
  ];

  console.log("\n" + Bun.inspect.table(summary, { colors: true }));

  return report;
}

export default {
  computeChecksum,
  computeAllChecksums,
  computeMasterChecksum,
  verifyChecksum,
  checkBinary,
  checkAllBinaries,
  generateIntegrityReport,
  displayChecksums,
  displayBinaryStatus,
  displayIntegrityReport,
};
