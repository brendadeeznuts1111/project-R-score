/**
 * PlayerCard Component — Desert Rose Theme (#d4a5a5)
 *
 * Displays a player summary card with:
 * - Avatar placeholder with archetype badge
 * - Name, balance, risk tier (color-coded)
 * - Win rate, total wagers, P&L
 * - Click to expand full profile
 */

import React, { useState } from "react";
import type { CustomerArchetype, RiskTier } from "../../utils/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlayerCardData {
  id: string;
  customerId: string;
  displayName: string;
  email?: string | null;
  balance: number;
  riskTier: RiskTier;
  archetype?: CustomerArchetype | null;
  winRate?: number | null;
  wagerCount: number;
  netPnl: number;
  lastActiveAt?: number | null;
  status?: string;
}

interface PlayerCardProps {
  player: PlayerCardData;
  onClick?: (player: PlayerCardData) => void;
  selected?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ARCHETYPE_LABELS: Record<string, string> = {
  sharp: "Sharp",
  whale: "Whale",
  chase_gambler: "Chaser",
  new: "New",
  recreational: "Rec",
  suspicious: "Suspicious",
};

const ARCHETYPE_EMOJI: Record<string, string> = {
  sharp: "\u{1F3AF}",
  whale: "\u{1F40B}",
  chase_gambler: "\u{1F525}",
  new: "\u{1F31F}",
  recreational: "\u{26BD}",
  suspicious: "\u{1F6A8}",
};

const RISK_TIER_COLORS: Record<RiskTier, { bg: string; text: string; border: string }> = {
  BLACK: { bg: "#1a1a1a", text: "#ffffff", border: "#333333" },
  RED: { bg: "#dc3545", text: "#ffffff", border: "#b02a37" },
  YELLOW: { bg: "#ffc107", text: "#212529", border: "#e0a800" },
  GREEN: { bg: "#28a745", text: "#ffffff", border: "#1e7e34" },
};

function formatCents(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(dollars);
}

function formatPercent(val: number | null | undefined): string {
  if (val == null) return "--";
  return `${(val * 100).toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PlayerCard: React.FC<PlayerCardProps> = ({ player, onClick, selected }) => {
  const [expanded, setExpanded] = useState(false);
  const archetype = player.archetype ?? "recreational";
  const tierColor = RISK_TIER_COLORS[player.riskTier] ?? RISK_TIER_COLORS.GREEN;
  const isPositivePnl = (player.netPnl ?? 0) >= 0;

  const handleClick = () => {
    setExpanded(!expanded);
    onClick?.(player);
  };

  return (
    <div
      className={`player-card ${selected ? "player-card-selected" : ""}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
      style={{
        border: `2px solid ${selected ? "#d4a5a5" : tierColor.border}`,
        borderRadius: "12px",
        padding: "16px",
        background: "#1e1e2f",
        color: "#e0e0e0",
        cursor: "pointer",
        transition: "all 0.2s ease",
        minWidth: "280px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Risk tier stripe */}
      <div
        className={`risk-tier-${player.riskTier.toLowerCase()}`}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "4px",
          background: tierColor.bg,
        }}
      />

      {/* Header: Avatar + Name + Archetype */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
        <div
          className="player-avatar"
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: `linear-gradient(135deg, #d4a5a5 0%, #c48e8e 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px",
            flexShrink: 0,
            border: `2px solid ${tierColor.border}`,
          }}
        >
          {ARCHETYPE_EMOJI[archetype] ?? "\u{1F464}"}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontWeight: 600,
                fontSize: "15px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {player.displayName || "Unnamed Player"}
            </span>
            <span
              className={`archetype-${archetype}`}
              style={{
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                padding: "2px 8px",
                borderRadius: "10px",
                background:
                  archetype === "sharp"
                    ? "rgba(212,165,165,0.25)"
                    : archetype === "whale"
                    ? "rgba(100,149,237,0.25)"
                    : archetype === "chase_gambler"
                    ? "rgba(255,99,71,0.25)"
                    : archetype === "suspicious"
                    ? "rgba(255,165,0,0.25)"
                    : "rgba(128,128,128,0.2)",
                color:
                  archetype === "sharp"
                    ? "#d4a5a5"
                    : archetype === "whale"
                    ? "#6495ed"
                    : archetype === "chase_gambler"
                    ? "#ff6347"
                    : archetype === "suspicious"
                    ? "#ffa500"
                    : "#aaa",
                flexShrink: 0,
              }}
            >
              {ARCHETYPE_LABELS[archetype] ?? archetype}
            </span>
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "#888",
              marginTop: "2px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {player.email || player.customerId}
          </div>
        </div>

        {/* Risk tier badge */}
        <div
          className={`risk-tier-${player.riskTier.toLowerCase()}`}
          style={{
            background: tierColor.bg,
            color: tierColor.text,
            fontSize: "10px",
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: "8px",
            textTransform: "uppercase",
            letterSpacing: "1px",
            flexShrink: 0,
          }}
        >
          {player.riskTier}
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "8px",
          marginTop: "14px",
          paddingTop: "12px",
          borderTop: "1px solid rgba(212,165,165,0.15)",
        }}
      >
        <div className="player-stat" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Balance
          </div>
          <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "2px" }}>
            {formatCents(player.balance)}
          </div>
        </div>

        <div className="player-stat" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Win Rate
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              marginTop: "2px",
              color:
                (player.winRate ?? 0) > 0.55 ? "#d4a5a5" : (player.winRate ?? 0) > 0.4 ? "#e0e0e0" : "#ff6347",
            }}
          >
            {formatPercent(player.winRate)}
          </div>
        </div>

        <div className="player-stat" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Wagers
          </div>
          <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "2px" }}>
            {player.wagerCount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* P&L + expanded info */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "10px",
          paddingTop: "8px",
          borderTop: "1px solid rgba(212,165,165,0.1)",
        }}
      >
        <div style={{ fontSize: "12px" }}>
          <span style={{ color: "#888" }}>P&L: </span>
          <span style={{ color: isPositivePnl ? "#28a745" : "#dc3545", fontWeight: 600 }}>
            {isPositivePnl ? "+" : ""}
            {formatCents(player.netPnl)}
          </span>
        </div>
        {player.lastActiveAt && (
          <div style={{ fontSize: "11px", color: "#666" }}>
            {new Date(player.lastActiveAt * 1000).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div
          style={{
            marginTop: "12px",
            paddingTop: "12px",
            borderTop: "1px solid rgba(212,165,165,0.2)",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>Quick Actions</div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              style={{
                background: "rgba(212,165,165,0.2)",
                border: "1px solid #d4a5a5",
                color: "#d4a5a5",
                borderRadius: "6px",
                padding: "4px 12px",
                fontSize: "11px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(212,165,165,0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(212,165,165,0.2)";
              }}
            >
              View Profile
            </button>
            <button
              style={{
                background: "rgba(220,53,69,0.15)",
                border: "1px solid rgba(220,53,69,0.4)",
                color: "#dc3545",
                borderRadius: "6px",
                padding: "4px 12px",
                fontSize: "11px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(220,53,69,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(220,53,69,0.15)";
              }}
            >
              Add Flag
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerCard;
