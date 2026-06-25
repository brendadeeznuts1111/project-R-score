#!/usr/bin/env bun

// Simple CLI for T3-Lattice Registry

// Load the complete implementation
import {
  COMPONENTS,
  VIEWS,
  getComponentById,
  getViewComponents,
  renderGraphASCII,
  matchVersion,
  generateDashboardHTML,
  startDashboard
} from "../src/core.ts";

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
    break;

  case "list":
    console.info("📦 Components:");
    console.info("═".repeat(80));
    for (const comp of COMPONENTS) {
      console.info(`${comp.color?.hex || "#000000"}● #${comp.id.toString().padStart(2, "0")} ${comp.name.padEnd(25)} ${(comp.category || "N/A").padEnd(12)} ${comp.status || "unknown"}`);
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
      console.info(`   Category: ${comp.category}`);
      console.info(`   Status: ${comp.status}`);
      console.info(`   Bun Version: ${comp.bunVersion}`);
      console.info(`   Groups: ${comp.groups.join(", ")}`);
      console.info(`   ${comp.description}\n`);
    }
    break;

  case "graph":
    console.info(renderGraphASCII());
    break;

  case "views":
    console.info("👁️  Available Views:");
    for (const [name, view] of Object.entries(VIEWS)) {
      console.info(`   ${view.icon} ${name}: ${view.description} (${view.componentIds.length} components)`);
    }
    break;

  case "view":
    if (!arg) {
      console.info("Usage: view <overview|detail|expert>");
      break;
    }
    const components = getViewComponents(arg as keyof typeof VIEWS);
    console.info(`\n📋 ${VIEWS[arg as keyof typeof VIEWS]?.name} View (${components.length} components):`);
    for (const comp of components) {
      console.info(`   ${comp.color?.hex || "#000000"}● ${comp.name}`);
    }
    console.info();
    break;

  case "groups":
    const groups = new Set(COMPONENTS.flatMap(c => c.groups));
    console.info("🏷️  Component Groups:");
    for (const group of groups) {
      const count = COMPONENTS.filter(c => c.groups.includes(group)).length;
      console.info(`   ${group}: ${count} components`);
    }
    break;

  case "check":
    if (!arg) {
      console.info("Usage: check <bunVersion>");
      break;
    }
    const compatible = COMPONENTS.filter(c => c.bunVersion === "any" || matchVersion(c.bunVersion, arg));
    const incompatible = COMPONENTS.filter(c => c.bunVersion !== "any" && !matchVersion(c.bunVersion, arg));
    console.info(`🔍 Compatibility Check: Bun ${arg}`);
    console.info(`   ✅ Compatible: ${compatible.length}`);
    console.info(`   ❌ Incompatible: ${incompatible.length}`);
    if (incompatible.length > 0) {
      console.info("   Incompatible components:");
      for (const comp of incompatible) {
        console.info(`     ${comp.color?.hex || "#000000"}● ${comp.name} (requires ${comp.bunVersion})`);
      }
    }
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

  case "dashboard":
    console.info("🚀 Starting dashboard server...");
    startDashboard({ port: arg ? parseInt(arg) : 8080 });
    break;

  case "html":
    if (!arg) {
      console.info("Usage: html <overview|detail|expert>");
      break;
    }
    const html = generateDashboardHTML(arg as keyof typeof VIEWS);
    console.info("Generated HTML dashboard (" + html.length + " characters)");
    console.info("First 200 chars:");
    console.info(html.substring(0, 200) + "...");
    break;

  default:
    console.info("Available commands:");
    console.info("  stats        Show registry metrics");
    console.info("  list         List all components");
    console.info("  get <id>     Get component details");
    console.info("  graph        Show dependency graph");
    console.info("  views        List available views");
    console.info("  view <name>  Show components in view");
    console.info("  groups       List component groups");
    console.info("  check <ver>  Check Bun version compatibility");
    console.info("  patterns     Show pattern distribution");
    console.info("  html <view>  Generate HTML for view");
    console.info("  dashboard [port] Start dashboard server");
}