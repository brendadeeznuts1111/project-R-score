#!/usr/bin/env bun
import { loadConfig, readParams, f402Fetch, makeTable, SPORT_POSSESSION_EMOJI } from "./lib/f402";

const config = await loadConfig();
const params = await readParams<{ sport: string; status?: string; date?: string }>();

async function main() {
  const { sport, status = "live", date } = params;
  const emoji = SPORT_POSSESSION_EMOJI[sport] ?? "";

  const data = await f402Fetch<{ games: any[] }>(config, "/scores", { sport, status, date });
  const games = data.games ?? [];

  const rows = games.map((g: any) => {
    const scoreLine = `${g.away_score ?? 0} - ${g.home_score ?? 0}`;
    const clock = g.clock || g.status || "";
    const possession = g.possession ? `${emoji} ${g.possession}` : "";
    const period = g.period ? `Q${g.period}` : g.inning ? `${g.inning}` : "";
    return `| ${g.away_team} @ ${g.home_team} | ${scoreLine} | ${period} | ${clock} | ${possession} | ${g.status ?? ""} |`;
  });

  console.log(JSON.stringify({
    content: `## ${sport} Scores (${status})\n\n${makeTable(
      ["Matchup", "Score", "Period", "Clock", "Possession", "Status"],
      rows,
    ) || `No ${status} games found for ${sport}.`}\n\n*${games.length} games | ${date || "today"}*`,
    metadata: { count: games.length, sport, status, date },
  }));
}

main().catch(err => {
  console.log(JSON.stringify({ error: true, message: err.message }));
  process.exit(1);
});
