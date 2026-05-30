/**
 * Partner Profile OS — Partners Admin Page
 *
 * Full partner management interface:
 *   - Partner list with filtering, sorting, pagination
 *   - Status breakdown summary
 *   - Create new partner modal
 *   - Partner detail view (uses PartnerProfile component)
 *   - Signal evaluation tester
 *   - Book index overview
 */

import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PartnerListItem {
  partnerId: string;
  templateId: string;
  displayName: string;
  email: string;
  status: string;
  kycStatus: string;
  currentBalance: number;
  dailyUsed: number;
  currentLimit: number;
  opsecScore: number;
  riskLevel: string;
  createdAt: number;
}

interface TemplateListItem {
  templateId: string;
  description: string;
  version: string;
  categories: string[];
  loadedAt: number;
}

interface CreatePartnerRequest {
  partnerId: string;
  templateId: string;
  displayName: string;
  email: string;
  phone?: string;
  overrides?: {
    runtime?: {
      currentBalance?: number;
      kycStatus?: string;
    };
  };
}

// ---------------------------------------------------------------------------
// PartnersPage Component
// ---------------------------------------------------------------------------

export function PartnersPage() {
  const [partners, setPartners] = useState<PartnerListItem[]>([]);
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<PartnerListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreatePartnerRequest>({
    partnerId: "",
    templateId: "",
    displayName: "",
    email: "",
  });

  // Signal tester
  const [showTester, setShowTester] = useState(false);
  const [testSignal, setTestSignal] = useState({
    bookId: "PINNACLE",
    type: "steam",
    suggestedStake: 10000,
    tier: "T1",
    sport: "NBA",
    market: "spread",
    confidence: 0.95,
  });
  const [testResult, setTestResult] = useState<any>(null);

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, graduated: 0, frozen: 0, suspended: 0 });

  const API_BASE = "/api";

  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (templateFilter) params.set("templateId", templateFilter);

      const res = await fetch(`${API_BASE}/partners?${params}`);
      const data = await res.json();

      let filtered = data.partners ?? [];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (p: PartnerListItem) =>
            p.partnerId.toLowerCase().includes(q) ||
            p.displayName.toLowerCase().includes(q) ||
            p.email.toLowerCase().includes(q)
        );
      }

      setPartners(filtered);
      setStats({
        total: data.total ?? 0,
        active: filtered.filter((p: PartnerListItem) => p.status === "active").length,
        graduated: filtered.filter((p: PartnerListItem) => p.status === "graduated").length,
        frozen: filtered.filter((p: PartnerListItem) => p.status === "frozen").length,
        suspended: filtered.filter((p: PartnerListItem) => p.status === "suspended").length,
      });
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, templateFilter, searchQuery]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/templates`);
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch (err: any) {
      console.error("Failed to fetch templates:", err);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
    fetchTemplates();
  }, [fetchPartners, fetchTemplates]);

  const handleCreatePartner = async () => {
    try {
      const res = await fetch(`${API_BASE}/partners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create partner");
      }
      setShowCreate(false);
      setCreateForm({ partnerId: "", templateId: "", displayName: "", email: "" });
      await fetchPartners();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTransition = async (partnerId: string, event: string, reason: string) => {
    try {
      const res = await fetch(`${API_BASE}/partners/${partnerId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, reason: reason || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Transition failed");
      }
      await fetchPartners();
      // Refresh selected partner
      if (selectedPartner?.partnerId === partnerId) {
        setSelectedPartner(null);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeposit = async (partnerId: string, amount: number) => {
    try {
      const res = await fetch(`${API_BASE}/partners/${partnerId}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, method: "admin", reference: `admin_${Date.now()}` }),
      });
      if (!res.ok) throw new Error("Deposit failed");
      await fetchPartners();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSetLimit = async (partnerId: string, market: string, limit: number) => {
    try {
      const res = await fetch(`${API_BASE}/partners/${partnerId}/set-market-limit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market, limit }),
      });
      if (!res.ok) throw new Error("Set limit failed");
      await fetchPartners();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTestSignal = async () => {
    if (!selectedPartner) return;
    try {
      const res = await fetch(`${API_BASE}/partners/${selectedPartner.partnerId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signalId: `test_${Date.now()}`,
          ...testSignal,
          eventId: `E_${Date.now()}`,
          urgencyMs: 5000,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRefreshIndex = async () => {
    try {
      await fetch(`${API_BASE}/templates/reload`, { method: "POST" });
      await fetchTemplates();
      await fetchPartners();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", maxWidth: 1200, margin: "0 auto", padding: "0 24px 48px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 0", borderBottom: "2px solid #e5e7eb" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Partners</h1>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
            Manage partner profiles, routing, and lifecycle
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleRefreshIndex}
            style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 }}
          >
            Refresh Templates
          </button>
          <button
            onClick={() => setShowTester(!showTester)}
            style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid #3b82f6", background: "#eff6ff", color: "#3b82f6", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            Signal Tester
          </button>
          <button
            onClick={() => setShowCreate(true)}
            style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            + Create Partner
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginTop: 16, padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", fontSize: 13 }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 12, fontSize: 11, cursor: "pointer" }}>Dismiss</button>
        </div>
      )}

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginTop: 20 }}>
        <StatCard label="Total Partners" value={stats.total} color="#6b7280" />
        <StatCard label="Active" value={stats.active} color="#22c55e" />
        <StatCard label="Graduated" value={stats.graduated} color="#8b5cf6" />
        <StatCard label="Frozen" value={stats.frozen} color="#06b6d4" />
        <StatCard label="Suspended" value={stats.suspended} color="#ef4444" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search partners..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, background: "#fff" }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="cultivating">Cultivating</option>
          <option value="graduated">Graduated</option>
          <option value="materialized">Materialized</option>
          <option value="kyc_pending">KYC Pending</option>
          <option value="frozen">Frozen</option>
          <option value="suspended">Suspended</option>
          <option value="terminated">Terminated</option>
        </select>
        <select
          value={templateFilter}
          onChange={(e) => setTemplateFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, background: "#fff" }}
        >
          <option value="">All Templates</option>
          {templates.map((t) => (
            <option key={t.templateId} value={t.templateId}>{t.templateId}</option>
          ))}
        </select>
      </div>

      {/* Signal Tester */}
      {showTester && selectedPartner && (
        <div style={{ marginTop: 20, padding: 20, background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Signal Tester: {selectedPartner.partnerId}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase" }}>Book</label>
              <input value={testSignal.bookId} onChange={(e) => setTestSignal({ ...testSignal, bookId: e.target.value })} style={{ width: "100%", padding: 6, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase" }}>Type</label>
              <select value={testSignal.type} onChange={(e) => setTestSignal({ ...testSignal, type: e.target.value })} style={{ width: "100%", padding: 6, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
                <option value="steam">Steam</option>
                <option value="arb">Arb</option>
                <option value="clv">CLV</option>
                <option value="manual">Manual</option>
                <option value="predictive">Predictive</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase" }}>Stake</label>
              <input type="number" value={testSignal.suggestedStake} onChange={(e) => setTestSignal({ ...testSignal, suggestedStake: Number(e.target.value) })} style={{ width: "100%", padding: 6, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase" }}>Tier</label>
              <select value={testSignal.tier} onChange={(e) => setTestSignal({ ...testSignal, tier: e.target.value })} style={{ width: "100%", padding: 6, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
                <option value="T1">T1</option>
                <option value="T2">T2</option>
                <option value="T3">T3</option>
                <option value="T4">T4</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
            <button onClick={handleTestSignal} style={{ padding: "8px 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>
              Evaluate Signal
            </button>
            {testResult && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
                <span>Result:</span>
                <ResultBadge result={testResult} />
                {testResult.adjustedStake && (
                  <span style={{ color: "#f59e0b" }}>Adjusted: ${testResult.adjustedStake.toLocaleString()}</span>
                )}
                {testResult.reason && (
                  <span style={{ color: "#ef4444" }}>{testResult.reason}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Partner List */}
      <div style={{ marginTop: 20 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Loading partners...</div>
        ) : partners.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
            No partners found. Create your first partner to get started.
          </div>
        ) : (
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "10px 8px" }}>Partner</th>
                <th style={{ padding: "10px 8px" }}>Status</th>
                <th style={{ padding: "10px 8px" }}>KYC</th>
                <th style={{ padding: "10px 8px" }}>Risk</th>
                <th style={{ padding: "10px 8px" }}>Balance</th>
                <th style={{ padding: "10px 8px" }}>Daily Used</th>
                <th style={{ padding: "10px 8px" }}>Limit</th>
                <th style={{ padding: "10px 8px" }}>OpSec</th>
                <th style={{ padding: "10px 8px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr
                  key={p.partnerId}
                  onClick={() => setSelectedPartner(p)}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    cursor: "pointer",
                    background: selectedPartner?.partnerId === p.partnerId ? "#eff6ff" : "transparent",
                  }}
                >
                  <td style={{ padding: "10px 8px" }}>
                    <div style={{ fontWeight: 600 }}>{p.displayName}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace" }}>{p.partnerId}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>{p.templateId}</div>
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <StatusBadge status={p.status} />
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: p.kycStatus === "verified" ? "#22c55e" : "#f59e0b" }}>
                      {p.kycStatus}
                    </span>
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <RiskBadge level={p.riskLevel} />
                  </td>
                  <td style={{ padding: "10px 8px", fontWeight: 600, color: "#22c55e" }}>
                    ${p.currentBalance.toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    ${p.dailyUsed.toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    ${p.currentLimit.toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <span style={{ color: p.opsecScore > 50 ? "#ef4444" : p.opsecScore > 25 ? "#f59e0b" : "#22c55e", fontWeight: 600 }}>
                      {p.opsecScore}
                    </span>
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {p.status === "materialized" && (
                        <MiniButton label="Approve" color="#22c55e" onClick={(e) => { e.stopPropagation(); handleTransition(p.partnerId, "approve", ""); }} />
                      )}
                      {p.status === "active" && (
                        <>
                          <MiniButton label="Freeze" color="#f59e0b" onClick={(e) => { e.stopPropagation(); handleTransition(p.partnerId, "freeze", ""); }} />
                          <MiniButton label="Grad" color="#8b5cf6" onClick={(e) => { e.stopPropagation(); handleTransition(p.partnerId, "graduate", ""); }} />
                        </>
                      )}
                      {(p.status === "frozen" || p.status === "suspended") && (
                        <MiniButton label="Activate" color="#3b82f6" onClick={(e) => { e.stopPropagation(); handleTransition(p.partnerId, "reactivate", ""); }} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Partner Modal */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, width: 480, maxHeight: "80vh", overflow: "auto" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 20 }}>Create Partner</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>Partner ID *</label>
                <input value={createForm.partnerId} onChange={(e) => setCreateForm({ ...createForm, partnerId: e.target.value })} placeholder="PARTNER_001" style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>Template *</label>
                <select value={createForm.templateId} onChange={(e) => setCreateForm({ ...createForm, templateId: e.target.value })} style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, marginTop: 4 }}>
                  <option value="">Select template...</option>
                  {templates.map((t) => (
                    <option key={t.templateId} value={t.templateId}>{t.templateId}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>Display Name *</label>
                <input value={createForm.displayName} onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })} placeholder="Acme Trading" style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>Email *</label>
                <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="partner@example.com" style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>Phone</label>
                <input value={createForm.phone ?? ""} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="+1-555-0100" style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>Initial Balance</label>
                <input type="number" value={createForm.overrides?.runtime?.currentBalance ?? ""} onChange={(e) => setCreateForm({ ...createForm, overrides: { runtime: { ...createForm.overrides?.runtime, currentBalance: Number(e.target.value) } } })} placeholder="0" style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>KYC Status</label>
                <select value={createForm.overrides?.runtime?.kycStatus ?? "pending"} onChange={(e) => setCreateForm({ ...createForm, overrides: { runtime: { ...createForm.overrides?.runtime, kycStatus: e.target.value } } })} style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, marginTop: 4 }}>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "flex-end" }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontWeight: 500 }}>Cancel</button>
              <button onClick={handleCreatePartner} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ padding: 16, borderRadius: 10, background: color + "08", border: `1px solid ${color}20`, textAlign: "center" }}>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "#22c55e",
    cultivating: "#3b82f6",
    graduated: "#8b5cf6",
    materialized: "#f59e0b",
    kyc_pending: "#f97316",
    frozen: "#06b6d4",
    suspended: "#ef4444",
    terminated: "#6b7280",
    signup: "#9ca3af",
  };
  const c = colors[status] ?? "#6b7280";
  return (
    <span style={{
      padding: "3px 10px",
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      background: c + "18",
      color: c,
    }}>
      {status}
    </span>
  );
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    green: "#22c55e",
    yellow: "#eab308",
    orange: "#f97316",
    red: "#ef4444",
  };
  return (
    <span style={{ color: colors[level] ?? "#6b7280", fontWeight: 700, fontSize: 11 }}>
      {level.toUpperCase()}
    </span>
  );
}

function MiniButton({ label, color, onClick }: { label: string; color: string; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "3px 8px",
        borderRadius: 4,
        border: `1px solid ${color}`,
        background: color + "15",
        color,
        fontSize: 10,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function ResultBadge({ result }: { result: any }) {
  const color = result.allowed ? (result.action === "adjust" ? "#f59e0b" : "#22c55e") : "#ef4444";
  return (
    <span style={{
      padding: "4px 12px",
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 700,
      background: color + "20",
      color,
      textTransform: "uppercase",
    }}>
      {result.action}
    </span>
  );
}

export default PartnersPage;
