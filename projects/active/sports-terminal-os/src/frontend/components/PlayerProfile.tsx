/**
 * PlayerProfile Component — Player 360 View
 * Desert Rose Theme (#d4a5a5)
 *
 * Tabs: Overview, Performance, Wagers, Transactions, Risk, Notes, Links
 * Header: name, archetype, risk tier, balance
 */

import React, { useState, useEffect, useCallback } from "react";
import type { RiskTier, CustomerArchetype } from "../../utils/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlayerProfileData {
  id: number;
  customerId: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  balance: number;
  riskTier: RiskTier;
  riskScore: number;
  archetype?: CustomerArchetype | null;
  archetypeConfidence?: number | null;
  status: string;
  wagerCount: number;
  winRate?: number | null;
  avgStake?: number | null;
  lifetimePnl: number;
  agentLogin: string;
  lastWagerAt?: number | null;
  lastLoginAt?: number | null;
  createdAt: number;
  kycStatus: string;
}

interface PlayerProfileProps {
  playerId: string | null;
  onBack?: () => void;
}

type TabId = "overview" | "performance" | "wagers" | "transactions" | "risk" | "notes" | "links";

interface TabDef {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: TabDef[] = [
  { id: "overview", label: "Overview", icon: "\u{1F4CA}" },
  { id: "performance", label: "Performance", icon: "\u{1F4C8}" },
  { id: "wagers", label: "Wagers", icon: "\u{1F3C6}" },
  { id: "transactions", label: "Transactions", icon: "\u{1F4B0}" },
  { id: "risk", label: "Risk", icon: "\u{1F6A8}" },
  { id: "notes", label: "Notes", icon: "\u{1F4DD}" },
  { id: "links", label: "Links", icon: "\u{1F517}" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatPercent(val: number | null | undefined): string {
  if (val == null) return "--";
  return `${(val * 100).toFixed(1)}%`;
}

function formatDate(ts: number | null | undefined): string {
  if (!ts) return "--";
  return new Date(ts * 1000).toLocaleString();
}

const TIER_COLORS: Record<string, string> = {
  BLACK: "#1a1a1a",
  RED: "#dc3545",
  YELLOW: "#ffc107",
  GREEN: "#28a745",
};

const ARCHETYPE_LABELS: Record<string, string> = {
  sharp: "Sharp",
  whale: "Whale",
  chase_gambler: "Chase Gambler",
  new: "New",
  recreational: "Recreational",
  suspicious: "Suspicious",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PlayerProfile: React.FC<PlayerProfileProps> = ({ playerId, onBack }) => {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [player, setPlayer] = useState<PlayerProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tabData, setTabData] = useState<Record<string, unknown>>({});
  const [newNote, setNewNote] = useState("");
  const [newFlag, setNewFlag] = useState({ title: "", description: "", severity: "medium", flagType: "manual" });
  const [showFlagForm, setShowFlagForm] = useState(false);

  const token = localStorage.getItem("token") ?? "";

  const fetchPlayer = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/players/${playerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPlayer(data);
    } catch (err) {
      console.error("[PlayerProfile] fetch player error:", err);
    } finally {
      setLoading(false);
    }
  }, [playerId, token]);

  const fetchTabData = useCallback(async () => {
    if (!playerId) return;
    try {
      const endpoint = `/api/players/${playerId}/${activeTab}`;
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTabData(data);
    } catch (err) {
      console.error(`[PlayerProfile] fetch ${activeTab} error:`, err);
      setTabData({});
    }
  }, [playerId, activeTab, token]);

  useEffect(() => {
    fetchPlayer();
  }, [fetchPlayer]);

  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  const handleAddNote = async () => {
    if (!playerId || !newNote.trim()) return;
    try {
      const res = await fetch(`/api/players/${playerId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newNote.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNewNote("");
      fetchTabData();
    } catch (err) {
      console.error("[PlayerProfile] add note error:", err);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!playerId) return;
    try {
      const res = await fetch(`/api/players/${playerId}/notes/${noteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fetchTabData();
    } catch (err) {
      console.error("[PlayerProfile] delete note error:", err);
    }
  };

  const handleAddFlag = async () => {
    if (!playerId || !newFlag.title.trim()) return;
    try {
      const res = await fetch(`/api/players/${playerId}/flags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newFlag),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNewFlag({ title: "", description: "", severity: "medium", flagType: "manual" });
      setShowFlagForm(false);
      fetchTabData();
    } catch (err) {
      console.error("[PlayerProfile] add flag error:", err);
    }
  };

  const handleResolveFlag = async (flagId: number) => {
    if (!playerId) return;
    try {
      const res = await fetch(`/api/players/${playerId}/flags/${flagId}/resolve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fetchTabData();
    } catch (err) {
      console.error("[PlayerProfile] resolve flag error:", err);
    }
  };

  if (!playerId) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#666",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>{"\u{1F464}"}</div>
        <div style={{ fontSize: "16px" }}>Select a player to view their 360 profile</div>
      </div>
    );
  }

  if (loading || !player) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#d4a5a5" }}>
        Loading player profile...
      </div>
    );
  }

  const isPositivePnl = player.lifetimePnl >= 0;
  const tierColor = TIER_COLORS[player.riskTier] ?? "#28a745";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* ===== HEADER ===== */}
      <div
        style={{
          background: "#1a1a2e",
          borderRadius: "12px",
          padding: "16px 20px",
          border: "1px solid rgba(212,165,165,0.15)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: "rgba(212,165,165,0.15)",
                border: "none",
                color: "#d4a5a5",
                padding: "6px 12px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              &larr; Back
            </button>
          )}

          <div
            className="player-avatar"
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: `linear-gradient(135deg, #d4a5a5, #c48e8e)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
            }}
          >
            {player.displayName?.charAt(0)?.toUpperCase() || "?"}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "18px", fontWeight: 700 }}>{player.displayName}</span>
              {player.archetype && (
                <span
                  className={`archetype-${player.archetype}`}
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "2px 8px",
                    borderRadius: "8px",
                    background: "rgba(212,165,165,0.2)",
                    color: "#d4a5a5",
                  }}
                >
                  {ARCHETYPE_LABELS[player.archetype] ?? player.archetype}
                </span>
              )}
            </div>
            <div style={{ fontSize: "12px", color: "#888" }}>
              {player.email} &middot; {player.customerId}
            </div>
          </div>

          {/* Risk tier badge */}
          <div
            className={`risk-tier-${player.riskTier.toLowerCase()}`}
            style={{
              background: tierColor,
              color: player.riskTier === "YELLOW" ? "#212529" : "#fff",
              padding: "5px 14px",
              borderRadius: "8px",
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {player.riskTier}
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
          <StatBox label="Balance" value={formatCents(player.balance)} />
          <StatBox
            label="Win Rate"
            value={formatPercent(player.winRate)}
            color={
              (player.winRate ?? 0) > 0.55 ? "#d4a5a5" : (player.winRate ?? 0) > 0.4 ? "#e0e0e0" : "#ff6347"
            }
          />
          <StatBox label="Wagers" value={player.wagerCount.toLocaleString()} />
          <StatBox
            label="P&L"
            value={`${isPositivePnl ? "+" : ""}${formatCents(player.lifetimePnl)}`}
            color={isPositivePnl ? "#28a745" : "#dc3545"}
          />
          <StatBox label="Risk Score" value={String(player.riskScore)} color={tierColor} />
        </div>
      </div>

      {/* ===== TABS ===== */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginTop: "12px",
          borderBottom: "1px solid rgba(212,165,165,0.15)",
          flexShrink: 0,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: 600,
              background: activeTab === tab.id ? "rgba(212,165,165,0.15)" : "transparent",
              border: "none",
              borderBottom: `2px solid ${activeTab === tab.id ? "#d4a5a5" : "transparent"}`,
              color: activeTab === tab.id ? "#d4a5a5" : "#888",
              cursor: "pointer",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ===== TAB CONTENT ===== */}
      <div style={{ flex: 1, overflowY: "auto", marginTop: "12px" }}>
        {activeTab === "overview" && <OverviewTab player={player} tabData={tabData} />}
        {activeTab === "performance" && <PerformanceTab tabData={tabData} />}
        {activeTab === "wagers" && <WagersTab tabData={tabData} />}
        {activeTab === "transactions" && <TransactionsTab tabData={tabData} />}
        {activeTab === "risk" && (
          <RiskTab
            tabData={tabData}
            showFlagForm={showFlagForm}
            setShowFlagForm={setShowFlagForm}
            newFlag={newFlag}
            setNewFlag={setNewFlag}
            onAddFlag={handleAddFlag}
            onResolveFlag={handleResolveFlag}
          />
        )}
        {activeTab === "notes" && (
          <NotesTab
            tabData={tabData}
            newNote={newNote}
            setNewNote={setNewNote}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
          />
        )}
        {activeTab === "links" && <LinksTab tabData={tabData} />}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// StatBox
// ---------------------------------------------------------------------------

const StatBox: React.FC<{ label: string; value: string; color?: string }> = ({
  label,
  value,
  color,
}) => (
  <div
    style={{
      background: "#252540",
      borderRadius: "8px",
      padding: "8px 12px",
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: "10px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>
      {label}
    </div>
    <div style={{ fontSize: "14px", fontWeight: 700, color: color ?? "#e0e0e0", marginTop: "2px" }}>
      {value}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

const OverviewTab: React.FC<{
  player: PlayerProfileData;
  tabData: Record<string, unknown>;
}> = ({ player }) => {
  const stats = [
    { label: "Customer ID", value: player.customerId },
    { label: "Agent", value: player.agentLogin },
    { label: "Status", value: player.status },
    { label: "KYC Status", value: player.kycStatus },
    { label: "Avg Stake", value: player.avgStake ? formatCents(player.avgStake) : "--" },
    { label: "Last Wager", value: formatDate(player.lastWagerAt) },
    { label: "Last Login", value: formatDate(player.lastLoginAt) },
    { label: "Created", value: formatDate(player.createdAt) },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            background: "#1a1a2e",
            borderRadius: "8px",
            padding: "12px 16px",
            border: "1px solid rgba(212,165,165,0.1)",
          }}
        >
          <div style={{ fontSize: "10px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {s.label}
          </div>
          <div style={{ fontSize: "13px", fontWeight: 600, marginTop: "4px", color: "#e0e0e0" }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Performance Tab
// ---------------------------------------------------------------------------

const PerformanceTab: React.FC<{ tabData: Record<string, unknown> }> = ({ tabData }) => {
  const summary = (tabData as Record<string, unknown>)?.summary as Record<string, unknown> | undefined;
  const bySport = (tabData as Record<string, unknown>)?.bySport as
    | Array<Record<string, unknown>>
    | undefined;
  const daily = (tabData as Record<string, unknown>)?.daily as
    | Array<Record<string, unknown>>
    | undefined;

  if (!summary) {
    return <EmptyState message="No performance data available" />;
  }

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "16px" }}>
        <StatBox label="Wagers" value={String((summary?.wagers ?? 0))} />
        <StatBox label="Win Rate" value={formatPercent(summary?.winRate as number)} color="#d4a5a5" />
        <StatBox
          label="P&L"
          value={`${(summary?.profitLoss as number ?? 0) >= 0 ? "+" : ""}${formatCents((summary?.profitLoss as number) ?? 0)}`}
          color={(summary?.profitLoss as number ?? 0) >= 0 ? "#28a745" : "#dc3545"}
        />
        <StatBox label="ROI" value={formatPercent(summary?.roi as number)} />
      </div>

      {/* Sport breakdown */}
      {bySport && bySport.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <h4 style={{ color: "#d4a5a5", fontSize: "13px", marginBottom: "8px" }}>By Sport</h4>
          <DataTable
            headers={["Sport", "Wagers", "Wagered", "P&L", "Win Rate"]}
            rows={bySport.map((s) => [
              String(s.sport ?? ""),
              String(s.wagers ?? 0),
              formatCents(Number(s.wagered ?? 0)),
              `${(Number(s.pnl ?? 0)) >= 0 ? "+" : ""}${formatCents(Number(s.pnl ?? 0))}`,
              formatPercent(s.winRate as number),
            ])}
          />
        </div>
      )}

      {/* Daily chart */}
      {daily && daily.length > 0 && (
        <div>
          <h4 style={{ color: "#d4a5a5", fontSize: "13px", marginBottom: "8px" }}>Daily (Last 30 Days)</h4>
          <DataTable
            headers={["Date", "Wagers", "Wagered", "P&L", "Win Rate"]}
            rows={daily.map((d) => [
              String(d.date ?? ""),
              String(d.wagers ?? 0),
              formatCents(Number(d.wagered ?? 0)),
              `${(Number(d.pnl ?? 0)) >= 0 ? "+" : ""}${formatCents(Number(d.pnl ?? 0))}`,
              formatPercent(d.winRate as number),
            ])}
          />
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Wagers Tab
// ---------------------------------------------------------------------------

const WagersTab: React.FC<{ tabData: Record<string, unknown> }> = ({ tabData }) => {
  const items = (tabData as Record<string, unknown>)?.items as Array<Record<string, unknown>> | undefined;

  if (!items || items.length === 0) {
    return <EmptyState message="No wager history" />;
  }

  return (
    <DataTable
      headers={["Wager #", "Sport", "Event", "Market", "Selection", "Odds", "Stake", "Result", "Placed"]}
      rows={items.map((w) => [
        String(w.wagerNumber ?? "").slice(0, 12),
        String(w.sport ?? ""),
        String(w.eventName ?? "").slice(0, 20),
        String(w.market ?? ""),
        String(w.selection ?? "").slice(0, 18),
        String(w.odds ?? ""),
        formatCents(Number(w.stake ?? 0)),
        String(w.result ?? w.status ?? "pending"),
        formatDate(Number(w.placedAt)),
      ])}
    />
  );
};

// ---------------------------------------------------------------------------
// Transactions Tab
// ---------------------------------------------------------------------------

const TransactionsTab: React.FC<{ tabData: Record<string, unknown> }> = ({ tabData }) => {
  const items = (tabData as Record<string, unknown>)?.items as Array<Record<string, unknown>> | undefined;

  if (!items || items.length === 0) {
    return <EmptyState message="No transaction history" />;
  }

  return (
    <DataTable
      headers={["Type", "Amount", "Currency", "Status", "Method", "Date"]}
      rows={items.map((t) => [
        String(t.transactionType ?? t.transaction_type ?? ""),
        `${(Number(t.amount ?? 0)) >= 0 ? "+" : ""}${formatCents(Math.abs(Number(t.amount ?? 0)))}`,
        String(t.currency ?? "USD"),
        String(t.status ?? ""),
        String(t.method ?? "--"),
        formatDate(Number(t.createdAt ?? t.created_at)),
      ])}
    />
  );
};

// ---------------------------------------------------------------------------
// Risk Tab
// ---------------------------------------------------------------------------

const RiskTab: React.FC<{
  tabData: Record<string, unknown>;
  showFlagForm: boolean;
  setShowFlagForm: (v: boolean) => void;
  newFlag: { title: string; description: string; severity: string; flagType: string };
  setNewFlag: React.Dispatch<React.SetStateAction<{ title: string; description: string; severity: string; flagType: string }>>;
  onAddFlag: () => void;
  onResolveFlag: (flagId: number) => void;
}> = ({ tabData, showFlagForm, setShowFlagForm, newFlag, setNewFlag, onAddFlag, onResolveFlag }) => {
  const flags = (tabData as Record<string, unknown>)?.flags as Array<Record<string, unknown>> | undefined;
  const violations = (tabData as Record<string, unknown>)?.violations as
    | Array<Record<string, unknown>>
    | undefined;

  return (
    <div>
      {/* Flags section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h4 style={{ color: "#d4a5a5", fontSize: "13px" }}>
          Active Flags ({String((tabData as Record<string, unknown>)?.openCount ?? 0)})
        </h4>
        <button
          onClick={() => setShowFlagForm(!showFlagForm)}
          style={{
            background: "rgba(220,53,69,0.15)",
            border: "1px solid rgba(220,53,69,0.4)",
            color: "#dc3545",
            padding: "4px 12px",
            borderRadius: "6px",
            fontSize: "11px",
            cursor: "pointer",
          }}
        >
          {showFlagForm ? "Cancel" : "+ Add Flag"}
        </button>
      </div>

      {showFlagForm && (
        <div
          style={{
            background: "#252540",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "12px",
            border: "1px solid rgba(220,53,69,0.3)",
          }}
        >
          <input
            placeholder="Flag title"
            value={newFlag.title}
            onChange={(e) => setNewFlag((p) => ({ ...p, title: e.target.value }))}
            style={{ ...inputStyle, marginBottom: "8px" }}
          />
          <textarea
            placeholder="Description"
            value={newFlag.description}
            onChange={(e) => setNewFlag((p) => ({ ...p, description: e.target.value }))}
            style={{ ...inputStyle, marginBottom: "8px", minHeight: "60px", resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <select
              value={newFlag.severity}
              onChange={(e) => setNewFlag((p) => ({ ...p, severity: e.target.value }))}
              style={{ ...inputStyle, width: "auto" }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <select
              value={newFlag.flagType}
              onChange={(e) => setNewFlag((p) => ({ ...p, flagType: e.target.value }))}
              style={{ ...inputStyle, width: "auto" }}
            >
              <option value="risk">Risk</option>
              <option value="compliance">Compliance</option>
              <option value="fraud">Fraud</option>
              <option value="vip">VIP</option>
              <option value="manual">Manual</option>
            </select>
            <button
              onClick={onAddFlag}
              style={{
                background: "#dc3545",
                border: "none",
                color: "#fff",
                padding: "6px 16px",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Add Flag
            </button>
          </div>
        </div>
      )}

      {flags && flags.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {flags.map((flag) => (
            <div
              key={String(flag.id)}
              className="flag-active"
              style={{
                background: "#1a1a2e",
                borderRadius: "8px",
                padding: "12px",
                border: "1px solid rgba(220,53,69,0.2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#e0e0e0" }}>
                      {String(flag.title ?? "")}
                    </span>
                    <SeverityBadge severity={String(flag.severity ?? "medium")} />
                  </div>
                  <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
                    {String(flag.flagType ?? flag.flag_type ?? "")} &middot;{" "}
                    {String(flag.source ?? "")} &middot; {formatDate(Number(flag.createdAt ?? flag.created_at))}
                  </div>
                  {Boolean(flag.description) && (
                    <div style={{ fontSize: "12px", color: "#aaa", marginTop: "4px" }}>
                      {flag.description as React.ReactNode}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onResolveFlag(Number(flag.id))}
                  style={{
                    background: "rgba(40,167,69,0.15)",
                    border: "1px solid rgba(40,167,69,0.3)",
                    color: "#28a745",
                    padding: "3px 10px",
                    borderRadius: "6px",
                    fontSize: "10px",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="No active flags" />
      )}

      {/* Violations */}
      {violations && violations.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <h4 style={{ color: "#d4a5a5", fontSize: "13px", marginBottom: "8px" }}>Recent Violations</h4>
          <DataTable
            headers={["Type", "Severity", "Description", "Date"]}
            rows={violations.map((v) => [
              String(v.violationType ?? v.violation_type ?? ""),
              String(v.severity ?? ""),
              String(v.description ?? "").slice(0, 40),
              formatDate(Number(v.createdAt ?? v.created_at)),
            ])}
          />
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Notes Tab
// ---------------------------------------------------------------------------

const NotesTab: React.FC<{
  tabData: Record<string, unknown>;
  newNote: string;
  setNewNote: (v: string) => void;
  onAddNote: () => void;
  onDeleteNote: (noteId: number) => void;
}> = ({ tabData, newNote, setNewNote, onAddNote, onDeleteNote }) => {
  const notes = (tabData as Record<string, unknown>)?.notes as Array<Record<string, unknown>> | undefined;

  return (
    <div>
      {/* Add note */}
      <div
        style={{
          background: "#1a1a2e",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "12px",
          border: "1px solid rgba(212,165,165,0.15)",
        }}
      >
        <textarea
          placeholder="Add a staff note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          style={{ ...inputStyle, minHeight: "60px", resize: "vertical", marginBottom: "8px" }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onAddNote();
          }}
        />
        <button
          onClick={onAddNote}
          disabled={!newNote.trim()}
          style={{
            background: newNote.trim() ? "rgba(212,165,165,0.25)" : "rgba(212,165,165,0.05)",
            border: `1px solid ${newNote.trim() ? "#d4a5a5" : "rgba(212,165,165,0.1)"}`,
            color: newNote.trim() ? "#d4a5a5" : "#555",
            padding: "6px 16px",
            borderRadius: "6px",
            fontSize: "12px",
            cursor: newNote.trim() ? "pointer" : "not-allowed",
          }}
        >
          Add Note
        </button>
      </div>

      {/* Notes list */}
      {notes && notes.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {notes.map((note) => (
            <div
              key={String(note.id)}
              style={{
                background: "#1a1a2e",
                borderRadius: "8px",
                padding: "12px",
                border: "1px solid rgba(212,165,165,0.1)",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: "13px", color: "#e0e0e0", lineHeight: 1.5, flex: 1 }}>
                  {String(note.content ?? "")}
                </div>
                <button
                  onClick={() => onDeleteNote(Number(note.id))}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#666",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "0 4px",
                    flexShrink: 0,
                  }}
                  title="Delete note"
                >
                  &times;
                </button>
              </div>
              <div style={{ fontSize: "11px", color: "#666", marginTop: "6px" }}>
                {String(note.agentLogin ?? note.agent_login ?? "System")} &middot;{" "}
                {formatDate(Number(note.createdAt ?? note.created_at))}
                {Boolean(note.isPinned) && (
                  <span style={{ color: "#d4a5a5", marginLeft: "8px" }}>{"\u{1F4CC}"} Pinned</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="No notes yet" />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Links Tab
// ---------------------------------------------------------------------------

const LinksTab: React.FC<{ tabData: Record<string, unknown> }> = ({ tabData }) => {
  const links = (tabData as Record<string, unknown>)?.links as Array<Record<string, unknown>> | undefined;

  if (!links || links.length === 0) {
    return <EmptyState message="No linked accounts, devices, or IPs found" />;
  }

  return (
    <DataTable
      headers={["Type", "Value", "Confidence", "Occurrences", "First Seen", "Last Seen"]}
      rows={links.map((l) => [
        String(l.linkType ?? l.link_type ?? ""),
        String(l.linkValue ?? l.link_value ?? ""),
        `${l.confidence ?? 0}%`,
        String(l.occurrenceCount ?? l.occurrence_count ?? 0),
        formatDate(Number(l.firstSeen ?? l.first_seen)),
        formatDate(Number(l.lastSeen ?? l.last_seen)),
      ])}
    />
  );
};

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div
    style={{
      textAlign: "center",
      padding: "40px 20px",
      color: "#666",
      background: "#1a1a2e",
      borderRadius: "8px",
      border: "1px solid rgba(212,165,165,0.1)",
    }}
  >
    <div style={{ fontSize: "28px", marginBottom: "8px" }}>{"\u{1F4C3}"}</div>
    <div style={{ fontSize: "13px" }}>{message}</div>
  </div>
);

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const colors: Record<string, string> = {
    critical: "#ff0000",
    high: "#dc3545",
    medium: "#ffc107",
    low: "#28a745",
  };
  return (
    <span
      style={{
        fontSize: "9px",
        fontWeight: 700,
        textTransform: "uppercase",
        padding: "2px 8px",
        borderRadius: "6px",
        background: `${colors[severity] ?? "#666"}20`,
        color: colors[severity] ?? "#666",
        border: `1px solid ${colors[severity] ?? "#666"}40`,
      }}
    >
      {severity}
    </span>
  );
};

const DataTable: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => (
  <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid rgba(212,165,165,0.2)" }}>
          {headers.map((h) => (
            <th
              key={h}
              style={{
                padding: "8px 10px",
                textAlign: "left",
                color: "#d4a5a5",
                fontWeight: 600,
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={i}
            style={{
              borderBottom: "1px solid rgba(212,165,165,0.08)",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(212,165,165,0.05)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            {row.map((cell, j) => (
              <td
                key={j}
                style={{
                  padding: "8px 10px",
                  color: "#ccc",
                  whiteSpace: j === 0 ? "nowrap" : "normal",
                }}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#1a1a2e",
  border: "1px solid rgba(212,165,165,0.2)",
  borderRadius: "6px",
  color: "#e0e0e0",
  padding: "8px 10px",
  fontSize: "12px",
  outline: "none",
  fontFamily: "inherit",
};

export default PlayerProfile;
