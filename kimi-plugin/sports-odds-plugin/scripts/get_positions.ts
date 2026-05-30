#!/usr/bin/env bun
import { init, runMain, f402Fetch, makeTable, respond, riskEmoji, formatMoney, formatPNL } from "./lib/f402";

const { config, params } = await init<{ view?: string; sport?: string }>();

runMain(async () => {
  const { view = "summary", sport } = params;

  const data = await f402Fetch<{ positions: any[]; total_at_risk?: number; book_pnl?: number }>(
    config, "/positions", { view, sport },
  );
  const positions = data.positions ?? [];

  const rows = positions.map((p: any) =>
    `| ${riskEmoji(p.exposure ?? 0)} | ${p.game} | ${p.side} | ${formatMoney(p.exposure)} | ${p.tickets ?? 0} | ${formatPNL(p.pnl)} | ${p.sharp_flag ? "⚡" : ""} | ${p.limit_breach ? "🚨" : ""} |`
  );

  respond({
    content: `## Risk Positions (${view})\n\n${makeTable(
      ["Risk", "Game", "Side", "Exposure", "Tickets", "P&L", "Sharp", "Limit"],
      rows,
    ) || "No active positions."}\n\n**Total at risk:** ${formatMoney(data.total_at_risk)} | **Book P&L:** ${formatPNL(data.book_pnl)}`,
    metadata: {
      total_at_risk: data.total_at_risk,
      book_pnl: data.book_pnl,
      position_count: positions.length,
      sharp_flags: positions.filter((p: any) => p.sharp_flag).length,
      limit_breaches: positions.filter((p: any) => p.limit_breach).length,
    },
  });
});
