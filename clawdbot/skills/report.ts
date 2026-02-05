#!/usr/bin/env bun
/**
 * report.ts
 * Generate skill report with fast JSON serialization
 * Uses Bun v1.3.6 SIMD-accelerated FastStringifier via %j
 * Usage: bun run report.ts | jq '.summary'
 *        bun run report.ts --debug (verbose with %j)
 */

import { parseArgs } from "util";
import skillsModule from "./src/skills";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    debug: { type: "boolean", short: "d", default: false },
  },
});

const debug = (label: string, data: any) => {
  if (values.debug) {
    // Uses SIMD FastStringifier - 3x faster than JSON.stringify
    console.error(`[DEBUG] ${label}: %j`, data);
  }
};

const { skills, allSkills, getReady, getNeedsAttention, formatStatus, formatHealth } = skillsModule;

debug("meta", skills.meta);

// Aggregate stats
const byCategory: Record<string, { total: number; ready: number; skills: string[] }> = {};
const byStatus: Record<string, number> = {};
const byTag: Record<string, number> = {};

allSkills.forEach(s => {
  // Category stats
  if (!byCategory[s.category]) {
    byCategory[s.category] = { total: 0, ready: 0, skills: [] };
  }
  byCategory[s.category].total++;
  byCategory[s.category].skills.push(s.name);
  if (s.status === "ready") byCategory[s.category].ready++;

  // Status stats
  byStatus[s.status] = (byStatus[s.status] || 0) + 1;

  // Tag stats
  s.tags.forEach(t => {
    byTag[t] = (byTag[t] || 0) + 1;
  });
});

debug("byCategory", byCategory);
debug("byStatus", byStatus);
debug("byTag", byTag);

// Health score calculation
const healthScore = Math.round(
  allSkills.reduce((acc, s) => acc + s.health, 0) / allSkills.length
);

// Priority breakdown
const byPriority = allSkills
  .filter(s => s.priority)
  .reduce((acc, s) => {
    acc[s.priority!] = acc[s.priority!] || [];
    acc[s.priority!].push(s.name);
    return acc;
  }, {} as Record<string, string[]>);

// Setup time breakdown
const bySetupTime = allSkills
  .filter(s => s.setupTime)
  .reduce((acc, s) => {
    acc[s.setupTime!] = acc[s.setupTime!] || [];
    acc[s.setupTime!].push(s.name);
    return acc;
  }, {} as Record<string, string[]>);

// Quick wins (env only, quick setup)
const quickWins = allSkills.filter(s =>
  s.status === "env" || s.setupTime === "quick"
);

debug("byPriority", byPriority);
debug("bySetupTime", bySetupTime);
debug("quickWins", quickWins.map(s => s.name));

// Last used stats
const lastUsedStats = allSkills.reduce((acc, s) => {
  acc[s.lastUsed] = (acc[s.lastUsed] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

// Generate report
const report = {
  summary: {
    version: skills.meta.version,
    total: skills.meta.total,
    ready: skills.meta.ready,
    missing: skills.meta.missing,
    healthScore,
    healthPercent: `${Math.round((skills.meta.ready / skills.meta.total) * 100)}%`,
  },

  byCategory: Object.entries(byCategory)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, data]) => ({
      name,
      icon: skills.categories[name]?.icon || "?",
      total: data.total,
      ready: data.ready,
      percent: `${Math.round((data.ready / data.total) * 100)}%`,
    })),

  byStatus: Object.entries(byStatus)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({
      status,
      icon: formatStatus(status),
      count,
      percent: `${Math.round((count / allSkills.length) * 100)}%`,
    })),

  byTag: Object.entries(byTag)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count })),

  priority: byPriority,
  setupTime: bySetupTime,

  quickWins: quickWins.map(s => ({
    name: s.name,
    action: s.action,
    setupTime: s.setupTime,
  })),

  needsAttention: getNeedsAttention()
    .filter(s => s.tags.includes("needs-attention"))
    .map(s => ({
      name: s.name,
      status: s.status,
      action: s.action,
    })),

  usage: {
    today: lastUsedStats.today || 0,
    week: lastUsedStats.week || 0,
    month: lastUsedStats.month || 0,
    never: lastUsedStats.never || 0,
  },

  combos: Object.entries(skills.combos).map(([name, members]) => ({
    name,
    members,
    ready: members.filter(m => {
      const skill = allSkills.find(s => s.name === m);
      return skill?.status === "ready";
    }).length,
    total: members.length,
  })),

  generatedAt: new Date().toISOString(),
};

// Fast JSON output using Response.json() internally
console.log(JSON.stringify(report, null, 2));
