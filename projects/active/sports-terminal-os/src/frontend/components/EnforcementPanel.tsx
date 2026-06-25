/**
 * EnforcementPanel Component
 *
 * Enforcement queue management: view queue, apply limits manually,
 * toggle auto-enforcement, view enforcement history.
 *
 * Theme: Arctic Frost (#4a6fa5)
 */

import React, { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EnforcementAction {
  id: number;
  queueId: string;
  actionType: string;
  entityType: string;
  entityId: string;
  agentLogin: string;
  paramsJson: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  priority: number;
  scheduledAt: number | null;
  processedAt: number | null;
  processedBy: string | null;
  resultJson: string | null;
  errorMessage: string | null;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THEME = {
  accent: "#4a6fa5",
  bg: "#0d1117",
  surface: "#161b22",
  border: "#30363d",
  text: "#c9d1d9",
  textMuted: "#8b949e",
  green: "#3fb950",
  yellow: "#d29922",
  red: "#f85149",
  orange: "#db6d28",
  pending: "#d29922",
  applied: "#3fb950",
  expired: "#8b949e",
  appealed: "#db6d28",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EnforcementPanel(): React.JSX.Element {
  const [queue, setQueue] = useState<EnforcementAction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [autoEnforce, setAutoEnforce] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    playerId: "",
    actionType: "apply_limit",
    limitType: "wager",
    amount: "",
    reason: "",
    durationMinutes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      params.set("offset", "0");
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/risk/enforcement/queue?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setQueue(json.items || []);
        setTotal(json.total || 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const res = await fetch("/api/risk/enforcement/apply-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: formData.playerId,
          actionType: formData.actionType,
          limitType: formData.limitType,
          amount: formData.amount ? parseInt(formData.amount, 10) : undefined,
          reason: formData.reason,
          durationMinutes: formData.durationMinutes ? parseInt(formData.durationMinutes, 10) : undefined,
        }),
      });

      if (res.ok) {
        setMessage("Enforcement applied successfully.");
        setFormData({ playerId: "", actionType: "apply_limit", limitType: "wager", amount: "", reason: "", durationMinutes: "" });
        setShowForm(false);
        await fetchQueue();
      } else {
        const err = await res.json();
        setMessage(`Error: ${err.error || "Failed to apply enforcement"}`);
      }
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoEnforce = async () => {
    const newVal = !autoEnforce;
    setAutoEnforce(newVal);
    try {
      await fetch("/api/risk/config/auto_enforce", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: newVal ? "true" : "false", type: "boolean", description: "Auto-enforcement toggle", category: "enforcement" }),
      });
    } catch {
      // silent
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Enforcement Center</h2>
        <div style={styles.headerRight}>
          <label style={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={autoEnforce}
              onChange={handleAutoEnforce}
              style={{ marginRight: 6 }}
            />
            <span style={{ color: autoEnforce ? THEME.green : THEME.textMuted, fontWeight: 600, fontSize: 12 }}>
              AUTO-ENFORCE {autoEnforce ? "ON" : "OFF"}
            </span>
          </label>
          <button
            style={styles.btn}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel" : "Apply Limit"}
          </button>
        </div>
      </div>

      {/* Apply Limit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <h3 style={styles.formTitle}>New Enforcement Action</h3>
          <div style={styles.formGrid}>
            <div style={styles.formField}>
              <label style={styles.label}>Player ID *</label>
              <input
                style={styles.input}
                value={formData.playerId}
                onChange={(e) => setFormData({ ...formData, playerId: e.target.value })}
                placeholder="player_12345"
                required
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>Action Type *</label>
              <select
                style={styles.select}
                value={formData.actionType}
                onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
              >
                <option value="apply_limit">Apply Limit</option>
                <option value="block_wager">Block Wager</option>
                <option value="suspend_account">Suspend Account</option>
                <option value="reduce_limit">Reduce Limit</option>
                <option value="notify">Notify Only</option>
              </select>
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>Limit Type</label>
              <select
                style={styles.select}
                value={formData.limitType}
                onChange={(e) => setFormData({ ...formData, limitType: e.target.value })}
              >
                <option value="wager">Wager</option>
                <option value="payout">Payout</option>
                <option value="deposit">Deposit</option>
                <option value="daily">Daily Total</option>
              </select>
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>Amount (cents)</label>
              <input
                style={styles.input}
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="5000"
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.label}>Duration (minutes)</label>
              <input
                style={styles.input}
                type="number"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                placeholder="60"
              />
            </div>
            <div style={{ ...styles.formField, gridColumn: "1 / -1" }}>
              <label style={styles.label}>Reason *</label>
              <input
                style={styles.input}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Player exceeded velocity threshold..."
                required
              />
            </div>
          </div>
          <div style={styles.formActions}>
            <button type="submit" style={styles.submitBtn} disabled={submitting}>
              {submitting ? "Applying..." : "Apply Enforcement"}
            </button>
          </div>
          {message && (
            <div style={{ ...styles.message, color: message.startsWith("Error") ? THEME.red : THEME.green }}>
              {message}
            </div>
          )}
        </form>
      )}

      {/* Status Filter */}
      <div style={styles.filterRow}>
        {["", "pending", "completed", "failed"].map((s) => (
          <button
            key={s}
            style={{
              ...styles.filterBtn,
              background: statusFilter === s ? THEME.accent : "#21262d",
              color: statusFilter === s ? "#fff" : THEME.textMuted,
            }}
            onClick={() => setStatusFilter(s)}
          >
            {s || "All"}
          </button>
        ))}
        <span style={styles.count}>{total} actions</span>
      </div>

      {/* Queue Table */}
      {loading ? (
        <div style={styles.loading}>Loading...</div>
      ) : queue.length === 0 ? (
        <div style={styles.empty}>No enforcement actions</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Action</th>
                <th style={styles.th}>Entity</th>
                <th style={styles.th}>Book</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Priority</th>
                <th style={styles.th}>Attempts</th>
                <th style={styles.th}>Processed By</th>
                <th style={styles.th}>Time</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => {
                let params: Record<string, unknown> = {};
                try { params = JSON.parse(item.paramsJson || "{}"); } catch { /* ignore */ }
                return (
                  <tr
                    key={item.queueId}
                    className={`enforcement-${item.status}`}
                    style={{
                      ...styles.tr,
                      borderLeft: `3px solid ${statusColor(item.status)}`,
                      background: statusBg(item.status),
                    }}
                  >
                    <td style={{ ...styles.td, fontFamily: "monospace", fontSize: 11 }}>
                      {item.queueId.slice(0, 14)}
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: 600 }}>{String(item.actionType)}</span>
                      {Boolean(params.limit_type) && (
                        <span style={{ color: THEME.textMuted, marginLeft: 4 }}>({String(params.limit_type ?? "")})</span>
                      )}
                    </td>
                    <td style={styles.td}>{item.entityId as React.ReactNode}</td>
                    <td style={styles.td}>{item.agentLogin}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.statusBadge, color: statusColor(item.status) }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: "center" }}>{item.priority}</td>
                    <td style={{ ...styles.td, textAlign: "center" }}>{item.attempts}/{item.maxAttempts}</td>
                    <td style={styles.td}>{item.processedBy || "—"}</td>
                    <td style={styles.td}>{new Date(item.createdAt * 1000).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Enforcement Legend */}
      <div style={styles.legend}>
        <span style={styles.legendTitle}>Status Key:</span>
        <span style={{ ...styles.legendItem, color: THEME.pending }}>● Pending</span>
        <span style={{ ...styles.legendItem, color: THEME.applied }}>● Completed</span>
        <span style={{ ...styles.legendItem, color: THEME.expired }}>● Expired</span>
        <span style={{ ...styles.legendItem, color: THEME.appealed }}>● Appealed</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusColor(status: string): string {
  switch (status) {
    case "pending": return THEME.pending;
    case "processing": return THEME.accent;
    case "completed": return THEME.applied;
    case "failed": return THEME.red;
    case "cancelled": return THEME.expired;
    default: return THEME.textMuted;
  }
}

function statusBg(status: string): string {
  switch (status) {
    case "pending": return "rgba(210,153,34,0.08)";
    case "completed": return "rgba(63,185,80,0.08)";
    case "failed": return "rgba(248,81,73,0.08)";
    default: return "transparent";
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "20px",
    background: "#0d1117",
    color: "#c9d1d9",
    minHeight: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: "1px solid #30363d",
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: "#4a6fa5",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  toggleLabel: {
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    fontSize: 12,
    padding: "4px 10px",
    background: "#161b22",
    borderRadius: 6,
    border: "1px solid #30363d",
  },
  btn: {
    padding: "8px 16px",
    background: "#4a6fa5",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  form: {
    background: "#161b22",
    border: "1px solid #30363d",
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  formTitle: {
    margin: "0 0 16px 0",
    fontSize: 14,
    fontWeight: 600,
    color: "#4a6fa5",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 12,
  },
  formField: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: "#8b949e",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    padding: "8px 10px",
    background: "#0d1117",
    color: "#c9d1d9",
    border: "1px solid #30363d",
    borderRadius: 6,
    fontSize: 13,
    outline: "none",
  },
  select: {
    padding: "8px 10px",
    background: "#0d1117",
    color: "#c9d1d9",
    border: "1px solid #30363d",
    borderRadius: 6,
    fontSize: 13,
    outline: "none",
  },
  formActions: {
    marginTop: 16,
    display: "flex",
    justifyContent: "flex-end",
  },
  submitBtn: {
    padding: "10px 24px",
    background: "#4a6fa5",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
  },
  message: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: 600,
  },
  filterRow: {
    display: "flex",
    gap: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  filterBtn: {
    padding: "6px 14px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    textTransform: "capitalize",
    transition: "background 0.15s",
  },
  count: {
    marginLeft: "auto",
    fontSize: 12,
    color: "#8b949e",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
  },
  th: {
    textAlign: "left",
    padding: "10px 8px",
    borderBottom: "2px solid #30363d",
    color: "#8b949e",
    fontWeight: 600,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    position: "sticky",
    top: 0,
    background: "#161b22",
    zIndex: 1,
  },
  tr: {
    borderBottom: "1px solid #21262d",
    transition: "background 0.12s",
  },
  td: {
    padding: "8px",
    color: "#c9d1d9",
    fontVariantNumeric: "tabular-nums",
  },
  statusBadge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    background: "rgba(0,0,0,0.2)",
  },
  loading: {
    textAlign: "center",
    color: "#8b949e",
    padding: 40,
  },
  empty: {
    textAlign: "center",
    color: "#8b949e",
    padding: 40,
  },
  legend: {
    display: "flex",
    gap: 16,
    marginTop: 20,
    paddingTop: 16,
    borderTop: "1px solid #30363d",
    alignItems: "center",
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "#8b949e",
    textTransform: "uppercase",
  },
  legendItem: {
    fontSize: 11,
    fontWeight: 600,
  },
};
