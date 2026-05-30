/**
 * AgentTree — Agent Domain (Sunset Boulevard: #e76f51)
 *
 * Interactive tree view of agent hierarchy:
 *   - Expandable/collapsible nodes
 *   - Agent card: name, login, tier badge, player count, balance
 *   - Color-coded by tier (platinum, gold, silver, bronze)
 *   - Click to expand/collapse children
 *   - Path highlighting from root to selected
 *   - CSS classes: .agent-node, .agent-tier-{platinum,gold,silver,bronze}, .agent-tree, .hierarchy-path
 */

import React, { useState, useCallback, useMemo } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AgentTier = "platinum" | "gold" | "silver" | "bronze";
type AgentStatus = "active" | "inactive" | "suspended";

export interface AgentTreeNode {
  login: string;
  displayName: string;
  tier: AgentTier;
  status: AgentStatus;
  balance: number;
  commissionRate: number;
  totalPlayers: number;
  totalWagers: number;
  totalPnl: number;
  level: number;
  children: AgentTreeNode[];
}

interface AgentTreeProps {
  root: AgentTreeNode | null;
  themeColor?: string;
  onSelectAgent?: (login: string) => void;
  selectedAgent?: string | null;
}

// ---------------------------------------------------------------------------
// Tier colors (Sunset Boulevard palette)
// ---------------------------------------------------------------------------

const TIER_STYLES: Record<AgentTier, { bg: string; border: string; badge: string; text: string }> = {
  platinum: { bg: "#fdf2f0", border: "#e76f51", badge: "#e76f51", text: "#fff" },
  gold:     { bg: "#fff8e6", border: "#f4a261", badge: "#f4a261", text: "#fff" },
  silver:   { bg: "#f8f9fa", border: "#adb5bd", badge: "#adb5bd", text: "#fff" },
  bronze:   { bg: "#faf3e8", border: "#cd7f32", badge: "#cd7f32", text: "#fff" },
};

const TIER_LABELS: Record<AgentTier, string> = {
  platinum: "PLATINUM",
  gold:     "GOLD",
  silver:   "SILVER",
  bronze:   "BRONZE",
};

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatCurrency(cents: number): string {
  if (cents === 0) return "$0";
  if (Math.abs(cents) < 100) return `${cents}c`;
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

// ---------------------------------------------------------------------------
// Agent Node Component
// ---------------------------------------------------------------------------

interface NodeProps {
  node: AgentTreeNode;
  depth: number;
  selectedAgent: string | null;
  highlightedPath: Set<string>;
  expandedNodes: Set<string>;
  onToggleExpand: (login: string) => void;
  onSelect: (login: string) => void;
  themeColor: string;
}

const AgentNodeComponent: React.FC<NodeProps> = ({
  node,
  depth,
  selectedAgent,
  highlightedPath,
  expandedNodes,
  onToggleExpand,
  onSelect,
  themeColor,
}) => {
  const isExpanded = expandedNodes.has(node.login);
  const isSelected = selectedAgent === node.login;
  const isHighlighted = highlightedPath.has(node.login);
  const hasChildren = node.children.length > 0;
  const tierStyle = TIER_STYLES[node.tier];

  // Calculate connector lines
  const indentWidth = depth * 28;

  return (
    <div className={`agent-node-container ${isHighlighted ? "hierarchy-path" : ""}`}>
      {/* Connector line from parent */}
      {depth > 0 && (
        <div
          className="agent-connector"
          style={{
            position: "absolute",
            left: indentWidth - 14,
            top: 0,
            width: 14,
            height: 24,
            borderLeft: `2px solid ${themeColor}40`,
            borderBottom: `2px solid ${themeColor}40`,
            borderBottomLeftRadius: 6,
          }}
        />
      )}

      <div
        className={`
          agent-node
          agent-tier-${node.tier}
          ${isSelected ? "agent-node-selected" : ""}
          ${isHighlighted ? "agent-node-highlighted" : ""}
          ${node.status !== "active" ? "agent-node-inactive" : ""}
        `}
        style={{
          marginLeft: indentWidth,
          marginBottom: 4,
          borderRadius: 10,
          border: `2px solid ${isSelected ? themeColor : tierStyle.border}`,
          background: isSelected ? `${themeColor}15` : tierStyle.bg,
          padding: "10px 14px",
          cursor: "pointer",
          position: "relative",
          transition: "all 0.2s ease",
          opacity: node.status === "inactive" ? 0.6 : 1,
        }}
        onClick={() => onSelect(node.login)}
        onDoubleClick={() => hasChildren && onToggleExpand(node.login)}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Expand/collapse toggle */}
          {hasChildren && (
            <button
              className="agent-expand-btn"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(node.login);
              }}
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: `1.5px solid ${themeColor}`,
                background: isExpanded ? themeColor : "#fff",
                color: isExpanded ? "#fff" : themeColor,
                fontSize: 12,
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.15s ease",
              }}
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? "−" : "+"}
            </button>
          )}
          {!hasChildren && <div style={{ width: 22, flexShrink: 0 }} />}

          {/* Drag handle */}
          <div
            className="agent-drag-handle"
            style={{
              color: "#aaa",
              fontSize: 14,
              cursor: "grab",
              userSelect: "none",
              lineHeight: 1,
              letterSpacing: 2,
            }}
            title="Drag to reorder"
          >
            ⋮⋮
          </div>

          {/* Tier badge */}
          <span
            className={`agent-tier-badge agent-tier-${node.tier}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2px 10px",
              borderRadius: 12,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.5px",
              background: tierStyle.badge,
              color: tierStyle.text,
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            {TIER_LABELS[node.tier]}
          </span>

          {/* Name and login */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: "#264653",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {node.displayName}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#888",
                fontFamily: "monospace",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              @{node.login}
            </div>
          </div>

          {/* Stats */}
          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#888" }}>Players</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#264653" }}>
                {formatNumber(node.totalPlayers)}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#888" }}>Wagers</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#264653" }}>
                {formatNumber(node.totalWagers)}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#888" }}>Balance</div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: node.balance >= 0 ? "#2a9d8f" : "#e76f51",
                }}
              >
                {formatCurrency(node.balance)}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#888" }}>Comm</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#264653" }}>
                {node.commissionRate}%
              </div>
            </div>
          </div>

          {/* Status indicator */}
          {node.status !== "active" && (
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 8,
                fontSize: 10,
                fontWeight: 600,
                background: node.status === "suspended" ? "#f8d7da" : "#e2e3e5",
                color: node.status === "suspended" ? "#721c24" : "#383d41",
                textTransform: "uppercase",
              }}
            >
              {node.status}
            </span>
          )}
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="agent-children" style={{ position: "relative" }}>
          {node.children.map((child) => (
            <AgentNodeComponent
              key={child.login}
              node={child}
              depth={depth + 1}
              selectedAgent={selectedAgent}
              highlightedPath={highlightedPath}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              themeColor={themeColor}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main AgentTree Component
// ---------------------------------------------------------------------------

const AgentTree: React.FC<AgentTreeProps> = ({
  root,
  themeColor = "#e76f51",
  onSelectAgent,
  selectedAgent: externalSelected,
}) => {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(externalSelected || null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Expand root by default
  React.useEffect(() => {
    if (root && expandedNodes.size === 0) {
      setExpandedNodes(new Set([root.login]));
    }
  }, [root]);

  // Sync external selection
  React.useEffect(() => {
    if (externalSelected !== undefined) {
      setSelectedAgent(externalSelected);
    }
  }, [externalSelected]);

  // Compute highlighted path (root to selected)
  const highlightedPath = useMemo(() => {
    if (!root || !selectedAgent) return new Set<string>();
    const path = new Set<string>();

    function findPath(node: AgentTreeNode, target: string): boolean {
      path.add(node.login);
      if (node.login === target) return true;
      for (const child of node.children) {
        if (findPath(child, target)) return true;
      }
      path.delete(node.login);
      return false;
    }

    findPath(root, selectedAgent);
    return path;
  }, [root, selectedAgent]);

  const handleToggleExpand = useCallback((login: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(login)) {
        next.delete(login);
      } else {
        next.add(login);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (login: string) => {
      setSelectedAgent(login);
      onSelectAgent?.(login);
    },
    [onSelectAgent]
  );

  const expandAll = useCallback(() => {
    if (!root) return;
    const all = new Set<string>();
    function collect(node: AgentTreeNode) {
      all.add(node.login);
      node.children.forEach(collect);
    }
    collect(root);
    setExpandedNodes(all);
  }, [root]);

  const collapseAll = useCallback(() => {
    if (!root) return;
    setExpandedNodes(new Set([root.login]));
  }, [root]);

  if (!root) {
    return (
      <div className="agent-tree" style={{ padding: 24, textAlign: "center", color: "#888" }}>
        <div style={{ fontSize: 16, marginBottom: 8 }}>No agents found</div>
        <div style={{ fontSize: 12 }}>Create an agent to see the hierarchy</div>
      </div>
    );
  }

  return (
    <div className="agent-tree" style={{ padding: "16px 8px" }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          padding: "0 8px",
        }}
      >
        <div style={{ fontSize: 12, color: "#666" }}>
          {countNodes(root)} agents
          {selectedAgent && (
            <span style={{ marginLeft: 12, color: themeColor, fontWeight: 600 }}>
              Selected: {selectedAgent}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={expandAll}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              border: `1px solid ${themeColor}40`,
              background: "#fff",
              color: themeColor,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = themeColor;
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.color = themeColor;
            }}
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              border: `1px solid ${themeColor}40`,
              background: "#fff",
              color: themeColor,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = themeColor;
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.color = themeColor;
            }}
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Tree */}
      <div role="tree" style={{ position: "relative" }}>
        <AgentNodeComponent
          node={root}
          depth={0}
          selectedAgent={selectedAgent}
          highlightedPath={highlightedPath}
          expandedNodes={expandedNodes}
          onToggleExpand={handleToggleExpand}
          onSelect={handleSelect}
          themeColor={themeColor}
        />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countNodes(node: AgentTreeNode): number {
  return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
}

export default AgentTree;
