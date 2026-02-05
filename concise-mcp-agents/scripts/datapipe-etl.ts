#!/usr/bin/env bun

// [PIPE][DATAPIPE][ETL][PIPE-002][v1.3][ACTIVE]

// [DATAPIPE][CORE][DA-CO-CC4][v1.3.0][ACTIVE]

// ETL pipeline specifically for datapipe API
// Usage: fetch https://api... | jq '.bets[] | {agent,profit}' | bun datapipe:append

import { fetchData, parseBets } from "./datapipe.ts";

async function datapipeETL() {
  try {
    console.log("🔄 Running datapipe ETL pipeline...");

    // Fetch data
    const rawData = await fetchData();
    const bets = parseBets(rawData.data || []);

    // Transform to JSON Lines format
    const jsonLines = bets.map(bet => JSON.stringify({
      agent: bet.agent,
      profit: parseFloat(bet.result || '0'),
      volume: parseFloat(bet.bet || '0'),
      player: bet.player,
      odds: bet.odds,
      isWin: bet.isWin === '1',
      timestamp: new Date().toISOString()
    })).join('\n') + '\n';

    // Pipe to stdout (can be piped to jq or other tools)
    console.log(jsonLines);

    console.log(`📊 Exported ${bets.length} bets to stdout`);

  } catch (error) {
    console.error(`❌ Datapipe ETL failed: ${error.message}`);
    process.exit(1);
  }
}

// CLI usage
if (import.meta.main) {
  datapipeETL();
}
