/**
 * WebhookSettings Component
 *
 * Provides:
 *   - List of configured webhooks with status indicators
 *   - Create/edit form (name, URL, method, headers, events)
 *   - Test button with result display
 *   - Toggle enable/disable switch
 *   - Delivery history table
 *   - Dark theme with Tech Innovation (#0066ff) accent
 *
 * Zone 8: Webhook Alerts
 */

import React, { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WebhookConfig {
  id: number;
  webhookId: string;
  name: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  bodyTemplate?: string;
  eventTypes: string[];
  enabled: boolean;
  retryCount: number;
  timeoutMs: number;
  circuitState: string;
  consecutiveFailures: number;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

interface WebhookDelivery {
  id: number;
  deliveryId: string;
  eventType: string;
  status: "pending" | "success" | "failed" | "retrying";
  httpStatus?: number;
  attempts: number;
  error?: string;
  durationMs?: number;
  timestamp: number;
}

interface TestResult {
  success: boolean;
  status?: number;
  durationMs: number;
  error?: string;
  attempts: number;
}

interface DeliveryStats {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  avgLatencyMs: number;
  avgAttempts: number;
  lastDeliveryAt?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const THEME_COLOR = "#0066ff";
const EVENT_TYPE_OPTIONS = [
  "risk_alert",
  "system_alert",
  "pattern_alert",
  "enforcement_alert",
  "webhook_failure",
  "circuit_breaker",
  "ip_flag",
  "compliance",
];

const WebhookSettings: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [deliveryStats, setDeliveryStats] = useState<DeliveryStats | null>(null);
  const [showDeliveries, setShowDeliveries] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    method: "POST",
    headers: '{"Content-Type": "application/json"}',
    eventTypes: ["risk_alert"],
    retryCount: 3,
    timeoutMs: 30000,
    secret: "",
    description: "",
    enabled: false,
  });

  const fetchWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/webhooks");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setWebhooks(data.items ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch webhooks";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleCreate = async () => {
    try {
      setError(null);
      const headers = JSON.parse(formData.headers);
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, headers }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setShowForm(false);
      resetForm();
      await fetchWebhooks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create webhook");
    }
  };

  const handleUpdate = async () => {
    if (!editingWebhook) return;
    try {
      setError(null);
      const headers = JSON.parse(formData.headers);
      const res = await fetch(`/api/webhooks/${editingWebhook.webhookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          headers,
          secret: formData.secret || undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setShowForm(false);
      setEditingWebhook(null);
      resetForm();
      await fetchWebhooks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update webhook");
    }
  };

  const handleDelete = async (webhookId: string) => {
    if (!confirm("Delete this webhook? This cannot be undone.")) return;
    try {
      setError(null);
      const res = await fetch(`/api/webhooks/${webhookId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchWebhooks();
      if (selectedWebhook?.webhookId === webhookId) {
        setSelectedWebhook(null);
        setShowDeliveries(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete webhook");
    }
  };

  const handleToggle = async (webhookId: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/webhooks/${webhookId}/toggle`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchWebhooks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to toggle webhook");
    }
  };

  const handleTest = async (webhookId: string) => {
    try {
      setError(null);
      setTestResult(null);
      const res = await fetch(`/api/webhooks/${webhookId}/test`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result: TestResult = await res.json();
      setTestResult(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Test failed");
    }
  };

  const handleFetchDeliveries = async (webhookId: string) => {
    try {
      setError(null);
      const [delRes, statsRes] = await Promise.all([
        fetch(`/api/webhooks/${webhookId}/deliveries?limit=50`),
        fetch(`/api/webhooks/${webhookId}/stats`),
      ]);
      if (!delRes.ok || !statsRes.ok) throw new Error("Failed to fetch delivery data");
      const delData = await delRes.json();
      const statsData = await statsRes.json();
      setDeliveries(delData.items ?? []);
      setDeliveryStats(statsData);
      setShowDeliveries(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch deliveries");
    }
  };

  const handleResetCircuit = async (webhookId: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/webhooks/${webhookId}/reset-circuit`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchWebhooks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset circuit");
    }
  };

  const openEditForm = (wh: WebhookConfig) => {
    setEditingWebhook(wh);
    setFormData({
      name: wh.name,
      url: wh.url,
      method: wh.method,
      headers: JSON.stringify(wh.headers, null, 2),
      eventTypes: wh.eventTypes,
      retryCount: wh.retryCount,
      timeoutMs: wh.timeoutMs,
      secret: "",
      description: wh.description ?? "",
      enabled: wh.enabled,
    });
    setShowForm(true);
  };

  const openCreateForm = () => {
    setEditingWebhook(null);
    resetForm();
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      url: "",
      method: "POST",
      headers: '{"Content-Type": "application/json"}',
      eventTypes: ["risk_alert"],
      retryCount: 3,
      timeoutMs: 30000,
      secret: "",
      description: "",
      enabled: false,
    });
  };

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const styles: Record<string, React.CSSProperties> = {
    container: {
      backgroundColor: "#0a0e1a",
      color: "#c8d0e0",
      padding: "24px",
      fontFamily: "'Inter', 'SF Mono', monospace",
      minHeight: "100%",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "24px",
    },
    title: {
      fontSize: "20px",
      fontWeight: 600,
      color: "#ffffff",
      margin: 0,
    },
    createBtn: {
      backgroundColor: THEME_COLOR,
      color: "#ffffff",
      border: "none",
      padding: "10px 20px",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: 500,
    },
    card: {
      backgroundColor: "#111827",
      border: "1px solid #1e293b",
      borderRadius: "8px",
      padding: "16px",
      marginBottom: "12px",
      transition: "border-color 0.2s",
    },
    cardHover: {
      borderColor: THEME_COLOR,
    },
    cardHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    webhookName: {
      fontSize: "15px",
      fontWeight: 600,
      color: "#ffffff",
      margin: "0 0 4px 0",
    },
    webhookUrl: {
      fontSize: "12px",
      color: "#64748b",
      margin: 0,
      wordBreak: "break-all" as const,
    },
    statusBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "4px 10px",
      borderRadius: "12px",
      fontSize: "11px",
      fontWeight: 600,
      textTransform: "uppercase" as const,
    },
    enabled: {
      backgroundColor: "rgba(0, 102, 255, 0.15)",
      color: THEME_COLOR,
    },
    disabled: {
      backgroundColor: "rgba(100, 116, 139, 0.15)",
      color: "#64748b",
    },
    circuitOpen: {
      backgroundColor: "rgba(239, 68, 68, 0.15)",
      color: "#ef4444",
    },
    actions: {
      display: "flex",
      gap: "8px",
      marginTop: "12px",
      flexWrap: "wrap" as const,
    },
    btn: {
      padding: "6px 12px",
      borderRadius: "4px",
      border: "1px solid #334155",
      backgroundColor: "#1e293b",
      color: "#94a3b8",
      cursor: "pointer",
      fontSize: "12px",
    },
    btnPrimary: {
      backgroundColor: "rgba(0, 102, 255, 0.15)",
      color: THEME_COLOR,
      border: `1px solid ${THEME_COLOR}40`,
    },
    btnDanger: {
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      color: "#ef4444",
      border: "1px solid rgba(239, 68, 68, 0.3)",
    },
    formOverlay: {
      position: "fixed" as const,
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    },
    formPanel: {
      backgroundColor: "#111827",
      border: "1px solid #1e293b",
      borderRadius: "12px",
      padding: "24px",
      width: "100%",
      maxWidth: "560px",
      maxHeight: "90vh",
      overflow: "auto",
    },
    formTitle: {
      fontSize: "18px",
      fontWeight: 600,
      color: "#ffffff",
      margin: "0 0 20px 0",
    },
    formGroup: {
      marginBottom: "16px",
    },
    label: {
      display: "block",
      fontSize: "12px",
      fontWeight: 500,
      color: "#94a3b8",
      marginBottom: "6px",
      textTransform: "uppercase" as const,
      letterSpacing: "0.5px",
    },
    input: {
      width: "100%",
      padding: "10px 12px",
      backgroundColor: "#0f172a",
      border: "1px solid #334155",
      borderRadius: "6px",
      color: "#e2e8f0",
      fontSize: "14px",
      boxSizing: "border-box" as const,
      fontFamily: "inherit",
    },
    select: {
      width: "100%",
      padding: "10px 12px",
      backgroundColor: "#0f172a",
      border: "1px solid #334155",
      borderRadius: "6px",
      color: "#e2e8f0",
      fontSize: "14px",
      fontFamily: "inherit",
    },
    textarea: {
      width: "100%",
      padding: "10px 12px",
      backgroundColor: "#0f172a",
      border: "1px solid #334155",
      borderRadius: "6px",
      color: "#e2e8f0",
      fontSize: "13px",
      fontFamily: "'SF Mono', monospace",
      minHeight: "80px",
      resize: "vertical" as const,
      boxSizing: "border-box" as const,
    },
    checkboxGroup: {
      display: "flex",
      flexWrap: "wrap" as const,
      gap: "8px",
    },
    checkboxLabel: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 10px",
      backgroundColor: "#0f172a",
      border: "1px solid #334155",
      borderRadius: "4px",
      fontSize: "12px",
      cursor: "pointer",
      color: "#94a3b8",
    },
    formActions: {
      display: "flex",
      gap: "12px",
      justifyContent: "flex-end",
      marginTop: "20px",
      paddingTop: "16px",
      borderTop: "1px solid #1e293b",
    },
    testResult: {
      padding: "12px",
      borderRadius: "6px",
      fontSize: "13px",
      marginTop: "12px",
    },
    testSuccess: {
      backgroundColor: "rgba(34, 197, 94, 0.1)",
      border: "1px solid rgba(34, 197, 94, 0.3)",
      color: "#22c55e",
    },
    testFailed: {
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      border: "1px solid rgba(239, 68, 68, 0.3)",
      color: "#ef4444",
    },
    error: {
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      border: "1px solid rgba(239, 68, 68, 0.3)",
      color: "#ef4444",
      padding: "12px",
      borderRadius: "6px",
      marginBottom: "16px",
      fontSize: "13px",
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
      gap: "12px",
      marginBottom: "16px",
    },
    statCard: {
      backgroundColor: "#0f172a",
      border: "1px solid #1e293b",
      borderRadius: "6px",
      padding: "12px",
      textAlign: "center" as const,
    },
    statValue: {
      fontSize: "24px",
      fontWeight: 700,
      color: "#ffffff",
      margin: 0,
    },
    statLabel: {
      fontSize: "11px",
      color: "#64748b",
      margin: "4px 0 0 0",
      textTransform: "uppercase" as const,
    },
    table: {
      width: "100%",
      borderCollapse: "collapse" as const,
      fontSize: "13px",
    },
    th: {
      textAlign: "left" as const,
      padding: "10px 12px",
      borderBottom: "1px solid #1e293b",
      color: "#64748b",
      fontSize: "11px",
      fontWeight: 600,
      textTransform: "uppercase" as const,
    },
    td: {
      padding: "10px 12px",
      borderBottom: "1px solid #1e293b",
      color: "#c8d0e0",
    },
    statusDot: {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      display: "inline-block",
    },
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const getStatusStyle = (wh: WebhookConfig) => {
    if (wh.circuitState === "half_open") return { ...styles.statusBadge, ...styles.circuitOpen };
    return wh.enabled ? { ...styles.statusBadge, ...styles.enabled } : { ...styles.statusBadge, ...styles.disabled };
  };

  const getStatusLabel = (wh: WebhookConfig) => {
    if (wh.circuitState === "half_open") return "Degraded";
    return wh.enabled ? "Enabled" : "Disabled";
  };

  const deliveryStatusStyle = (status: string) => {
    switch (status) {
      case "success": return { color: "#22c55e" };
      case "failed": return { color: "#ef4444" };
      case "pending": return { color: "#f59e0b" };
      case "retrying": return { color: "#f97316" };
      default: return { color: "#94a3b8" };
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Webhook Configurations</h2>
        <button style={styles.createBtn} onClick={openCreateForm}>
          + New Webhook
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Test Result */}
      {testResult && (
        <div style={{ ...styles.testResult, ...(testResult.success ? styles.testSuccess : styles.testFailed) }}>
          <strong>{testResult.success ? "Test Successful" : "Test Failed"}</strong>
          <div style={{ marginTop: "4px" }}>
            {testResult.success
              ? `HTTP ${testResult.status} in ${testResult.durationMs}ms (${testResult.attempts} attempt)`
              : `${testResult.error} (${testResult.durationMs}ms)`}
          </div>
        </div>
      )}

      {/* Webhook List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading webhooks...</div>
      ) : webhooks.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
          No webhooks configured. Click "New Webhook" to get started.
        </div>
      ) : (
        webhooks.map((wh) => (
          <div key={wh.webhookId} style={styles.card} className="webhook-card">
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.webhookName}>{wh.name}</h3>
                <p style={styles.webhookUrl}>{wh.method} {wh.url}</p>
                <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                  <span style={getStatusStyle(wh)} className={wh.enabled ? "webhook-status-enabled" : "webhook-status-disabled"}>
                    <span style={styles.statusDot} />
                    {getStatusLabel(wh)}
                  </span>
                  {wh.eventTypes.map((et) => (
                    <span key={et} style={{ fontSize: "11px", color: "#64748b", backgroundColor: "#0f172a", padding: "2px 8px", borderRadius: "4px" }}>
                      {et}
                    </span>
                  ))}
                  {wh.consecutiveFailures > 0 && (
                    <span style={{ fontSize: "11px", color: "#ef4444" }}>
                      {wh.consecutiveFailures} consecutive failures
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={styles.actions}>
              <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => handleTest(wh.webhookId)}>
                Test
              </button>
              <button style={styles.btn} onClick={() => handleToggle(wh.webhookId)}>
                {wh.enabled ? "Disable" : "Enable"}
              </button>
              <button style={styles.btn} onClick={() => openEditForm(wh)}>
                Edit
              </button>
              <button style={styles.btn} onClick={() => { setSelectedWebhook(wh); handleFetchDeliveries(wh.webhookId); }}>
                Deliveries
              </button>
              {wh.circuitState === "half_open" && (
                <button style={styles.btn} onClick={() => handleResetCircuit(wh.webhookId)}>
                  Reset Circuit
                </button>
              )}
              <button style={{ ...styles.btn, ...styles.btnDanger }} onClick={() => handleDelete(wh.webhookId)}>
                Delete
              </button>
            </div>
          </div>
        ))
      )}

      {/* Delivery History Panel */}
      {showDeliveries && selectedWebhook && (
        <div style={{ ...styles.card, marginTop: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, color: "#ffffff", fontSize: "16px" }}>
              Delivery History: {selectedWebhook.name}
            </h3>
            <button style={styles.btn} onClick={() => setShowDeliveries(false)}>Close</button>
          </div>

          {deliveryStats && (
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <p style={styles.statValue}>{deliveryStats.total}</p>
                <p style={styles.statLabel}>Total</p>
              </div>
              <div style={styles.statCard}>
                <p style={{ ...styles.statValue, color: "#22c55e" }}>{deliveryStats.successRate}%</p>
                <p style={styles.statLabel}>Success Rate</p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statValue}>{deliveryStats.avgLatencyMs}ms</p>
                <p style={styles.statLabel}>Avg Latency</p>
              </div>
              <div style={styles.statCard}>
                <p style={{ ...styles.statValue, color: "#ef4444" }}>{deliveryStats.failed}</p>
                <p style={styles.statLabel}>Failed</p>
              </div>
            </div>
          )}

          {deliveries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>No deliveries recorded yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Event</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>HTTP</th>
                    <th style={styles.th}>Attempts</th>
                    <th style={styles.th}>Duration</th>
                    <th style={styles.th}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((d) => (
                    <tr key={d.deliveryId}>
                      <td style={styles.td}>{d.eventType}</td>
                      <td style={styles.td}>
                        <span style={deliveryStatusStyle(d.status)} className={`delivery-${d.status}`}>
                          {d.status}
                        </span>
                      </td>
                      <td style={styles.td}>{d.httpStatus ?? "-"}</td>
                      <td style={styles.td}>{d.attempts}/{d.attempts}</td>
                      <td style={styles.td}>{d.durationMs ? `${d.durationMs}ms` : "-"}</td>
                      <td style={styles.td}>{new Date(d.timestamp * 1000).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div style={styles.formOverlay} onClick={() => setShowForm(false)}>
          <div style={styles.formPanel} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.formTitle}>{editingWebhook ? "Edit Webhook" : "Create Webhook"}</h3>

            <div style={styles.formGroup}>
              <label style={styles.label}>Name *</label>
              <input
                style={styles.input}
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="My Webhook"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>URL *</label>
              <input
                style={styles.input}
                value={formData.url}
                onChange={(e) => setFormData((p) => ({ ...p, url: e.target.value }))}
                placeholder="https://example.com/webhook"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Method</label>
                <select
                  style={styles.select}
                  value={formData.method}
                  onChange={(e) => setFormData((p) => ({ ...p, method: e.target.value }))}
                >
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Timeout (ms)</label>
                <input
                  style={styles.input}
                  type="number"
                  value={formData.timeoutMs}
                  onChange={(e) => setFormData((p) => ({ ...p, timeoutMs: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Headers (JSON)</label>
              <textarea
                style={styles.textarea}
                value={formData.headers}
                onChange={(e) => setFormData((p) => ({ ...p, headers: e.target.value }))}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Event Types</label>
              <div style={styles.checkboxGroup}>
                {EVENT_TYPE_OPTIONS.map((et) => (
                  <label key={et} style={{
                    ...styles.checkboxLabel,
                    ...(formData.eventTypes.includes(et) ? { borderColor: THEME_COLOR, color: "#ffffff" } : {}),
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.eventTypes.includes(et)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData((p) => ({ ...p, eventTypes: [...p.eventTypes, et] }));
                        } else {
                          setFormData((p) => ({ ...p, eventTypes: p.eventTypes.filter((x) => x !== et) }));
                        }
                      }}
                      style={{ accentColor: THEME_COLOR }}
                    />
                    {et}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Retry Count</label>
                <input
                  style={styles.input}
                  type="number"
                  min={0}
                  max={10}
                  value={formData.retryCount}
                  onChange={(e) => setFormData((p) => ({ ...p, retryCount: parseInt(e.target.value) }))}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Secret (HMAC)</label>
                <input
                  style={styles.input}
                  type="password"
                  value={formData.secret}
                  onChange={(e) => setFormData((p) => ({ ...p, secret: e.target.value }))}
                  placeholder={editingWebhook ? "Leave blank to keep existing" : "Optional"}
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <input
                style={styles.input}
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={{ ...styles.checkboxLabel, display: "inline-flex" }}>
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData((p) => ({ ...p, enabled: e.target.checked }))}
                />
                <span style={{ color: formData.enabled ? "#ffffff" : "#94a3b8" }}>
                  Enable webhook immediately
                </span>
              </label>
            </div>

            <div style={styles.formActions}>
              <button style={styles.btn} onClick={() => setShowForm(false)}>Cancel</button>
              <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={editingWebhook ? handleUpdate : handleCreate}>
                {editingWebhook ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhookSettings;
