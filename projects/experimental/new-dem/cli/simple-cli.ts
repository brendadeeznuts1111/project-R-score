#!/usr/bin/env bun

// Simple T3-Lattice CLI with metrics

// Component data
interface Component {
  id: number;
  name: string;
  hex: string;
  hsl: string;
  slot: string;
  pattern: string;
  category?: string;
  status?: "stable" | "beta" | "experimental";
  bunVersion?: string;
  groups?: string[];
  views?: string[];
}

const COMPONENTS: Component[] = [
  { id: 1,  name: "TOML Config",     hex: "#4ECDC4",  hsl: "hsl(174, 54%, 61%)",  slot: "/slots/config",      pattern: "grid", category: "Config", status: "stable", bunVersion: ">=1.0.0", groups: ["foundation"], views: ["overview", "detail", "expert"] },
  { id: 2,  name: "DNS Prefetch",    hex: "#5BA4B8",  hsl: "hsl(193, 41%, 52%)",  slot: "/slots/dns",        pattern: "wave", category: "Network", status: "stable", bunVersion: ">=1.0.0", groups: ["network"], views: ["detail", "expert"] },
  { id: 3,  name: "Secrets",         hex: "#7FA886",  hsl: "hsl(138, 25%, 53%)",  slot: "/slots/secrets",    pattern: "lock", category: "Security", status: "stable", bunVersion: ">=1.0.0", groups: ["security"], views: ["overview", "detail", "expert"] },
  { id: 4,  name: "Fetch/ETag",      hex: "#E8D591",  hsl: "hsl(45, 67%, 71%)",   slot: "/slots/fetch",      pattern: "stream", category: "HTTP", status: "stable", bunVersion: ">=1.0.0", groups: ["performance"], views: ["detail", "expert"] },
  { id: 5,  name: "Channels",        hex: "#5D4E8C",  hsl: "hsl(255, 33%, 40%)",  slot: "/slots/color",      pattern: "amp", category: "Channels", status: "stable", bunVersion: ">=1.0.0", groups: ["transformation"], views: ["detail", "expert"] },
  { id: 6,  name: "SQLite",          hex: "#9ACEB8",  hsl: "hsl(159, 36%, 64%)",  slot: "/slots/sqlite",     pattern: "db", category: "Storage", status: "stable", bunVersion: ">=1.0.0", groups: ["storage"], views: ["overview", "detail", "expert"] },
  { id: 7,  name: "%j Logging",      hex: "#F0D88A",  hsl: "hsl(47, 79%, 68%)",   slot: "/slots/log",        pattern: "stream", category: "Logging", status: "stable", bunVersion: ">=1.0.0", groups: ["performance"], views: ["detail", "expert"] },
  { id: 8,  name: "Table",           hex: "#8B7CB3",  hsl: "hsl(255, 30%, 55%)",  slot: "/slots/table",      pattern: "matrix", category: "Data", status: "stable", bunVersion: ">=1.0.0", groups: ["transformation"], views: ["detail", "expert"] },
  { id: 9,  name: "S3 Stream",       hex: "#5BA4B8",  hsl: "hsl(193, 41%, 52%)",  slot: "/slots/s3",         pattern: "cloud", category: "Storage", status: "beta", bunVersion: ">=1.0.0", groups: ["network"], views: ["detail", "expert"] },
  { id: 10, name: "Proxy",           hex: "#6D7679",  hsl: "hsl(190, 12%, 42%)",  slot: "/slots/proxy",      pattern: "mirror", category: "Proxy", status: "stable", bunVersion: ">=1.0.0", groups: ["system"], views: ["detail", "expert"] },
  { id: 11, name: "Dashboard",       hex: "#8ADED8",  hsl: "hsl(175, 49%, 73%)",  slot: "/slots/dashboard",  pattern: "grid", category: "UI", status: "stable", bunVersion: ">=1.0.0", groups: ["foundation", "ui"], views: ["detail", "expert"] },
  { id: 12, name: "URLPattern",      hex: "#6A5F9E",  hsl: "hsl(250, 27%, 45%)",  slot: "/slots/routing",    pattern: "route", category: "Routing", status: "stable", bunVersion: ">=1.0.0", groups: ["transformation"], views: ["detail", "expert"] },
  { id: 13, name: "PTY Terminal",    hex: "#4ECDC4",  hsl: "hsl(174, 54%, 61%)",  slot: "/slots/terminal",   pattern: "grid", category: "Terminal", status: "beta", bunVersion: ">=1.0.0", groups: ["foundation"], views: ["detail", "expert"] },
  { id: 14, name: "Flags",           hex: "#A5C9A8",  hsl: "hsl(130, 32%, 64%)",  slot: "/slots/features",   pattern: "toggle", category: "Config", status: "stable", bunVersion: ">=1.0.0", groups: ["security"], views: ["detail", "expert"] },
  { id: 15, name: "HTTP Pool",       hex: "#5BA4B8",  hsl: "hsl(193, 41%, 52%)",  slot: "/slots/http-pool",  pattern: "pool", category: "HTTP", status: "stable", bunVersion: ">=1.0.0", groups: ["network"], views: ["detail", "expert"] },
  { id: 16, name: "Compile",         hex: "#8E999C",  hsl: "hsl(191, 8%, 52%)",   slot: "/slots/compile",    pattern: "cargo", category: "Build", status: "stable", bunVersion: ">=1.0.0", groups: ["system"], views: ["detail", "expert"] },
  { id: 17, name: "Timers",          hex: "#F0D88A",  hsl: "hsl(47, 79%, 68%)",   slot: "/slots/test",       pattern: "timer", category: "Utils", status: "stable", bunVersion: ">=1.0.0", groups: ["performance"], views: ["detail", "expert"] },
  { id: 18, name: "UUIDv7",          hex: "#5D4E8C",  hsl: "hsl(255, 33%, 40%)",  slot: "/slots/uuid",       pattern: "id", category: "Utils", status: "stable", bunVersion: ">=1.0.0", groups: ["transformation"], views: ["detail", "expert"] },
  { id: 19, name: "stringWidth",     hex: "#4ECDC4",  hsl: "hsl(174, 54%, 61%)",  slot: "/slots/stringwidth",pattern: "grid", category: "Utils", status: "stable", bunVersion: ">=1.0.0", groups: ["foundation"], views: ["detail", "expert"] },
  { id: 20, name: "V8 APIs",         hex: "#7A8689",  hsl: "hsl(193, 10%, 46%)",  slot: "/slots/native",     pattern: "native", category: "Runtime", status: "experimental", bunVersion: ">=1.0.0", groups: ["system"], views: ["detail", "expert"] },
  { id: 21, name: "Disposition",     hex: "#9CA8AB",  hsl: "hsl(190, 9%, 57%)",   slot: "/slots/disposition",pattern: "download", category: "Utils", status: "stable", bunVersion: ">=1.0.0", groups: ["system"], views: ["detail", "expert"] },
  { id: 22, name: "Env Exp",         hex: "#F0D88A",  hsl: "hsl(47, 79%, 68%)",   slot: "/slots/env",        pattern: "stream", category: "Config", status: "stable", bunVersion: ">=1.0.0", groups: ["performance"], views: ["detail", "expert"] },
  { id: 23, name: "Bug Fixes",       hex: "#6D7679",  hsl: "hsl(190, 12%, 42%)",  slot: "/slots/fixes",      pattern: "fix", category: "Maintenance", status: "stable", bunVersion: ">=1.0.0", groups: ["system"], views: ["detail", "expert"] },
  { id: 24, name: "Versioning",      hex: "#C95D7B",  hsl: "hsl(346, 51%, 53%)",  slot: "/slots/version",    pattern: "tag", category: "Meta", status: "stable", bunVersion: "any", groups: ["meta"], views: ["overview", "detail", "expert"] }
];

// Views configuration
const VIEWS = {
  overview: { name: "Overview", description: "Core components", componentIds: [1, 3, 6, 24] },
  detail: { name: "Detail", description: "Extended functionality", componentIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  expert: { name: "Expert", description: "All components", componentIds: COMPONENTS.map(c => c.id) }
};

// Helper functions
function getComponentById(id: number): Component | undefined {
  return COMPONENTS.find(c => c.id === id);
}

function getViewComponents(view: keyof typeof VIEWS): Component[] {
  return VIEWS[view].componentIds.map(id => getComponentById(id)).filter(Boolean) as Component[];
}

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

// CLI
const command = process.argv[2];
const arg = process.argv[3];

console.info("🚀 T3-Lattice Registry CLI v3.3\n");

switch (command) {
  case "stats":
    console.info("📊 Registry Metrics:");
    console.info(`   Total Components: ${COMPONENTS.length}`);
    console.info(`   Categories: ${new Set(COMPONENTS.map(c => c.category)).size}`);
    console.info(`   Stable Components: ${COMPONENTS.filter(c => c.status === 'stable').length}`);
    console.info(`   Beta Components: ${COMPONENTS.filter(c => c.status === 'beta').length}`);
    console.info(`   Experimental: ${COMPONENTS.filter(c => c.status === 'experimental').length}`);
    console.info(`   Color Families: ${new Set(COMPONENTS.map(c => c.hex)).size}`);
    console.info(`   Pattern Types: ${new Set(COMPONENTS.map(c => c.pattern)).size}`);
    break;

  case "colors":
    console.info("🎨 Color Palette:");
    console.info("═".repeat(60));
    const colorGroups = new Map<string, Component[]>();
    for (const comp of COMPONENTS) {
      if (!colorGroups.has(comp.hex)) {
        colorGroups.set(comp.hex, []);
      }
      colorGroups.get(comp.hex)!.push(comp);
    }
    for (const [hex, comps] of colorGroups) {
      const hsl = hexToHsl(hex);
      console.info(`${hex} ${hsl.padEnd(18)} ${comps.map(c => "#" + c.id.toString().padStart(2, "0")).join(" ")}`);
    }
    break;

  case "list":
    console.info("📦 Components:");
    console.info("═".repeat(80));
    for (const comp of COMPONENTS) {
      console.info(`${comp.hex}● #${comp.id.toString().padStart(2, "0")} ${comp.name.padEnd(25)} ${comp.category?.padEnd(12) || "N/A".padEnd(12)} ${comp.status || "unknown"}`);
    }
    console.info("═".repeat(80));
    break;

  case "get":
    if (!arg) {
      console.info("Usage: get <id>");
      break;
    }
    const comp = getComponentById(Number(arg));
    if (!comp) {
      console.info(`Component #${arg} not found`);
    } else {
      console.info(`\n📦 Component #${comp.id}: ${comp.name}`);
      console.info(`   Color: ${comp.hex} (${comp.hsl})`);
      console.info(`   Slot: ${comp.slot}`);
      console.info(`   Pattern: ${comp.pattern}`);
      console.info(`   Category: ${comp.category}`);
      console.info(`   Status: ${comp.status}`);
      console.info(`   Bun Version: ${comp.bunVersion}`);
      console.info(`   Groups: ${(comp.groups || []).join(", ")}`);
      console.info(`   Views: ${(comp.views || []).join(", ")}\n`);
    }
    break;

  case "views":
    console.info("👁️  Available Views:");
    for (const [name, view] of Object.entries(VIEWS)) {
      console.info(`   ${name}: ${view.description} (${view.componentIds.length} components)`);
    }
    break;

  case "view":
    if (!arg || !VIEWS[arg as keyof typeof VIEWS]) {
      console.info("Usage: view <overview|detail|expert>");
      break;
    }
    const components = getViewComponents(arg as keyof typeof VIEWS);
    console.info(`\n📋 ${VIEWS[arg as keyof typeof VIEWS].name} View (${components.length} components):`);
    for (const comp of components) {
      console.info(`   ${comp.hex}● ${comp.name}`);
    }
    console.info();
    break;

  case "patterns":
    console.info("🔷 Pattern Types:");
    const patternCounts = new Map<string, number>();
    for (const comp of COMPONENTS) {
      patternCounts.set(comp.pattern, (patternCounts.get(comp.pattern) || 0) + 1);
    }
    for (const [pattern, count] of patternCounts) {
      console.info(`   ${pattern}: ${count} components`);
    }
    break;

  default:
    console.info("Available commands:");
    console.info("  stats      Show registry metrics");
    console.info("  colors     Display color palette");
    console.info("  list       List all components");
    console.info("  get <id>   Get component details");
    console.info("  views      List available views");
    console.info("  view <name> Show components in view");
    console.info("  patterns   Show pattern distribution");
}