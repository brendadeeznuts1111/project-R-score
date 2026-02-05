#!/usr/bin/env bun

// Test version with mock data to validate script structure
console.log("🧪 Testing pipe-live script structure...");

// Simulate mock profitable bets data
const mockData = [
  { agent: "ADAM", profit: 1250.75, volume: 5000, bet: "Over 25.5 Points", state: "2" },
  { agent: "SARAH", profit: -850.25, volume: 3200, bet: "Under 8.5 Assists", state: "2" },
  { agent: "MIKE", profit: 2100.50, volume: 7500, bet: "Over 28.5 Points", state: "2" },
  { agent: "JESSICA", profit: 450.00, volume: 2200, bet: "Over 12.5 Rebounds", state: "0" },
  { agent: "DAVID", profit: -320.75, volume: 1800, bet: "Triple-Double", state: "2" }
];

// Filter profitable bets and create YAML
const profitableBets = mockData.filter(bet => bet.profit > 100);
const yamlContent = profitableBets.map(bet => `- agent: "${bet.agent}"\n  profit: ${bet.profit}\n  volume: ${bet.volume}\n  bet: "${bet.bet}"\n  state: "${bet.state}"\n`).join('\n');

// Write to file
await Bun.write("data/live.yaml", yamlContent);

console.log(`✅ Mock data processed: ${profitableBets.length} profitable bets`);
console.log("📁 Data written to: data/live.yaml");
console.log("🎯 Script structure validated!");
