import { describe, expect, test } from "bun:test";
import {
  deriveAlerts,
  deriveMovers,
  deriveSharp,
  historyFromPoints,
  mapScore,
  mapWager,
  moneyFromCents,
} from "../projects/active/sports-terminal-os/demos/sports-ops/map.ts";

describe("fantasy402 desk mapping", () => {
  test("converts ticker cents into a desk wager", () => {
    expect(moneyFromCents(139000)).toBe(1390);
    const wager = mapWager({
      WagerNumber: 42,
      Login: "GOLF74613",
      AgentLogin: "CMASS",
      AmountWagered: 139000,
      ToWinAmount: 100000,
      InsertDateTime: "2026-10-06 18:53:41",
      TicketWriter: "alert",
      ShortDesc: "S Baseball #936 Padres -139 - For Game",
    });
    expect(wager).toMatchObject({
      id: "42",
      customer: "GOLF74613",
      agent: "CMASS",
      type: "straight",
      source: "alert",
      sport: "BASEBALL",
      risk: 1390,
      win: 1000,
    });
    expect(wager?.ts.startsWith("2026-10-06T18:53:41")).toBe(true);
  });

  test("maps a live score into a board game and a mover", () => {
    const game = mapScore({
      SportType: "NFL",
      Team1ID: "Chiefs",
      Team2ID: "Ravens",
      Team1Score: 24,
      Team2Score: 21,
      PeriodDescription: "Q4",
      Spread: -4.5,
      Final: "N",
    });
    expect(game).toMatchObject({ sport: "NFL", away: "Chiefs", home: "Ravens", as: 24, bs: 21, live: true, spread: -4.5 });
    const moved = deriveMovers(
      [{ ...game!, spread: -3.5, line: "-3.5" }],
      [game!],
    );
    expect(moved[0]).toMatchObject({ dir: "dn", hot: true, ctx: "NFL" });
  });

  test("derives sharp profiles and alerts from the ticker window", () => {
    const wager = mapWager({
      WagerNumber: 7,
      Login: "RIP445",
      AgentLogin: "RIPTIDE",
      AmountWagered: 3500,
      ToWinAmount: 2600,
      InsertDateTime: "2026-10-06T18:55:15Z",
      TicketWriter: "internet",
      ShortDesc: "P Football #399 Tennessee",
    });
    const sharp = deriveSharp([wager!]);
    expect(sharp[0]?.customer).toBe("RIP445");
    expect(sharp[0]?.tickets).toBe(1);
    expect(sharp[0]?.type).toBeUndefined();
    const alerts = deriveAlerts([wager!]);
    expect(alerts[0]?.title).toBe("FOOTBALL");
    expect(alerts[0]?.sev).toBe("info");
    const history = historyFromPoints(
      [
        { game: "NFL · Chiefs @ Ravens", spread: -2.5 },
        { game: "NFL · Chiefs @ Ravens", spread: -4.5 },
      ],
      [mapScore({ SportType: "NFL", Team1ID: "Chiefs", Team2ID: "Ravens", Spread: -4.5, Team1Score: 0, Team2Score: 0 })!],
    );
    expect(history["NFL · Chiefs @ Ravens"]?.open).toBe(-2.5);
    expect(history["NFL · Chiefs @ Ravens"]?.now).toBe(-4.5);
  });
});
