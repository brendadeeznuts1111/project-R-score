#!/usr/bin/env bun
/**
 * 🧬 Nebula-Flow™ DNS Cache Live Monitor
 * Real-time DNS cache monitoring with Nebula branding
 * Polls dns.getCacheStats() and displays live metrics
 * 
 * Usage:
 *   bun nebula-dns-live.ts
 *   BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5 bun nebula-dns-live.ts
 */

import { dns } from "bun";

const TTL = Number(process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS ?? 30);
const WIDTH = 50; // wider bar for Nebula branding

function bar(pct: number): string {
  const filled = Math.round((pct / 100) * WIDTH);
  return "█".repeat(filled) + "░".repeat(WIDTH - filled);
}

function fmt(n: number): string {
  return n.toString().padStart(7);
}

function spark(nums: number[]): string {
  const bricks = "▁▂▃▄▅▆▇█";
  const max = Math.max(...nums, 100);
  return nums.map(n => bricks[Math.floor((n / max) * (bricks.length - 1))]).join("");
}

const history: number[] = [];

console.clear();
console.log("\n🧬 ═══════════════════════════════════════════════════════════════════════════════");
console.log("   Nebula-Flow™ DNS Cache Live Monitor");
console.log("   Real-time DNS performance tracking for Lightning Network integration");
console.log("═══════════════════════════════════════════════════════════════════════════════\n");
console.log("   TTL:", TTL, "seconds  |  Polling: every 1 second  |  Press Ctrl-C to quit\n");

setInterval(() => {
  const s = dns.getCacheStats();
  const total = s.totalCount || 1;
  const hitRatio = ((s.cacheHitsCompleted + s.cacheHitsInflight) / total) * 100;

  console.clear();
  console.log("\n🧬 ═══════════════════════════════════════════════════════════════════════════════");
  console.log("   Nebula-Flow™ DNS Cache Live Monitor");
  console.log("═══════════════════════════════════════════════════════════════════════════════\n");

  // Color-coded hit ratio
  let hitRatioColor = "";
  let status = "";
  if (hitRatio >= 90) {
    hitRatioColor = "✅";
    status = "EXCELLENT";
  } else if (hitRatio >= 70) {
    hitRatioColor = "⚠️ ";
    status = "GOOD";
  } else {
    hitRatioColor = "❌";
    status = "NEEDS IMPROVEMENT";
  }

  console.log("   Hit Ratio:", hitRatioColor, hitRatio.toFixed(1).padStart(5) + "%", "[", status, "]");
  console.log("   " + bar(hitRatio) + "\n");

  console.log("   📊 Cache Statistics:");
  console.log("      Hits (completed)  :", fmt(s.cacheHitsCompleted));
  console.log("      Hits (in-flight)  :", fmt(s.cacheHitsInflight));
  console.log("      Misses            :", fmt(s.cacheMisses));
  console.log("      Errors            :", fmt(s.errors));
  console.log("      Cache Size        :", fmt(s.size) + " / 255 entries\n");

  // Warnings
  if (s.size > 200) {
    console.log("   ⚠️  WARNING: Cache approaching limit (" + s.size + "/255)");
  }
  if (s.errors > 10) {
    console.log("   ⚠️  WARNING: High error count - investigate failed hosts");
  }
  if (hitRatio < 70 && total > 50) {
    console.log("   ⚠️  WARNING: Low hit ratio - consider DNS prefetch optimization");
  }

  // Trend
  history.push(hitRatio);
  if (history.length > 60) history.shift();
  console.log("\n   📈 Hit Ratio Trend (60 seconds, ► = now):");
  console.log("      " + spark(history.map(r => Math.round(r))) + " ►\n");

  // Recommendations
  console.log("   💡 Recommendations:");
  if (hitRatio >= 90) {
    console.log("      ✅ DNS prefetch/preconnect strategy is working well");
  } else if (hitRatio >= 70) {
    console.log("      ℹ️  Consider adding more DNS prefetch hints for critical domains");
  } else {
    console.log("      🔧 Add DNS prefetch for all external API endpoints");
  }

  if (s.size < 50) {
    console.log("      ℹ️  Cache has plenty of room for more entries");
  } else if (s.size > 200) {
    console.log("      🔧 Consider lowering TTL or reducing unique domains");
  }

  console.log("\n═══════════════════════════════════════════════════════════════════════════════\n");
}, 1_000);
