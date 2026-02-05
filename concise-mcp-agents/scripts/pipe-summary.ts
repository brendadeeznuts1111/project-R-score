#!/usr/bin/env bun

// [PIPE][SUMMARY][STREAMS][PIPE-SUMMARY-001][v1.5][ACTIVE]

const cookie = await Bun.secrets.get({ service: "plive", name: "cookie" });
if (!cookie) throw "Run auth-plive first - cookie expired";

console.log("📡 Connecting to plive summary report...");

const response = await fetch('https://plive.sportswidgets.pro/manager-tools/ajax.php?action=getSummaryReport', {
  method: 'POST',
  headers: {
    'cookie': cookie,
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Referer': 'https://plive.sportswidgets.pro/manager-tools/',
    'X-Requested-With': 'XMLHttpRequest'
  },
  body: 'start=0&limit=500',
  timeout: 10000
});

if (!response.ok) {
  console.error(`❌ API Error: ${response.status} ${response.statusText}`);
  const errorText = await response.text();
  console.error("Response:", errorText.substring(0, 200));
  process.exit(1);
}

console.log("✅ Connected to summary report");

// Get the raw JSON response
const rawData = await response.text();
console.log(`📦 Received ${rawData.length} bytes of data`);

// Parse and check structure
let data;
try {
  data = JSON.parse(rawData);
} catch (error) {
  console.error("❌ Failed to parse JSON response:", error.message);
  process.exit(1);
}

// Check response structure and filter
if (data.r && Array.isArray(data.r)) {
  const profitableBets = data.r.filter(item =>
    item.profit && typeof item.profit === 'number' && item.profit > 100
  );

  console.log(`💰 Found ${profitableBets.length} profitable bets (> $100)`);

  // Convert to YAML format
  const yamlContent = profitableBets.map(bet => `- agent: "${bet.agent || 'Unknown'}"
  profit: ${bet.profit || 0}
  volume: ${bet.volume || 0}
  bet: "${bet.bet || 'Unknown'}"
  state: "${bet.state || 'unknown'}"
  ${bet.player ? `player: "${bet.player}"` : ''}
  ${bet.odds ? `odds: "${bet.odds}"` : ''}
  logTime: "${bet.logTime || new Date().toISOString()}"`).join('\n');

  await Bun.write("data/summary.yaml", yamlContent);
  console.log("✅ Summary report piped");
  console.log("📊 Run: tail -f data/summary.yaml");
} else {
  console.log("⚠️ Unexpected response structure");
  console.log("Available keys:", Object.keys(data));
  console.log("Sample response:", JSON.stringify(data).substring(0, 500));
}
