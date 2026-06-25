/**
 * Root Application Component — Sports Terminal OS v5.2.0
 *
 * Provides the main application shell with:
 *   - Sidebar navigation with ALL routes organized by category
 *   - Route definitions for all 20+ frontend pages
 *   - WebSocket connection management via useWebSocket hook
 *   - Global state context (version, WS status, server time, alerts)
 *   - Theme context for dark mode
 *   - Responsive sidebar (collapsible on mobile)
 *   - Lazy loading for all page components
 *
 * Navigation Groups:
 *   Dashboard: Home
 *   Trading: Sportsbook, Prediction Markets, Patterns
 *   Players: Customers, Risk Flags, Live Ticker
 *   Agents: Agents, Agent Config, Agent Hierarchy
 *   Operations: Command Center, Telegram, Operations, Logs
 *   System: API Reference, Architecture, OpenAPI, Deploy, Vault, AI Playground
 */

import React, { useEffect, useState, createContext, useContext } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import PageLayout from "./components/PageLayout";
import { useWebSocket } from "./hooks/useWebSocket";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AppState {
  version: string;
  serverTime: string;
  activeAlerts: number;
  wsConnected: boolean;
  darkMode: boolean;
}

interface AppContextValue {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

// ---------------------------------------------------------------------------
// Global context
// ---------------------------------------------------------------------------

const defaultState: AppState = {
  version: "5.2.0",
  serverTime: new Date().toISOString(),
  activeAlerts: 0,
  wsConnected: false,
  darkMode: true,
};

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Page components — ALL lazy-loaded
// ---------------------------------------------------------------------------

const HomePage = React.lazy(() => import("./pages/HomePage"));
const SportsbookPage = React.lazy(() => import("./pages/SportsbookPage"));
const PredictionMarketsPage = React.lazy(() => import("./pages/PredictionMarketsPage"));
const PatternsPage = React.lazy(() => import("./pages/PatternsPage"));
const CustomersPage = React.lazy(() => import("./pages/CustomersPage"));
const RiskPage = React.lazy(() => import("./pages/RiskPage"));
const LiveTickerPage = React.lazy(() => import("./pages/LiveTickerPage"));
const AgentsPage = React.lazy(() => import("./pages/AgentsPage"));
const AgentConfigPage = React.lazy(() => import("./pages/AgentConfigPage"));
const PartnersPage = React.lazy(() => import("./pages/PartnersPage"));
const CommandCenterPage = React.lazy(() => import("./pages/CommandCenterPage"));
const TelegramPage = React.lazy(() => import("./pages/TelegramPage"));
const OperationsPage = React.lazy(() => import("./pages/OperationsPage"));
const LogsPage = React.lazy(() => import("./pages/LogsPage"));
const ApiReferencePage = React.lazy(() => import("./pages/ApiReferencePage"));
const ArchitecturePage = React.lazy(() => import("./pages/ArchitecturePage"));
const OpenAPIPage = React.lazy(() => import("./pages/OpenAPIPage"));
const DeployPage = React.lazy(() => import("./pages/DeployPage"));
const VaultPage = React.lazy(() => import("./pages/VaultPage"));
const AIPlaygroundPage = React.lazy(() => import("./pages/AIPlaygroundPage"));
const NotFoundPage = React.lazy(() => import("./pages/NotFoundPage"));

// ---------------------------------------------------------------------------
// Route → Page Title mapping
// ---------------------------------------------------------------------------

const ROUTE_TITLES: Record<string, string> = {
  "/": "Sports Terminal OS",
  "/sportsbook": "Sportsbook Grid",
  "/prediction-markets": "Prediction Markets",
  "/patterns": "Betting Patterns",
  "/customers": "Customers",
  "/risk": "Risk Flags",
  "/live": "Live Ticker",
  "/agents": "Agents",
  "/agent-config": "Agent Configuration",
  "/partners": "Partner Hierarchy",
  "/command": "Command Center",
  "/telegram": "Telegram Hub",
  "/operations": "Operations",
  "/logs": "System Logs",
  "/api-reference": "API Reference",
  "/architecture": "System Architecture",
  "/openapi": "OpenAPI Specification",
  "/deploy": "Deployment",
  "/vault": "Secrets Vault",
  "/playground": "AI Playground",
};

// ---------------------------------------------------------------------------
// App Component
// ---------------------------------------------------------------------------

export function App(): React.JSX.Element {
  const [state, setState] = useState<AppState>(defaultState);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const ws = useWebSocket();

  // Derive page title from route
  const pageTitle = ROUTE_TITLES[location.pathname] || "Sports Terminal OS";

  // Sync WS connection status to app state
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      wsConnected: ws.connected,
    }));
  }, [ws.connected]);

  // Subscribe to WebSocket channels for global state
  useEffect(() => {
    const unsubRisk = ws.subscribe("riskAlert", () => {
      setState((prev) => ({
        ...prev,
        activeAlerts: (prev.activeAlerts || 0) + 1,
      }));
    });

    const unsubConnected = ws.subscribe("connected", (msg) => {
      setState((prev) => ({
        ...prev,
        serverTime: new Date((msg.data as Record<string, number>)?.serverTime || Date.now()).toISOString(),
      }));
    });

    // Subscribe to default channels
    if (ws.connected) {
      ws.subscribeChannel("wagerTick");
      ws.subscribeChannel("riskAlert");
      ws.subscribeChannel("positionUpdate");
    }

    return () => {
      unsubRisk();
      unsubConnected();
    };
  }, [ws]);

  // Server time ticker (local fallback)
  useEffect(() => {
    const ticker = setInterval(() => {
      setState((prev) => ({
        ...prev,
        serverTime: new Date().toISOString(),
      }));
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  // Responsive: auto-collapse sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <AppContext.Provider value={{ state, setState }}>
      <PageLayout
        version={state.version}
        wsConnected={state.wsConnected}
        serverTime={state.serverTime}
        activeAlerts={state.activeAlerts}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        pageTitle={pageTitle}
      >
        <Routes>
          {/* Dashboard */}
          <Route path="/" element={<HomePage />} />

          {/* Trading */}
          <Route path="/sportsbook" element={<SportsbookPage />} />
          <Route path="/prediction-markets" element={<PredictionMarketsPage />} />
          <Route path="/patterns" element={<PatternsPage />} />

          {/* Players */}
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/risk" element={<RiskPage />} />
          <Route path="/live" element={<LiveTickerPage />} />

          {/* Agents */}
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/agent-config" element={<AgentConfigPage />} />
          <Route path="/partners" element={<PartnersPage />} />

          {/* Operations */}
          <Route path="/command" element={<CommandCenterPage />} />
          <Route path="/telegram" element={<TelegramPage />} />
          <Route path="/operations" element={<OperationsPage />} />
          <Route path="/logs" element={<LogsPage />} />

          {/* System */}
          <Route path="/api-reference" element={<ApiReferencePage />} />
          <Route path="/architecture" element={<ArchitecturePage />} />
          <Route path="/openapi" element={<OpenAPIPage />} />
          <Route path="/deploy" element={<DeployPage />} />
          <Route path="/vault" element={<VaultPage />} />
          <Route path="/playground" element={<AIPlaygroundPage />} />

          {/* Catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </PageLayout>
    </AppContext.Provider>
  );
}
