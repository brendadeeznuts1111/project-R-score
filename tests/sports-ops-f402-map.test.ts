import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { dedupeWagers, loadUnified } from "../projects/active/sports-terminal-os/demos/sports-ops/desk-read.ts";
import {
  baseRotation,
  deriveAlerts,
  deriveMovers,
  deriveSharp,
  historyFromPoints,
  leagueFor,
  mapScore,
  mapWager,
  moneyFromCents,
  rollupLeagues,
  ticketOf,
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
    expect(alerts[0]?.title).toBe("NCAAF");
    expect(alerts[0]?.msg.startsWith("parlay r35")).toBe(true);
    expect(ticketOf(wager!).league).toBe("NCAAF");
    expect(leagueFor("FOOTBALL", 463, "S.Football #463 Giants")).toBe("NFL");
    expect(leagueFor("HOCKEY", 16, "M.Hockey #16 Rangers")).toBe("NHL");
    expect(leagueFor("BASEBALL", 936, "M.Baseball #936 Braves")).toBe("MLB");
    expect(leagueFor("BASEBALL", 304669, "P.Baseball #304669 Hanwha")).toBe("KBO");
    expect(ticketOf({ id: "1", ts: "", customer: "", agent: "", type: "straight", source: "internet", sport: "OTHER", risk: 10, win: 8, legs: [{ desc: "P.Martial Arts #24170 N Ariano -640 - For Game" }] }).league).toBe("UFC");
    expect(baseRotation("FOOTBALL", 1130101)).toBe(301);
    expect(leagueFor("FOOTBALL", 1130101, "S.Football #1130101 Southern Miss")).toBe("NCAAF");
    const board = rollupLeagues([wager!], []);
    expect(board[0]?.league).toBe("NCAAF");
    expect(board[0]?.tickets).toBe(1);
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

  test("sqlite rollup joins fantasy402 tickets with 4codds status", () => {
    const db = new Database(":memory:");
    db.run("CREATE TABLE wagers (wager_number TEXT PRIMARY KEY, payload TEXT NOT NULL, seen_at TEXT NOT NULL)");
    db.run("CREATE TABLE fourc_status (id INTEGER PRIMARY KEY AUTOINCREMENT, seen_at TEXT NOT NULL, status TEXT NOT NULL, title TEXT NOT NULL)");
    db.run("CREATE TABLE link_log (id INTEGER PRIMARY KEY AUTOINCREMENT, t TEXT NOT NULL, src TEXT NOT NULL, detail TEXT NOT NULL)");
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
    db.run("INSERT INTO wagers (wager_number, payload, seen_at) VALUES (?, ?, ?)", ["42", JSON.stringify(wager), "2026-10-06T18:53:41Z"]);
    db.run("INSERT INTO fourc_status (seen_at, status, title) VALUES (?, ?, ?)", ["2026-10-06T18:53:41Z", "blocked", "cloudflare"]);
    const desk = loadUnified(db, {
      source: "live",
      games: [{ sport: "Baseball", away: "Los Angeles Dodgers", as: 1, bs: 0, home: "Atlanta Braves", status: "Game", line: "-1.5", live: true, spread: -1.5 }],
      links: { f402: "live", fourc: "blocked" },
    });
    db.close();
    expect(desk.socket).toBe(false);
    expect(desk.books).toBe("F402 1 · 4C BLOCKED");
    expect(desk.games[0]?.league).toBe("MLB");
    expect(desk.leagues.find((row) => row.league === "MLB")).toMatchObject({ tickets: 1, games: 1 });
    expect(desk.betfeed[0]?.league).toBe("MLB");
    expect(desk.betfeed[0]?.selection).toContain("Padres");
    expect(desk.sources.map((row) => row.id)).toEqual(["f402", "4c", "sqlite"]);
    expect(desk.links).toEqual({ f402: "live", fourc: "blocked" });
    const twin = { ...wager!, id: "43", legs: [{ desc: "S:Baseball #936 Padres -139 - For Game" }] };
    expect(dedupeWagers([wager!, twin]).length).toBe(1);
  });
});
