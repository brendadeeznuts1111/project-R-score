/**
 * SandboxPanel Component
 *
 * Provides the sandbox A/B testing interface:
 *   - Scenario list with status indicators
 *   - Create scenario form
 *   - A/B test builder (variant A vs B)
 *   - Results visualization with charts
 *   - Summary generation trigger
 *   - Customer simulation controls
 *
 * Theme: Midnight Galaxy (#2b1e3e)
 */

import React, { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScenarioType = "a_b_test" | "simulation" | "regression" | "stress";
type ScenarioStatus = "draft" | "ready" | "running" | "completed" | "failed";
type ABTestStatus = "draft" | "running" | "paused" | "completed";
type ABWinner = "a" | "b" | "tie" | "inconclusive";

interface SandboxScenario {
  scenarioId: string;
  name: string;
  description?: string;
  scenarioType: ScenarioType;
  isActive: boolean;
  runCount: number;
  lastRunAt?: number;
  createdAt: number;
}

interface ABTest {
  testId: string;
  scenarioId: string;
  name: string;
  status: ABTestStatus;
  winner?: ABWinner;
  sampleSizeA: number;
  sampleSizeB: number;
  metricName?: string;
  createdAt: number;
}

interface ABResult {
  variantA: {
    sampleSize: number;
    conversionRate: number;
    avgRevenue: number;
    confidenceInterval: [number, number];
  };
  variantB: {
    sampleSize: number;
    conversionRate: number;
    avgRevenue: number;
    confidenceInterval: [number, number];
  };
  pValue: number;
  winner: ABWinner;
  liftPct: number;
  isStatisticallySignificant: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THEME = {
  bg: "#1a0f2e",
  card: "#23183a",
  border: "#3d2b5c",
  text: "#e0d5f5",
  textMuted: "#9b8db5",
  accent: "#8b5cf6",
  accentHover: "#7c3aed",
  accentLight: "#a78bfa",
  input: "#2b1e3e",
  button: "#8b5cf6",
  buttonHover: "#7c3aed",
  success: "#22c55e",
  danger: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
};

const SCENARIO_TYPES: { id: ScenarioType; label: string }[] = [
  { id: "a_b_test", label: "A/B Test" },
  { id: "simulation", label: "Simulation" },
  { id: "regression", label: "Regression" },
  { id: "stress", label: "Stress Test" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SandboxPanel: React.FC = () => {
  const [scenarios, setScenarios] = useState<SandboxScenario[]>([]);
  const [abTests, setAbTests] = useState<ABTest[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<ABResult | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showABForm, setShowABForm] = useState(false);
  const [showSimForm, setShowSimForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [newScenarioName, setNewScenarioName] = useState("");
  const [newScenarioDesc, setNewScenarioDesc] = useState("");
  const [newScenarioType, setNewScenarioType] = useState<ScenarioType>("simulation");
  const [newTestName, setNewTestName] = useState("");
  const [variantAConfig, setVariantAConfig] = useState("{}");
  const [variantBConfig, setVariantBConfig] = useState("{}");
  const [metricName, setMetricName] = useState("conversion_rate");
  const [simCount, setSimCount] = useState("100");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [scenariosRes, testsRes] = await Promise.all([
        fetch("/api/sandbox/v2/scenarios"),
        fetch("/api/sandbox/v2/ab-tests"),
      ]);

      if (scenariosRes.ok) {
        const data = await scenariosRes.json();
        setScenarios(data.scenarios || []);
      }
      if (testsRes.ok) {
        const data = await testsRes.json();
        setAbTests(data.abTests || []);
      }
    } catch (err: any) {
      setError(`Failed to load sandbox data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateScenario = async () => {
    if (!newScenarioName.trim()) {
      setError("Scenario name is required");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/sandbox/v2/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newScenarioName,
          description: newScenarioDesc,
          scenarioType: newScenarioType,
          config: {},
        }),
      });

      if (!res.ok) throw new Error("Failed to create scenario");

      setSuccess("Scenario created successfully!");
      setShowCreateForm(false);
      setNewScenarioName("");
      setNewScenarioDesc("");
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateABTest = async () => {
    if (!selectedScenario || !newTestName.trim()) {
      setError("Test name and scenario selection are required");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/sandbox/v2/ab-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: selectedScenario,
          name: newTestName,
          variantA: JSON.parse(variantAConfig || "{}"),
          variantB: JSON.parse(variantBConfig || "{}"),
          metricName,
        }),
      });

      if (!res.ok) throw new Error("Failed to create A/B test");

      setSuccess("A/B test created successfully!");
      setShowABForm(false);
      setNewTestName("");
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunScenario = async (scenarioId: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/sandbox/v2/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      });

      if (!res.ok) throw new Error("Failed to run scenario");

      setSuccess("Scenario executed successfully!");
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateCustomers = async () => {
    if (!selectedScenario) {
      setError("Select a scenario first");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/sandbox/v2/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: selectedScenario,
          count: parseInt(simCount, 10),
        }),
      });

      if (!res.ok) throw new Error("Failed to simulate customers");

      const data = await res.json();
      setSuccess(`${data.customersCreated} customers simulated!`);
      setShowSimForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummaries = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sandbox/v2/generate-summaries", { method: "POST" });

      if (!res.ok) throw new Error("Failed to generate summaries");

      const data = await res.json();
      setSuccess(`Generated ${data.processed} summaries!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewABResults = async (testId: string) => {
    try {
      setLoading(true);
      setSelectedTest(testId);
      const res = await fetch(`/api/sandbox/v2/ab-tests/${testId}`);

      if (!res.ok) throw new Error("Failed to load A/B test results");

      const data = await res.json();
      setTestResults(data.results || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Clear messages after delay
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
    return;
  }, [error, success]);

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ color: THEME.text, fontSize: "20px", marginBottom: "20px", fontWeight: 600 }}>
        ◈ Sandbox Lab
      </h2>

      {/* Error / Success */}
      {error && (
        <div style={{ backgroundColor: "#3d1f1f", border: `1px solid ${THEME.danger}`, borderRadius: "8px", padding: "12px 16px", color: THEME.danger, marginBottom: "16px", fontSize: "13px" }}>
          ⚠ {error}
        </div>
      )}
      {success && (
        <div style={{ backgroundColor: "#1f3d2a", border: `1px solid ${THEME.success}`, borderRadius: "8px", padding: "12px 16px", color: THEME.success, marginBottom: "16px", fontSize: "13px" }}>
          ✓ {success}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        <ActionButton onClick={() => setShowCreateForm(!showCreateForm)} active={showCreateForm} icon="+" label="New Scenario" />
        <ActionButton onClick={() => setShowABForm(!showABForm)} active={showABForm} icon="◇" label="A/B Test" />
        <ActionButton onClick={() => setShowSimForm(!showSimForm)} active={showSimForm} icon="◉" label="Simulate" />
        <ActionButton onClick={handleGenerateSummaries} active={false} icon="✎" label="Summaries" />
      </div>

      {/* Create Scenario Form */}
      {showCreateForm && (
        <FormCard>
          <h3 style={{ color: THEME.text, fontSize: "14px", marginBottom: "12px" }}>Create Scenario</h3>
          <div style={{ display: "grid", gap: "10px" }}>
            <FormInput label="Name" value={newScenarioName} onChange={setNewScenarioName} placeholder="e.g., Q1 Risk Model" />
            <FormInput label="Description" value={newScenarioDesc} onChange={setNewScenarioDesc} placeholder="Optional description..." />
            <div>
              <label style={{ color: THEME.textMuted, fontSize: "11px", display: "block", marginBottom: "4px" }}>Type</label>
              <select
                value={newScenarioType}
                onChange={(e) => setNewScenarioType(e.target.value as ScenarioType)}
                style={inputStyle}
              >
                {SCENARIO_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <FormButton onClick={handleCreateScenario} label="Create" primary />
              <FormButton onClick={() => setShowCreateForm(false)} label="Cancel" />
            </div>
          </div>
        </FormCard>
      )}

      {/* A/B Test Form */}
      {showABForm && (
        <FormCard>
          <h3 style={{ color: THEME.text, fontSize: "14px", marginBottom: "12px" }}>Create A/B Test</h3>
          <div style={{ display: "grid", gap: "10px" }}>
            <div>
              <label style={{ color: THEME.textMuted, fontSize: "11px", display: "block", marginBottom: "4px" }}>Scenario</label>
              <select
                value={selectedScenario || ""}
                onChange={(e) => setSelectedScenario(e.target.value || null)}
                style={inputStyle}
              >
                <option value="">Select a scenario...</option>
                {scenarios.map((s) => (
                  <option key={s.scenarioId} value={s.scenarioId}>{s.name}</option>
                ))}
              </select>
            </div>
            <FormInput label="Test Name" value={newTestName} onChange={setNewTestName} placeholder="e.g., Higher Limits Variant" />
            <FormInput label="Metric" value={metricName} onChange={setMetricName} placeholder="e.g., conversion_rate" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ color: THEME.info, fontSize: "11px", display: "block", marginBottom: "4px" }}>Variant A (Control)</label>
                <textarea
                  value={variantAConfig}
                  onChange={(e) => setVariantAConfig(e.target.value)}
                  placeholder='{"limit": 5000}'
                  style={{ ...inputStyle, minHeight: "80px", fontFamily: "monospace", fontSize: "12px" }}
                />
              </div>
              <div>
                <label style={{ color: THEME.accentLight, fontSize: "11px", display: "block", marginBottom: "4px" }}>Variant B (Treatment)</label>
                <textarea
                  value={variantBConfig}
                  onChange={(e) => setVariantBConfig(e.target.value)}
                  placeholder='{"limit": 10000}'
                  style={{ ...inputStyle, minHeight: "80px", fontFamily: "monospace", fontSize: "12px" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <FormButton onClick={handleCreateABTest} label="Create Test" primary />
              <FormButton onClick={() => setShowABForm(false)} label="Cancel" />
            </div>
          </div>
        </FormCard>
      )}

      {/* Simulate Form */}
      {showSimForm && (
        <FormCard>
          <h3 style={{ color: THEME.text, fontSize: "14px", marginBottom: "12px" }}>Simulate Customers</h3>
          <div style={{ display: "grid", gap: "10px" }}>
            <div>
              <label style={{ color: THEME.textMuted, fontSize: "11px", display: "block", marginBottom: "4px" }}>Scenario</label>
              <select
                value={selectedScenario || ""}
                onChange={(e) => setSelectedScenario(e.target.value || null)}
                style={inputStyle}
              >
                <option value="">Select a scenario...</option>
                {scenarios.map((s) => (
                  <option key={s.scenarioId} value={s.scenarioId}>{s.name}</option>
                ))}
              </select>
            </div>
            <FormInput label="Customer Count" value={simCount} onChange={setSimCount} placeholder="100" type="number" />
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <FormButton onClick={handleSimulateCustomers} label="Simulate" primary />
              <FormButton onClick={() => setShowSimForm(false)} label="Cancel" />
            </div>
          </div>
        </FormCard>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "16px", color: THEME.textMuted, fontSize: "13px" }}>
          ⏳ Processing...
        </div>
      )}

      {/* Scenarios List */}
      <div style={{ marginBottom: "24px" }}>
        <h3 style={{ color: THEME.text, fontSize: "14px", marginBottom: "12px", fontWeight: 600 }}>
          Scenarios ({scenarios.length})
        </h3>
        {scenarios.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: THEME.textMuted, fontSize: "13px", backgroundColor: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: "10px" }}>
            No scenarios yet. Create one to get started.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {scenarios.map((s) => (
              <div
                key={s.scenarioId}
                style={{
                  padding: "14px 16px",
                  backgroundColor: selectedScenario === s.scenarioId ? `${THEME.accent}15` : THEME.card,
                  border: `1px solid ${selectedScenario === s.scenarioId ? THEME.accent : THEME.border}`,
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onClick={() => setSelectedScenario(s.scenarioId === selectedScenario ? null : s.scenarioId)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ color: THEME.text, fontSize: "13px", fontWeight: 500 }}>{s.name}</div>
                    <div style={{ color: THEME.textMuted, fontSize: "11px", marginTop: "2px" }}>
                      {s.scenarioType} · {s.runCount} runs
                      {s.lastRunAt ? ` · Last: ${new Date(s.lastRunAt).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <ScenarioStatusBadge status={s.isActive ? "ready" : "draft"} />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRunScenario(s.scenarioId); }}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "4px",
                        border: `1px solid ${THEME.accent}`,
                        backgroundColor: "transparent",
                        color: THEME.accent,
                        cursor: "pointer",
                        fontSize: "11px",
                      }}
                    >
                      ▶ Run
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* A/B Tests List */}
      <div style={{ marginBottom: "24px" }}>
        <h3 style={{ color: THEME.text, fontSize: "14px", marginBottom: "12px", fontWeight: 600 }}>
          A/B Tests ({abTests.length})
        </h3>
        {abTests.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: THEME.textMuted, fontSize: "13px", backgroundColor: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: "10px" }}>
            No A/B tests yet. Create one to compare variants.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {abTests.map((t) => (
              <div
                key={t.testId}
                style={{
                  padding: "14px 16px",
                  backgroundColor: selectedTest === t.testId ? `${THEME.accent}15` : THEME.card,
                  border: `1px solid ${selectedTest === t.testId ? THEME.accent : THEME.border}`,
                  borderRadius: "10px",
                  cursor: "pointer",
                }}
                onClick={() => handleViewABResults(t.testId)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ color: THEME.text, fontSize: "13px", fontWeight: 500 }}>{t.name}</div>
                    <div style={{ color: THEME.textMuted, fontSize: "11px", marginTop: "2px" }}>
                      {t.metricName || "conversion"} · A: {t.sampleSizeA.toLocaleString()} · B: {t.sampleSizeB.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {t.winner && t.winner !== "inconclusive" && (
                      <WinnerBadge winner={t.winner} />
                    )}
                    <ABStatusBadge status={t.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* A/B Results Visualization */}
      {testResults && selectedTest && (
        <div style={{ backgroundColor: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: "10px", padding: "20px" }}>
          <h3 style={{ color: THEME.text, fontSize: "14px", marginBottom: "16px", fontWeight: 600 }}>
            A/B Test Results
          </h3>

          {/* Comparison Bar */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: THEME.info, fontSize: "12px" }}>Variant A: {(testResults.variantA.conversionRate * 100).toFixed(2)}%</span>
              <span style={{ color: THEME.accentLight, fontSize: "12px" }}>Variant B: {(testResults.variantB.conversionRate * 100).toFixed(2)}%</span>
            </div>
            <div style={{ backgroundColor: THEME.input, borderRadius: "6px", height: "28px", display: "flex", overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.max(10, (testResults.variantA.conversionRate / (testResults.variantA.conversionRate + testResults.variantB.conversionRate)) * 100)}%`,
                  backgroundColor: THEME.info,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  color: "#fff",
                  fontWeight: 600,
                }}
              >
                A
              </div>
              <div
                style={{
                  flex: 1,
                  backgroundColor: THEME.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  color: "#fff",
                  fontWeight: 600,
                }}
              >
                B
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
            <StatCard label="P-Value" value={testResults.pValue.toFixed(4)} />
            <StatCard label="Lift %" value={`${testResults.liftPct > 0 ? "+" : ""}${testResults.liftPct.toFixed(2)}%`} color={testResults.liftPct > 0 ? THEME.success : THEME.danger} />
            <StatCard label="Significant" value={testResults.isStatisticallySignificant ? "Yes ✓" : "No ✗"} color={testResults.isStatisticallySignificant ? THEME.success : THEME.warning} />
            <StatCard label="Winner" value={testResults.winner.toUpperCase()} color={testResults.winner === "b" ? THEME.accent : testResults.winner === "a" ? THEME.info : THEME.textMuted} />
          </div>

          {/* Confidence Intervals */}
          <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ padding: "10px", backgroundColor: THEME.input, borderRadius: "6px" }}>
              <div style={{ color: THEME.info, fontSize: "11px", marginBottom: "4px" }}>Variant A CI</div>
              <div style={{ color: THEME.text, fontSize: "12px" }}>
                [{testResults.variantA.confidenceInterval[0].toFixed(4)}, {testResults.variantA.confidenceInterval[1].toFixed(4)}]
              </div>
            </div>
            <div style={{ padding: "10px", backgroundColor: THEME.input, borderRadius: "6px" }}>
              <div style={{ color: THEME.accent, fontSize: "11px", marginBottom: "4px" }}>Variant B CI</div>
              <div style={{ color: THEME.text, fontSize: "12px" }}>
                [{testResults.variantB.confidenceInterval[0].toFixed(4)}, {testResults.variantB.confidenceInterval[1].toFixed(4)}]
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const ActionButton: React.FC<{ onClick: () => void; active: boolean; icon: string; label: string }> = ({
  onClick,
  active,
  icon,
  label,
}) => (
  <button
    onClick={onClick}
    style={{
      padding: "8px 16px",
      borderRadius: "6px",
      border: active ? `2px solid ${THEME.accent}` : `1px solid ${THEME.border}`,
      backgroundColor: active ? `${THEME.accent}20` : THEME.card,
      color: active ? THEME.accent : THEME.textMuted,
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: active ? 600 : 400,
      display: "flex",
      alignItems: "center",
      gap: "6px",
    }}
  >
    {icon} {label}
  </button>
);

const FormCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ backgroundColor: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
    {children}
  </div>
);

const FormInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}> = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div>
    <label style={{ color: THEME.textMuted, fontSize: "11px", display: "block", marginBottom: "4px" }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={inputStyle}
    />
  </div>
);

const FormButton: React.FC<{ onClick: () => void; label: string; primary?: boolean }> = ({
  onClick,
  label,
  primary,
}) => (
  <button
    onClick={onClick}
    style={{
      padding: "8px 18px",
      borderRadius: "6px",
      border: primary ? "none" : `1px solid ${THEME.border}`,
      backgroundColor: primary ? THEME.button : "transparent",
      color: primary ? "#fff" : THEME.textMuted,
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: primary ? 600 : 400,
    }}
  >
    {label}
  </button>
);

const ScenarioStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    ready: THEME.success,
    draft: THEME.warning,
    running: THEME.info,
    completed: THEME.success,
    failed: THEME.danger,
  };
  return (
    <span style={{ padding: "2px 8px", borderRadius: "4px", backgroundColor: `${colors[status] || THEME.textMuted}20`, color: colors[status] || THEME.textMuted, fontSize: "10px", fontWeight: 600, textTransform: "uppercase" }}>
      {status}
    </span>
  );
};

const ABStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    running: THEME.info,
    draft: THEME.warning,
    paused: THEME.textMuted,
    completed: THEME.success,
  };
  return (
    <span style={{ padding: "2px 8px", borderRadius: "4px", backgroundColor: `${colors[status] || THEME.textMuted}20`, color: colors[status] || THEME.textMuted, fontSize: "10px", fontWeight: 600, textTransform: "uppercase" }}>
      {status}
    </span>
  );
};

const WinnerBadge: React.FC<{ winner: string }> = ({ winner }) => {
  const color = winner === "b" ? THEME.accent : winner === "a" ? THEME.info : winner === "tie" ? THEME.warning : THEME.textMuted;
  return (
    <span style={{ padding: "2px 8px", borderRadius: "4px", backgroundColor: `${color}20`, color, fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}>
      {winner === "inconclusive" ? "?" : `${winner} wins`}
    </span>
  );
};

const StatCard: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div style={{ padding: "12px", backgroundColor: THEME.input, borderRadius: "8px", textAlign: "center" }}>
    <div style={{ color: THEME.textMuted, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>{label}</div>
    <div style={{ color: color || THEME.text, fontSize: "18px", fontWeight: 700 }}>{value}</div>
  </div>
);

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: "6px",
  border: `1px solid ${THEME.border}`,
  backgroundColor: THEME.input,
  color: THEME.text,
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

export default SandboxPanel;
