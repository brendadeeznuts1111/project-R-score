#!/usr/bin/env bun

// Debug script to examine the live API response structure

// Get stored credentials
const cookie = await Bun.secrets.get({ service: "plive", name: "cookie" });

if (!cookie) {
  console.error("❌ No stored cookie found. Run auth script first.");
  process.exit(1);
}

console.log("🔍 Fetching live data for analysis...");

// Fetch the data
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
  console.error(`❌ API Error: ${response.status}`);
  process.exit(1);
}

const rawData = await response.text();
console.log(`📦 Response size: ${rawData.length} bytes`);

let data;
try {
  data = JSON.parse(rawData);
} catch (error) {
  console.error("❌ Not valid JSON");
  console.log("First 200 chars:", rawData.substring(0, 200));
  process.exit(1);
}

console.log("📊 Response type:", typeof data);
console.log("🔍 Top-level keys:", Object.keys(data));

if (Array.isArray(data)) {
  console.log(`📋 Array with ${data.length} items`);
  if (data.length > 0) {
    console.log("📋 First item keys:", Object.keys(data[0]));
    console.log("📋 First item:", JSON.stringify(data[0], null, 2));
  }
} else if (typeof data === 'object') {
  // Check for common data structures
  if (data.countries) console.log(`🌍 Countries: ${data.countries.length}`);
  if (data.leagues) console.log(`🏆 Leagues: ${data.leagues.length}`);
  if (data.sports) console.log(`⚽ Sports: ${data.sports.length}`);
  if (data.events) console.log(`📅 Events: ${data.events.length}`);
  if (data.bets) console.log(`💰 Bets: ${data.bets.length}`);
  
  // Show structure
  console.log("🏗️  Structure preview:");
  console.log(JSON.stringify(data, null, 2).substring(0, 1000));
}
