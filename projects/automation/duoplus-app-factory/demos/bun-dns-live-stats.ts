#!/usr/bin/env bun
/**
 * DNS Cache Live Stats Dashboard
 * Polls dns.getCacheStats() and displays live hit-ratio histogram
 * Run with: bun bun-dns-live-stats.ts
 * Or with custom TTL: BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5 bun bun-dns-live-stats.ts
 */

import { dns } from "bun";

const TTL = Number(process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS ?? 30);
const WIDTH = 40; // bar-chart width

function bar(pct: number): string {
  const filled = Math.round((pct / 100) * WIDTH);
  return "█".repeat(filled) + "░".repeat(WIDTH - filled);
}

function fmt(n: number): string {
  return n.toString().padStart(6);
}

function spark(nums: number[]): string {
  const bricks = "▁▂▃▄▅▆▇█";
  const max = Math.max(...nums, 100);
  return nums.map(n => bricks[Math.floor((n / max) * (bricks.length - 1))]).join("");
}

const history: number[] = [];

console.clear();
console.info("🌐 DNS Cache Live View  (Ctrl-C to quit)");
console.info("TTL =", TTL, "s  |  poll every 1 s\n");

setInterval(() => {
  const s = dns.getCacheStats();
  const total = s.totalCount || 1;
  const hitRatio = ((s.cacheHitsCompleted + s.cacheHitsInflight) / total) * 100;

  console.clear();
  console.info("🌐 DNS Cache Live View  (TTL:", TTL + "s)\n");

  // Color-coded hit ratio based on performance
  let hitRatioColor = "";
  if (hitRatio >= 90) {
    hitRatioColor = "✅"; // Green - excellent
  } else if (hitRatio >= 70) {
    hitRatioColor = "⚠️ "; // Yellow - good
  } else {
    hitRatioColor = "❌"; // Red - needs improvement
  }

  console.info(
    "Hit ratio :", hitRatioColor, hitRatio.toFixed(1) + "%", bar(hitRatio),
    "\nHits      :", fmt(s.cacheHitsCompleted), "completed +", fmt(s.cacheHitsInflight), "in-flight",
    "\nMisses    :", fmt(s.cacheMisses),
    "\nErrors    :", fmt(s.errors),
    "\nSize      :", fmt(s.size) + "/255",
  );

  // Cache size warning
  if (s.size > 200) {
    console.info("⚠️  Cache size approaching limit (200+/255)");
  }

  // Error warning
  if (s.errors > 10) {
    console.info("⚠️  High error count - investigate failed hosts");
  }

  // mini spark-line of last 60 ratios (kept in memory)
  history.push(hitRatio);
  if (history.length > 60) history.shift();
  console.info("\nRecent hit-ratio trend (► = now)");
  console.info(spark(history.map(r => Math.round(r))) + " ►");

  // Interpretation guide
  console.info("\n📊 Interpretation:");
  if (hitRatio >= 90) {
    console.info("   ✅ Excellent! Prefetch/pre-connect strategy is working.");
  } else if (hitRatio >= 70) {
    console.info("   ⚠️  Good, but could improve. Consider more prefetching.");
  } else {
    console.info("   ❌ Low hit ratio. Add more DNS prefetch/pre-connect hints.");
  }

  if (s.size < 50) {
    console.info("   ℹ️  Cache is small - plenty of room for more entries.");
  } else if (s.size > 200) {
    console.info("   ⚠️  Cache is large - consider lowering TTL or raising limit.");
  }
}, 1_000);

