#!/usr/bin/env bun
/**
 * MCP Listen‑Topic — live WebSocket audit stream
 *
 * Connects to the odds‑drift WebSocket server, subscribes to a
 * pubsub topic, and streams incoming messages to stdout with
 * ANSI‑formatted metadata (timestamp, type, payload preview).
 *
 * Usage:
 *   bun run mcp --tool=listen-topic --topic=odds-hygiene
 *   bun run mcp --tool=listen-topic --topic=odds-hygiene --url=ws://localhost:3001/ws/odds-drift
 *   bun run mcp --tool=listen-topic --topic=odds-hygiene --raw     (JSON only, no ANSI)
 *   bun run mcp --tool=listen-topic --topic=odds-hygiene --timeout=30  (auto‑exit after N seconds)
 */

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const flags: Record<string, string> = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith("--")) {
    const eq = arg.indexOf("=");
    if (eq > 0) {
      flags[arg.slice(2, eq)] = arg.slice(eq + 1);
    } else {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    }
  }
}

const TOPIC = flags.topic ?? flags.t ?? "odds-hygiene";
const WS_URL = flags.url ?? flags.u ?? "ws://localhost:3001/ws/odds-drift";
const RAW = flags.raw !== undefined;
const TIMEOUT_SEC = parseInt(flags.timeout ?? flags.T ?? "0", 10);

// ---------------------------------------------------------------------------
// ANSI helpers
// ---------------------------------------------------------------------------

const dim = (s: string) => (RAW ? s : `\x1b[2m${s}\x1b[0m`);
const bold = (s: string) => (RAW ? s : `\x1b[1m${s}\x1b[0m`);
const cyan = (s: string) => (RAW ? s : `\x1b[36m${s}\x1b[0m`);
const green = (s: string) => (RAW ? s : `\x1b[32m${s}\x1b[0m`);
const yellow = (s: string) => (RAW ? s : `\x1b[33m${s}\x1b[0m`);
const red = (s: string) => (RAW ? s : `\x1b[31m${s}\x1b[0m`);
const gray = (s: string) => (RAW ? s : `\x1b[90m${s}\x1b[0m`);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

let msgCount = 0;
let byteCount = 0;
const startTime = Date.now();

console.log("");
console.log(bold("MCP Listen‑Topic"));
console.log(gray(`  URL:   ${WS_URL}`));
console.log(gray(`  Topic: ${TOPIC}`));
console.log(gray(`  Mode:  ${RAW ? "raw JSON" : "ANSI formatted"}`));
if (TIMEOUT_SEC > 0) console.log(gray(`  Timeout: ${TIMEOUT_SEC}s`));
console.log("");

// Auto-exit timer
let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
if (TIMEOUT_SEC > 0) {
  timeoutHandle = setTimeout(() => {
    console.log("");
    console.log(gray(`⏱  Timeout after ${TIMEOUT_SEC}s — ${msgCount} messages, ${byteCount} bytes`));
    process.exit(0);
  }, TIMEOUT_SEC * 1000);
}

// Connect
const ws = new WebSocket(WS_URL);

ws.onopen = () => {
  console.log(green("✔ Connected") + gray(` to ${WS_URL}`));

  // Subscribe to the topic
  ws.send(JSON.stringify({ type: "subscribe:odds_drift", data: { version: "odds-drift-v2.1.0" } }));
  console.log(gray(`→ subscribe:odds_drift`));
};

ws.onmessage = (event) => {
  msgCount++;
  const raw = event.data as string;
  byteCount += raw.length;

  if (RAW) {
    console.log(raw);
  } else {
    try {
      const msg = JSON.parse(raw);
      const ts = new Date(msg.timestamp ?? Date.now()).toISOString().slice(11, 23);
      const type = msg.type ?? "unknown";
      const payload = msg.payload ?? msg.data ?? {};

      // Color the type
      const typeColor =
        type === "data" ? cyan(type) :
        type === "handshake" ? green(type) :
        type === "error" ? red(type) :
        yellow(type);

      // Build a compact preview
      let preview = "";
      if (payload.oddsCount !== undefined) {
        preview = gray(` | odds:${payload.oddsCount}`);
      }
      if (payload.metrics) {
        preview += gray(` | scrn:${payload.metrics.screenshots ?? "?"}`);
      }
      if (payload.site) {
        preview += gray(` | site:${payload.site}`);
      }
      if (payload.placeholder) {
        preview += gray(` | ph:${String(payload.placeholder).length}B`);
      }

      console.log(`${dim(ts)} ${typeColor} ${gray(`#${msgCount}`)}${preview}`);
    } catch {
      console.log(`${dim("--:--:--.---")} ${yellow("raw")} ${gray(`#${msgCount}`)} ${gray(`[${raw.length}B]`)}`);
    }
  }
};

ws.onclose = (event) => {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("");
  console.log(
    `${red("✘ Disconnected")} ${gray(`code=${event.code} | ${msgCount} msgs | ${byteCount}B | ${elapsed}s`)}`
  );
  if (timeoutHandle) clearTimeout(timeoutHandle);
  process.exit(event.code === 1000 ? 0 : 1);
};

ws.onerror = () => {
  // onclose will fire after this
};
