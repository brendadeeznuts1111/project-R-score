#!/usr/bin/env bun
import { init, runMain, f402Fetch, makeTable, respond, formatMoney } from "./lib/f402";

const { config, params } = await init<{ sport?: string; game_id?: string; period?: string }>();

runMain(async () => {
  const { sport, game_id, period = "today" } = params;

  const data = await f402Fetch<{ games: any[] }>(config, "/handle", { sport, game_id, period });
  const games = data.games ?? [];

  const rows = games.map((g: any) => {
    const total = g.handle?.total ?? 0;
    const tickets = g.handle?.tickets ?? 0;
    const split = g.handle?.split ?? { home: 50, away: 50 };
    const bar = `Home ${split.home}% |${"█".repeat(Math.round(split.home / 5))}${"░".repeat(20 - Math.round(split.home / 5))}| ${split.away}% Away`;
    return `| ${g.away_team} @ ${g.home_team} | ${formatMoney(total)} | ${tickets} | ${bar} |`;
  });

  const totalHandle = games.reduce((sum: number, g: any) => sum + (g.handle?.total ?? 0), 0);
  const totalTickets = games.reduce((sum: number, g: any) => sum + (g.handle?.tickets ?? 0), 0);

  const table = makeTable(["Matchup", "Handle", "Tickets", "Money Split"], rows);

  respond({
    content: `## Betting Handle (${period})\n\n${table || "No handle data available."}${table ? `\n\n**Total:** ${formatMoney(totalHandle)} | ${totalTickets.toLocaleString()} tickets` : ""}`,
    metadata: { total_handle: totalHandle, total_tickets: totalTickets, game_count: games.length, period },
  });
});
