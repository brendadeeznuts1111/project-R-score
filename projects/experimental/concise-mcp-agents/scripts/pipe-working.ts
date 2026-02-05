#!/usr/bin/env bun

// [PIPE][WORKING][STREAMS][PIPE-WORKING-001][v1.8][PRODUCTION]
// Production-hardened with session management, circuit breaker, jitter, and guards

import { smartSessionRefresh } from '../src/etl/fetch-users';

const CIRCUIT_BREAKER_FILE = 'data/circuit-breaker.json';
const YAML_SIZE_LIMIT = 1024 * 1024; // 1MB
const SESSION_REFRESH_FILE = 'data/last-session-refresh.json';

// Circuit breaker state
let circuitBreaker = {
  failures: 0,
  lastFailure: 0,
  open: false,
  cooldownUntil: 0
};

// Session refresh tracking
let lastSessionRefresh = 0;
try {
  if (await Bun.file(SESSION_REFRESH_FILE).exists()) {
    const data = await Bun.file(SESSION_REFRESH_FILE).json();
    lastSessionRefresh = data.timestamp || 0;
  }
} catch (e) {
  // Ignore, use defaults
}

// Load circuit breaker state
try {
  if (await Bun.file(CIRCUIT_BREAKER_FILE).exists()) {
    circuitBreaker = { ...circuitBreaker, ...(await Bun.file(CIRCUIT_BREAKER_FILE).json()) };
  }
} catch (e) {
  // Ignore, use defaults
}

// Check circuit breaker
if (circuitBreaker.open && Date.now() < circuitBreaker.cooldownUntil) {
  console.error("🔌 CIRCUIT BREAKER OPEN - Cooling down until", new Date(circuitBreaker.cooldownUntil).toISOString());
  process.exit(1);
}

console.log("📡 Connecting to plive bets report (syndicate-etl/1.0.0-prod)...");

// Smart session refresh (only if needed and circuit breaker not active)
const freshHeaders = await smartSessionRefresh(lastSessionRefresh, circuitBreaker.open);

if (freshHeaders) {
  lastSessionRefresh = Date.now();
  await Bun.write(SESSION_REFRESH_FILE, JSON.stringify({ timestamp: lastSessionRefresh }, null, 2));
  console.log("🔄 Session refreshed successfully");
} else {
  console.log("✅ Using existing session (still fresh)");
}

// Add jitter to avoid thundering herd (0-5 seconds)
const jitter = Math.random() * 5000;
if (jitter > 100) { // Only log significant jitter
  console.log(`⏱️  Adding ${Math.round(jitter/1000)}s jitter to avoid rate limits`);
}
await new Promise(resolve => setTimeout(resolve, jitter));

// Get the session headers (either fresh or existing)
const cookie = await Bun.secrets.get({ service: "plive", name: "cookie" });
const sessionToken = await Bun.secrets.get({ service: "plive", name: "x-gs-session" }) || '';

const headers: Record<string, string> = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'X-Requested-With': 'XMLHttpRequest',
  'Cookie': cookie,
  'User-Agent': 'syndicate-etl/1.0.0-prod',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Referer': 'https://plive.sportswidgets.pro/manager-tools/'
};

if (sessionToken) {
  headers['x-gs-session'] = sessionToken;
}

const now = Math.floor(Date.now() / 1000);
const from = now - 86400; // 24h ago

// Use getBetReport action (not getSummaryReport) - this is what works
const response = await fetch('https://plive.sportswidgets.pro/manager-tools/ajax.php', {
  method: 'POST',
  headers: headers,
  body: `action=getBetReport&minVolume=0&maxTimeUntilScore=0&from=${from}&to=${now}&toTime=86399&dateFilterBy=calcTime&state=0`,
  timeout: 15000
});

// Handle auth failures specially
if (response.status === 401 || response.status === 403) {
  const errorText = await response.text();
  console.error(`🔐 AUTH FAILURE: ${response.status} ${response.statusText}`);
  console.error("Response:", errorText);

  // Cookie expired - exit with special code for monitoring
  console.error("💡 Cookie likely expired - update with: bun run scripts/secrets-manager.ts set plive cookie 'NEW_COOKIE'");
  process.exit(2); // Special exit code for auth failures
}

if (!response.ok) {
  console.error(`❌ API Error: ${response.status} ${response.statusText}`);
  const errorText = await response.text();
  console.error("Response:", errorText);

  // Circuit breaker logic
  circuitBreaker.failures++;
  circuitBreaker.lastFailure = Date.now();

  if (circuitBreaker.failures >= 5) {
    circuitBreaker.open = true;
    circuitBreaker.cooldownUntil = Date.now() + (5 * 60 * 1000); // 5 minute cooldown
    console.error("🔌 CIRCUIT BREAKER ACTIVATED - Too many failures");
    await Bun.write(CIRCUIT_BREAKER_FILE, JSON.stringify(circuitBreaker, null, 2));
  }

  process.exit(1);
}

// Success - reset circuit breaker
circuitBreaker.failures = 0;
circuitBreaker.open = false;
await Bun.write(CIRCUIT_BREAKER_FILE, JSON.stringify(circuitBreaker, null, 2));

console.log("✅ Connected to summary report");

const rawData = await response.text();
console.log(`📦 Received ${rawData.length} bytes of data`);

let data;
try {
  data = JSON.parse(rawData);
} catch (error) {
  console.error("❌ Failed to parse JSON response:", error.message);
  process.exit(1);
}

// Check for success response with betting data
if (data.success && data.r && Array.isArray(data.r)) {
  const profitableBets = data.r.filter(item => 
    item.profit && typeof item.profit === 'number' && item.profit > 100
  );

  console.log(`💰 Found ${profitableBets.length} profitable bets (> $100)`);

  if (profitableBets.length > 0) {
    // Convert to YAML format
    const yamlContent = profitableBets.map(bet => `- agent: "${bet.agent || 'Unknown'}"
  profit: ${bet.profit || 0}
  volume: ${bet.volume || 0}
  bet: "${bet.bet || 'Unknown'}"
  state: "${bet.state || 'unknown'}"
  ${bet.player ? `player: "${bet.player}"` : ''}
  ${bet.odds ? `odds: "${bet.odds}"` : ''}
  logTime: "${bet.logTime || new Date().toISOString()}"`).join('\n');

    // YAML size guard - rotate if too large
    const yamlSize = new TextEncoder().encode(yamlContent).length;
    let outputPath = "data/summary.yaml";

    if (yamlSize > YAML_SIZE_LIMIT) {
      console.log(`📏 YAML size ${yamlSize} bytes > ${YAML_SIZE_LIMIT} limit, rotating file`);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const rotatedPath = `data/summary-${timestamp}.yaml`;
      outputPath = rotatedPath;

      // Create/update symlink to latest
      try {
        await Bun.spawn(['ln', '-sf', rotatedPath, 'data/summary-latest.yaml']);
        console.log(`🔄 Created symlink: data/summary-latest.yaml -> ${rotatedPath}`);
      } catch (e) {
        console.warn("⚠️ Could not create symlink (normal on some systems)");
      }
    }

    await Bun.write(outputPath, yamlContent);
    console.log(`✅ Live betting data piped to ${outputPath} (${yamlSize} bytes)`);
    console.log("📊 Run: wc -l", outputPath, "&& tail -1", outputPath);
  } else {
    console.log("⚠️ No profitable bets found in the data");
    // Save raw data for inspection
    await Bun.write("data/summary-raw.json", rawData);
    console.log("💾 Raw data saved to data/summary-raw.json for inspection");
  }
} else if (data.e !== undefined) {
  console.error(`❌ API Error: ${data.d || 'Unknown error'}`);
  console.log("Full response:", JSON.stringify(data, null, 2));
  process.exit(1);
} else {
  console.log("⚠️ Unexpected response structure");
  console.log("Available keys:", Object.keys(data));
  console.log("Sample response:", JSON.stringify(data).substring(0, 500));
  
  // Save for inspection
  await Bun.write("data/summary-unexpected.json", rawData);
}
