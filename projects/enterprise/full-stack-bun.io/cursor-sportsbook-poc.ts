#!/usr/bin/env bun
// cursor-sportsbook-poc.ts  (Bun ≥ 1.2)
// Demo only – keeps everything in one file for easy hacking.

import { serve } from "bun";
// import { WorkflowHandle, TemporalWorker } from "bun:temporal"; // not available in current Bun
// import { sign } from "bun:crypto";
// import { createHash } from "bun";

/* ---------- 1.  DOMAIN MODELS --------------------------------------- */
type Outcome = { id: string; name: string; odds: number }; // decimal
type Market = { id: string; name: string; outcomes: Outcome[]; suspended: boolean };
type Event = { id: string; home: string; away: string; markets: Market[]; status: "pre" | "live" | "settled" };
type Bet = { id: string; user: string; outcome: string; stake: number; odds: number; ts: number };

const book = new Map<string, Event>();
const bets = new Map<string, Bet[]>();

/* ---------- 2.  AGENT LOGIC  (SRL stanzas as pure functions) -------- */
const oddsSetter = {
  // WHEN: Event.status == "pre" AND news.impact THEN adjust
  adjustPreMatch(e: Event, newsImpact: number) {
    for (const m of e.markets)
      for (const o of m.outcomes) o.odds = Math.max(1.01, o.odds + newsImpact);
  },
};

const riskManager = {
  // WHEN: liability > max THEN suggest suspend
  maxLiability: 10_000,
  check(eventId: string, marketId: string): boolean {
    const liability = (bets.get(eventId) || [])
      .filter(b => b.outcome === marketId)
      .reduce((sum, b) => sum + b.stake * b.odds, 0);
    return liability > this.maxLiability;
  },
};

/* ---------- 3.  WORKFLOW  (suspend if risky) --------------- */
async function suspendWorkflow(eventId: string, marketId: string): Promise<void> {
  const ev = book.get(eventId);
  if (!ev) return;
  const m = ev.markets.find(m => m.id === marketId);
  if (m) m.suspended = true;
  console.log(`[WORKFLOW] suspended ${marketId} on ${eventId}`);
}

/* ---------- 4.  MINI IPFS STUB  (signed audit log) ------------------ */
function audit(payload: object) {
  const buf = Buffer.from(JSON.stringify(payload));
  const hash = Bun.password.hash(buf); // Use Bun's password hashing for simplicity
  // For now, skip complex signing - just use a simple signature
  const sig = `sig-${Date.now()}`;
  return { hash, sig, payload };
}

/* ---------- 5.  SLASH-COMMAND SERVER  (over WebSocket) -------------- */
const clients = new Set<WebSocket>();

serve({
  port: 3000,
  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response("Send commands via ws://localhost:3000");
  },
  websocket: {
    open(ws) { clients.add(ws); },
    close(ws) { clients.delete(ws); },
    async message(ws, msg) {
      const line = msg.toString().trim();
      if (!line.startsWith("/")) return ws.send("ERR: use /cmd");

      const [cmd, ...rest] = line.slice(1).split(" ");
      const reply = (s: string) => ws.send(s);

      switch (cmd) {
        case "event": {
          const [home, away] = rest;
          const ev: Event = {
            id: crypto.randomUUID(),
            home, away, status: "pre",
            markets: [
              { id: "win", name: "Match Winner", suspended: false,
                outcomes: [
                  { id: "H", name: home, odds: 2.5 },
                  { id: "D", name: "Draw", odds: 3.2 },
                  { id: "A", name: away, odds: 2.7 },
                ]},
            ],
          };
          book.set(ev.id, ev);
          reply(`OK event ${ev.id} ${home} vs ${away}`);
          break;
        }
        case "bet": {
          const [eventId, outcome, stake] = rest;
          const ev = book.get(eventId);
          if (!ev) return reply("ERR no event");
          const o = ev.markets.flatMap(m => m.outcomes).find(x => x.id === outcome);
          if (!o) return reply("ERR bad outcome");
          const bet: Bet = { id: crypto.randomUUID(), user: "demo", outcome, stake: +stake, odds: o.odds, ts: Date.now() };
          bets.set(eventId, [...(bets.get(eventId) || []), bet]);
          const entry = audit({ type: "bet", bet });
          console.log("[AUDIT]", entry);
          reply(`OK bet ${bet.id}`);

          // risk check → workflow
          if (riskManager.check(eventId, outcome)) {
            await suspendWorkflow(eventId, outcome);
            reply("WARN market suspended (liability)");
          }
          break;
        }
        case "market": {
          if (rest[0] === "suspend") {
            const [eventId, marketId] = rest.slice(1);
            const ev = book.get(eventId);
            if (!ev) return reply("ERR no event");
            const m = ev.markets.find(m => m.id === marketId);
            if (m) m.suspended = true;
            reply(`OK ${marketId} suspended`);
          }
          break;
        }
        default:
          reply("ERR unknown cmd");
      }
    },
  },
});

/* ---------- 6.  FAKE LIVE-DATA LOOP  (move odds every 2 s) ---------- */
setInterval(() => {
  for (const ev of book.values()) {
    for (const m of ev.markets) {
      if (m.suspended) continue;
      for (const o of m.outcomes) o.odds = +(o.odds + (Math.random() - 0.5) * 0.1).toFixed(2);
    }
  }
  const payload = JSON.stringify([...book.values()]);
  for (const ws of clients) ws.send(`ODDS ${payload}`);
}, 2000);

console.log("🏦 Cursor-Sportsbook PoC on ws://localhost:3000");
console.log("Try:  /event Arsenal Chelsea");
console.log("      /bet <eventId> H 100");
console.log("      /market suspend <eventId> win");
