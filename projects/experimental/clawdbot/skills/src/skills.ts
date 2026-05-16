#!/usr/bin/env bun
/**
 * src/skills.ts
 * Skills module - importable skill definitions and utilities
 * Build: bun build ./src/skills.ts --outdir ./dist --metafile --minify
 */

import skillsData from "../skills.json";

// Types
export interface SkillColor {
  hex: string;
  H: number;
  S: number;
  L: number;
  R: number;
  G: number;
  B: number;
  A: number;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
  description: string;
  icon: string;
  codepoint: string;
  status: "ready" | "env" | "bin" | "multiple" | "unknown" | "config";
  health: number;
  color: SkillColor;
  missing: string[];
  action: string;
  priority: string | null;
  path: string | null;
  version: string | null;
  homepage: string | null;
  tags: string[];
  combos: string[];
  lastUsed: "today" | "week" | "month" | "never";
  setupTime: "quick" | "medium" | "long" | "complex" | null;
}

export interface SkillsData {
  meta: {
    version: string;
    generated: string;
    total: number;
    ready: number;
    missing: number;
  };
  quickActions: Record<string, { label: string; icon: string; cmd: string }>;
  viewModes: Record<string, { desc: string; cmd: string }>;
  categories: Record<string, { icon: string; color: string }>;
  statusColors: Record<string, SkillColor>;
  tags: Record<string, string[]>;
  combos: Record<string, string[]>;
  skills: Skill[];
}

// Export data
export const skills: SkillsData = skillsData as SkillsData;
export const allSkills = skills.skills;
export const categories = skills.categories;
export const tags = skills.tags;
export const combos = skills.combos;

// Utilities
export const getSkill = (name: string): Skill | undefined =>
  allSkills.find(s => s.name === name);

export const getSkillById = (id: number): Skill | undefined =>
  allSkills.find(s => s.id === id);

export const getByCategory = (category: string): Skill[] =>
  allSkills.filter(s => s.category === category);

export const getByStatus = (status: Skill["status"]): Skill[] =>
  allSkills.filter(s => s.status === status);

export const getByTag = (tag: string): Skill[] =>
  allSkills.filter(s => s.tags.includes(tag));

export const getReady = (): Skill[] =>
  allSkills.filter(s => s.status === "ready");

export const getNeedsAttention = (): Skill[] =>
  allSkills.filter(s => ["env", "bin", "multiple", "unknown"].includes(s.status));

export const getCombo = (name: string): Skill[] => {
  const comboSkills = combos[name];
  if (!comboSkills) return [];
  return comboSkills.map(name => getSkill(name)).filter(Boolean) as Skill[];
};

// Color utilities using Bun.color
export const getStatusColor = (status: string): { r: number; g: number; b: number; a: number } | null => {
  const color = skills.statusColors?.[status];
  if (!color?.hex) return null;
  try {
    return Bun.color(color.hex, "{rgba}") ?? null;
  } catch {
    return null;
  }
};

export const formatHealth = (health: number): string => {
  const filled = Math.round(health / 12.5);
  return "█".repeat(filled) + "░".repeat(8 - filled);
};

export const formatStatus = (status: string): string => {
  const icons: Record<string, string> = {
    ready: "🟢",
    env: "🟡",
    bin: "🟠",
    multiple: "🔴",
    unknown: "🔴",
    config: "🟣",
  };
  return icons[status] || "⚪";
};

// Table output using Bun.inspect.table
// Signature: Bun.inspect.table(tabularData, properties?, options?)
// - properties: optional array of column names to display
// - options: { colors: boolean }
export const printTable = (
  skillList: Skill[] = allSkills,
  columns?: string[],
  options: { colors?: boolean } = { colors: true }
) => {
  const data = skillList.map(s => ({
    "#": s.id,
    skill: `${s.icon} ${s.name}`,
    category: s.category,
    status: formatStatus(s.status),
    health: formatHealth(s.health),
    action: s.action,
    version: s.version || "—",
    tags: s.tags.slice(0, 2).join(", ") || "—",
  }));

  // Bun.inspect.table(data, properties?, options?)
  if (columns) {
    console.log(Bun.inspect.table(data, columns, options));
  } else {
    console.log(Bun.inspect.table(data, options));
  }
};

// Compact table with specific columns
export const printCompactTable = (skillList: Skill[] = allSkills) => {
  printTable(skillList, ["#", "skill", "status", "health"], { colors: true });
};

// Export default
export default {
  skills,
  allSkills,
  categories,
  tags,
  combos,
  getSkill,
  getSkillById,
  getByCategory,
  getByStatus,
  getByTag,
  getReady,
  getNeedsAttention,
  getCombo,
  getStatusColor,
  formatHealth,
  formatStatus,
  printTable,
  printCompactTable,
};
