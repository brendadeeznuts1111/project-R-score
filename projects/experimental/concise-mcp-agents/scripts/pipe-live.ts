#!/usr/bin/env bun

// [PIPE][LIVE][STREAMS][PIPE-LIVE-001][v1.4][ACTIVE]

import { spawn } from "bun";

// Get fresh creds from browser session
console.info("🔑 Paste your current plive session credentials:");
console.info("1. Open https://plive.sportswidgets.pro/manager-tools/");
console.info("2. Open DevTools (F12) → Network tab");
console.info("3. Refresh page, find the live/data request");
console.info("4. Copy the 'cookie' header value");
console.info("5. Copy any 'x0header' or custom headers");
console.info("");

// Try to get stored credentials first, then fall back to prompts
let cookie = process.env.PLIVE_COOKIE;
let x0header = process.env.PLIVE_X0;

if (!cookie) {
  try {
    // Try to get from Bun.secrets (stored during auth)
    cookie = await Bun.secrets.get({ service: "plive", name: "cookie" });
  } catch (error) {
    // Fall back to manual input
    console.info("🔑 No stored credentials found. Please provide:");
    console.info("1. Open https://plive.sportswidgets.pro/manager-tools/");
    console.info("2. Open DevTools (F12) → Network tab");
    console.info("3. Refresh page, find the live/data request");
    console.info("4. Copy the 'cookie' header value");
    console.info("");

    // Use readline for input since Bun.prompt isn't available
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    cookie = await new Promise((resolve) => {
      rl.question("Cookie from DevTools: ", (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }
}

if (!cookie) {
  console.error("❌ Cookie required for authentication");
  process.exit(1);
}

console.info("📡 Connecting to live plive data stream...");

// Fetch live data with real auth
const response = await fetch('https://plive.sportswidgets.pro/live/data?countries=true&leagues=true&sports=true', {
  headers: {
    'cookie': cookie,
    ...(x0header && { 'x0header': x0header }),
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'accept': 'application/json',
    'referer': 'https://plive.sportswidgets.pro/manager-tools/'
  },
  timeout: 10000
});

if (!response.ok) {
  console.error(`❌ API Error: ${response.status} ${response.statusText}`);
  const errorText = await response.text();
  console.error("Response:", errorText.substring(0, 200));
  process.exit(1);
}

console.info("✅ Connected to live data stream");

// Get the raw JSON response
const rawData = await response.text();
console.info(`📦 Received ${rawData.length} bytes of data`);

// Parse JSON and filter for profitable bets
let data;
try {
  data = JSON.parse(rawData);
  console.info(`📊 Parsed ${Array.isArray(data) ? data.length : 'non-array'} records`);
} catch (error) {
  console.error("❌ Failed to parse JSON response:", error.message);
  console.info("Raw response preview:", rawData.substring(0, 200));
  process.exit(1);
}

// Filter for profitable bets (>100)
const profitableBets = Array.isArray(data)
  ? data.filter(item => item.profit && typeof item.profit === 'number' && item.profit > 100)
  : [];

console.info(`💰 Found ${profitableBets.length} profitable bets (> $100)`);

// Convert to YAML format
const yamlContent = profitableBets.map(bet => `- agent: "${bet.agent || 'Unknown'}"
  profit: ${bet.profit || 0}
  volume: ${bet.volume || 0}
  bet: "${bet.bet || 'Unknown'}"
  state: "${bet.state || 'unknown'}"
  ${bet.player ? `player: "${bet.player}"` : ''}
  ${bet.odds ? `odds: "${bet.odds}"` : ''}
  logTime: "${bet.logTime || new Date().toISOString()}"`).join('\n');

// Write to file
await Bun.write("data/live.yaml", yamlContent);

console.info("✅ Live profitable bets (>100) filtered and stored");
console.info("📊 Run: tail -f data/live.yaml");

// Optional: Publish to Redis/WebSocket for live dashboard updates
try {
  // If Redis is available, publish update
  const { redis } = await import("redis");
  const client = redis.createClient();
  await client.connect();
  await client.publish("etl:live", "new-data");
  await client.quit();
  console.info("📡 Published update to dashboard");
} catch (error) {
  // Redis not available, skip
}

console.info("🎯 Live data pipeline active!");
