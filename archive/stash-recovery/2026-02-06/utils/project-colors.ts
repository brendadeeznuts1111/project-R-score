// project-colors.ts — Tier-1380 Color Identity System

export interface ProjectIdentity {
  namespace: string;
  baseHue: number;
  saturation: number;
  lightness: number;
  glyph: string;
  ansiBg: string;
}

export const PROJECT_PALETTE: Record<string, ProjectIdentity> = {
  "com.tier1380.scanner": {
    namespace: "scanner",
    baseHue: 25,
    saturation: 90,
    lightness: 50,
    glyph: "🔍",
    ansiBg: "\x1b[48;2;230;120;30m",
  },
  "com.tier1380.mcp": {
    namespace: "mcp",
    baseHue: 200,
    saturation: 85,
    lightness: 55,
    glyph: "🔌",
    ansiBg: "\x1b[48;2;30;160;230m",
  },
  "com.tier1380.registry": {
    namespace: "registry",
    baseHue: 280,
    saturation: 75,
    lightness: 45,
    glyph: "📦",
    ansiBg: "\x1b[48;2;140;30;180m",
  },
  "legacy.cli": {
    namespace: "legacy",
    baseHue: 0,
    saturation: 0,
    lightness: 60,
    glyph: "⏳",
    ansiBg: "\x1b[48;2;150;150;150m",
  },
  "com.factorywager.edge": {
    namespace: "edge",
    baseHue: 120,
    saturation: 80,
    lightness: 40,
    glyph: "⚡",
    ansiBg: "\x1b[48;2;40;180;60m",
  },
};

export type StatusKind = "critical" | "warning" | "success" | "info";

export function getProjectStatusColor(project: string, status: StatusKind): string {
  const p = PROJECT_PALETTE[project] || PROJECT_PALETTE["legacy.cli"];
  const modifiers = {
    critical: { s: 1.0, l: 0.6, glyph: "🔴" },
    warning: { s: 0.9, l: 0.7, glyph: "🟡" },
    success: { s: 0.8, l: 0.4, glyph: "🟢" },
    info: { s: 0.7, l: 0.8, glyph: "🔵" },
  };
  const mod = modifiers[status];
  const h = p.baseHue;
  const s = Math.min(100, p.saturation * mod.s);
  const l = Math.min(100, p.lightness * mod.l);
  return Bun.color(`hsl(${h}, ${s}%, ${l}%)`, "ansi");
}

export function renderProjectHeader(project: string): string {
  const p = PROJECT_PALETTE[project] || PROJECT_PALETTE["legacy.cli"];
  const color = getProjectStatusColor(project, "info");
  const reset = "\x1b[0m";
  return `${color}${p.glyph} ${project}${reset}`;
}
