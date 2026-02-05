#!/usr/bin/env bun

// Parse the successful bet report data
const ck = await Bun.secrets.get({ service: "plive", name: "cookie" });

if (!ck) {
  console.error("❌ No cookie set");
  process.exit(1);
}

console.log("📊 Parsing bet report data...");

const now = Math.floor(Date.now() / 1000);
const from = now - 86400; // 24h ago

const res = await fetch("https://plive.sportswidgets.pro/manager-tools/ajax.php", {
  method: "POST",
  headers: {
    "cookie": ck,
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Requested-With": "XMLHttpRequest",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  },
  body: `action=getBetReport&state=0&minVolume=0&maxTimeUntilScore=0&from=${from}&to=${now}&toTime=86399&dateFilterBy=calcTime`
});

if (!res.ok) {
  console.error(`❌ Failed: ${res.status}`);
  process.exit(1);
}

const data = await res.json();

// Extract bets from response
const bets = data.r?.bets || [];
console.log(`📊 Total bets: ${bets.length}`);

// Filter for pending bets (state=0) - live/pending
const pendingBets = bets.filter(bet => bet.state === "0");
console.log(`⏳ Pending bets: ${pendingBets.length}`);

// Filter profitable bets (> $100)
const profitableBets = bets.filter(bet => {
  const profit = parseFloat(bet.profit) || 0;
  return profit > 100;
});
console.log(`💰 Profitable bets: ${profitableBets.length}`);

// Show sample of each type
if (pendingBets.length > 0) {
  console.log("\n🎯 SAMPLE PENDING BET:");
  console.log(JSON.stringify(pendingBets[0], null, 2));
}

if (profitableBets.length > 0) {
  console.log("\n💰 SAMPLE PROFITABLE BET:");
  console.log(JSON.stringify(profitableBets[0], null, 2));
}

// Save raw data for analysis
await Bun.write("data/bet-report-raw.json", JSON.stringify(data, null, 2));
console.log("💾 Saved raw data to data/bet-report-raw.json");
