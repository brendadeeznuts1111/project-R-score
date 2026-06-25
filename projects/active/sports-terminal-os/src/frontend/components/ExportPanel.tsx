/**
 * ExportPanel Component
 *
 * Provides a user interface for exporting operational data:
 *   - Format selector: CSV, JSON, XLSX
 *   - Entity selector: Players, Wagers, Agents, Risk, Partners
 *   - Filter builder (varies by entity)
 *   - Download button with progress
 *   - Recent exports list
 *
 * Theme: Midnight Galaxy (#2b1e3e)
 */

import React, { useState, useCallback, useEffect } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExportFormat = "csv" | "json" | "xlsx";
type ExportEntity = "players" | "wagers" | "agents" | "risk" | "partners";

interface RecentExport {
  jobId: string;
  entity: ExportEntity;
  format: ExportFormat;
  rowCount: number;
  status: "pending" | "completed" | "failed";
  createdAt: number;
}

interface FilterState {
  startDate: string;
  endDate: string;
  agentLogin: string;
  playerId: string;
  status: string;
  riskTier: string;
  sport: string;
  search: string;
  limit: string;
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
  input: "#2b1e3e",
  button: "#8b5cf6",
  buttonHover: "#7c3aed",
  success: "#22c55e",
  danger: "#ef4444",
  warning: "#f59e0b",
};

const ENTITIES: { id: ExportEntity; label: string; icon: string }[] = [
  { id: "players", label: "Players", icon: "◉" },
  { id: "wagers", label: "Wagers", icon: "⚐" },
  { id: "agents", label: "Agents", icon: "◈" },
  { id: "risk", label: "Risk Positions", icon: "⚠" },
  { id: "partners", label: "Partners", icon: "◇" },
];

const FORMATS: { id: ExportFormat; label: string; ext: string }[] = [
  { id: "csv", label: "CSV", ext: ".csv" },
  { id: "json", label: "JSON", ext: ".json" },
  { id: "xlsx", label: "XLSX", ext: ".xlsx" },
];

const RISK_TIERS = ["BLACK", "RED", "YELLOW", "GREEN"];
const SPORTS = ["NBA", "NFL", "MLB", "NHL", "SOCCER", "TENNIS", "GOLF", "ESPORTS"];
const STATUSES = ["active", "suspended", "closed", "pending", "won", "lost", "pushed", "cancelled"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ExportPanel: React.FC = () => {
  const [entity, setEntity] = useState<ExportEntity>("players");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [filters, setFilters] = useState<FilterState>({
    startDate: "",
    endDate: "",
    agentLogin: "",
    playerId: "",
    status: "",
    riskTier: "",
    sport: "",
    search: "",
    limit: "1000",
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [recentExports, setRecentExports] = useState<RecentExport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load recent exports on mount
  useEffect(() => {
    loadRecentExports();
  }, []);

  const loadRecentExports = async () => {
    try {
      const res = await fetch("/api/export/jobs");
      if (res.ok) {
        const data = await res.json();
        setRecentExports(data.jobs || []);
      }
    } catch {
      // Silently fail — recent exports are non-critical
    }
  };

  const updateFilter = useCallback((key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const buildQueryString = (): string => {
    const params = new URLSearchParams();
    params.set("format", format);

    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    if (filters.agentLogin) params.set("agentLogin", filters.agentLogin);
    if (filters.playerId) params.set("playerId", filters.playerId);
    if (filters.status) params.set("status", filters.status);
    if (filters.riskTier) params.set("riskTier", filters.riskTier);
    if (filters.sport) params.set("sport", filters.sport);
    if (filters.search) params.set("search", filters.search);
    if (filters.limit) params.set("limit", filters.limit);

    return params.toString();
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setError(null);
    setSuccess(null);

    try {
      const progressInterval = setInterval(() => {
        setExportProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const query = buildQueryString();
      const res = await fetch(`/api/export/${entity}?${query}`);

      clearInterval(progressInterval);

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(data.error || `Export failed: ${res.status}`);
      }

      // Download the file
      const blob = await res.blob();
      const fileName = res.headers.get("X-Export-File-Name") || `${entity}_export.${format}`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      const rowCount = parseInt(res.headers.get("X-Export-Row-Count") || "0", 10);
      setExportProgress(100);
      setSuccess(`Exported ${rowCount.toLocaleString()} rows successfully!`);

      // Add to recent
      const newExport: RecentExport = {
        jobId: `exp_${Date.now()}`,
        entity,
        format,
        rowCount,
        status: "completed",
        createdAt: Date.now(),
      };
      setRecentExports((prev) => [newExport, ...prev].slice(0, 20));
    } catch (err: any) {
      setError(err.message);
      setExportProgress(0);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 2000);
    }
  };

  const renderFilterFields = () => {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
        {(entity === "players" || entity === "agents" || entity === "wagers" || entity === "risk") && (
          <FilterInput
            label="Agent Login"
            value={filters.agentLogin}
            onChange={(v) => updateFilter("agentLogin", v)}
            placeholder="Filter by agent..."
          />
        )}

        {(entity === "players" || entity === "wagers" || entity === "risk") && (
          <FilterInput
            label="Player ID"
            value={filters.playerId}
            onChange={(v) => updateFilter("playerId", v)}
            placeholder="Filter by player..."
          />
        )}

        {(entity === "wagers" || entity === "risk") && (
          <FilterSelect
            label="Sport"
            value={filters.sport}
            onChange={(v) => updateFilter("sport", v)}
            options={SPORTS}
          />
        )}

        {(entity === "players" || entity === "wagers") && (
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(v) => updateFilter("status", v)}
            options={STATUSES}
          />
        )}

        {entity === "players" && (
          <FilterSelect
            label="Risk Tier"
            value={filters.riskTier}
            onChange={(v) => updateFilter("riskTier", v)}
            options={RISK_TIERS}
          />
        )}

        <FilterInput
          label="Start Date"
          value={filters.startDate}
          onChange={(v) => updateFilter("startDate", v)}
          type="date"
        />

        <FilterInput
          label="End Date"
          value={filters.endDate}
          onChange={(v) => updateFilter("endDate", v)}
          type="date"
        />

        <FilterInput
          label="Limit"
          value={filters.limit}
          onChange={(v) => updateFilter("limit", v.replace(/\D/g, ""))}
          placeholder="Max rows..."
          type="number"
        />

        {entity === "players" && (
          <FilterInput
            label="Search"
            value={filters.search}
            onChange={(v) => updateFilter("search", v)}
            placeholder="Search name/login..."
          />
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ color: THEME.text, fontSize: "20px", marginBottom: "20px", fontWeight: 600 }}>
        ◉ Data Export
      </h2>

      {/* Entity Selector */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ color: THEME.textMuted, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "8px" }}>
          Entity
        </label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {ENTITIES.map((e) => (
            <button
              key={e.id}
              onClick={() => setEntity(e.id)}
              style={{
                padding: "10px 18px",
                borderRadius: "8px",
                border: entity === e.id ? `2px solid ${THEME.accent}` : `1px solid ${THEME.border}`,
                backgroundColor: entity === e.id ? `${THEME.accent}20` : THEME.card,
                color: entity === e.id ? THEME.accent : THEME.textMuted,
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: entity === e.id ? 600 : 400,
                transition: "all 0.15s",
              }}
            >
              <span style={{ marginRight: "6px" }}>{e.icon}</span>
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Format Selector */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ color: THEME.textMuted, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "8px" }}>
          Format
        </label>
        <div style={{ display: "flex", gap: "8px" }}>
          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: format === f.id ? `2px solid ${THEME.accent}` : `1px solid ${THEME.border}`,
                backgroundColor: format === f.id ? `${THEME.accent}20` : THEME.card,
                color: format === f.id ? THEME.accent : THEME.textMuted,
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: format === f.id ? 600 : 400,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          backgroundColor: THEME.card,
          border: `1px solid ${THEME.border}`,
          borderRadius: "10px",
          padding: "16px",
          marginBottom: "20px",
        }}
      >
        <label style={{ color: THEME.textMuted, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "12px" }}>
          Filters
        </label>
        {renderFilterFields()}
      </div>

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

      {/* Progress Bar */}
      {exportProgress > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ backgroundColor: THEME.input, borderRadius: "4px", height: "6px", overflow: "hidden" }}>
            <div
              style={{
                width: `${exportProgress}%`,
                height: "100%",
                backgroundColor: THEME.accent,
                borderRadius: "4px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <span style={{ color: THEME.textMuted, fontSize: "11px", marginTop: "4px", display: "block" }}>
            {exportProgress < 100 ? "Exporting..." : "Complete!"}
          </span>
        </div>
      )}

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={isExporting}
        style={{
          padding: "12px 28px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: isExporting ? THEME.border : THEME.button,
          color: "#fff",
          cursor: isExporting ? "not-allowed" : "pointer",
          fontSize: "14px",
          fontWeight: 600,
          transition: "background-color 0.15s",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
        onMouseEnter={(e) => {
          if (!isExporting) (e.target as HTMLElement).style.backgroundColor = THEME.buttonHover;
        }}
        onMouseLeave={(e) => {
          if (!isExporting) (e.target as HTMLElement).style.backgroundColor = THEME.button;
        }}
      >
        {isExporting ? "⏳ Exporting..." : "⬇ Download Export"}
      </button>

      {/* Recent Exports */}
      <div style={{ marginTop: "32px" }}>
        <h3 style={{ color: THEME.text, fontSize: "14px", marginBottom: "12px", fontWeight: 600 }}>
          Recent Exports
        </h3>
        <div
          style={{
            backgroundColor: THEME.card,
            border: `1px solid ${THEME.border}`,
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          {recentExports.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: THEME.textMuted, fontSize: "13px" }}>
              No exports yet. Start by selecting an entity and format above.
            </div>
          ) : (
            recentExports.map((exp) => (
              <div
                key={exp.jobId}
                style={{
                  padding: "12px 16px",
                  borderBottom: `1px solid ${THEME.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ color: THEME.accent, fontSize: "16px" }}>📄</span>
                  <div>
                    <div style={{ color: THEME.text, fontSize: "13px", fontWeight: 500 }}>
                      {ENTITIES.find((e) => e.id === exp.entity)?.label || exp.entity}
                    </div>
                    <div style={{ color: THEME.textMuted, fontSize: "11px" }}>
                      {exp.rowCount.toLocaleString()} rows · {exp.format.toUpperCase()}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <StatusBadge status={exp.status} />
                  <span style={{ color: THEME.textMuted, fontSize: "11px" }}>
                    {new Date(exp.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const FilterInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}> = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div>
    <label style={{ color: THEME.textMuted, fontSize: "11px", display: "block", marginBottom: "4px" }}>
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "8px 12px",
        borderRadius: "6px",
        border: `1px solid ${THEME.border}`,
        backgroundColor: THEME.input,
        color: THEME.text,
        fontSize: "13px",
        outline: "none",
        boxSizing: "border-box",
      }}
    />
  </div>
);

const FilterSelect: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}> = ({ label, value, onChange, options }) => (
  <div>
    <label style={{ color: THEME.textMuted, fontSize: "11px", display: "block", marginBottom: "4px" }}>
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "8px 12px",
        borderRadius: "6px",
        border: `1px solid ${THEME.border}`,
        backgroundColor: THEME.input,
        color: THEME.text,
        fontSize: "13px",
        outline: "none",
        cursor: "pointer",
      }}
    >
      <option value="">All</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    completed: THEME.success,
    pending: THEME.warning,
    failed: THEME.danger,
  };
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: "4px",
        backgroundColor: `${colors[status] || THEME.textMuted}20`,
        color: colors[status] || THEME.textMuted,
        fontSize: "10px",
        fontWeight: 600,
        textTransform: "uppercase",
      }}
    >
      {status}
    </span>
  );
};

export default ExportPanel;
