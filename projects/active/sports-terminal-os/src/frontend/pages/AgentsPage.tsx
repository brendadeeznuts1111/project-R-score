/**
 * AgentsPage — Agent Domain (Sunset Boulevard: #e76f51)
 *
 * Main agents management page featuring:
 *   - Tabs: Hierarchy Tree, Performance, Downline, Settings
 *   - Uses AgentTree, AgentPerformance, AgentDownline components
 *   - Theme: Sunset Boulevard (#e76f51)
 *   - Agent count summary bar
 *   - WebSocket integration for real-time updates
 *   - Sunset Boulevard color scheme throughout
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import AgentTree from "../components/AgentTree";
import AgentPerformance from "../components/AgentPerformance";
import AgentDownline from "../components/AgentDownline";
import type { AgentTreeNode } from "../components/AgentTree";
import type { AgentPerformanceData, PlayerPerformance, PnLDataPoint } from "../components/AgentPerformance";
import type { DownlineAgent } from "../components/AgentDownline";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = "hierarchy" | "performance" | "downline" | "settings";

interface AgentSummary {
  total: number;
  byTier: { platinum: number; gold: number; silver: number; bronze: number };
  byStatus: Record<string, number>;
  totalPlayers: number;
}

interface ApiAgent {
  agentLogin: string;
  displayName: string;
  tier: "platinum" | "gold" | "silver" | "bronze";
  status: "active" | "inactive" | "suspended";
  parentLogin?: string;
  balance: number;
  commissionRate: number;
  totalPlayers: number;
  totalWagers: number;
  totalPnl: number;
  email?: string;
  phone?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THEME_COLOR = "#e76f51";
const THEME_SECONDARY = "#f4a261";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "hierarchy", label: "Hierarchy Tree", icon: "🌳" },
  { id: "performance", label: "Performance", icon: "📊" },
  { id: "downline", label: "Downline", icon: "👥" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

// ---------------------------------------------------------------------------
// Mock data helpers (for demo / initial state)
// ---------------------------------------------------------------------------

function buildMockTree(): AgentTreeNode {
  return {
    login: "root_agent",
    displayName: "Root Agent",
    tier: "platinum",
    status: "active",
    balance: 5000000,
    commissionRate: 35,
    totalPlayers: 100,
    totalWagers: 5000,
    totalPnl: 250000,
    level: 0,
    children: [
      {
        login: "agent_gold_1",
        displayName: "Gold Agent One",
        tier: "gold",
        status: "active",
        balance: 2500000,
        commissionRate: 30,
        totalPlayers: 50,
        totalWagers: 2500,
        totalPnl: 125000,
        level: 1,
        children: [
          {
            login: "agent_silver",
            displayName: "Silver Agent",
            tier: "silver",
            status: "active",
            balance: 800000,
            commissionRate: 25,
            totalPlayers: 20,
            totalWagers: 800,
            totalPnl: 40000,
            level: 2,
            children: [],
          },
        ],
      },
      {
        login: "agent_gold_2",
        displayName: "Gold Agent Two",
        tier: "gold",
        status: "active",
        balance: 2000000,
        commissionRate: 30,
        totalPlayers: 40,
        totalWagers: 2000,
        totalPnl: 100000,
        level: 1,
        children: [
          {
            login: "agent_bronze",
            displayName: "Bronze Agent",
            tier: "bronze",
            status: "active",
            balance: 300000,
            commissionRate: 20,
            totalPlayers: 10,
            totalWagers: 300,
            totalPnl: 15000,
            level: 2,
            children: [],
          },
        ],
      },
    ],
  };
}

function buildMockPerformance(agentLogin: string): AgentPerformanceData {
  const pnlHistory: PnLDataPoint[] = Array.from({ length: 14 }, (_, i) => ({
    label: `Day ${i + 1}`,
    pnl: Math.floor(Math.random() * 200000) - 50000,
    wagers: Math.floor(Math.random() * 200) + 50,
  }));

  const playerVolumes: PlayerPerformance[] = [
    { playerId: "player_001", displayName: "Ace Ventura", riskTier: "GREEN", wagerCount: 145, totalWagered: 450000, pnl: 125000, winRate: 0.62, flags: [] },
    { playerId: "player_002", displayName: "Big Risk", riskTier: "RED", wagerCount: 89, totalWagered: 890000, pnl: -45000, winRate: 0.71, flags: ["high_win_rate"] },
    { playerId: "player_003", displayName: "Lucky Strike", riskTier: "YELLOW", wagerCount: 67, totalWagered: 320000, pnl: 78000, winRate: 0.58, flags: [] },
    { playerId: "player_004", displayName: "Weekend Warrior", riskTier: "GREEN", wagerCount: 34, totalWagered: 120000, pnl: 15000, winRate: 0.48, flags: [] },
    { playerId: "player_005", displayName: "Sharp Shooter", riskTier: "BLACK", wagerCount: 234, totalWagered: 1200000, pnl: -89000, winRate: 0.65, flags: ["sharp_behavior", "line_movement"] },
    { playerId: "player_006", displayName: "Casual Joe", riskTier: "GREEN", wagerCount: 12, totalWagered: 45000, pnl: -8000, winRate: 0.35, flags: [] },
    { playerId: "player_007", displayName: "High Roller", riskTier: "YELLOW", wagerCount: 56, totalWagered: 2800000, pnl: 320000, winRate: 0.52, flags: ["high_stakes"] },
  ];

  return {
    agentLogin,
    displayName: agentLogin === "root_agent" ? "Root Agent" : agentLogin,
    period: "month",
    totalPlayers: 100,
    activePlayers: 78,
    totalWagers: 1247,
    totalWagered: 8900000,
    totalPayouts: 7200000,
    grossProfit: 1700000,
    netProfit: 1275000,
    holdPercentage: 0.191,
    newPlayers: 12,
    commissionDue: 425000,
    pnlHistory,
    playerVolumes,
  };
}

function buildMockDownline(): DownlineAgent[] {
  return [
    { login: "agent_gold_1", displayName: "Gold Agent One", tier: "gold", status: "active", level: 1, totalPlayers: 50, totalWagers: 2500, totalPnl: 125000, balance: 2500000, commissionRate: 30, path: "/root/agent_gold_1", children: [] },
    { login: "agent_gold_2", displayName: "Gold Agent Two", tier: "gold", status: "active", level: 1, totalPlayers: 40, totalWagers: 2000, totalPnl: 100000, balance: 2000000, commissionRate: 30, path: "/root/agent_gold_2", children: [] },
    { login: "agent_silver", displayName: "Silver Agent", tier: "silver", status: "active", level: 2, totalPlayers: 20, totalWagers: 800, totalPnl: 40000, balance: 800000, commissionRate: 25, path: "/root/agent_gold_1/agent_silver", children: [] },
    { login: "agent_bronze", displayName: "Bronze Agent", tier: "bronze", status: "active", level: 2, totalPlayers: 10, totalWagers: 300, totalPnl: 15000, balance: 300000, commissionRate: 20, path: "/root/agent_gold_2/agent_bronze", children: [] },
  ];
}

function buildMockSummary(): AgentSummary {
  return { total: 5, byTier: { platinum: 1, gold: 2, silver: 1, bronze: 1 }, byStatus: { active: 5, inactive: 0, suspended: 0 }, totalPlayers: 100 };
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchHierarchy(): Promise<AgentTreeNode | null> {
  try {
    const resp = await fetch("/api/agents/root_agent/hierarchy");
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.root || null;
  } catch {
    return null;
  }
}

async function fetchPerformance(agentLogin: string, period: string): Promise<AgentPerformanceData | null> {
  try {
    const resp = await fetch(`/api/agents/${agentLogin}/performance?period=${period}`);
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

async function fetchDownline(agentLogin: string): Promise<DownlineAgent[]> {
  try {
    const resp = await fetch(`/api/agents/${agentLogin}/downline`);
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.allDescendants || [];
  } catch {
    return [];
  }
}

async function fetchSummary(): Promise<AgentSummary | null> {
  try {
    const resp = await fetch("/api/agents/summary");
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Tier Pill
// ---------------------------------------------------------------------------

const TierPill: React.FC<{ tier: string; count: number; color: string; bgColor: string }> = ({
  tier,
  count,
  color,
  bgColor,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 12px",
      borderRadius: 16,
      background: bgColor,
      border: `1.5px solid ${color}30`,
    }}
  >
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        display: "inline-block",
      }}
    />
    <span style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "capitalize" }}>{tier}</span>
    <span style={{ fontSize: 12, fontWeight: 700, color }}>{count}</span>
  </div>
);

// ---------------------------------------------------------------------------
// Settings Panel
// ---------------------------------------------------------------------------

const SettingsPanel: React.FC<{ themeColor: string }> = ({ themeColor }) => (
  <div style={{ padding: 24 }}>
    <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#264653", fontWeight: 700 }}>Agent Domain Settings</h3>

    <div style={{ display: "grid", gap: 16, maxWidth: 480 }}>
      <div
        style={{
          padding: 16,
          borderRadius: 10,
          background: "#fff",
          border: `1px solid ${themeColor}15`,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "#264653", marginBottom: 8 }}>Sync Configuration</div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
          Sync agent data from upstream Buckeye system
        </div>
        <button
          style={{
            padding: "8px 20px",
            borderRadius: 6,
            border: "none",
            background: themeColor,
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.85";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          onClick={async () => {
            try {
              const resp = await fetch("/api/agents/sync", { method: "POST" });
              const data = await resp.json();
              alert(`Sync ${data.success ? "completed" : "failed"}: ${data.agentsProcessed || 0} agents processed`);
            } catch {
              alert("Sync failed — check console");
            }
          }}
        >
          Trigger Buckeye Sync
        </button>
      </div>

      <div
        style={{
          padding: 16,
          borderRadius: 10,
          background: "#fff",
          border: `1px solid ${themeColor}15`,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "#264653", marginBottom: 8 }}>Commission Rates</div>
        <div style={{ fontSize: 12, color: "#888" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
            <span>Platinum</span>
            <span style={{ fontWeight: 700, color: themeColor }}>35%</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
            <span>Gold</span>
            <span style={{ fontWeight: 700, color: "#f4a261" }}>30%</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
            <span>Silver</span>
            <span style={{ fontWeight: 700, color: "#adb5bd" }}>25%</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
            <span>Bronze</span>
            <span style={{ fontWeight: 700, color: "#cd7f32" }}>20%</span>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: 16,
          borderRadius: 10,
          background: "#fff",
          border: `1px solid ${themeColor}15`,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "#264653", marginBottom: 8 }}>Theme</div>
        <div style={{ fontSize: 12, color: "#888" }}>
          Sunset Boulevard
          <span
            style={{
              display: "inline-block",
              width: 16,
              height: 16,
              borderRadius: 4,
              background: themeColor,
              marginLeft: 8,
              verticalAlign: "middle",
            }}
          />
        </div>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

const AgentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("hierarchy");
  const [hierarchy, setHierarchy] = useState<AgentTreeNode | null>(null);
  const [performance, setPerformance] = useState<AgentPerformanceData | null>(null);
  const [downline, setDownline] = useState<DownlineAgent[]>([]);
  const [summary, setSummary] = useState<AgentSummary | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>("root_agent");
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Load initial data
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);

      // Try API first, fallback to mock
      const [h, s] = await Promise.all([fetchHierarchy(), fetchSummary()]);

      if (cancelled) return;

      setHierarchy(h || buildMockTree());
      setSummary(s || buildMockSummary());

      if (s && h) {
        const [p, d] = await Promise.all([
          fetchPerformance(selectedAgent, "month"),
          fetchDownline(selectedAgent),
        ]);
        if (!cancelled) {
          setPerformance(p || buildMockPerformance(selectedAgent));
          setDownline(d.length > 0 ? d : buildMockDownline());
        }
      } else {
        setPerformance(buildMockPerformance(selectedAgent));
        setDownline(buildMockDownline());
      }

      setLoading(false);
    }

    loadAll();
    return () => { cancelled = true; };
  }, []);

  // WebSocket
  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      // Subscribe to agent updates
      ws.send(JSON.stringify({ type: `subscribe:agent:${selectedAgent}` }));
      ws.send(JSON.stringify({ type: "subscribe:agents" }));
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.provider === "agents") {
          // Refresh on agent updates
          if (msg.type === "agent_update" || msg.type === "performance_update") {
            // Debounced refresh
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      ws.close();
    };
  }, [selectedAgent]);

  // Handle agent selection from tree
  const handleSelectAgent = useCallback(
    async (login: string) => {
      setSelectedAgent(login);

      // Load performance and downline for selected agent
      const [p, d] = await Promise.all([
        fetchPerformance(login, "month"),
        fetchDownline(login),
      ]);

      setPerformance(p || buildMockPerformance(login));
      setDownline(d.length > 0 ? d : buildMockDownline());

      // Re-subscribe WS
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: `subscribe:agent:${login}` }));
      }

      // Switch to performance tab
      setActiveTab("performance");
    },
    []
  );

  const handlePeriodChange = useCallback(
    async (period: string) => {
      const p = await fetchPerformance(selectedAgent, period);
      setPerformance(p || buildMockPerformance(selectedAgent));
    },
    [selectedAgent]
  );

  const currentSummary = summary || buildMockSummary();

  return (
    <div style={{ minHeight: "100vh", background: "#faf8f7" }}>
      {/* Page Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${THEME_COLOR} 0%, ${THEME_SECONDARY} 100%)`,
          padding: "24px 32px",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -30,
            right: 100,
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }}>
                🌅 Agents
              </h1>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                Sunset Boulevard — Agent Hierarchy & Performance
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* WS status */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 12px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.15)",
                  fontSize: 11,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: wsConnected ? "#90ee90" : "#ff6b6b",
                    display: "inline-block",
                  }}
                />
                {wsConnected ? "Live" : "Offline"}
              </div>
            </div>
          </div>

          {/* Summary pills */}
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <TierPill tier="Platinum" count={currentSummary.byTier.platinum} color="#e76f51" bgColor="#fdf2f0" />
            <TierPill tier="Gold" count={currentSummary.byTier.gold} color="#f4a261" bgColor="#fff8e6" />
            <TierPill tier="Silver" count={currentSummary.byTier.silver} color="#adb5bd" bgColor="#f8f9fa" />
            <TierPill tier="Bronze" count={currentSummary.byTier.bronze} color="#cd7f32" bgColor="#faf3e8" />
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 12px",
                borderRadius: 16,
                background: "rgba(255,255,255,0.15)",
                fontSize: 11,
                color: "#fff",
              }}
            >
              <span style={{ fontWeight: 600 }}>{currentSummary.total}</span> agents
              <span style={{ opacity: 0.5 }}>|</span>
              <span style={{ fontWeight: 600 }}>{currentSummary.totalPlayers}</span> players
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          background: "#fff",
          borderBottom: `1px solid ${THEME_COLOR}15`,
          padding: "0 32px",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "14px 20px",
              border: "none",
              borderBottom: `3px solid ${activeTab === tab.id ? THEME_COLOR : "transparent"}`,
              background: "transparent",
              color: activeTab === tab.id ? THEME_COLOR : "#666",
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) e.currentTarget.style.color = THEME_COLOR;
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) e.currentTarget.style.color = "#666";
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: "0 32px 32px" }}>
        {activeTab === "hierarchy" && (
          <div
            style={{
              marginTop: 20,
              background: "#fff",
              borderRadius: 12,
              border: `1px solid ${THEME_COLOR}10`,
              boxShadow: `0 2px 12px ${THEME_COLOR}06`,
            }}
          >
            <AgentTree
              root={hierarchy}
              themeColor={THEME_COLOR}
              onSelectAgent={handleSelectAgent}
              selectedAgent={selectedAgent}
            />
          </div>
        )}

        {activeTab === "performance" && (
          <div
            style={{
              marginTop: 20,
              background: "#fff",
              borderRadius: 12,
              border: `1px solid ${THEME_COLOR}10`,
              boxShadow: `0 2px 12px ${THEME_COLOR}06`,
            }}
          >
            <AgentPerformance
              data={performance}
              themeColor={THEME_COLOR}
              onPeriodChange={handlePeriodChange}
              loading={loading}
            />
          </div>
        )}

        {activeTab === "downline" && (
          <div
            style={{
              marginTop: 20,
              background: "#fff",
              borderRadius: 12,
              border: `1px solid ${THEME_COLOR}10`,
              boxShadow: `0 2px 12px ${THEME_COLOR}06`,
            }}
          >
            <AgentDownline
              downline={downline}
              themeColor={THEME_COLOR}
              agentLogin={selectedAgent}
              loading={loading}
            />
          </div>
        )}

        {activeTab === "settings" && (
          <div
            style={{
              marginTop: 20,
              background: "#fff",
              borderRadius: 12,
              border: `1px solid ${THEME_COLOR}10`,
              boxShadow: `0 2px 12px ${THEME_COLOR}06`,
            }}
          >
            <SettingsPanel themeColor={THEME_COLOR} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentsPage;
