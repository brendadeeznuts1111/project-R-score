#!/usr/bin/env bun

import { getPliveSession } from "../src/lib/plive-session";

const { cookie, sessionId } = await getPliveSession();

console.info("📡 Connecting to live plive data stream...");

const response = await fetch('https://plive.sportswidgets.pro/live/data?countries=true&leagues=true&sports=true', {
  headers: {
    'cookie': cookie,
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Referer': 'https://plive.sportswidgets.pro/manager-tools/',
    ...(sessionId ? { 'x-gs-session': sessionId } : {}),
  },
  timeout: 10000
});

if (!response.ok) {
  console.error(`❌ API Error: ${response.status} ${response.statusText}`);
  process.exit(1);
}

console.info("✅ Connected to live data stream");

const rawData = await response.text();
console.info(`📦 Received ${rawData.length} bytes of data`);

let data;
try {
  data = JSON.parse(rawData);
} catch (error) {
  console.error("❌ Failed to parse JSON response:", error.message);
  process.exit(1);
}

// Inspect the structure and find betting data
function exploreStructure(obj, path = '', depth = 0) {
  const results = [];
  
  if (depth > 5) return results; // Limit depth
  
  if (typeof obj === 'object' && obj !== null) {
    // Look for arrays that might contain bets
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value) && value.length > 0) {
        console.info(`${path}${key}: Array[${value.length}]`);
        // Check first few items for betting data
        const sampleItems = value.slice(0, 3);
        for (let i = 0; i < sampleItems.length; i++) {
          const item = sampleItems[i];
          if (typeof item === 'object' && item !== null) {
            const keys = Object.keys(item);
            if (keys.some(k => ['profit', 'agent', 'bet', 'wager', 'amount'].includes(k))) {
              console.info(`  🎯 Found betting data in ${path}${key}[${i}]:`, keys);
              results.push(...value); // Add the whole array
              break;
            }
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        results.push(...exploreStructure(value, path + key + '.', depth + 1));
      }
    }
  }
  
  return results;
}

const bettingData = exploreStructure(data);
console.info(`💰 Found ${bettingData.length} betting records`);

// Convert to YAML format
if (bettingData.length > 0) {
  const yamlContent = bettingData.map(record => {
    const lines = ['-'];
    for (const [key, value] of Object.entries(record)) {
      if (value !== null && value !== undefined) {
        const safeValue = typeof value === 'string' ? `"${value.replace(/"/g, '\\"')}"` : value;
        lines.push(`  ${key}: ${safeValue}`);
      }
    }
    return lines.join('\n');
  }).join('\n');
  
  await Bun.write("data/live.yaml", yamlContent);
  console.info("✅ Live betting data stored");
} else {
  console.info("⚠️ No betting data found - storing raw structure for analysis");
  await Bun.write("data/live-raw.json", JSON.stringify(data, null, 2));
}

console.info("📊 Run: tail -f data/live.yaml");
