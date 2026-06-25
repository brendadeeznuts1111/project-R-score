#!/usr/bin/env bun
import { loadConfig, readParams, f402Fetch, makeTable } from "./lib/f402";

const config = await loadConfig();
const params = await readParams<{ sport: string; league?: string; game_id?: string; market?: string }>();

async function main() {
  const { sport, league, game_id, market = "all" } = params;

  const data = await f402Fetch<{ games: any[] }>(config, "/odds", {
    sport, league, game_id,
    market: market === "all" ? undefined : market,
  });
  const games = data.games ?? [];

  const rows = games.map((g: any) =>
    `| ${g.away_team} @ ${g.home_team} | ${g.markets?.moneyline?.away ?? "N/A"} | ${g.markets?.moneyline?.home ?? "N/A"} | ${g.markets?.spread?.line ?? "N/A"} | ${g.markets?.totals?.line ?? "N/A"} | ${g.status ?? ""} |`
  );

  console.log(JSON.stringify({
    content: `## ${sport} Odds\n\n${makeTable(
      ["Matchup", "Away ML", "Home ML", "Spread", "Total", "Status"],
      rows,
    ) || "No odds data available."}\n\n*Source: Fantasy402 | ${games.length} games*`,
    metadata: { count: games.length, sport, market },
  }));
}

main().catch(err => {
  console.log(JSON.stringify({ error: true, message: err.message }));
  process.exit(1);
});
