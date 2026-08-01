/**
 * Sidebar — Full Navigation Sidebar
 *
 * - Navigation groups with icons and labels
 * - Active route highlighting
 * - Collapsible on mobile
 * - Grouped by domain: Dashboard, Trading, Players, Agents, Operations, System
 */

import React from "react";
import { NavLink } from "react-router";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

// ---------------------------------------------------------------------------
// Navigation Configuration
// ---------------------------------------------------------------------------

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Dashboard",
    items: [{ path: "/", label: "Home", icon: "◈" }],
  },
  {
    title: "Trading",
    items: [
      { path: "/sportsbook", label: "Sportsbook", icon: "⚡" },
      { path: "/prediction-markets", label: "Predictions", icon: "🌲" },
      { path: "/patterns", label: "Patterns", icon: "📊" },
    ],
  },
  {
    title: "Players",
    items: [
      { path: "/customers", label: "Customers", icon: "👤" },
      { path: "/risk", label: "Risk Flags", icon: "⚑" },
      { path: "/live", label: "Live Ticker", icon: "📡" },
    ],
  },
  {
    title: "Agents",
    items: [
      { path: "/agents", label: "Agents", icon: "👥" },
      { path: "/agent-config", label: "Agent Config", icon: "⚙" },
      { path: "/partners", label: "Agent Hierarchy", icon: "🌐" },
    ],
  },
  {
    title: "Operations",
    items: [
      { path: "/command", label: "Command Center", icon: "◉" },
      { path: "/telegram", label: "Telegram", icon: "✈" },
      { path: "/operations", label: "Operations", icon: "🔧" },
      { path: "/logs", label: "Logs", icon: "📋" },
    ],
  },
  {
    title: "System",
    items: [
      { path: "/api-reference", label: "API Reference", icon: "📖" },
      { path: "/architecture", label: "Architecture", icon: "🏗" },
      { path: "/openapi", label: "OpenAPI", icon: "🔌" },
      { path: "/deploy", label: "Deploy", icon: "🚀" },
      { path: "/vault", label: "Vault", icon: "🔐" },
      { path: "/playground", label: "AI Playground", icon: "🤖" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  wsConnected: boolean;
  version: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse, wsConnected, version }) => {
  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="logo">◈</div>
        {!collapsed && (
          <div className="brand">
            <div className="brand-name">Sports Terminal</div>
            <div className="brand-version">v{version}</div>
          </div>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="nav-group">
            {!collapsed && <div className="nav-group-title">{group.title}</div>}
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? "active" : ""}`}
                title={collapsed ? item.label : undefined}
                end={item.path === "/"}
              >
                <span className="nav-icon">{item.icon}</span>
                {!collapsed && <span className="nav-label">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          className="collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "→" : "←"}
        </button>
        <div
          className={`connection-dot ${wsConnected ? "connected" : "disconnected"}`}
          title={wsConnected ? "WebSocket connected" : "WebSocket disconnected"}
        />
      </div>
    </aside>
  );
};

export default Sidebar;
