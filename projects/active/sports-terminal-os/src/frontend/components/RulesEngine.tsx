/**
 * RulesEngine.tsx — Zone 2 (Golden Hour)
 *
 * Rules engine UI component:
 *   - Rules list with status (enabled/disabled), type, priority
 *   - Rule builder form with condition builder (AND/OR logic)
 *   - Action configuration (alert, simulate, webhook dispatch)
 *   - Execute button with simulation result display
 *   - Backtest panel with historical results
 *   - Win rate and P&L summary
 *   - CSS classes: .rule-card, .rule-enabled, .rule-disabled, .condition-group, .simulation-result
 */

import React, { useState, useCallback, useMemo } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RuleType = "odds_threshold" | "line_movement_pct" | "steam_detected" | "confidence_level" | "time_based";
type Comparator = "eq" | "gt" | "lt" | "gte" | "lte" | "between" | "contains";
type LogicOperator = "AND" | "OR";
type ActionType = "alert" | "simulate" | "webhook" | "log_only";
type ExecutionType = "simulated" | "live";

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

interface RuleStats {
  simulationCount: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  lastExecutedAt?: number;
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

interface RulesEngineProps {
  rules?: TradingRule[];
  onCreateRule?: (rule: Omit<TradingRule, "id" | "simulationCount" | "winCount" | "lossCount" | "totalPnl" | "createdAt" | "updatedAt">) => void;
  onUpdateRule?: (id: string, updates: Partial<TradingRule>) => void;
  onDeleteRule?: (id: string) => void;
  onToggleRule?: (id: string) => void;
  onExecuteRule?: (id: string, context: Record<string, unknown>) => Promise<unknown>;
  onBacktestRule?: (id: string, options?: Record<string, unknown>) => Promise<BacktestResult>;
  onGetStats?: (id: string) => RuleStats | undefined;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THEME_COLOR = "#f4a900";

const RULE_TYPES: { value: RuleType; label: string }[] = [
  { value: "odds_threshold", label: "Odds Threshold" },
  { value: "line_movement_pct", label: "Line Movement %" },
  { value: "steam_detected", label: "Steam Detected" },
  { value: "confidence_level", label: "Confidence Level" },
  { value: "time_based", label: "Time Based" },
];

const COMPARATORS: { value: Comparator; label: string }[] = [
  { value: "eq", label: "=" },
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
  { value: "gte", label: ">=" },
  { value: "lte", label: "<=" },
  { value: "between", label: "between" },
  { value: "contains", label: "contains" },
];

const FIELDS = [
  { value: "odds", label: "Odds" },
  { value: "movement_pct", label: "Movement %" },
  { value: "confidence", label: "Confidence" },
  { value: "steam_detected", label: "Steam Detected" },
  { value: "steam_book_count", label: "Steam Book Count" },
  { value: "timestamp", label: "Timestamp" },
  { value: "sport", label: "Sport" },
  { value: "market", label: "Market" },
  { value: "vig", label: "Vig" },
];

const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: "alert", label: "🚨 Alert" },
  { value: "simulate", label: "💰 Simulate Trade" },
  { value: "webhook", label: "🔗 Webhook" },
  { value: "log_only", label: "📝 Log Only" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const RulesEngine: React.FC<RulesEngineProps> = ({
  rules: externalRules,
  onCreateRule,
  onUpdateRule,
  onDeleteRule,
  onToggleRule,
  onExecuteRule,
  onBacktestRule,
  onGetStats,
}) => {
  const [rules, setRules] = useState<TradingRule[]>(externalRules || []);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<TradingRule | null>(null);
  const [activeTab, setActiveTab] = useState<"list" | "builder" | "backtest">("list");
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<Record<string, unknown> | null>(null);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState<RuleType>("odds_threshold");
  const [formConditions, setFormConditions] = useState<RuleCondition[]>([
    { field: "odds", comparator: "lt", value: -110, logic: "AND" },
  ]);
  const [formActions, setFormActions] = useState<RuleAction[]>([
    { type: "simulate", config: { stake: 10000 } },
  ]);
  const [formEnabled, setFormEnabled] = useState(false);
  const [formPriority, setFormPriority] = useState(5);

  // Sync external rules
  React.useEffect(() => {
    if (externalRules) setRules(externalRules);
  }, [externalRules]);

  // Stats lookup
  const selectedStats = useMemo(() => {
    if (!selectedRuleId || !onGetStats) return undefined;
    return onGetStats(selectedRuleId);
  }, [selectedRuleId, onGetStats]);

  const selectedRule = useMemo(() => {
    return rules.find((r) => r.id === selectedRuleId) || null;
  }, [rules, selectedRuleId]);

  // Add condition
  const addCondition = () => {
    setFormConditions((prev) => [
      ...prev,
      { field: "odds", comparator: "lt", value: -110, logic: "AND" },
    ]);
  };

  // Remove condition
  const removeCondition = (idx: number) => {
    setFormConditions((prev) => prev.filter((_, i) => i !== idx));
  };

  // Update condition
  const updateCondition = (idx: number, updates: Partial<RuleCondition>) => {
    setFormConditions((prev) => prev.map((c, i) => (i === idx ? { ...c, ...updates } : c)));
  };

  // Add action
  const addAction = () => {
    setFormActions((prev) => [...prev, { type: "log_only", config: {} }]);
  };

  // Remove action
  const removeAction = (idx: number) => {
    setFormActions((prev) => prev.filter((_, i) => i !== idx));
  };

  // Update action
  const updateAction = (idx: number, updates: Partial<RuleAction>) => {
    setFormActions((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, ...updates, config: { ...a.config, ...(updates.config || {}) } } : a))
    );
  };

  // Reset form
  const resetForm = () => {
    setFormName("");
    setFormDesc("");
    setFormType("odds_threshold");
    setFormConditions([{ field: "odds", comparator: "lt", value: -110, logic: "AND" }]);
    setFormActions([{ type: "simulate", config: { stake: 10000 } }]);
    setFormEnabled(false);
    setFormPriority(5);
    setEditingRule(null);
  };

  // Submit rule
  const handleSubmit = () => {
    if (!formName.trim() || formConditions.length === 0 || formActions.length === 0) return;

    const ruleData = {
      name: formName,
      description: formDesc,
      ruleType: formType,
      conditions: formConditions,
      actions: formActions,
      enabled: formEnabled,
      priority: formPriority,
    };

    if (editingRule) {
      onUpdateRule?.(editingRule.id, ruleData);
    } else {
      onCreateRule?.(ruleData);
    }

    resetForm();
    setShowBuilder(false);
    setActiveTab("list");
  };

  // Edit rule
  const handleEdit = (rule: TradingRule) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormDesc(rule.description);
    setFormType(rule.ruleType);
    setFormConditions(rule.conditions);
    setFormActions(rule.actions);
    setFormEnabled(rule.enabled);
    setFormPriority(rule.priority);
    setShowBuilder(true);
    setActiveTab("builder");
  };

  // Execute rule
  const handleExecute = async (ruleId: string) => {
    if (!onExecuteRule) return;
    setIsLoading(true);
    setSimResult(null);
    try {
      const result = await onExecuteRule(ruleId, {
        sport: "NBA",
        eventId: `evt_${Date.now()}`,
        market: "spread",
        odds: -110,
        confidence: 65,
      });
      setSimResult(result as Record<string, unknown>);
    } catch (err) {
      setSimResult({ error: err instanceof Error ? err.message : "Execution failed" });
    } finally {
      setIsLoading(false);
    }
  };

  // Backtest rule
  const handleBacktest = async (ruleId: string) => {
    if (!onBacktestRule) return;
    setIsLoading(true);
    setBacktestResult(null);
    try {
      const result = await onBacktestRule(ruleId);
      setBacktestResult(result);
    } catch (err) {
      setBacktestResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Format P&L
  const formatPnl = (pnl: number) => {
    const sign = pnl >= 0 ? "+" : "";
    return `${sign}$${(pnl / 100).toFixed(2)}`;
  };

  return (
    <div style={styles.container}>
      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === "list" ? styles.tabActive : {}) }}
          onClick={() => setActiveTab("list")}
        >
          📋 Rules ({rules.length})
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === "builder" ? styles.tabActive : {}) }}
          onClick={() => {
            setActiveTab("builder");
            if (!showBuilder) {
              resetForm();
              setShowBuilder(true);
            }
          }}
        >
          ⚙️ Builder
        </button>
        {selectedRuleId && (
          <button
            style={{ ...styles.tab, ...(activeTab === "backtest" ? styles.tabActive : {}) }}
            onClick={() => setActiveTab("backtest")}
          >
            📈 Backtest
          </button>
        )}
      </div>

      {/* LIST TAB */}
      {activeTab === "list" && (
        <div>
          {rules.length === 0 ? (
            <div style={styles.empty}>No rules configured. Use the Builder tab to create one.</div>
          ) : (
            <div style={styles.rulesList}>
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`rule-card ${rule.enabled ? "rule-enabled" : "rule-disabled"}`}
                  style={{
                    ...styles.ruleCard,
                    borderLeftColor: rule.enabled ? "#22c55e" : "#666",
                    opacity: rule.enabled ? 1 : 0.65,
                  }}
                  onClick={() => setSelectedRuleId(rule.id)}
                >
                  <div style={styles.ruleHeader}>
                    <div style={styles.ruleLeft}>
                      <span style={styles.ruleName}>{rule.name}</span>
                      <span style={{ ...styles.statusBadge, backgroundColor: rule.enabled ? "#22c55e33" : "#666333", color: rule.enabled ? "#22c55e" : "#999" }}>
                        {rule.enabled ? "ON" : "OFF"}
                      </span>
                      <span style={styles.typeBadge}>{rule.ruleType}</span>
                      <span style={styles.priorityBadge}>P{rule.priority}</span>
                    </div>
                    <div style={styles.ruleActions}>
                      <button style={styles.iconBtn} onClick={(e) => { e.stopPropagation(); onToggleRule?.(rule.id); }} title="Toggle">
                        {rule.enabled ? "⏸" : "▶"}
                      </button>
                      <button style={styles.iconBtn} onClick={(e) => { e.stopPropagation(); handleEdit(rule); }} title="Edit">
                        ✏️
                      </button>
                      <button style={styles.iconBtn} onClick={(e) => { e.stopPropagation(); handleExecute(rule.id); }} title="Execute">
                        🚀
                      </button>
                      <button style={{ ...styles.iconBtn, color: "#ef4444" }} onClick={(e) => { e.stopPropagation(); if (confirm("Delete this rule?")) onDeleteRule?.(rule.id); }} title="Delete">
                        🗑
                      </button>
                    </div>
                  </div>

                  <div style={styles.ruleDesc}>{rule.description}</div>

                  <div style={styles.ruleMeta}>
                    <span>{rule.conditions.length} conditions</span>
                    <span>{rule.actions.length} actions</span>
                    <span style={rule.totalPnl >= 0 ? styles.pnlPositive : styles.pnlNegative}>
                      {formatPnl(rule.totalPnl)} total
                    </span>
                    <span style={styles.winRate}>
                      {rule.simulationCount > 0 ? `${Math.round((rule.winCount / rule.simulationCount) * 100)}%` : "N/A"} WR
                    </span>
                  </div>

                  {/* Inline simulation result */}
                  {simResult && selectedRuleId === rule.id && (
                    <div className="simulation-result" style={styles.simResult}>
                      <pre style={styles.simPre}>{JSON.stringify(simResult, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BUILDER TAB */}
      {activeTab === "builder" && showBuilder && (
        <div style={styles.builder}>
          <h4 style={styles.builderTitle}>{editingRule ? "Edit Rule" : "Create New Rule"}</h4>

          {/* Basic info */}
          <div style={styles.formSection}>
            <input
              style={styles.input}
              placeholder="Rule name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
            <textarea
              style={{ ...styles.input, minHeight: 60, resize: "vertical" }}
              placeholder="Description"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
            />
            <div style={styles.formRow}>
              <select style={styles.select} value={formType} onChange={(e) => setFormType(e.target.value as RuleType)}>
                {RULE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <div style={styles.priorityControl}>
                <label style={styles.label}>Priority:</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={formPriority}
                  onChange={(e) => setFormPriority(parseInt(e.target.value, 10))}
                  style={{ ...styles.input, width: 60, textAlign: "center" }}
                />
              </div>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formEnabled}
                  onChange={(e) => setFormEnabled(e.target.checked)}
                />
                <span>Enabled</span>
              </label>
            </div>
          </div>

          {/* Conditions */}
          <div style={styles.formSection}>
            <h5 style={styles.sectionTitle}>Conditions</h5>
            <div className="condition-group" style={styles.conditionsList}>
              {formConditions.map((cond, idx) => (
                <div key={idx} style={styles.conditionRow}>
                  {idx > 0 && (
                    <select
                      style={{ ...styles.select, width: 70 }}
                      value={cond.logic || "AND"}
                      onChange={(e) => updateCondition(idx, { logic: e.target.value as LogicOperator })}
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  )}
                  <select
                    style={styles.select}
                    value={cond.field}
                    onChange={(e) => updateCondition(idx, { field: e.target.value })}
                  >
                    {FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <select
                    style={{ ...styles.select, width: 100 }}
                    value={cond.comparator}
                    onChange={(e) => updateCondition(idx, { comparator: e.target.value as Comparator })}
                  >
                    {COMPARATORS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    style={{ ...styles.input, width: 100 }}
                    value={String(cond.value)}
                    onChange={(e) => updateCondition(idx, { value: e.target.value })}
                    placeholder="value"
                  />
                  <button style={styles.removeBtn} onClick={() => removeCondition(idx)}>✕</button>
                </div>
              ))}
            </div>
            <button style={styles.addBtn} onClick={addCondition}>+ Add Condition</button>
          </div>

          {/* Actions */}
          <div style={styles.formSection}>
            <h5 style={styles.sectionTitle}>Actions</h5>
            {formActions.map((action, idx) => (
              <div key={idx} style={styles.actionRow}>
                <select
                  style={styles.select}
                  value={action.type}
                  onChange={(e) => updateAction(idx, { type: e.target.value as ActionType })}
                >
                  {ACTION_TYPES.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
                {action.type === "simulate" && (
                  <input
                    style={{ ...styles.input, width: 120 }}
                    placeholder="Stake (cents)"
                    type="number"
                    value={(action.config.stake as number) || 10000}
                    onChange={(e) => updateAction(idx, { config: { ...action.config, stake: parseInt(e.target.value, 10) } })}
                  />
                )}
                <button style={styles.removeBtn} onClick={() => removeAction(idx)}>✕</button>
              </div>
            ))}
            <button style={styles.addBtn} onClick={addAction}>+ Add Action</button>
          </div>

          {/* Submit */}
          <div style={styles.formActions}>
            <button style={styles.cancelBtn} onClick={() => { resetForm(); setShowBuilder(false); setActiveTab("list"); }}>
              Cancel
            </button>
            <button style={styles.submitBtn} onClick={handleSubmit}>
              {editingRule ? "Update Rule" : "Create Rule"}
            </button>
          </div>
        </div>
      )}

      {/* BACKTEST TAB */}
      {activeTab === "backtest" && selectedRule && (
        <div>
          <div style={styles.backtestHeader}>
            <h4 style={styles.builderTitle}>Backtest: {selectedRule.name}</h4>
            <button style={styles.submitBtn} onClick={() => handleBacktest(selectedRule.id)} disabled={isLoading}>
              {isLoading ? "Running..." : "▶ Run Backtest"}
            </button>
          </div>

          {backtestResult && (
            <div style={styles.backtestResults}>
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <span style={styles.statLabel}>Executions</span>
                  <span style={styles.statValue}>{backtestResult.totalExecutions}</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statLabel}>Win Rate</span>
                  <span style={{ ...styles.statValue, color: backtestResult.winRate >= 50 ? "#22c55e" : "#ef4444" }}>
                    {backtestResult.winRate}%
                  </span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statLabel}>Wins</span>
                  <span style={{ ...styles.statValue, color: "#22c55e" }}>{backtestResult.wins}</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statLabel}>Losses</span>
                  <span style={{ ...styles.statValue, color: "#ef4444" }}>{backtestResult.losses}</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statLabel}>P&L</span>
                  <span style={{ ...styles.statValue, color: backtestResult.totalPnl >= 0 ? "#22c55e" : "#ef4444" }}>
                    {formatPnl(backtestResult.totalPnl)}
                  </span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statLabel}>Avg P&L</span>
                  <span style={styles.statValue}>{formatPnl(backtestResult.avgPnl)}</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statLabel}>Max Drawdown</span>
                  <span style={{ ...styles.statValue, color: "#f4a900" }}>{formatPnl(backtestResult.maxDrawdown)}</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statLabel}>Sharpe</span>
                  <span style={styles.statValue}>{backtestResult.sharpeRatio}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: "#0d0d0d",
    borderRadius: 8,
    padding: 16,
    color: "#e0e0e0",
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },
  tabs: {
    display: "flex",
    gap: 4,
    marginBottom: 16,
    borderBottom: "1px solid #2a2a2a",
    paddingBottom: 8,
  },
  tab: {
    padding: "8px 16px",
    border: "none",
    backgroundColor: "transparent",
    color: "#888",
    cursor: "pointer",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    transition: "all 0.2s",
  },
  tabActive: {
    backgroundColor: THEME_COLOR + "22",
    color: THEME_COLOR,
  },
  empty: {
    textAlign: "center",
    padding: 40,
    color: "#666",
    fontSize: 14,
  },
  rulesList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: 500,
    overflowY: "auto",
  },
  ruleCard: {
    backgroundColor: "#141414",
    borderRadius: 8,
    padding: "12px 14px",
    borderLeftWidth: 3,
    borderLeftStyle: "solid",
    borderLeftColor: "#22c55e",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  ruleHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  ruleLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  ruleName: {
    fontWeight: 600,
    fontSize: 14,
    color: "#e0e0e0",
  },
  statusBadge: {
    padding: "1px 6px",
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 700,
  },
  typeBadge: {
    padding: "1px 6px",
    borderRadius: 4,
    fontSize: 10,
    backgroundColor: "#1a3a5c",
    color: "#6ab0ff",
  },
  priorityBadge: {
    padding: "1px 6px",
    borderRadius: 4,
    fontSize: 10,
    backgroundColor: "#2a1a3c",
    color: "#c084fc",
  },
  ruleActions: {
    display: "flex",
    gap: 4,
  },
  iconBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "#888",
    cursor: "pointer",
    fontSize: 14,
    padding: "2px 4px",
    borderRadius: 4,
    transition: "all 0.2s",
  },
  ruleDesc: {
    fontSize: 12,
    color: "#888",
    marginBottom: 6,
  },
  ruleMeta: {
    display: "flex",
    gap: 12,
    fontSize: 11,
    color: "#666",
  },
  pnlPositive: {
    color: "#22c55e",
    fontWeight: 600,
  },
  pnlNegative: {
    color: "#ef4444",
    fontWeight: 600,
  },
  winRate: {
    color: "#f4a900",
    fontWeight: 600,
  },
  simResult: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#0a0a0a",
    borderRadius: 6,
    border: "1px solid #2a2a2a",
  },
  simPre: {
    margin: 0,
    fontSize: 11,
    color: "#aaa",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  builder: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  builderTitle: {
    margin: "0 0 8px 0",
    fontSize: 16,
    color: THEME_COLOR,
    fontWeight: 600,
  },
  formSection: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  sectionTitle: {
    margin: "0 0 4px 0",
    fontSize: 13,
    color: "#aaa",
    fontWeight: 600,
  },
  input: {
    backgroundColor: "#1a1a1a",
    color: "#e0e0e0",
    border: "1px solid #333",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 13,
    outline: "none",
    fontFamily: "inherit",
  },
  select: {
    backgroundColor: "#1a1a1a",
    color: "#e0e0e0",
    border: "1px solid #333",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 13,
    outline: "none",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  formRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  priorityControl: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: "#888",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#ccc",
    cursor: "pointer",
  },
  conditionsList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  conditionRow: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    flexWrap: "wrap",
    backgroundColor: "#0f0f0f",
    padding: "6px 10px",
    borderRadius: 6,
  },
  actionRow: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    flexWrap: "wrap",
    backgroundColor: "#0f0f0f",
    padding: "6px 10px",
    borderRadius: 6,
  },
  removeBtn: {
    backgroundColor: "#ef444422",
    color: "#ef4444",
    border: "none",
    borderRadius: 4,
    padding: "2px 8px",
    cursor: "pointer",
    fontSize: 12,
  },
  addBtn: {
    backgroundColor: THEME_COLOR + "22",
    color: THEME_COLOR,
    border: `1px solid ${THEME_COLOR}44`,
    borderRadius: 6,
    padding: "6px 14px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
    alignSelf: "flex-start",
  },
  formActions: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    paddingTop: 8,
    borderTop: "1px solid #2a2a2a",
  },
  cancelBtn: {
    backgroundColor: "#2a2a2a",
    color: "#888",
    border: "none",
    borderRadius: 6,
    padding: "8px 18px",
    cursor: "pointer",
    fontSize: 13,
  },
  submitBtn: {
    backgroundColor: THEME_COLOR,
    color: "#0d0d0d",
    border: "none",
    borderRadius: 6,
    padding: "8px 18px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
  },
  backtestHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  backtestResults: {
    marginTop: 16,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: 10,
  },
  statCard: {
    backgroundColor: "#141414",
    borderRadius: 8,
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  statLabel: {
    fontSize: 10,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  statValue: {
    fontSize: 18,
    fontWeight: 700,
    color: "#e0e0e0",
  },
};

export default RulesEngine;
