#!/usr/bin/env bun
// apps/profile-station/dashboard/index.tsx
// Tier-1380 Profile Station Dashboard with PUBLIC_ env injection

import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// PUBLIC_ env vars injected by Bun at build time
const WS_URL = import.meta.env.PUBLIC_WS_URL || "ws://localhost:3000";
const ANOMALY_THRESHOLD = Number(import.meta.env.PUBLIC_ANOMALY_THRESHOLD) || 0.92;
const TENSION_THRESHOLD = Number(import.meta.env.PUBLIC_TENSION_THRESHOLD) || 80.0;
const GNN_ITERATIONS_MAX = Number(import.meta.env.PUBLIC_GNN_ITERATIONS_MAX) || 100;
const PROFILE_VERSION = import.meta.env.PUBLIC_PROFILE_STATION_VERSION || "1380";
const DASHBOARD_REFRESH_RATE = Number(import.meta.env.PUBLIC_DASHBOARD_REFRESH_RATE) || 100;
const DASHBOARD_3D_ENABLED = import.meta.env.PUBLIC_DASHBOARD_3D_ENABLED === "true";

interface TensionNode {
  id: string;
  tension: number;
  velocity: number;
  anomaly: boolean;
  position: { x: number; y: number; z: number };
}

interface PropagationResult {
  converged: boolean;
  delta: number;
  iterations: number;
  durationNs: number;
  affectedNodeIds: string[];
  anomalyScore: number;
  nodes: TensionNode[];
}

function TensionDashboard() {
  const [nodes, setNodes] = useState<TensionNode[]>([]);
  const [stats, setStats] = useState<PropagationResult | null>(null);
  const [connected, setConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    console.log(`🚀 Profile Station v${PROFILE_VERSION} initializing`);
    console.log(`📡 Connecting to: ${WS_URL}`);
    console.log(`⚡ Anomaly threshold: ${ANOMALY_THRESHOLD}`);

    // Connect to tension stream
    ws.current = new WebSocket(WS_URL);

    // Set headers after connection (WebSocket doesn't support headers in constructor)
    ws.current.onopen = () => {
      setConnected(true);
      console.log("✅ Connected to tension stream");

      // Send client info as first message
      ws.current?.send(JSON.stringify({
        type: 'client_info',
        version: PROFILE_VERSION,
        features: DASHBOARD_3D_ENABLED ? "3d,simd,hll" : "2d",
      }));
    };

    ws.current.onmessage = (event: MessageEvent) => {
      try {
        const data: PropagationResult = JSON.parse(event.data);

        // Update stats
        setStats(data);

        // Update nodes
        setNodes(data.nodes || []);

        // Client-side anomaly detection using PUBLIC_ threshold
        if (data.anomalyScore > ANOMALY_THRESHOLD) {
          triggerAnomalyVisual(data.affectedNodeIds);
        }

        // Update dashboard
        updateVisualization(data);

      } catch (e) {
        console.error("Failed to parse tension data:", e);
      }
    };

    ws.current.onclose = () => {
      setConnected(false);
      console.log("❌ Disconnected from tension stream");
    };

    // Cleanup
    return () => {
      ws.current?.close();
    };
  }, []);

  const triggerAnomalyVisual = (nodeIds: string[]) => {
    console.log(`🚨 Anomaly detected in nodes: ${nodeIds.join(", ")}`);

    // Flash affected nodes
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        nodeIds.forEach((id: string) => {
          const node = nodes.find(n => n.id === id);
          if (node) {
            ctx.beginPath();
            ctx.arc(node.position.x, node.position.y, 20, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }
    }
  };

  const updateVisualization = (data: PropagationResult) => {
    if (!DASHBOARD_3D_ENABLED) {
      // 2D Canvas visualization
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw nodes
      data.nodes?.forEach(node => {
        const intensity = node.tension / 100;
        ctx.fillStyle = `rgba(59, 130, 246, ${intensity})`;
        ctx.beginPath();
        ctx.arc(node.position.x, node.position.y, 10, 0, Math.PI * 2);
        ctx.fill();

        // Draw anomaly indicator
        if (node.anomaly) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 1)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    } else {
      // 3D visualization with Ziggy
      update3DVisualization(data);
    }
  };

  const update3DVisualization = (data: PropagationResult) => {
    // 3D visualization implementation
    console.log(`🎮 3D viz update: ${data.nodes?.length} nodes`);
  };

  return (
    <div className="tension-dashboard">
      <header>
        <h1>Factory Wager Profile Station v{PROFILE_VERSION}</h1>
        <div className="status">
          <span className={`indicator ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
          <span className="threshold">Anomaly: {ANOMALY_THRESHOLD}</span>
          <span className="refresh">{DASHBOARD_REFRESH_RATE}ms</span>
        </div>
      </header>

      <main>
        <section className="metrics">
          {stats && (
            <div className="stats-grid">
              <div className="stat">
                <label>Convergence</label>
                <span>{stats.converged ? '✅' : '⏳'}</span>
              </div>
              <div className="stat">
                <label>Delta</label>
                <span>{stats.delta.toFixed(4)}</span>
              </div>
              <div className="stat">
                <label>Iterations</label>
                <span>{stats.iterations} / {GNN_ITERATIONS_MAX}</span>
              </div>
              <div className="stat">
                <label>Anomaly Score</label>
                <span className={stats.anomalyScore > ANOMALY_THRESHOLD ? 'anomaly' : ''}>
                  {stats.anomalyScore.toFixed(4)}
                </span>
              </div>
              <div className="stat">
                <label>Duration</label>
                <span>{(stats.durationNs / 1e6).toFixed(2)} ms</span>
              </div>
              <div className="stat">
                <label>Active Nodes</label>
                <span>{nodes.length}</span>
              </div>
            </div>
          )}
        </section>

        <section className="visualization">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className={DASHBOARD_3D_ENABLED ? 'hidden' : ''}
          />
          {DASHBOARD_3D_ENABLED && (
            <div id="ziggy-container" className="viz-3d">
              {/* 3D visualization container */}
            </div>
          )}
        </section>
      </main>

      <footer>
        <p>Tension Field Engine • HLL Volume: {import.meta.env.PUBLIC_HLL_VOLUME_ENABLED ? 'ON' : 'OFF'} • SIMD: {import.meta.env.PUBLIC_SIMD_ACCELERATION_ENABLED ? 'ON' : 'OFF'}</p>
      </footer>
    </div>
  );
}

// Initialize dashboard
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<TensionDashboard />);
}

// HMR support
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log("🔥 Dashboard hot reloaded - PUBLIC_ env preserved");
  });
}
