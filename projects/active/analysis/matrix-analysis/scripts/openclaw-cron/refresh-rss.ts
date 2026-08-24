#!/usr/bin/env bun
/**
 * RSS Feed Refresh Script
 * Runs every 30 minutes
 */

import { $ } from "bun";

const RSS_FEEDS = [
  "https://openclaw.ai/changelog/rss",
  "https://bun.com/rss.xml"
];

async function refreshRSS() {
  console.info("📰 Refreshing RSS feeds...");
  
  for (const feed of RSS_FEEDS) {
    try {
      const response = await fetch(feed);
      if (response.ok) {
        console.info(`  ✅ ${feed}`);
      } else {
        console.info(`  ⚠️  ${feed} - ${response.status}`);
      }
    } catch (error) {
      console.info(`  ❌ ${feed} - ${error.message}`);
    }
  }
  
  console.info("✅ RSS refresh complete");
}

refreshRSS();
