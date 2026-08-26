#!/usr/bin/env bun
/**
 * RSS Feed Refresh Script
 * Runs every 30 minutes
 */

import { $ } from "bun";
import { fetchMatrixPublicResource } from "../../src/lib/matrix-outbound.ts";

const RSS_FEEDS = [
  "https://openclaw.ai/changelog/rss",
  "https://bun.com/rss.xml"
];

async function refreshRSS() {
  console.info("📰 Refreshing RSS feeds...");
  
  for (const feed of RSS_FEEDS) {
    try {
      const response = await fetchMatrixPublicResource(feed);
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
