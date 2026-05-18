#!/usr/bin/env bun

// Check the betLobbyV2 endpoint for betting data

const cookie = await Bun.secrets.get({ service: "plive", name: "cookie" });

if (!cookie) {
  console.error("❌ No stored cookie found");
  process.exit(1);
}

console.info("🔍 Fetching from betLobbyV2 endpoint...");

const response = await fetch('https://plive.sportswidgets.pro/betLobbyV2/logic/', {
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

const data = await response.text();
console.info(`📦 Response: ${data.length} bytes`);
console.info("📄 Content:", data);

if (data.includes('profit') || data.includes('agent') || data.includes('bet')) {
  console.info("🎯 Contains betting-related data!");
} else {
  console.info("📋 Metadata/configuration data");
}
