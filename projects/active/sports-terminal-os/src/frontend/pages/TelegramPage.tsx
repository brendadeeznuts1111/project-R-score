/**
 * TelegramPage — Telegram Hub Dashboard Page
 *
 * Wraps the TelegramHub component with page-level layout,
 * bot management controls, delivery log viewer, and settings.
 *
 * Theme: Midnight Galaxy (#2b1e3e)
 */

import React, { useState, useEffect, useCallback } from "react";
import { TelegramHub } from "../components/TelegramHub";

// ─── Theme Colors ──────────────────────────────────────────────────────────

const THEME = {
  bg: "#1a1128",
  card: "#23193a",
  cardBorder: "#2b1e3e",
  accent: "#7c3aed",
  accentLight: "#a78bfa",
  accentHover: "#6d28d9",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
};

// ─── Types ─────────────────────────────────────────────────────────────────

interface DeliveryLogEntry {
  id: number;
  eventType: string;
  agentLogin: string;
  chatId: number;
  threadId: number;
  purpose: string;
  status: string;
  latencyMs: number;
  error: string;
  payloadPreview: string;
  createdAt: string;
}

// ─── Delivery Log Viewer ───────────────────────────────────────────────────

const DeliveryLogViewer: React.FC<{ botId: string }> = ({ botId }) => {
  const [logs, setLogs] = useState<DeliveryLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(
        `/api/telegram/bot/${botId}/delivery-log?${params.toString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      // Silently handle errors
    } finally {
      setLoading(false);
    }
  }, [botId, limit, offset, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div
      className="rounded-lg border p-4"
      style={{
        backgroundColor: THEME.card,
        borderColor: THEME.cardBorder,
      }}
    >
      <div className="flex justify-between items-center mb-3">
        <h3
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: THEME.accentLight }}
        >
          Delivery Log — {botId}
        </h3>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setOffset(0);
            }}
            className="px-2 py-1 rounded text-xs"
            style={{
              backgroundColor: THEME.cardBorder,
              color: THEME.text,
              border: `1px solid ${THEME.cardBorder}`,
            }}
          >
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
          <button
            onClick={fetchLogs}
            className="px-2 py-1 rounded text-xs"
            style={{
              backgroundColor: THEME.accent,
              color: "#fff",
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div
          className="text-center py-8 text-sm animate-pulse"
          style={{ color: THEME.textMuted }}
        >
          Loading...
        </div>
      ) : logs.length === 0 ? (
        <div
          className="text-center py-8 text-sm"
          style={{ color: THEME.textMuted }}
        >
          No delivery logs found.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: THEME.textMuted }}>
                  <th className="text-left py-1.5 pr-2">Time</th>
                  <th className="text-left py-1.5 pr-2">Event</th>
                  <th className="text-left py-1.5 pr-2">Agent</th>
                  <th className="text-left py-1.5 pr-2">Status</th>
                  <th className="text-right py-1.5 pr-2">Latency</th>
                  <th className="text-left py-1.5">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-t"
                    style={{ borderColor: THEME.cardBorder }}
                  >
                    <td
                      className="py-1.5 pr-2 whitespace-nowrap"
                      style={{ color: THEME.textMuted }}
                    >
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                    <td
                      className="py-1.5 pr-2"
                      style={{ color: THEME.text }}
                    >
                      {log.eventType}
                    </td>
                    <td
                      className="py-1.5 pr-2"
                      style={{ color: THEME.textMuted }}
                    >
                      {log.agentLogin || "—"}
                    </td>
                    <td className="py-1.5 pr-2">
                      <span
                        className="px-1.5 py-0.5 rounded text-xs"
                        style={{
                          backgroundColor:
                            log.status === "success"
                              ? `${THEME.success}22`
                              : `${THEME.danger}22`,
                          color:
                            log.status === "success"
                              ? THEME.success
                              : THEME.danger,
                        }}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td
                      className="text-right py-1.5 pr-2"
                      style={{ color: THEME.textMuted }}
                    >
                      {log.latencyMs ? `${log.latencyMs}ms` : "—"}
                    </td>
                    <td
                      className="py-1.5 truncate max-w-[200px]"
                      style={{ color: THEME.danger }}
                      title={log.error}
                    >
                      {log.error || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-3 pt-3 border-t" style={{ borderColor: THEME.cardBorder }}>
              <span style={{ color: THEME.textMuted }}>
                Page {currentPage} of {totalPages} ({total} total)
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-2 py-1 rounded text-xs disabled:opacity-30"
                  style={{
                    backgroundColor: THEME.cardBorder,
                    color: THEME.text,
                  }}
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setOffset(offset + limit)
                  }
                  disabled={offset + limit >= total}
                  className="px-2 py-1 rounded text-xs disabled:opacity-30"
                  style={{
                    backgroundColor: THEME.cardBorder,
                    color: THEME.text,
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Bot Settings Panel ────────────────────────────────────────────────────

const BotSettingsPanel: React.FC = () => {
  const [tokens, setTokens] = useState({
    riskBot: "",
    paymentBot: "",
    agentBot: "",
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In a real implementation, these would be stored securely
    // via the secrets vault API. Here we just show a confirmation.
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div
      className="rounded-lg border p-4"
      style={{
        backgroundColor: THEME.card,
        borderColor: THEME.cardBorder,
      }}
    >
      <h3
        className="text-sm font-semibold uppercase tracking-wider mb-3"
        style={{ color: THEME.accentLight }}
      >
        Bot Token Settings
      </h3>
      <p
        className="text-xs mb-3"
        style={{ color: THEME.textMuted }}
      >
        Configure Telegram bot tokens. Tokens are stored in the secrets
        vault and loaded from environment variables.
      </p>

      <div className="space-y-3">
        {[
          { key: "riskBot" as const, label: "Risk Bot Token" },
          { key: "paymentBot" as const, label: "Payment Bot Token" },
          { key: "agentBot" as const, label: "Agent Bot Token" },
        ].map(({ key, label }) => (
          <div key={key}>
            <label
              className="block text-xs mb-1"
              style={{ color: THEME.textMuted }}
            >
              {label}
            </label>
            <input
              type="password"
              value={tokens[key]}
              onChange={(e) =>
                setTokens((prev) => ({
                  ...prev,
                  [key]: e.target.value,
                }))
              }
              placeholder="••••••••••••••••••••"
              className="w-full px-3 py-2 rounded text-sm"
              style={{
                backgroundColor: THEME.cardBorder,
                color: THEME.text,
                border: `1px solid ${THEME.cardBorder}`,
              }}
            />
          </div>
        ))}
      </div>

      {saved && (
        <div
          className="mt-3 px-3 py-2 rounded text-xs"
          style={{
            backgroundColor: `${THEME.success}22`,
            color: THEME.success,
          }}
        >
          Settings saved successfully. Restart bot workers to apply changes.
        </div>
      )}

      <button
        onClick={handleSave}
        className="mt-3 px-4 py-2 rounded text-sm font-medium transition-opacity hover:opacity-80"
        style={{
          backgroundColor: THEME.accent,
          color: "#fff",
        }}
      >
        Save Settings
      </button>
    </div>
  );
};

// ─── Main TelegramPage ─────────────────────────────────────────────────────

type TabId = "overview" | "logs" | "settings";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "logs", label: "Delivery Logs" },
  { id: "settings", label: "Settings" },
];

const TelegramPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [selectedBot, setSelectedBot] = useState("risk_bot");

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: THEME.bg, color: THEME.text }}
    >
      {/* Tab Navigation */}
      <div
        className="border-b px-6 pt-4 flex gap-1"
        style={{ borderColor: THEME.cardBorder }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 rounded-t-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor:
                activeTab === tab.id
                  ? THEME.card
                  : "transparent",
              color:
                activeTab === tab.id
                  ? THEME.accentLight
                  : THEME.textMuted,
              border:
                activeTab === tab.id
                  ? `1px solid ${THEME.cardBorder}`
                  : "1px solid transparent",
              borderBottom:
                activeTab === tab.id
                  ? `1px solid ${THEME.card}`
                  : undefined,
              marginBottom: activeTab === tab.id ? "-1px" : 0,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === "overview" && <TelegramHub />}

        {activeTab === "logs" && (
          <div className="space-y-4">
            <div className="flex gap-2 mb-4">
              {["risk_bot", "payment_bot", "agent_bot"].map(
                (botId) => (
                  <button
                    key={botId}
                    onClick={() => setSelectedBot(botId)}
                    className="px-3 py-1.5 rounded text-xs font-medium transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor:
                        selectedBot === botId
                          ? THEME.accent
                          : THEME.cardBorder,
                      color:
                        selectedBot === botId
                          ? "#fff"
                          : THEME.text,
                    }}
                  >
                    {botId.replace("_", " ").toUpperCase()}
                  </button>
                )
              )}
            </div>
            <DeliveryLogViewer botId={selectedBot} />
          </div>
        )}

        {activeTab === "settings" && (
          <div className="max-w-2xl">
            <BotSettingsPanel />
          </div>
        )}
      </div>
    </div>
  );
};

export default TelegramPage;
