#!/usr/bin/env bun
/**
 * RSS Feed Refresh Script
 * Runs every 30 minutes
 */

import { $ } from "bun";

const RSS_FEEDS = [
  "https://openclaw.ai/changelog/rss",
  "https://bun.sh/rss.xml"
];

async function refreshRSS() {
  console.log("📰 Refreshing RSS feeds...");
  
  for (const feed of RSS_FEEDS) {
    try {
      const response = await fetch(feed);
      if (response.ok) {
        console.log(`  ✅ ${feed}`);
      } else {
        console.log(`  ⚠️  ${feed} - ${response.status}`);
      }
    } catch (error) {
      console.log(`  ❌ ${feed} - ${error.message}`);
    }
  }
  
  console.log("✅ RSS refresh complete");
}

refreshRSS();
