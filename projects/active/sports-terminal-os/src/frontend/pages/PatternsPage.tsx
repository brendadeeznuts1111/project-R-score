/**
 * PatternsPage.tsx — Zone 2 (Golden Hour)
 *
 * Main Patterns tab page with three sub-tabs:
 *   - Patterns Timeline (PatternHistory component)
 *   - Rules Engine (RulesEngine component)
 *   - Simulations (execution log)
 *
 * Theme: Golden Hour (#f4a900)
 */

import React, { useState, useEffect, useCallback } from "react";
import { PatternHistory } from "../components/PatternHistory";
import { RulesEngine } from "../components/RulesEngine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabKey = "patterns" | "rules" | "simulations";

type PatternType = "steam_moves" | "reverse_line" | "public_money" | "sharp_money" | "line_freeze" | "key_number";
type PatternConfidence = "low" | "medium" | "high";

interface PatternFactor {
  factor: string;
  weight: number;
  description: string;
  value?: number | string;
}

interface Pattern {
  id: string;
  patternType: PatternType;
  sport: string;
  eventId: string;
  market: string;
  description: string;
  confidence: number;
  confidenceLabel: PatternConfidence;
  factors: PatternFactor[];
  triggeredByRuleId?: string;
  detectedAt: number;
}

type RuleType = "odds_threshold" | "line_movement_pct" | "steam_detected" | "confidence_level" | "time_based";
type Comparator = "eq" | "gt" | "lt" | "gte" | "lte" | "between" | "contains";
type LogicOperator = "AND" | "OR";
type ActionType = "alert" | "simulate" | "webhook" | "log_only";

interface RuleCondition {
  field: string;
  comparator: Comparator;
  value: number | string | boolean | [number, number];
  logic?: LogicOperator;
}

interface RuleAction {
  type: ActionType;
  config: Record<string, unknown>;
}

interface TradingRule {
  id: string;
  name: string;
  description: string;
  ruleType: RuleType;
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled: boolean;
  priority: number;
  simulationCount: number;
  winCount: number;
  lossCount: number;
  totalPnl: number;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
}

interface RuleExecution {
  id: string;
  ruleId: string;
  ruleName: string;
  executionType: "simulated" | "live";
  pnl: number;
  matched: boolean;
  executedAt: number;
}

interface BacktestResult {
  totalExecutions: number;
  wins: number;
  losses: number;
  pushes: number;
  totalPnl: number;
  avgPnl: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THEME_COLOR = "#f4a900";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "patterns", label: "Patterns Timeline", icon: "📊" },
  { key: "rules", label: "Rules Engine", icon: "⚙️" },
  { key: "simulations", label: "Simulations", icon: "🧪" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PatternsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("patterns");
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [rules, setRules] = useState<TradingRule[]>([]);
  const [executions, setExecutions] = useState<RuleExecution[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch patterns
  const fetchPatterns = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/patterns?limit=100");
      const data = await res.json();
      if (data.patterns) setPatterns(data.patterns);
    } catch (err) {
      console.error("Failed to fetch patterns:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch rules
  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/rules");
      const data = await res.json();
      if (data.rules) setRules(data.rules);
    } catch (err) {
      console.error("Failed to fetch rules:", err);
    }
  }, []);

  // Fetch executions
  const fetchExecutions = useCallback(async () => {
    try {
      const res = await fetch("/api/rules/all/executions?limit=50");
      const data = await res.json();
      if (data.executions) setExecutions(data.executions);
    } catch {
      // Aggregated endpoint may not exist — fetch per rule
      const execs: RuleExecution[] = [];
      for (const rule of rules) {
        try {
          const res = await fetch(`/api/rules/${rule.id}/executions?limit=10`);
          const data = await res.json();
          if (data.executions) {
            for (const e of data.executions) {
              execs.push({ ...e, ruleName: rule.name });
            }
          }
        } catch {
          // Ignore per-rule errors
        }
      }
      setExecutions(execs.sort((a, b) => b.executedAt - a.executedAt).slice(0, 50));
    }
  }, [rules]);

  // Initial load
  useEffect(() => {
    fetchPatterns();
    fetchRules();
  }, [fetchPatterns, fetchRules]);

  // Load executions when sim tab active
  useEffect(() => {
    if (activeTab === "simulations") {
      fetchExecutions();
    }
  }, [activeTab, fetchExecutions]);

  // Create rule
  const handleCreateRule = async (ruleData: Omit<TradingRule, "id" | "simulationCount" | "winCount" | "lossCount" | "totalPnl" | "createdAt" | "updatedAt">) => {
    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruleData),
      });
      if (res.ok) {
        await fetchRules();
      }
    } catch (err) {
      console.error("Failed to create rule:", err);
    }
  };

  // Update rule
  const handleUpdateRule = async (id: string, updates: Partial<TradingRule>) => {
    try {
      const res = await fetch(`/api/rules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        await fetchRules();
      }
    } catch (err) {
      console.error("Failed to update rule:", err);
    }
  };

  // Delete rule
  const handleDeleteRule = async (id: string) => {
    try {
      const res = await fetch(`/api/rules/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRules((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete rule:", err);
    }
  };

  // Toggle rule
  const handleToggleRule = async (id: string) => {
    try {
      const res = await fetch(`/api/rules/${id}/toggle`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: data.rule?.enabled ?? r.enabled } : r)));
      }
    } catch (err) {
      console.error("Failed to toggle rule:", err);
    }
  };

  // Execute rule
  const handleExecuteRule = async (id: string, context: Record<string, unknown>) => {
    const res = await fetch(`/api/rules/${id}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(context),
    });
    return res.json();
  };

  // Backtest rule
  const handleBacktestRule = async (id: string): Promise<BacktestResult> => {
    const res = await fetch(`/api/rules/${id}/backtest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    return data.backtest;
  };

  // Get stats
  const handleGetStats = (id: string) => {
    const rule = rules.find((r) => r.id === id);
    if (!rule) return undefined;
    const total = rule.simulationCount;
    return {
      simulationCount: total,
      winCount: rule.winCount,
      lossCount: rule.lossCount,
      winRate: total > 0 ? Math.round((rule.winCount / total) * 1000) / 10 : 0,
      totalPnl: rule.totalPnl,
      avgPnl: total > 0 ? Math.round(rule.totalPnl / total) : 0,
    };
  };

  // Refresh patterns
  const handleRefreshPatterns = async () => {
    try {
      await fetch("/api/patterns/refresh", { method: "POST" });
      await fetchPatterns();
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  };

  // Format P&L
  const formatPnl = (pnl: number) => {
    const sign = pnl >= 0 ? "+" : "";
    return `${sign}$${(pnl / 100).toFixed(2)}`;
  };

  // Execution outcome class
  const getOutcomeClass = (pnl: number, matched: boolean) => {
    if (!matched) return "simulation-pending";
    return pnl >= 0 ? "simulation-win" : "simulation-loss";
  };

  return (
    <div style={styles.page}>
      {/* Page header */}
      <div style={styles.header}>
        <h2 style={styles.pageTitle}>
          <span style={styles.zoneBadge}>ZONE 2</span>
          <span style={styles.titleText}>Patterns & Rules Engine</span>
          <span style={styles.themeDot} />
        </h2>
        <div style={styles.headerMeta}>
          {isLoading && <span style={styles.loading}>Loading...</span>}
          <span style={styles.countBadge}>{patterns.length} patterns</span>
          <span style={styles.countBadge}>{rules.length} rules</span>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            style={{
              ...styles.tab,
              ...(activeTab === tab.key ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            <span style={styles.tabIcon}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={styles.content}>
        {activeTab === "patterns" && (
          <PatternHistory
            patterns={patterns}
            wsConnected={wsConnected}
            onRefresh={handleRefreshPatterns}
          />
        )}

        {activeTab === "rules" && (
          <RulesEngine
            rules={rules}
            onCreateRule={handleCreateRule}
            onUpdateRule={handleUpdateRule}
            onDeleteRule={handleDeleteRule}
            onToggleRule={handleToggleRule}
            onExecuteRule={handleExecuteRule}
            onBacktestRule={handleBacktestRule}
            onGetStats={handleGetStats}
          />
        )}

        {activeTab === "simulations" && (
          <div style={styles.simContainer}>
            <h3 style={styles.simTitle}>🧪 Simulation Log</h3>
            {executions.length === 0 ? (
              <div style={styles.empty}>No simulations yet. Execute a rule to see results here.</div>
            ) : (
              <div style={styles.simTable}>
                <div style={styles.simHeader}>
                  <span style={styles.simCol}>Time</span>
                  <span style={styles.simCol}>Rule</span>
                  <span style={styles.simCol}>Type</span>
                  <span style={styles.simCol}>Result</span>
                  <span style={styles.simCol}>P&L</span>
                </div>
                {executions.map((exec) => (
                  <div
                    key={exec.id}
                    className={getOutcomeClass(exec.pnl, exec.matched)}
                    style={{
                      ...styles.simRow,
                      backgroundColor: exec.pnl >= 0 ? "#22c55e11" : "#ef444411",
                    }}
                  >
                    <span style={styles.simCol}>
                      {new Date(exec.executedAt * 1000).toLocaleTimeString()}
                    </span>
                    <span style={styles.simColName}>{exec.ruleName}</span>
                    <span style={styles.simCol}>
                      <span style={{ ...styles.typeTag, backgroundColor: exec.executionType === "live" ? "#ef444433" : "#6ab0ff33", color: exec.executionType === "live" ? "#ef4444" : "#6ab0ff" }}>
                        {exec.executionType}
                      </span>
                    </span>
                    <span style={styles.simCol}>
                      <span style={{ color: exec.matched ? "#22c55e" : "#666" }}>
                        {exec.matched ? "✓ matched" : "✗ no match"}
                      </span>
                    </span>
                    <span style={{ ...styles.simCol, color: exec.pnl >= 0 ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                      {formatPnl(exec.pnl)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: "#080808",
    minHeight: "100vh",
    color: "#e0e0e0",
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    padding: 20,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: `2px solid ${THEME_COLOR}44`,
  },
  pageTitle: {
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 22,
    fontWeight: 700,
  },
  zoneBadge: {
    backgroundColor: THEME_COLOR,
    color: "#0d0d0d",
    padding: "2px 10px",
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "1px",
  },
  titleText: {
    color: "#e0e0e0",
  },
  themeDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    backgroundColor: THEME_COLOR,
    display: "inline-block",
    boxShadow: `0 0 8px ${THEME_COLOR}`,
  },
  headerMeta: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  loading: {
    fontSize: 12,
    color: THEME_COLOR,
  },
  countBadge: {
    backgroundColor: "#1a1a1a",
    color: "#888",
    padding: "3px 10px",
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
  },
  tabBar: {
    display: "flex",
    gap: 4,
    marginBottom: 20,
  },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 20px",
    border: "none",
    backgroundColor: "#141414",
    color: "#888",
    cursor: "pointer",
    borderRadius: "8px 8px 0 0",
    fontSize: 14,
    fontWeight: 500,
    transition: "all 0.2s",
    borderBottom: "2px solid transparent",
  },
  tabActive: {
    backgroundColor: "#1a1a1a",
    color: THEME_COLOR,
    borderBottom: `2px solid ${THEME_COLOR}`,
  },
  tabIcon: {
    fontSize: 16,
  },
  content: {
    backgroundColor: "#0d0d0d",
    borderRadius: "0 8px 8px 8px",
    minHeight: 500,
  },
  simContainer: {
    padding: 16,
  },
  simTitle: {
    margin: "0 0 16px 0",
    fontSize: 16,
    color: THEME_COLOR,
    fontWeight: 600,
  },
  empty: {
    textAlign: "center",
    padding: 40,
    color: "#666",
    fontSize: 14,
  },
  simTable: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  simHeader: {
    display: "grid",
    gridTemplateColumns: "100px 1fr 100px 120px 80px",
    gap: 8,
    padding: "8px 12px",
    backgroundColor: "#1a1a1a",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  simRow: {
    display: "grid",
    gridTemplateColumns: "100px 1fr 100px 120px 80px",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 6,
    fontSize: 12,
    alignItems: "center",
    transition: "all 0.15s",
  },
  simCol: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  simColName: {
    fontWeight: 600,
    color: "#ccc",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  typeTag: {
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
  },
};

export default PatternsPage;
