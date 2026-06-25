/**
 * TelegramHub Component — Frontend Dashboard
 *
 * Displays:
 *   - Bot status cards (running/stopped, heartbeat age, message count)
 *   - Delivery stats (success rate, avg/p99 latency)
 *   - Topic status table
 *   - Refresh controls
 *
 * Theme: Midnight Galaxy (#2b1e3e)
 */

import React, { useState, useEffect, useCallback } from "react";

// ─── Theme Colors ──────────────────────────────────────────────────────────

const THEME = {
  bg: "#1a1128",
  card: "#23193a",
  cardBorder: "#2b1e3e",
  accent: "#7c3aed",
  accentLight: "#a78bfa",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
};

// ─── Types ─────────────────────────────────────────────────────────────────

interface BotStatus {
  botId: string;
  status: "healthy" | "stale" | "stopped";
  lastHeartbeat: string;
  heartbeatAgeMs: number;
  uptimeMs: number;
  messagesDelivered: number;
  messagesFailed: number;
  topicsManaged: number;
  errorCount: number;
}

interface QueueMetric {
  stream: string;
  length: number;
  pending: number;
}

interface SystemStatus {
  status: string;
  timestamp: string;
  telegramBots: BotStatus[];
  queues: QueueMetric[];
}

interface DeliveryStats {
  period: { hours: number; from: string; to: string };
  summary: {
    totalEvents: number;
    delivered: number;
    failed: number;
    successRate: number;
    avgLatencyMs: number;
    p99LatencyMs: number;
  };
  byBot: Array<{
    botId: string;
    total: number;
    delivered: number;
    failed: number;
    avgLatencyMs: number;
  }>;
  byPurpose: Array<{
    purpose: string;
    total: number;
    delivered: number;
    failed: number;
  }>;
  topFailures: Array<{ errorMessage: string; count: number }>;
}

interface TopicsStatus {
  totalTopics: number;
  totalSupergroups: number;
  byBot: Array<{
    botId: string;
    topicCount: number;
    supergroupCount: number;
  }>;
  byPurpose: Array<{ purpose: string; count: number }>;
  missingTopics: { count: number; items: Array<Record<string, any>> };
}

// ─── Utility Functions ─────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

// ─── Components ────────────────────────────────────────────────────────────

const Card: React.FC<{
  title: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, children, className = "" }) => (
  <div
    className={`rounded-lg border p-4 ${className}`}
    style={{
      backgroundColor: THEME.card,
      borderColor: THEME.cardBorder,
    }}
  >
    <h3
      className="text-sm font-semibold uppercase tracking-wider mb-3"
      style={{ color: THEME.accentLight }}
    >
      {title}
    </h3>
    {children}
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const color =
    status === "healthy" || status === "running"
      ? THEME.success
      : status === "stale" || status === "degraded"
        ? THEME.warning
        : THEME.danger;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}22`, color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full mr-1.5"
        style={{ backgroundColor: color }}
      />
      {status}
    </span>
  );
};

const Metric: React.FC<{ label: string; value: string | number }> = ({
  label,
  value,
}) => (
  <div className="flex flex-col">
    <span className="text-xs" style={{ color: THEME.textMuted }}>
      {label}
    </span>
    <span
      className="text-lg font-semibold"
      style={{ color: THEME.text }}
    >
      {value}
    </span>
  </div>
);

// ─── Bot Status Card ───────────────────────────────────────────────────────

const BotStatusCard: React.FC<{ bot: BotStatus }> = ({ bot }) => (
  <Card title={bot.botId.replace("_", " ").toUpperCase()}>
    <div className="flex justify-between items-start mb-3">
      <StatusBadge status={bot.status} />
      <span className="text-xs" style={{ color: THEME.textMuted }}>
        {formatDuration(bot.heartbeatAgeMs)} ago
      </span>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <Metric
        label="Delivered"
        value={formatNumber(bot.messagesDelivered)}
      />
      <Metric
        label="Failed"
        value={formatNumber(bot.messagesFailed)}
      />
      <Metric
        label="Topics"
        value={formatNumber(bot.topicsManaged)}
      />
      <Metric
        label="Uptime"
        value={formatDuration(bot.uptimeMs)}
      />
    </div>
    <div className="mt-2 text-xs" style={{ color: THEME.textMuted }}>
      Errors: {bot.errorCount}
    </div>
  </Card>
);

// ─── Delivery Stats Section ────────────────────────────────────────────────

const DeliveryStatsSection: React.FC<{ stats: DeliveryStats | null }> = ({
  stats,
}) => {
  if (!stats) return null;

  const s = stats.summary;

  return (
    <Card title="Delivery Statistics">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Metric
          label="Total Events"
          value={formatNumber(s.totalEvents)}
        />
        <Metric label="Success Rate" value={`${(s.successRate * 100).toFixed(2)}%`} />
        <Metric label="Avg Latency" value={`${s.avgLatencyMs}ms`} />
        <Metric label="P99 Latency" value={`${s.p99LatencyMs}ms`} />
      </div>

      {/* By Bot */}
      {stats.byBot.length > 0 && (
        <div className="mb-4">
          <h4
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: THEME.accentLight }}
          >
            By Bot
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: THEME.textMuted }}>
                  <th className="text-left py-1">Bot</th>
                  <th className="text-right py-1">Total</th>
                  <th className="text-right py-1">Delivered</th>
                  <th className="text-right py-1">Failed</th>
                  <th className="text-right py-1">Avg Latency</th>
                </tr>
              </thead>
              <tbody>
                {stats.byBot.map((b) => (
                  <tr
                    key={b.botId}
                    className="border-t"
                    style={{ borderColor: THEME.cardBorder }}
                  >
                    <td className="py-1" style={{ color: THEME.text }}>
                      {b.botId}
                    </td>
                    <td
                      className="text-right py-1"
                      style={{ color: THEME.text }}
                    >
                      {formatNumber(b.total)}
                    </td>
                    <td
                      className="text-right py-1"
                      style={{ color: THEME.success }}
                    >
                      {formatNumber(b.delivered)}
                    </td>
                    <td
                      className="text-right py-1"
                      style={{ color: THEME.danger }}
                    >
                      {formatNumber(b.failed)}
                    </td>
                    <td
                      className="text-right py-1"
                      style={{ color: THEME.textMuted }}
                    >
                      {Math.round(b.avgLatencyMs)}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Failures */}
      {stats.topFailures.length > 0 && (
        <div>
          <h4
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: THEME.accentLight }}
          >
            Top Failures
          </h4>
          {stats.topFailures.map((f, i) => (
            <div
              key={i}
              className="flex justify-between py-1 text-xs"
            >
              <span style={{ color: THEME.text }}>
                {f.errorMessage}
              </span>
              <span style={{ color: THEME.danger }}>
                {f.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

// ─── Topics Status Section ─────────────────────────────────────────────────

const TopicsStatusSection: React.FC<{
  status: TopicsStatus | null;
}> = ({ status }) => {
  if (!status) return null;

  return (
    <Card title="Topic Status">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Metric label="Total Topics" value={formatNumber(status.totalTopics)} />
        <Metric
          label="Supergroups"
          value={formatNumber(status.totalSupergroups)}
        />
        <Metric
          label="Missing Topics"
          value={formatNumber(status.missingTopics.count)}
        />
        <Metric label="Coverage" value={`${status.totalSupergroups > 0 ? Math.round((status.totalTopics / status.totalSupergroups) * 100) : 0}%`} />
      </div>

      {/* By Purpose */}
      {status.byPurpose.length > 0 && (
        <div>
          <h4
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: THEME.accentLight }}
          >
            By Purpose
          </h4>
          <div className="flex flex-wrap gap-2">
            {status.byPurpose.map((p) => (
              <span
                key={p.purpose}
                className="px-2 py-1 rounded text-xs"
                style={{
                  backgroundColor: THEME.cardBorder,
                  color: THEME.text,
                }}
              >
                {p.purpose}: {p.count}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

// ─── Queue Metrics Section ─────────────────────────────────────────────────

const QueueMetricsSection: React.FC<{
  queues: QueueMetric[];
}> = ({ queues }) => (
  <Card title="Queue Metrics">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {queues.map((q) => (
        <div
          key={q.stream}
          className="rounded p-2"
          style={{ backgroundColor: THEME.cardBorder }}
        >
          <div
            className="text-xs font-medium mb-1"
            style={{ color: THEME.accentLight }}
          >
            {q.stream}
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: THEME.textMuted }}>
              Len: {q.length >= 0 ? q.length : "?"}
            </span>
            <span style={{ color: THEME.textMuted }}>
              Pend: {q.pending >= 0 ? q.pending : "?"}
            </span>
          </div>
        </div>
      ))}
    </div>
  </Card>
);

// ─── Main TelegramHub Component ────────────────────────────────────────────

export const TelegramHub: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(
    null
  );
  const [deliveryStats, setDeliveryStats] =
    useState<DeliveryStats | null>(null);
  const [topicsStatus, setTopicsStatus] =
    useState<TopicsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      // Fetch system status
      const statusRes = await fetch("/api/health/system-status");
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setSystemStatus(statusData);
      }

      // Fetch delivery stats
      const statsRes = await fetch("/api/telegram/delivery-stats?hours=24");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setDeliveryStats(statsData);
      }

      // Fetch topics status
      const topicsRes = await fetch("/api/telegram/topics-status");
      if (topicsRes.ok) {
        const topicsData = await topicsRes.json();
        setTopicsStatus(topicsData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/bots/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        // eslint-disable-next-line no-console
        console.log("Refresh triggered:", data);
        // Refresh stats after a delay
        setTimeout(fetchAll, 2000);
      }
    } catch (err: any) {
      setError(`Refresh failed: ${err.message}`);
    }
  }, [fetchAll]);

  useEffect(() => {
    fetchAll();
    // Auto-refresh every 30s
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: THEME.bg, color: THEME.text }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: THEME.accentLight }}
          >
            Telegram Hub
          </h1>
          <p className="text-sm" style={{ color: THEME.textMuted }}>
            Bot worker monitoring & delivery analytics
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 rounded text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{
              backgroundColor: THEME.accent,
              color: "#fff",
            }}
          >
            {refreshing ? "Refreshing..." : "Refresh Topics"}
          </button>
          <button
            onClick={fetchAll}
            disabled={refreshing}
            className="px-4 py-2 rounded text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{
              backgroundColor: THEME.cardBorder,
              color: THEME.text,
            }}
          >
            Reload
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-lg p-3 mb-4 text-sm"
          style={{
            backgroundColor: `${THEME.danger}22`,
            color: THEME.danger,
            border: `1px solid ${THEME.danger}44`,
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !systemStatus && (
        <div className="flex items-center justify-center h-64">
          <div
            className="text-lg animate-pulse"
            style={{ color: THEME.accentLight }}
          >
            Loading Telegram Hub...
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && systemStatus && (
        <div className="space-y-6">
          {/* Bot Status Cards */}
          <div>
            <h2
              className="text-sm font-semibold uppercase tracking-wider mb-3"
              style={{ color: THEME.textMuted }}
            >
              Bot Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemStatus.telegramBots.map((bot) => (
                <BotStatusCard key={bot.botId} bot={bot} />
              ))}
            </div>
          </div>

          {/* Overall System Status */}
          <div className="flex items-center gap-4 text-sm">
            <span style={{ color: THEME.textMuted }}>
              System: <StatusBadge status={systemStatus.status} />
            </span>
            <span style={{ color: THEME.textMuted }}>
              Updated:{" "}
              {new Date(systemStatus.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* Queue Metrics */}
          {systemStatus.queues.length > 0 && (
            <QueueMetricsSection queues={systemStatus.queues} />
          )}

          {/* Delivery Stats */}
          {deliveryStats && (
            <DeliveryStatsSection stats={deliveryStats} />
          )}

          {/* Topics Status */}
          {topicsStatus && (
            <TopicsStatusSection status={topicsStatus} />
          )}
        </div>
      )}
    </div>
  );
};
