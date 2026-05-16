#!/usr/bin/env bun
/**
 * src/version-manager.ts
 * Skill version management with changelog parsing and semver support
 * - JSONC changelog parsing (Bun.JSONC)
 * - Version comparison and compatibility checks
 * - Upgrade/downgrade tracking
 * - Version history management
 */

import type { Skill } from "./skills";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface VersionEntry {
  version: string;
  date: string;
  changes: string[];
  breaking?: boolean;
  deprecated?: string[];
  added?: string[];
  fixed?: string[];
  removed?: string[];
}

export interface SkillChangelog {
  skillId: string;
  skillName: string;
  currentVersion: string;
  versions: VersionEntry[];
}

export interface VersionComparison {
  current: string;
  latest: string;
  isLatest: boolean;
  behind: number;
  updateAvailable: boolean;
  hasBreakingChanges: boolean;
  breakingVersions: string[];
}

export interface UpgradeResult {
  success: boolean;
  from: string;
  to: string;
  changes: VersionEntry[];
  warnings: string[];
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Semver Utilities
// ═══════════════════════════════════════════════════════════════════════════

export function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

export function compareVersions(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);

  if (!va && !vb) return 0;
  if (!va) return -1;
  if (!vb) return 1;

  if (va.major !== vb.major) return va.major - vb.major;
  if (va.minor !== vb.minor) return va.minor - vb.minor;
  return va.patch - vb.patch;
}

export function isCompatible(current: string, required: string): boolean {
  const vc = parseVersion(current);
  const vr = parseVersion(required);

  if (!vc || !vr) return false;

  // Major version must match for compatibility
  if (vc.major !== vr.major) return false;

  // Current must be >= required
  if (vc.minor < vr.minor) return false;
  if (vc.minor === vr.minor && vc.patch < vr.patch) return false;

  return true;
}

export function incrementVersion(
  version: string,
  type: "major" | "minor" | "patch"
): string {
  const v = parseVersion(version);
  if (!v) return "1.0.0";

  switch (type) {
    case "major":
      return `${v.major + 1}.0.0`;
    case "minor":
      return `${v.major}.${v.minor + 1}.0`;
    case "patch":
      return `${v.major}.${v.minor}.${v.patch + 1}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SkillVersionManager Class
// ═══════════════════════════════════════════════════════════════════════════

export class SkillVersionManager {
  private versions: Map<string, SkillChangelog> = new Map();
  private changelogPath: string;

  constructor(changelogPath: string = "./changelogs") {
    this.changelogPath = changelogPath;
  }

  /**
   * Parse a skill's changelog from JSONC file
   */
  async parseChangelog(skillId: string): Promise<SkillChangelog | null> {
    // Check cache
    if (this.versions.has(skillId)) {
      return this.versions.get(skillId)!;
    }

    const changelogFile = `${this.changelogPath}/${skillId}.jsonc`;
    const file = Bun.file(changelogFile);

    if (!(await file.exists())) {
      return null;
    }

    try {
      const content = await file.text();
      const changelog = Bun.JSONC.parse(content) as SkillChangelog;

      // Sort versions by semver (newest first)
      changelog.versions.sort((a, b) => compareVersions(b.version, a.version));

      // Cache it
      this.versions.set(skillId, changelog);

      return changelog;
    } catch (error) {
      console.error(`Failed to parse changelog for ${skillId}:`, error);
      return null;
    }
  }

  /**
   * Get all changelogs for skills
   */
  async loadAllChangelogs(skills: Skill[]): Promise<Map<string, SkillChangelog>> {
    const results = new Map<string, SkillChangelog>();

    for (const skill of skills) {
      const changelog = await this.parseChangelog(skill.name);
      if (changelog) {
        results.set(skill.name, changelog);
      }
    }

    return results;
  }

  /**
   * Compare current version with latest
   */
  async compareVersion(skillId: string, currentVersion: string): Promise<VersionComparison | null> {
    const changelog = await this.parseChangelog(skillId);
    if (!changelog || changelog.versions.length === 0) {
      return null;
    }

    const latest = changelog.versions[0].version;
    const comparison = compareVersions(currentVersion, latest);

    // Find breaking changes between current and latest
    const breakingVersions: string[] = [];
    let behind = 0;

    for (const entry of changelog.versions) {
      if (compareVersions(entry.version, currentVersion) > 0) {
        behind++;
        if (entry.breaking) {
          breakingVersions.push(entry.version);
        }
      }
    }

    return {
      current: currentVersion,
      latest,
      isLatest: comparison >= 0,
      behind,
      updateAvailable: comparison < 0,
      hasBreakingChanges: breakingVersions.length > 0,
      breakingVersions,
    };
  }

  /**
   * Get upgrade path between versions
   */
  async getUpgradePath(
    skillId: string,
    fromVersion: string,
    toVersion?: string
  ): Promise<UpgradeResult> {
    const changelog = await this.parseChangelog(skillId);
    if (!changelog) {
      return {
        success: false,
        from: fromVersion,
        to: toVersion || "unknown",
        changes: [],
        warnings: [],
        error: "Changelog not found",
      };
    }

    const targetVersion = toVersion || changelog.versions[0].version;
    const changes: VersionEntry[] = [];
    const warnings: string[] = [];

    // Collect all changes between versions
    for (const entry of changelog.versions) {
      if (
        compareVersions(entry.version, fromVersion) > 0 &&
        compareVersions(entry.version, targetVersion) <= 0
      ) {
        changes.push(entry);

        if (entry.breaking) {
          warnings.push(`⚠️  Version ${entry.version} has breaking changes`);
        }
        if (entry.deprecated && entry.deprecated.length > 0) {
          warnings.push(
            `⚠️  Version ${entry.version} deprecates: ${entry.deprecated.join(", ")}`
          );
        }
        if (entry.removed && entry.removed.length > 0) {
          warnings.push(
            `⚠️  Version ${entry.version} removes: ${entry.removed.join(", ")}`
          );
        }
      }
    }

    // Sort changes oldest to newest for upgrade path
    changes.sort((a, b) => compareVersions(a.version, b.version));

    return {
      success: true,
      from: fromVersion,
      to: targetVersion,
      changes,
      warnings,
    };
  }

  /**
   * Get version history for a skill
   */
  async getVersionHistory(skillId: string, limit?: number): Promise<VersionEntry[]> {
    const changelog = await this.parseChangelog(skillId);
    if (!changelog) {
      return [];
    }

    if (limit) {
      return changelog.versions.slice(0, limit);
    }

    return changelog.versions;
  }

  /**
   * Check if upgrade is safe (no breaking changes)
   */
  async isSafeUpgrade(
    skillId: string,
    fromVersion: string,
    toVersion?: string
  ): Promise<boolean> {
    const result = await getUpgradePath(skillId, fromVersion, toVersion);
    return result.warnings.length === 0;
  }

  /**
   * Create a new changelog entry
   */
  async addVersion(
    skillId: string,
    entry: VersionEntry
  ): Promise<{ success: boolean; error?: string }> {
    const changelogFile = `${this.changelogPath}/${skillId}.jsonc`;
    const file = Bun.file(changelogFile);

    let changelog: SkillChangelog;

    if (await file.exists()) {
      const content = await file.text();
      changelog = Bun.JSONC.parse(content) as SkillChangelog;
    } else {
      changelog = {
        skillId,
        skillName: skillId,
        currentVersion: entry.version,
        versions: [],
      };
    }

    // Check if version already exists
    if (changelog.versions.some((v) => v.version === entry.version)) {
      return { success: false, error: `Version ${entry.version} already exists` };
    }

    // Add new version
    changelog.versions.unshift(entry);
    changelog.currentVersion = entry.version;

    // Write back with comments preserved as much as possible
    const jsonContent = JSON.stringify(changelog, null, 2);

    // Add header comment
    const withHeader = `// Changelog for ${skillId}
// Auto-generated by SkillVersionManager
${jsonContent}`;

    await Bun.write(changelogFile, withHeader);

    // Update cache
    this.versions.set(skillId, changelog);

    return { success: true };
  }

  /**
   * Get skills that need updates
   */
  async getOutdatedSkills(
    skills: Skill[]
  ): Promise<Array<{ skill: Skill; comparison: VersionComparison }>> {
    const outdated: Array<{ skill: Skill; comparison: VersionComparison }> = [];

    for (const skill of skills) {
      if (!skill.version) continue;

      const comparison = await this.compareVersion(skill.name, skill.version);
      if (comparison && comparison.updateAvailable) {
        outdated.push({ skill, comparison });
      }
    }

    // Sort by how far behind they are
    outdated.sort((a, b) => b.comparison.behind - a.comparison.behind);

    return outdated;
  }

  /**
   * Clear the changelog cache
   */
  clearCache() {
    this.versions.clear();
  }
}

// Helper function for external use
async function getUpgradePath(
  skillId: string,
  fromVersion: string,
  toVersion?: string
): Promise<UpgradeResult> {
  const manager = new SkillVersionManager();
  return manager.getUpgradePath(skillId, fromVersion, toVersion);
}

// ═══════════════════════════════════════════════════════════════════════════
// Display Functions - Return formatted strings for testability
// ═══════════════════════════════════════════════════════════════════════════

export function formatChangelog(changelog: SkillChangelog, limit = 5): string {
  const lines: string[] = [];
  lines.push("\n" + "═".repeat(60));
  lines.push(`📋 CHANGELOG: ${changelog.skillName}`);
  lines.push("═".repeat(60));
  lines.push(`  Current Version: ${changelog.currentVersion}`);
  lines.push(`  Total Versions: ${changelog.versions.length}`);

  const entries = changelog.versions.slice(0, limit);

  for (const entry of entries) {
    const breaking = entry.breaking ? " ⚠️ BREAKING" : "";
    lines.push(`\n  ${entry.version} (${entry.date})${breaking}`);
    lines.push("  " + "─".repeat(40));

    if (entry.added && entry.added.length > 0) {
      lines.push("  ✨ Added:");
      entry.added.forEach((a) => lines.push(`     + ${a}`));
    }
    if (entry.fixed && entry.fixed.length > 0) {
      lines.push("  🔧 Fixed:");
      entry.fixed.forEach((f) => lines.push(`     - ${f}`));
    }
    if (entry.deprecated && entry.deprecated.length > 0) {
      lines.push("  ⚠️  Deprecated:");
      entry.deprecated.forEach((d) => lines.push(`     ~ ${d}`));
    }
    if (entry.removed && entry.removed.length > 0) {
      lines.push("  🗑️  Removed:");
      entry.removed.forEach((r) => lines.push(`     x ${r}`));
    }
    if (entry.changes.length > 0) {
      lines.push("  📝 Changes:");
      entry.changes.forEach((c) => lines.push(`     • ${c}`));
    }
  }

  if (changelog.versions.length > limit) {
    lines.push(`\n  ... and ${changelog.versions.length - limit} more versions`);
  }
  return lines.join("\n");
}

export function displayChangelog(changelog: SkillChangelog, limit = 5): void {
  console.log(formatChangelog(changelog, limit));
}

export function formatVersionComparison(skillName: string, comparison: VersionComparison): string {
  const lines: string[] = [];
  lines.push(`\n📊 Version Status: ${skillName}`);
  lines.push("─".repeat(40));
  lines.push(`  Current: ${comparison.current}`);
  lines.push(`  Latest:  ${comparison.latest}`);
  lines.push(`  Status:  ${comparison.isLatest ? "✅ Up to date" : `⬆️ ${comparison.behind} versions behind`}`);
  lines.push(`  Breaking: ${comparison.hasBreakingChanges ? `⚠️  Yes (${comparison.breakingVersions.join(", ")})` : "None"}`);
  return lines.join("\n");
}

export function displayVersionComparison(skillName: string, comparison: VersionComparison): void {
  console.log(formatVersionComparison(skillName, comparison));
}

export function formatUpgradePath(result: UpgradeResult): string {
  const lines: string[] = [];
  lines.push(`\n🔄 Upgrade Path: ${result.from} → ${result.to}`);
  lines.push("─".repeat(50));

  if (!result.success) {
    lines.push(`❌ Error: ${result.error}`);
    return lines.join("\n");
  }

  if (result.changes.length === 0) {
    lines.push("  No changes needed - already at target version");
    return lines.join("\n");
  }

  lines.push(`  ${result.changes.length} version(s) to apply:\n`);

  for (const entry of result.changes) {
    const breaking = entry.breaking ? " ⚠️" : "";
    lines.push(`  📦 ${entry.version}${breaking}`);
    entry.changes.slice(0, 3).forEach((c) => lines.push(`     • ${c}`));
    if (entry.changes.length > 3) {
      lines.push(`     ... and ${entry.changes.length - 3} more`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push("\n  Warnings:");
    result.warnings.forEach((w) => lines.push(`  ${w}`));
  }
  return lines.join("\n");
}

export function displayUpgradePath(result: UpgradeResult): void {
  console.log(formatUpgradePath(result));
}

export default {
  SkillVersionManager,
  parseVersion,
  compareVersions,
  isCompatible,
  incrementVersion,
  formatChangelog,
  formatVersionComparison,
  formatUpgradePath,
  displayChangelog,
  displayVersionComparison,
  displayUpgradePath,
};
