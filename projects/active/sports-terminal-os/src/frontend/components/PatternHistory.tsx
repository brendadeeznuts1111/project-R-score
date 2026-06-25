/**
 * PatternHistory.tsx — Zone 2 (Golden Hour)
 *
 * Pattern history timeline component:
 *   - Dark theme with Golden Hour (#f4a900) accent
 *   - Timeline view of detected patterns
 *   - Pattern type badges with CSS classes: .pattern-badge-{steam,reverse,public,sharp,freeze,key}
 *   - Confidence bars with percentage and color coding
 *   - Sport and market filters
 *   - Real-time updates via WebSocket
 *   - Expandable pattern detail cards
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface PatternHistoryProps {
  patterns?: Pattern[];
  wsConnected?: boolean;
  onRefresh?: () => void;
  onFilterChange?: (filters: PatternFilters) => void;
}

interface PatternFilters {
  type?: PatternType | "all";
  sport?: string;
  minConfidence?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THEME_COLOR = "#f4a900";

const PATTERN_CONFIG: Record<PatternType, { label: string; icon: string; badgeClass: string }> = {
  steam_moves: { label: "Steam", icon: "🔥", badgeClass: "pattern-badge-steam" },
  reverse_line: { label: "Reverse", icon: "↩️", badgeClass: "pattern-badge-reverse" },
  public_money: { label: "Public", icon: "👥", badgeClass: "pattern-badge-public" },
  sharp_money: { label: "Sharp", icon: "🎯", badgeClass: "pattern-badge-sharp" },
  line_freeze: { label: "Freeze", icon: "🧊", badgeClass: "pattern-badge-freeze" },
  key_number: { label: "Key #", icon: "🔢", badgeClass: "pattern-badge-key" },
};

const CONFIDENCE_COLORS: Record<PatternConfidence, string> = {
  low: "#ef4444",
  medium: "#f4a900",
  high: "#22c55e",
};

const SPORTS = ["All", "NFL", "NBA", "MLB", "NHL", "NCAAF", "NCAAB", "SOCCER", "TENNIS"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PatternHistory: React.FC<PatternHistoryProps> = ({
  patterns: externalPatterns,
  wsConnected = false,
  onRefresh,
  onFilterChange,
}) => {
  const [patterns, setPatterns] = useState<Pattern[]>(externalPatterns || []);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<PatternFilters>({
    type: "all",
    sport: "All",
    minConfidence: 0,
  });
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Sync external patterns
  useEffect(() => {
    if (externalPatterns) {
      setPatterns(externalPatterns);
    }
  }, [externalPatterns]);

  // WebSocket for real-time updates
  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.host}/ws`);

    ws.onopen = () => {
      setSocket(ws);
      ws.send(JSON.stringify({ type: "subscribe", data: "patterns" }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "pattern_detected" && msg.data) {
          setPatterns((prev) => [msg.data as Pattern, ...prev].slice(0, 500));
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setSocket(null);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "unsubscribe", data: "patterns" }));
        ws.close();
      }
    };
  }, []);

  // Filter change handler
  const handleFilterChange = useCallback((key: keyof PatternFilters, value: string | number) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      onFilterChange?.(next);
      return next;
    });
  }, [onFilterChange]);

  // Filtered patterns
  const filteredPatterns = useMemo(() => {
    return patterns.filter((p) => {
      if (filters.type && filters.type !== "all" && p.patternType !== filters.type) return false;
      if (filters.sport && filters.sport !== "All" && p.sport !== filters.sport) return false;
      if (filters.minConfidence !== undefined && p.confidence < filters.minConfidence) return false;
      return true;
    });
  }, [patterns, filters]);

  // Toggle expand
  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Format timestamp
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  // Confidence bar color
  const getConfidenceColor = (c: number) => {
    if (c >= 70) return CONFIDENCE_COLORS.high;
    if (c >= 40) return CONFIDENCE_COLORS.medium;
    return CONFIDENCE_COLORS.low;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>
          <span style={styles.icon}>📊</span> Pattern Timeline
          {wsConnected || socket ? (
            <span style={styles.wsLive}>● LIVE</span>
          ) : (
            <span style={styles.wsOffline}>● OFFLINE</span>
          )}
        </h3>
        <button onClick={onRefresh} style={styles.refreshBtn} className="pattern-refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <select
          value={filters.type || "all"}
          onChange={(e) => handleFilterChange("type", e.target.value)}
          style={styles.select}
        >
          <option value="all">All Types</option>
          {(Object.entries(PATTERN_CONFIG) as [PatternType, typeof PATTERN_CONFIG[PatternType]][]).map(([key, cfg]) => (
            <option key={key} value={key}>
              {cfg.icon} {cfg.label}
            </option>
          ))}
        </select>

        <select
          value={filters.sport || "All"}
          onChange={(e) => handleFilterChange("sport", e.target.value)}
          style={styles.select}
        >
          {SPORTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div style={styles.confidenceFilter}>
          <label style={styles.label}>Min Confidence:</label>
          <input
            type="range"
            min={0}
            max={100}
            value={filters.minConfidence || 0}
            onChange={(e) => handleFilterChange("minConfidence", parseInt(e.target.value, 10))}
            style={styles.slider}
          />
          <span style={styles.confidenceValue}>{filters.minConfidence || 0}%</span>
        </div>
      </div>

      {/* Pattern count */}
      <div style={styles.countBar}>
        <span style={styles.countText}>
          Showing {filteredPatterns.length} of {patterns.length} patterns
        </span>
      </div>

      {/* Timeline */}
      <div style={styles.timeline}>
        {filteredPatterns.length === 0 ? (
          <div style={styles.empty}>No patterns detected. Click Refresh to scan.</div>
        ) : (
          filteredPatterns.map((pattern, index) => {
            const config = PATTERN_CONFIG[pattern.patternType];
            const isExpanded = expandedId === pattern.id;
            const confidenceColor = getConfidenceColor(pattern.confidence);

            return (
              <div
                key={pattern.id}
                style={{
                  ...styles.card,
                  borderLeftColor: confidenceColor,
                  animationDelay: `${index * 30}ms`,
                }}
                className="pattern-card"
              >
                {/* Card header */}
                <div style={styles.cardHeader} onClick={() => toggleExpand(pattern.id)}>
                  <div style={styles.cardLeft}>
                    <span className={config.badgeClass} style={{ ...styles.badge, backgroundColor: confidenceColor + "33", color: confidenceColor, borderColor: confidenceColor + "66" }}>
                      {config.icon} {config.label}
                    </span>
                    <span style={styles.sport}>{pattern.sport}</span>
                    <span style={styles.market}>{pattern.market}</span>
                  </div>
                  <div style={styles.cardRight}>
                    {/* Confidence bar */}
                    <div className="confidence-bar" style={styles.confidenceBarContainer}>
                      <div
                        style={{
                          ...styles.confidenceBarFill,
                          width: `${pattern.confidence}%`,
                          backgroundColor: confidenceColor,
                        }}
                      />
                      <span style={styles.confidenceText}>{pattern.confidence}%</span>
                    </div>
                    <span style={styles.timestamp}>{formatTime(pattern.detectedAt)}</span>
                    <span style={styles.expandIcon}>{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Description */}
                <div style={styles.description}>{pattern.description}</div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={styles.details}>
                    <div style={styles.detailGrid}>
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Event ID</span>
                        <span style={styles.detailValue}>{pattern.eventId}</span>
                      </div>
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Type</span>
                        <span style={styles.detailValue}>{pattern.patternType}</span>
                      </div>
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Confidence</span>
                        <span style={{ ...styles.detailValue, color: confidenceColor }}>
                          {pattern.confidenceLabel.toUpperCase()} ({pattern.confidence}%)
                        </span>
                      </div>
                      {pattern.triggeredByRuleId && (
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Triggered By</span>
                          <span style={styles.detailValue}>{pattern.triggeredByRuleId}</span>
                        </div>
                      )}
                    </div>

                    {/* Factors */}
                    {pattern.factors.length > 0 && (
                      <div style={styles.factors}>
                        <h5 style={styles.factorsTitle}>Factors</h5>
                        {pattern.factors.map((f, i) => (
                          <div key={i} style={styles.factorRow}>
                            <div style={styles.factorInfo}>
                              <span style={styles.factorName}>{f.factor}</span>
                              <span style={styles.factorDesc}>{f.description}</span>
                            </div>
                            <div style={styles.factorValue}>
                              <span style={styles.factorWeightBar}>
                                <span
                                  style={{
                                    ...styles.factorWeightFill,
                                    width: `${f.weight * 100}%`,
                                    backgroundColor: THEME_COLOR,
                                  }}
                                />
                              </span>
                              <span style={styles.factorVal}>{f.value !== undefined ? String(f.value) : ""}</span>
                              <span style={styles.factorWeight}>{Math.round(f.weight * 100)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
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
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottom: "1px solid #2a2a2a",
    paddingBottom: 12,
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: THEME_COLOR,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  icon: {
    fontSize: 20,
  },
  wsLive: {
    fontSize: 11,
    color: "#22c55e",
    marginLeft: 8,
    fontWeight: 700,
  },
  wsOffline: {
    fontSize: 11,
    color: "#666",
    marginLeft: 8,
    fontWeight: 700,
  },
  refreshBtn: {
    backgroundColor: THEME_COLOR + "22",
    color: THEME_COLOR,
    border: `1px solid ${THEME_COLOR}44`,
    borderRadius: 6,
    padding: "6px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    transition: "all 0.2s",
  },
  filters: {
    display: "flex",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
    alignItems: "center",
  },
  select: {
    backgroundColor: "#1a1a1a",
    color: "#e0e0e0",
    border: "1px solid #333",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 13,
    outline: "none",
    cursor: "pointer",
  },
  confidenceFilter: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 12,
    color: "#999",
  },
  slider: {
    width: 100,
    accentColor: THEME_COLOR,
  },
  confidenceValue: {
    fontSize: 12,
    color: THEME_COLOR,
    fontWeight: 600,
    minWidth: 30,
  },
  countBar: {
    marginBottom: 12,
    fontSize: 12,
    color: "#888",
  },
  countText: {
    fontSize: 12,
  },
  timeline: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: 600,
    overflowY: "auto",
    paddingRight: 4,
  },
  empty: {
    textAlign: "center",
    padding: 40,
    color: "#666",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#141414",
    borderRadius: 8,
    padding: "10px 14px",
    borderLeftWidth: 3,
    borderLeftStyle: "solid",
    borderLeftColor: THEME_COLOR,
    transition: "all 0.2s ease",
    cursor: "pointer",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cardLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  cardRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    border: "1px solid",
  },
  sport: {
    fontSize: 12,
    color: "#aaa",
    fontWeight: 600,
  },
  market: {
    fontSize: 11,
    color: "#777",
    backgroundColor: "#1e1e1e",
    padding: "1px 6px",
    borderRadius: 4,
  },
  confidenceBarContainer: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: 100,
  },
  confidenceBarFill: {
    height: 6,
    borderRadius: 3,
    transition: "width 0.5s ease",
    minWidth: 2,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: 700,
    color: "#ccc",
    minWidth: 32,
    textAlign: "right",
  },
  timestamp: {
    fontSize: 11,
    color: "#666",
    fontFamily: "monospace",
    minWidth: 70,
    textAlign: "right",
  },
  expandIcon: {
    fontSize: 10,
    color: "#666",
    width: 16,
    textAlign: "center",
  },
  description: {
    fontSize: 12,
    color: "#bbb",
    marginTop: 6,
    lineHeight: 1.4,
  },
  details: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1px solid #2a2a2a",
    animation: "fadeIn 0.2s ease",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 8,
    marginBottom: 10,
  },
  detailItem: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  detailLabel: {
    fontSize: 10,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  detailValue: {
    fontSize: 12,
    color: "#ccc",
    fontWeight: 500,
  },
  factors: {
    backgroundColor: "#0f0f0f",
    borderRadius: 6,
    padding: 10,
  },
  factorsTitle: {
    margin: "0 0 8px 0",
    fontSize: 12,
    color: THEME_COLOR,
    fontWeight: 600,
  },
  factorRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 0",
    borderBottom: "1px solid #1e1e1e",
  },
  factorInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
  },
  factorName: {
    fontSize: 11,
    color: "#ccc",
    fontWeight: 500,
  },
  factorDesc: {
    fontSize: 10,
    color: "#888",
  },
  factorValue: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  factorWeightBar: {
    display: "inline-block",
    width: 40,
    height: 4,
    backgroundColor: "#2a2a2a",
    borderRadius: 2,
  },
  factorWeightFill: {
    display: "block",
    height: "100%",
    borderRadius: 2,
    transition: "width 0.3s ease",
  },
  factorVal: {
    fontSize: 10,
    color: "#aaa",
    minWidth: 30,
    textAlign: "right",
  },
  factorWeight: {
    fontSize: 10,
    color: "#666",
    minWidth: 30,
    textAlign: "right",
  },
};

export default PatternHistory;
