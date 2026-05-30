/**
 * Home Page / Dashboard
 *
 * Main landing page showing system overview:
 *   - Server health status
 *   - Key metrics cards
 *   - WebSocket connection status
 *   - Quick links to all zones
 */

import React, { useEffect, useState } from "react";
import { useApp } from "../App";

interface HealthData {
  status: string;
  version: string;
  database: string;
  timestamp: string;
  uptime: number;
}

const HomePage: React.FC = () => {
  const { state } = useApp();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const uptimeHours = health ? Math.floor(health.uptime / 3600) : 0;
  const uptimeMinutes = health
    ? Math.floor((health.uptime % 3600) / 60)
    : 0;

  const statusCards = [
    {
      label: "Server Status",
      value: health?.status || "unknown",
      status: health?.status === "healthy" ? "ok" : "warn",
    },
    {
      label: "WebSocket",
      value: state.wsConnected ? "connected" : "disconnected",
      status: state.wsConnected ? "ok" : "warn",
    },
    {
      label: "Database",
      value: health?.database || "unknown",
      status: health?.database === "connected" ? "ok" : "error",
    },
    {
      label: "Uptime",
      value: `${uptimeHours}h ${uptimeMinutes}m`,
      status: "info",
    },
    {
      label: "Version",
      value: state.version,
      status: "info",
    },
    {
      label: "Active Alerts",
      value: String(state.activeAlerts),
      status: state.activeAlerts > 0 ? "warn" : "ok",
    },
  ];

  const quickLinks = [
    { path: "/api/health", label: "Health Check", desc: "GET /api/health" },
    { path: "/api/proxy/players", label: "Players API", desc: "GET /api/proxy/players" },
    { path: "/api/proxy/wagers", label: "Wagers API", desc: "GET /api/proxy/wagers" },
    { path: "/api/dashboard/metrics", label: "Metrics API", desc: "GET /api/dashboard/metrics" },
    { path: "/metrics", label: "Prometheus", desc: "/metrics" },
  ];

  return (
    <div className="home-page">
      <section className="dashboard-section">
        <h2 className="section-title">System Status</h2>
        {loading ? (
          <div className="loading-pulse">Loading health data...</div>
        ) : (
          <div className="status-grid">
            {statusCards.map((card) => (
              <div key={card.label} className={`status-card status-${card.status}`}>
                <div className="status-label">{card.label}</div>
                <div className="status-value">{card.value}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <h2 className="section-title">Quick API Links</h2>
        <div className="link-grid">
          {quickLinks.map((link) => (
            <a
              key={link.path}
              href={link.path}
              className="quick-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="link-label">{link.label}</span>
              <code className="link-desc">{link.desc}</code>
            </a>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <h2 className="section-title">Welcome to Sports Terminal OS</h2>
        <div className="info-panel">
          <p>
            This is the <strong>Sports Terminal OS v{state.version}</strong> dashboard.
            The backend provides 93 proxy endpoints, dual WebSocket/SSE streaming,
            46 SQLite tables, and 8 scheduled cron jobs.
          </p>
          <p>
            <strong>Backend stack:</strong> Bun.serve + bun:sqlite + React 19 + Vite 5
          </p>
          <p>
            <strong>Auth modes:</strong> JWT (HS256 via jose), API Key, Session, Dev Bypass
          </p>
          <p>
            <strong>Features:</strong> Risk scoring, player 360, agent hierarchy,
            IP surveillance, sandbox A/B testing, webhooks, Telegram Hub, and more.
          </p>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
