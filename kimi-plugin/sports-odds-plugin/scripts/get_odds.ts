#!/usr/bin/env bun
import { init, runMain, f402Fetch, makeTable, respond } from "./lib/f402";

const { config, params } = await init<{ sport: string; league?: string; game_id?: string; market?: string }>();

runMain(async () => {
  const { sport, league, game_id, market = "all" } = params;

  const data = await f402Fetch<{ games: any[] }>(config, "/odds", {
    sport, league, game_id,
    market: market === "all" ? undefined : market,
  });
  const games = data.games ?? [];

  const rows = games.map((g: any) =>
    `| ${g.away_team} @ ${g.home_team} | ${g.markets?.moneyline?.away ?? "N/A"} | ${g.markets?.moneyline?.home ?? "N/A"} | ${g.markets?.spread?.line ?? "N/A"} | ${g.markets?.totals?.line ?? "N/A"} | ${g.status ?? ""} |`
  );

  respond({
    content: `## ${sport} Odds\n\n${makeTable(
      ["Matchup", "Away ML", "Home ML", "Spread", "Total", "Status"],
      rows,
    ) || "No odds data available."}\n\n*Source: Fantasy402 | ${games.length} games*`,
    metadata: { count: games.length, sport, market },
  });
});
