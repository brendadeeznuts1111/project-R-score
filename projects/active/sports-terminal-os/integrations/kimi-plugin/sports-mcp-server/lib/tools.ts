import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { CallToolRequest, Tool } from "@modelcontextprotocol/sdk/types.js";
import { riskColor } from "../../shared/constants";
import {
  connect,
  disconnect,
  hasConnection,
  setConnection,
  getConnections,
} from "./ws-pool";

const F402_API_KEY = Bun.env.F402_API_KEY ?? "";
const F402_ENDPOINT = Bun.env.F402_ENDPOINT ?? "https://fantasy402.com/api/v1";
const WS_ENDPOINT = Bun.env.F402_WS ?? "wss://fantasy402.com/ws";

// ── Topic builder ───────────────────────────────────────────────────────────

function topic(prefix: string, sport: string, ...extra: string[]): string {
  const tail = extra.filter(Boolean).join(":");
  return `${prefix}:${sport}${tail ? `:${tail}` : ""}`;
}

// ── Shared subscribe helper ─────────────────────────────────────────────────

/** Loose WS payload shape shared across sports feed topics. */
interface WsFeedMessage {
  game?: string;
  market?: string;
  old_line?: string;
  new_line?: string;
  opening_line?: string;
  current_line?: string;
  timestamp?: string;
  ewma_lag?: number;
  exposure_gate?: boolean;
  flow_particles?: number;
  exposure?: number;
  side?: string;
  tickets?: number;
  sharp_flag?: boolean;
  limit_breach?: boolean;
  away_score?: number;
  home_score?: number;
  period?: string;
  clock?: string;
  possession?: string;
  status?: string;
  last_play?: string;
  steam_move?: boolean;
  key_number_crossed?: string;
}

interface SubscribeArgs {
  topic: string;
  wsUrl: string;
  onMessage: (data: WsFeedMessage) => void;
  alreadyText: string;
  successText: string;
}

interface SubscribeOddsArgs {
  sport: string;
  game_id?: string;
  markets?: Array<"moneyline" | "spread" | "totals">;
}

interface SubscribePositionsArgs {
  threshold?: number;
  sports?: string[];
}

interface SubscribeScoresArgs {
  sport: string;
  games?: string[];
}

interface SubscribeLineHistoryArgs {
  sport: string;
  game_id?: string;
  since?: string;
}

interface CascadeSnapshotArgs {
  zone?: string;
}

interface UnsubscribeArgs {
  topic: string;
}

function readToolArgs<T extends object>(
  raw: CallToolRequest["params"]["arguments"],
): T {
  return (raw ?? {}) as T;
}

function subscribe(server: Server, args: SubscribeArgs) {
  if (hasConnection(args.topic)) {
    return { content: [{ type: "text" as const, text: args.alreadyText }] };
  }
  const conn = connect(
    args.topic,
    args.wsUrl,
    args.onMessage,
    (level, data) => {
      server.notification({
        method: "notifications/message",
        params: { level, data },
      });
    },
  );
  setConnection(args.topic, conn);
  return { content: [{ type: "text" as const, text: args.successText }] };
}

// ── Tool definitions ────────────────────────────────────────────────────────

export const TOOLS: Tool[] = [
  {
    name: "subscribe_odds",
    description: "Subscribe to real-time odds updates via WebSocket. Pushes line moves, steam moves, and market updates with cascade metadata.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { type: "string", description: "Sport code (NFL, NBA, etc.)" },
        game_id: { type: "string", description: "Optional specific game" },
        markets: {
          type: "array",
          items: { type: "string", enum: ["moneyline", "spread", "totals"] },
          description: "Markets to watch",
        },
      },
      required: ["sport"],
    },
  },
  {
    name: "subscribe_positions",
    description: "Subscribe to real-time position updates. Pushes exposure changes, limit breaches, and sharp action alerts.",
    inputSchema: {
      type: "object",
      properties: {
        threshold: { type: "number", description: "Exposure threshold to alert on (default $50k)" },
        sports: { type: "array", items: { type: "string" }, description: "Sports to monitor" },
      },
      required: [],
    },
  },
  {
    name: "subscribe_scores",
    description: "Subscribe to real-time score updates. Pushes score changes, period advances, and clock ticks.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { type: "string", description: "Sport to monitor" },
        games: { type: "array", items: { type: "string" }, description: "Specific game IDs" },
      },
      required: ["sport"],
    },
  },
  {
    name: "subscribe_line_history",
    description: "Track opening-to-current line movement for a game or sport. Pushes line history, steam moves, and key number crossings.",
    inputSchema: {
      type: "object",
      properties: {
        sport: { type: "string", description: "Sport code" },
        game_id: { type: "string", description: "Optional specific game" },
        since: { type: "string", description: "ISO timestamp for line history start (default: open)" },
      },
      required: ["sport"],
    },
  },
  {
    name: "get_cascade_snapshot",
    description: "Fetch current cascade mover state: EWMA lag, exposure gate, flow particles, and pause banner.",
    inputSchema: {
      type: "object",
      properties: {
        zone: { type: "string", description: "Zone ID (e.g., Z9)" },
      },
      required: [],
    },
  },
  {
    name: "status",
    description: "List all active WebSocket subscriptions with connection state and retry count.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "unsubscribe",
    description: "Unsubscribe from a real-time feed and clean up resources.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Topic to unsubscribe from" },
      },
      required: ["topic"],
    },
  },
];

// ── Request handler factory ─────────────────────────────────────────────────

export function createHandler(server: Server) {
  return async (request: { params: CallToolRequest["params"] }) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "subscribe_odds": {
        const { sport, game_id, markets = ["moneyline", "spread", "totals"] } =
          readToolArgs<SubscribeOddsArgs>(args);
        const t = topic("odds", sport, game_id ?? "");

        return subscribe(server, {
          topic: t,
          wsUrl: `${WS_ENDPOINT}?topic=${t}&markets=${markets.join(",")}&api_key=${F402_API_KEY}`,
          onMessage: (update) => {
            server.notification({
              method: "notifications/message",
              params: {
                level: "info",
                data: {
                  type: "odds_update", topic: t,
                  game: update.game, market: update.market,
                  old_line: update.old_line, new_line: update.new_line,
                  timestamp: update.timestamp,
                  cascade: {
                    ewma_lag: update.ewma_lag,
                    exposure_gate: update.exposure_gate,
                    flow_particles: update.flow_particles,
                  },
                },
              },
            });
          },
          alreadyText: `Already subscribed to ${t}. Use /unsubscribe to restart.`,
          successText: `Subscribed to ${t}\nMarkets: ${markets.join(", ")}\nWaiting for line moves...`,
        });
      }

      case "subscribe_positions": {
        const { threshold = 50000, sports = [] } = readToolArgs<SubscribePositionsArgs>(args);
        const t = topic("positions", sports.length ? sports.join(",") : "all");

        return subscribe(server, {
          topic: t,
          wsUrl: `${WS_ENDPOINT}?topic=positions&threshold=${threshold}&sports=${sports.join(",")}&api_key=${F402_API_KEY}`,
          onMessage: (alert) => {
            const severity =
              alert.exposure > threshold * 2 ? "critical" :
              alert.exposure > threshold ? "warning" : "info";

            server.notification({
              method: "notifications/message",
              params: {
                level: severity,
                data: {
                  type: "position_alert", topic: t,
                  game: alert.game, side: alert.side,
                  exposure: alert.exposure, tickets: alert.tickets,
                  sharp_flag: alert.sharp_flag, limit_breach: alert.limit_breach,
                  risk_color: riskColor(alert.exposure ?? 0),
                },
              },
            });
          },
          alreadyText: `Already monitoring ${t}. Current threshold: $${threshold.toLocaleString()}`,
          successText: `Position monitor active\nThreshold: $${threshold.toLocaleString()}\nSports: ${sports.length ? sports.join(", ") : "all"}`,
        });
      }

      case "subscribe_scores": {
        const { sport, games = [] } = readToolArgs<SubscribeScoresArgs>(args);
        const t = topic("scores", sport, games.join(","));

        return subscribe(server, {
          topic: t,
          wsUrl: `${WS_ENDPOINT}?topic=${t}&api_key=${F402_API_KEY}`,
          onMessage: (update) => {
            server.notification({
              method: "notifications/message",
              params: {
                level: "info",
                data: {
                  type: "score_update", topic: t,
                  game: update.game,
                  away_score: update.away_score, home_score: update.home_score,
                  period: update.period, clock: update.clock,
                  possession: update.possession, status: update.status,
                  last_play: update.last_play,
                },
              },
            });
          },
          alreadyText: `Already subscribed to ${t}. Use /unsubscribe to restart.`,
          successText: `Score feed active: ${t}\nTracking ${games.length || "all"} games...`,
        });
      }

      case "subscribe_line_history": {
        const { sport, game_id, since } = readToolArgs<SubscribeLineHistoryArgs>(args);
        const t = topic("line_history", sport, game_id ?? "");
        const sinceParam = since ?? new Date().toISOString();

        return subscribe(server, {
          topic: t,
          wsUrl: `${WS_ENDPOINT}?topic=${t}&since=${encodeURIComponent(sinceParam)}&api_key=${F402_API_KEY}`,
          onMessage: (update) => {
            const direction =
              update.opening_line === update.current_line ? "↔" :
              parseFloat(update.current_line) > parseFloat(update.opening_line) ? "▲" : "▼";
            const move = Math.abs(
              (parseFloat(update.current_line) || 0) - (parseFloat(update.opening_line) || 0),
            ).toFixed(1);

            server.notification({
              method: "notifications/message",
              params: {
                level: update.steam_move ? "warning" : "info",
                data: {
                  type: "line_history_update", topic: t,
                  game: update.game, market: update.market,
                  opening_line: update.opening_line, current_line: update.current_line,
                  direction, move: `${move} pts`,
                  steam_move: update.steam_move ?? false,
                  key_number_crossed: update.key_number_crossed
                    ? `⛔ Crossed ${update.key_number_crossed}` : "",
                  timestamp: update.timestamp,
                },
              },
            });
          },
          alreadyText: `Already tracking line history for ${t}. Use /unsubscribe to restart.`,
          successText: `Line history active: ${t}\nTracking opening → current line moves${since ? ` from ${since}` : ""}`,
        });
      }

      case "get_cascade_snapshot": {
        const { zone = "Z9" } = readToolArgs<CascadeSnapshotArgs>(args);

        try {
          const res = await fetch(`${F402_ENDPOINT}/cascade/snapshot?zone=${zone}`, {
            headers: { "Authorization": `Bearer ${F402_API_KEY}` },
          });

          if (!res.ok) {
            return {
              content: [{ type: "text", text: `Cascade snapshot unavailable (HTTP ${res.status}: ${res.statusText})` }],
            };
          }

          const data = await res.json();

          return {
            content: [{
              type: "text",
              text:
                `## Cascade Mover Snapshot (${zone})\n\n` +
                `- **EWMA Lag**: ${data.ewma_lag}ms\n` +
                `- **Exposure Gate**: ${data.exposure_gate_open ? "🟢 OPEN" : "🔴 CLOSED"}\n` +
                `- **Flow Particles**: ${data.flow_particles_active ? "✅ Active" : "⏸️ Paused"}\n` +
                `- **Pause Banner**: ${data.pause_banner || "None"}\n` +
                `- **Keyboard Nav**: ${data.keyboard_nav ? "Enabled" : "Disabled"}\n\n` +
                `*Last update: ${new Date(data.timestamp).toLocaleTimeString()}*`,
            }],
          };
        } catch (err) {
          return {
            content: [{ type: "text", text: `Cascade snapshot fetch failed: ${(err as Error).message}` }],
          };
        }
      }

      case "status": {
        const connections = getConnections();
        const statusList = Array.from(connections.entries()).map(([t, conn]) => ({
          topic: t,
          state:
            conn.ws.readyState === WebSocket.OPEN ? "connected" :
            conn.ws.readyState === WebSocket.CONNECTING ? "connecting" : "disconnected",
          retryCount: conn.retryCount,
          lastMessage: new Date(conn.lastMessage).toLocaleTimeString(),
          msSinceLastMessage: Date.now() - conn.lastMessage,
        }));

        const rows = statusList.map((s) =>
          `| ${s.topic} | ${s.state === "connected" ? "🟢" : s.state === "connecting" ? "🟡" : "🔴"} ${s.state} | ${s.retryCount} | ${s.lastMessage} | ${s.msSinceLastMessage}ms |`,
        );

        return {
          content: [{
            type: "text",
            text:
              `## Active Subscriptions (${connections.size})\n\n` +
              (rows.length > 0
                ? `| Topic | State | Retries | Last Msg | Lag |\n|-------|-------|---------|----------|-----|\n${rows.join("\n")}`
                : "No active subscriptions."),
          }],
        };
      }

      case "unsubscribe": {
        const { topic: t } = readToolArgs<UnsubscribeArgs>(args);
        const success = disconnect(t);

        return {
          content: [{
            type: "text",
            text: success
              ? `Unsubscribed from ${t}. Active: ${getConnections().size}`
              : `No active subscription found for ${t}`,
          }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  };
}
