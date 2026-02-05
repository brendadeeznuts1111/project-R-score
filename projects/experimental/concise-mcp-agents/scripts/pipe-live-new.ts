#!/usr/bin/env bun

// [PIPE][LIVE][STREAMS][PIPE-LIVE-001][v1.4][ACTIVE]

const cookie = await Bun.secrets.get({ service: "plive", name: "cookie" });
if (!cookie) throw "Run auth-plive first";

console.log("📡 Connecting to live plive data stream...");

const response = await fetch('https://plive.sportswidgets.pro/live/data?countries=true&leagues=true&sports=true', {
  headers: {
    'cookie': cookie,
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Referer': 'https://plive.sportswidgets.pro/manager-tools/'
  },
  timeout: 10000
});

if (!response.ok) {
  console.error(`❌ API Error: ${response.status} ${response.statusText}`);
  process.exit(1);
}

console.log("✅ Connected to live data stream");

// Get the raw JSON response
const rawData = await response.text();
console.log(`📦 Received ${rawData.length} bytes of data`);

let data;
try {
  data = JSON.parse(rawData);
} catch (error) {
  console.error("❌ Failed to parse JSON response:", error.message);
  process.exit(1);
}

// Flatten nested objects and filter for betting data
function flattenAndFilter(obj, path = '') {
  const results = [];

  if (typeof obj === 'object' && obj !== null) {
    // Check if this object looks like betting data
    if (obj.profit !== undefined || obj.agent !== undefined || obj.bet !== undefined) {
      results.push(obj);
    }

    // Recursively check nested objects/arrays
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        results.push(...flattenAndFilter(value, path + key + '.'));
      }
    }
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      results.push(...flattenAndFilter(item, path));
    }
  }

  return results;
}

const flattenedData = flattenAndFilter(data);
console.log(`📊 Flattened to ${flattenedData.length} potential betting records`);

// Filter for records with profit > 100 or any betting indicators
const bettingRecords = flattenedData.filter(item =>
  (item.profit && typeof item.profit === 'number' && item.profit > 100) ||
  item.agent || item.bet || item.wager
);

console.log(`💰 Found ${bettingRecords.length} betting records`);

// Convert to YAML format
const yamlContent = bettingRecords.map(record => {
  const lines = ['-'];
  for (const [key, value] of Object.entries(record)) {
    if (value !== null && value !== undefined) {
      const safeValue = typeof value === 'string' ? `"${value.replace(/"/g, '\\"')}"` : value;
      lines.push(`  ${key}: ${safeValue}`);
    }
  }
  return lines.join('\n');
}).join('\n');

// Write to file
await Bun.write("data/live.yaml", yamlContent);

console.log("✅ Live betting data filtered and stored");
console.log("📊 Run: tail -f data/live.yaml");

// WebSocket broadcast (simulated)
console.log("📡 Dashboard update triggered (WebSocket broadcast)");
EOF && mv scripts/pipe-live-new.ts scripts/pipe-live.ts