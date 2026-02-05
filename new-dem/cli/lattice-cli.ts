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

console.log("🚀 T3-Lattice Registry CLI v3.3\n");

switch (command) {
  case "stats":
    console.log("📊 Registry Metrics:");
    console.log(`   Total Components: ${COMPONENTS.length}`);
    console.log(`   Categories: ${new Set(COMPONENTS.map(c => c.category)).size}`);
    console.log(`   Stable Components: ${COMPONENTS.filter(c => c.status === 'stable').length}`);
    console.log(`   Beta Components: ${COMPONENTS.filter(c => c.status === 'beta').length}`);
    console.log(`   Experimental: ${COMPONENTS.filter(c => c.status === 'experimental').length}`);
    break;

  case "list":
    console.log("📦 Components:");
    console.log("═".repeat(80));
    for (const comp of COMPONENTS) {
      console.log(`${comp.color?.hex || "#000000"}● #${comp.id.toString().padStart(2, "0")} ${comp.name.padEnd(25)} ${(comp.category || "N/A").padEnd(12)} ${comp.status || "unknown"}`);
    }
    console.log("═".repeat(80));
    break;

  case "get":
    if (!arg) {
      console.log("Usage: get <id>");
      break;
    }
    const comp = getComponentById(Number(arg));
    if (!comp) {
      console.log(`Component #${arg} not found`);
    } else {
      console.log(`\n📦 Component #${comp.id}: ${comp.name}`);
      console.log(`   Category: ${comp.category}`);
      console.log(`   Status: ${comp.status}`);
      console.log(`   Bun Version: ${comp.bunVersion}`);
      console.log(`   Groups: ${comp.groups.join(", ")}`);
      console.log(`   ${comp.description}\n`);
    }
    break;

  case "graph":
    console.log(renderGraphASCII());
    break;

  case "views":
    console.log("👁️  Available Views:");
    for (const [name, view] of Object.entries(VIEWS)) {
      console.log(`   ${view.icon} ${name}: ${view.description} (${view.componentIds.length} components)`);
    }
    break;

  case "view":
    if (!arg) {
      console.log("Usage: view <overview|detail|expert>");
      break;
    }
    const components = getViewComponents(arg as keyof typeof VIEWS);
    console.log(`\n📋 ${VIEWS[arg as keyof typeof VIEWS]?.name} View (${components.length} components):`);
    for (const comp of components) {
      console.log(`   ${comp.color?.hex || "#000000"}● ${comp.name}`);
    }
    console.log();
    break;

  case "groups":
    const groups = new Set(COMPONENTS.flatMap(c => c.groups));
    console.log("🏷️  Component Groups:");
    for (const group of groups) {
      const count = COMPONENTS.filter(c => c.groups.includes(group)).length;
      console.log(`   ${group}: ${count} components`);
    }
    break;

  case "check":
    if (!arg) {
      console.log("Usage: check <bunVersion>");
      break;
    }
    const compatible = COMPONENTS.filter(c => c.bunVersion === "any" || matchVersion(c.bunVersion, arg));
    const incompatible = COMPONENTS.filter(c => c.bunVersion !== "any" && !matchVersion(c.bunVersion, arg));
    console.log(`🔍 Compatibility Check: Bun ${arg}`);
    console.log(`   ✅ Compatible: ${compatible.length}`);
    console.log(`   ❌ Incompatible: ${incompatible.length}`);
    if (incompatible.length > 0) {
      console.log("   Incompatible components:");
      for (const comp of incompatible) {
        console.log(`     ${comp.color?.hex || "#000000"}● ${comp.name} (requires ${comp.bunVersion})`);
      }
    }
    break;

  case "patterns":
    console.log("🔷 Pattern Types:");
    const patternCounts = new Map<string, number>();
    for (const comp of COMPONENTS) {
      patternCounts.set(comp.pattern, (patternCounts.get(comp.pattern) || 0) + 1);
    }
    for (const [pattern, count] of patternCounts) {
      console.log(`   ${pattern}: ${count} components`);
    }
    break;

  case "dashboard":
    console.log("🚀 Starting dashboard server...");
    startDashboard({ port: arg ? parseInt(arg) : 8080 });
    break;

  case "html":
    if (!arg) {
      console.log("Usage: html <overview|detail|expert>");
      break;
    }
    const html = generateDashboardHTML(arg as keyof typeof VIEWS);
    console.log("Generated HTML dashboard (" + html.length + " characters)");
    console.log("First 200 chars:");
    console.log(html.substring(0, 200) + "...");
    break;

  default:
    console.log("Available commands:");
    console.log("  stats        Show registry metrics");
    console.log("  list         List all components");
    console.log("  get <id>     Get component details");
    console.log("  graph        Show dependency graph");
    console.log("  views        List available views");
    console.log("  view <name>  Show components in view");
    console.log("  groups       List component groups");
    console.log("  check <ver>  Check Bun version compatibility");
    console.log("  patterns     Show pattern distribution");
    console.log("  html <view>  Generate HTML for view");
    console.log("  dashboard [port] Start dashboard server");
}