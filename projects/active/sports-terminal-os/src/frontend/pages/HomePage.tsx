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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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

  const badgeVariant = (status: string) => {
    if (status === "ok") return "default" as const;
    if (status === "warn" || status === "error") return "destructive" as const;
    return "secondary" as const;
  };

  return (
    <div className="home-page space-y-6 p-1">
      <section className="dashboard-section space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title m-0">System Status</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
        </div>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {statusCards.map((card) => (
              <Card key={card.label} className="border-border/60 bg-card/80">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs uppercase tracking-wide">
                    {card.label}
                  </CardDescription>
                  <CardTitle className="text-xl font-semibold tabular-nums">
                    {card.value}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Badge variant={badgeVariant(card.status)}>{card.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section space-y-3">
        <h2 className="section-title m-0">Quick API Links</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Card key={link.path} className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{link.label}</CardTitle>
                <CardDescription>
                  <code className="text-xs">{link.desc}</code>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild size="sm" variant="secondary">
                  <a href={link.path} target="_blank" rel="noopener noreferrer">
                    Open
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Welcome to Sports Terminal OS</CardTitle>
            <CardDescription>
              v{state.version} · Bun.serve + bun:sqlite + React 19 + Vite 5 · shadcn/ui
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Backend provides 93 proxy endpoints, dual WebSocket/SSE streaming,
              46 SQLite tables, and scheduled cron jobs.
            </p>
            <p>
              <strong className="text-foreground">Auth:</strong> JWT (HS256 via jose),
              API Key, Session, Dev Bypass
            </p>
            <p>
              <strong className="text-foreground">Features:</strong> Risk scoring,
              player 360, agent hierarchy, IP surveillance, sandbox A/B testing,
              webhooks, Telegram Hub, and more.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default HomePage;
