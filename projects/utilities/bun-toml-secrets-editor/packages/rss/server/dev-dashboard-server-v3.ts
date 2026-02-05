#!/usr/bin/env bun
/**
 * Dev Dashboard Server V3
 * Enhanced with themes, advanced charts, export functionality, keyboard shortcuts
 */

import { type ServerWebSocket, serve } from "bun";
import { createKimiClient } from "../integrations/kimi-api-client";
import { type Alert, alertsManager } from "../services/alerts-manager";
import { getDriftMonitorManager } from "../services/connection-drift-monitor";
import { getEnhancedMetricsCollector } from "../services/enhanced-metrics-collector";

// V3 Dashboard HTML with themes, charts, and enhanced UI
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dev Dashboard V3 - Enhanced Metrics & Monitoring</title>
    <style>
        :root {
            --bg-primary: #0a0a0f;
            --bg-secondary: #111118;
            --bg-tertiary: #16161f;
            --border-color: #1e1e2e;
            --text-primary: #e0e0e0;
            --text-secondary: #888;
            --accent-cyan: #00d4ff;
            --accent-green: #00ff64;
            --accent-yellow: #ffc800;
            --accent-red: #ff3232;
            --accent-purple: #a855f7;
            --accent-orange: #f97316;
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        }
        
        [data-theme="light"] {
            --bg-primary: #f8fafc;
            --bg-secondary: #ffffff;
            --bg-tertiary: #f1f5f9;
            --border-color: #e2e8f0;
            --text-primary: #0f172a;
            --text-secondary: #64748b;
            --accent-cyan: #0891b2;
            --accent-green: #10b981;
            --accent-yellow: #f59e0b;
            --accent-red: #ef4444;
            --accent-purple: #8b5cf6;
            --accent-orange: #f97316;
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
            transition: background 0.3s, color 0.3s;
        }
        
        .header {
            background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
            padding: 1rem 2rem;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 100;
            backdrop-filter: blur(10px);
        }
        
        .header h1 { 
            font-size: 1.25rem; 
            background: linear-gradient(90deg, var(--accent-cyan), var(--accent-green)); 
            -webkit-background-clip: text; 
            -webkit-text-fill-color: transparent;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        
        .header-controls {
            display: flex;
            gap: 1rem;
            align-items: center;
        }
        
        .btn-icon {
            background: transparent;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 0.5rem;
            cursor: pointer;
            color: var(--text-secondary);
            transition: all 0.2s;
        }
        
        .btn-icon:hover {
            border-color: var(--accent-cyan);
            color: var(--accent-cyan);
        }
        
        .status-bar {
            display: flex;
            gap: 0.75rem;
            align-items: center;
            flex-wrap: wrap;
        }
        
        .status-pill {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.375rem 0.875rem;
            border-radius: 20px;
            font-size: 0.8125rem;
            font-weight: 500;
            background: rgba(0, 212, 255, 0.1);
            border: 1px solid rgba(0, 212, 255, 0.2);
            transition: all 0.3s;
        }
        
        .status-pill.healthy { background: rgba(0, 255, 100, 0.15); border-color: var(--accent-green); box-shadow: 0 0 15px rgba(0, 255, 100, 0.2); }
        .status-pill.warning { background: rgba(255, 200, 0, 0.15); border-color: var(--accent-yellow); box-shadow: 0 0 15px rgba(255, 200, 0, 0.2); }
        .status-pill.critical { background: rgba(255, 50, 50, 0.15); border-color: var(--accent-red); box-shadow: 0 0 20px rgba(255, 50, 50, 0.4); animation: pulse-red 2s infinite; }
        
        .badge-hex {
            font-family: 'SF Mono', monospace;
            font-size: 0.6875rem;
            opacity: 0.7;
            margin-left: 0.25rem;
        }
        
        .dot { width: 6px; height: 6px; border-radius: 50%; animation: pulse 2s infinite; }
        .dot-green { background: var(--accent-green); }
        .dot-yellow { background: var(--accent-yellow); }
        .dot-red { background: var(--accent-red); }
        
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes pulse-red { 0%, 100% { box-shadow: 0 0 10px rgba(255, 50, 50, 0.2); } 50% { box-shadow: 0 0 25px rgba(255, 50, 50, 0.6); } }
        
        .health-badges { display: flex; gap: 0.5rem; align-items: center; }
        .health-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.25rem 0.625rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .badge-health-ok { background: var(--accent-green); color: #000; }
        .badge-health-warn { background: var(--accent-yellow); color: #000; }
        .badge-health-error { background: var(--accent-red); color: #fff; }
        .badge-hex-code { font-family: 'SF Mono', monospace; font-size: 0.625rem; opacity: 0.8; margin-left: 0.125rem; }
        
        .container {
            display: grid;
            grid-template-columns: 1fr 400px;
            gap: 1rem;
            padding: 1rem;
            max-width: 1800px;
            margin: 0 auto;
        }
        
        @media (max-width: 1200px) {
            .container { grid-template-columns: 1fr; }
        }
        
        .panel {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: var(--shadow);
        }
        
        .panel-header {
            background: var(--bg-tertiary);
            padding: 1rem 1.25rem;
            border-bottom: 1px solid var(--border-color);
            font-weight: 600;
            font-size: 0.9375rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .panel-actions {
            display: flex;
            gap: 0.5rem;
        }
        
        .btn-sm {
            background: transparent;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 0.375rem 0.75rem;
            font-size: 0.75rem;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-sm:hover {
            border-color: var(--accent-cyan);
            color: var(--accent-cyan);
        }
        
        .panel-content { padding: 1.25rem; }
        
        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
        }
        
        .stat-card {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 10px;
            padding: 1rem;
            position: relative;
            overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        }
        
        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--accent-cyan), var(--accent-green));
        }
        
        .stat-label {
            font-size: 0.6875rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .stat-value {
            font-size: 1.75rem;
            font-weight: 700;
            font-family: 'SF Mono', monospace;
            color: var(--accent-cyan);
        }
        
        .stat-unit {
            font-size: 0.875rem;
            color: var(--text-secondary);
            margin-left: 0.25rem;
        }
        
        .stat-change {
            font-size: 0.75rem;
            margin-top: 0.25rem;
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }
        
        .stat-change.positive { color: var(--accent-green); }
        .stat-change.negative { color: var(--accent-red); }
        
        /* Charts */
        .chart-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        
        @media (max-width: 800px) {
            .chart-grid { grid-template-columns: 1fr; }
        }
        
        .chart-container {
            height: 220px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 10px;
            position: relative;
            overflow: hidden;
        }
        
        .chart-canvas { width: 100%; height: 100%; }
        
        /* Percentile Bars */
        .percentile-bars { display: flex; flex-direction: column; gap: 0.75rem; padding: 0.5rem 0; }
        .percentile-row { display: flex; align-items: center; gap: 0.75rem; font-size: 0.875rem; }
        .percentile-label { width: 40px; color: var(--text-secondary); font-weight: 600; }
        .percentile-bar-bg { flex: 1; height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden; }
        .percentile-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s ease; }
        .p50 { background: var(--accent-green); }
        .p95 { background: var(--accent-yellow); }
        .p99 { background: var(--accent-red); }
        .percentile-value { width: 60px; text-align: right; font-family: 'SF Mono', monospace; color: var(--text-primary); }
        
        /* Pool Visualization */
        .pool-viz {
            display: grid;
            grid-template-columns: repeat(20, 1fr);
            gap: 3px;
            margin-top: 0.75rem;
        }
        
        .pool-slot {
            aspect-ratio: 1;
            border-radius: 3px;
            background: var(--border-color);
            transition: all 0.3s;
        }
        
        .pool-slot.active { 
            background: var(--accent-green); 
            box-shadow: 0 0 8px var(--accent-green);
            animation: glow 2s infinite;
        }
        
        .pool-slot.idle { background: var(--accent-cyan); opacity: 0.6; }
        
        @keyframes glow { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        
        /* Memory Bars */
        .memory-section { margin-top: 1rem; }
        .memory-row { margin-bottom: 1rem; }
        .memory-label { display: flex; justify-content: space-between; font-size: 0.8125rem; margin-bottom: 0.5rem; }
        .memory-bar-bg { height: 10px; background: var(--border-color); border-radius: 5px; overflow: hidden; }
        .memory-bar-fill { height: 100%; border-radius: 5px; transition: width 0.3s ease, background 0.3s; }
        
        /* Chat */
        .chat-container {
            display: flex;
            flex-direction: column;
            height: calc(100vh - 100px);
            min-height: 500px;
        }
        
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        
        .message {
            max-width: 90%;
            padding: 0.875rem 1rem;
            border-radius: 12px;
            font-size: 0.875rem;
            line-height: 1.5;
            animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .message-user {
            align-self: flex-end;
            background: linear-gradient(135deg, var(--accent-cyan) 0%, #0066cc 100%);
            color: white;
            border-bottom-right-radius: 4px;
        }
        
        .message-assistant {
            align-self: flex-start;
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-bottom-left-radius: 4px;
        }
        
        .message-system {
            align-self: center;
            background: rgba(255, 200, 0, 0.1);
            border: 1px solid rgba(255, 200, 0, 0.3);
            color: var(--accent-yellow);
            font-size: 0.8125rem;
        }
        
        .chat-input-container {
            padding: 1rem;
            border-top: 1px solid var(--border-color);
            display: flex;
            gap: 0.5rem;
        }
        
        .chat-input {
            flex: 1;
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 10px;
            padding: 0.75rem 1rem;
            color: var(--text-primary);
            font-size: 0.9375rem;
            outline: none;
            transition: border-color 0.2s;
        }
        
        .chat-input:focus { border-color: var(--accent-cyan); }
        
        .btn {
            background: linear-gradient(135deg, var(--accent-cyan) 0%, #0099cc 100%);
            border: none;
            border-radius: 10px;
            padding: 0.75rem 1.5rem;
            color: white;
            font-weight: 600;
            font-size: 0.875rem;
            cursor: pointer;
            transition: opacity 0.2s, transform 0.2s;
        }
        
        .btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        
        /* RSS Feeds */
        .rss-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 0.75rem;
        }
        
        .rss-card {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 0.875rem;
            transition: all 0.2s;
        }
        
        .rss-card:hover {
            border-color: var(--accent-cyan);
            transform: translateY(-2px);
        }
        
        .rss-title { font-size: 0.875rem; font-weight: 600; margin-bottom: 0.375rem; }
        .rss-meta { font-size: 0.75rem; color: var(--text-secondary); }
        
        /* Alerts */
        .alert-item {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 0.75rem;
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            transition: all 0.2s;
            animation: slideInDown 0.3s ease;
        }
        
        .alert-item:hover {
            border-color: var(--accent-cyan);
            transform: translateX(2px);
        }
        
        .alert-item.info {
            border-left: 4px solid var(--accent-cyan);
            background: rgba(0, 212, 255, 0.05);
        }
        
        .alert-item.warning {
            border-left: 4px solid var(--accent-yellow);
            background: rgba(255, 200, 0, 0.05);
        }
        
        .alert-item.critical {
            border-left: 4px solid var(--accent-red);
            background: rgba(255, 50, 50, 0.05);
            animation: slideInDown 0.3s ease, pulse-red 2s infinite;
        }
        
        .alert-icon {
            font-size: 1rem;
            margin-top: 0.125rem;
        }
        
        .alert-content {
            flex: 1;
            min-width: 0;
        }
        
        .alert-title {
            font-size: 0.875rem;
            font-weight: 600;
            margin-bottom: 0.25rem;
            color: var(--text-primary);
        }
        
        .alert-message {
            font-size: 0.75rem;
            color: var(--text-secondary);
            line-height: 1.4;
            margin-bottom: 0.375rem;
        }
        
        .alert-meta {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 0.6875rem;
            color: var(--text-secondary);
        }
        
        .alert-actions {
            display: flex;
            gap: 0.375rem;
        }
        
        .alert-btn {
            background: transparent;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 0.25rem 0.5rem;
            font-size: 0.6875rem;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .alert-btn:hover {
            border-color: var(--accent-cyan);
            color: var(--accent-cyan);
        }
        
        @keyframes slideInDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        /* Toast Notifications */
        .toast-container {
            position: fixed;
            top: 80px;
            right: 1rem;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .toast {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-left: 4px solid var(--accent-cyan);
            border-radius: 8px;
            padding: 1rem 1.25rem;
            min-width: 300px;
            box-shadow: var(--shadow);
            animation: slideInRight 0.3s ease;
        }
        
        .toast.success { border-left-color: var(--accent-green); }
        .toast.warning { border-left-color: var(--accent-yellow); }
        .toast.error { border-left-color: var(--accent-red); }
        
        @keyframes slideInRight {
            from { opacity: 0; transform: translateX(100%); }
            to { opacity: 1; transform: translateX(0); }
        }
        
        /* Keyboard Shortcuts Help */
        .kbd {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 0.125rem 0.375rem;
            font-family: 'SF Mono', monospace;
            font-size: 0.75rem;
        }
        
        /* Scrollbar */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: var(--bg-primary); }
        ::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--text-secondary); }
        
        /* Grid Lines for Charts */
        .grid-overlay {
            position: absolute;
            inset: 0;
            pointer-events: none;
        }
        
        .grid-line {
            stroke: var(--border-color);
            stroke-width: 1;
            stroke-dasharray: 4 4;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>
            <span>🔧</span>
            <span>Dev Dashboard V3</span>
        </h1>
        <div class="header-controls">
            <div class="status-bar">
                <div class="status-pill" id="poolPill">
                    <span class="dot dot-green" id="poolDot"></span>
                    <span id="poolStatus">Pool: 0/100</span>
                    <span class="badge-hex" id="poolHex">#00FF64</span>
                </div>
                <div class="status-pill" id="connPill">
                    <span class="dot dot-green" id="connDot"></span>
                    <span id="connStatus">Healthy</span>
                    <span class="badge-hex" id="connHex">#00FF64</span>
                </div>
                <div class="status-pill" id="latencyPill">
                    <span class="dot dot-green" id="latencyDot"></span>
                    <span id="latencyStatus">Latency OK</span>
                    <span class="badge-hex" id="latencyHex">#00FF64</span>
                </div>
                <div class="health-badges">
                    <div class="health-badge badge-health-ok" id="healthBadge">
                        <span>●</span>
                        <span>HEALTH</span>
                        <span class="badge-hex-code">00FF64</span>
                    </div>
                </div>
            </div>
            <button class="btn-icon" id="themeToggle" title="Toggle Theme (T)">
                <span id="themeIcon">🌙</span>
            </button>
            <button class="btn-icon" id="exportBtn" title="Export Metrics (E)">
                <span>📊</span>
            </button>
            <button class="btn-icon" id="shortcutsBtn" title="Keyboard Shortcuts (?)">
                <span>⌨️</span>
            </button>
        </div>
    </div>

    <div class="container">
        <div class="main-column">
            <!-- Fetch Pool & Network Metrics -->
            <div class="panel" style="margin-bottom: 1rem;">
                <div class="panel-header">
                    <span>🌊 Bun Fetch Pool & Network Metrics</span>
                    <div class="panel-actions">
                        <span id="throughput" style="font-size: 0.8125rem; color: var(--accent-cyan);">0 RPS</span>
                    </div>
                </div>
                <div class="panel-content">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">Pool Usage</div>
                            <div class="stat-value" id="poolSize">0<span class="stat-unit">/100</span></div>
                            <div class="pool-viz" id="poolViz"></div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Active Connections</div>
                            <div class="stat-value" id="activeConn">0</div>
                            <div class="stat-change positive" id="connTrend">↑ 0%</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Success Rate</div>
                            <div class="stat-value" id="successRate">100<span class="stat-unit">%</span></div>
                            <div class="stat-change positive" id="successTrend">Stable</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">DNS Cache</div>
                            <div class="stat-value" id="dnsCache">0</div>
                            <div class="stat-change" style="color: var(--text-secondary);">entries</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Throughput</div>
                            <div class="stat-value" id="throughputVal">0<span class="stat-unit">rps</span></div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Avg Latency</div>
                            <div class="stat-value" id="avgLatency">0<span class="stat-unit">ms</span></div>
                        </div>
                    </div>
                    
                    <div class="chart-grid">
                        <div class="chart-container">
                            <canvas id="latencyChart"></canvas>
                        </div>
                        <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem;">
                            <div style="font-size: 0.875rem; font-weight: 600; margin-bottom: 1rem;">Latency Percentiles</div>
                            <div class="percentile-bars">
                                <div class="percentile-row">
                                    <span class="percentile-label">P50</span>
                                    <div class="percentile-bar-bg"><div class="percentile-bar-fill p50" id="p50bar" style="width: 30%"></div></div>
                                    <span class="percentile-value" id="p50val">--</span>
                                </div>
                                <div class="percentile-row">
                                    <span class="percentile-label">P95</span>
                                    <div class="percentile-bar-bg"><div class="percentile-bar-fill p95" id="p95bar" style="width: 50%"></div></div>
                                    <span class="percentile-value" id="p95val">--</span>
                                </div>
                                <div class="percentile-row">
                                    <span class="percentile-label">P99</span>
                                    <div class="percentile-bar-bg"><div class="percentile-bar-fill p99" id="p99bar" style="width: 70%"></div></div>
                                    <span class="percentile-value" id="p99val">--</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Memory & System Metrics -->
            <div class="panel" style="margin-bottom: 1rem;">
                <div class="panel-header">
                    <span>💾 Memory & System</span>
                    <span id="memoryTotal" style="font-size: 0.8125rem; color: var(--text-secondary);">-- MB total</span>
                </div>
                <div class="panel-content">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">Heap Used</div>
                            <div class="stat-value" id="heapUsed">--<span class="stat-unit">MB</span></div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">External</div>
                            <div class="stat-value" id="externalMem">--<span class="stat-unit">MB</span></div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">ArrayBuffers</div>
                            <div class="stat-value" id="arrayBuffers">--<span class="stat-unit">MB</span></div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">RSS</div>
                            <div class="stat-value" id="rssMem">--<span class="stat-unit">MB</span></div>
                        </div>
                    </div>
                    <div class="memory-section">
                        <div class="memory-row">
                            <div class="memory-label">
                                <span>Heap Usage</span>
                                <span id="heapPercent">0%</span>
                            </div>
                            <div class="memory-bar-bg">
                                <div class="memory-bar-fill" id="heapBar" style="width: 0%; background: linear-gradient(90deg, var(--accent-green), var(--accent-cyan));"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Alerts Panel -->
            <div class="panel" style="margin-bottom: 1rem;">
                <div class="panel-header">
                    <span>🚨 Real-time Alerts</span>
                    <div class="panel-actions">
                        <span id="alertCount" style="font-size: 0.8125rem; color: var(--text-secondary);">0 active</span>
                        <button class="btn-sm" id="clearAlerts" style="margin-left: 0.5rem;">Clear All</button>
                    </div>
                </div>
                <div class="panel-content">
                    <div id="alertsList" style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <div style="color: var(--text-secondary); font-size: 0.875rem; text-align: center; padding: 1rem;">
                            No active alerts
                        </div>
                    </div>
                </div>
            </div>

            <!-- RSS Feeds -->
            <div class="panel">
                <div class="panel-header">
                    <span>📰 RSS Feeds</span>
                    <span id="rssCount" style="font-size: 0.8125rem; color: var(--text-secondary);">0 feeds</span>
                </div>
                <div class="panel-content">
                    <div class="rss-grid" id="rssFeeds">
                        <div style="color: var(--text-secondary); font-size: 0.875rem;">No RSS feeds configured</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="side-column">
            <!-- Kimi Chat -->
            <div class="panel chat-container">
                <div class="panel-header">
                    <span>🤖 Kimi Chat</span>
                    <div class="panel-actions">
                        <span id="kimiStatus" style="font-size: 0.75rem; color: var(--text-secondary);">Ready</span>
                    </div>
                </div>
                <div class="chat-messages" id="chatMessages">
                    <div class="message message-assistant">
                        <strong>Dev Dashboard V3</strong> is live! 🚀<br><br>
                        Features:<br>
                        • <kbd>T</kbd> Toggle theme<br>
                        • <kbd>E</kbd> Export metrics<br>
                        • <kbd>?</kbd> Shortcuts<br>
                        • <kbd>Esc</kbd> Close modals<br><br>
                        How can I help you today?
                    </div>
                </div>
                <div class="chat-input-container">
                    <input type="text" class="chat-input" id="chatInput" placeholder="Type a message... (Enter to send)" />
                    <button class="btn" id="sendBtn">Send</button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Toast Container -->
    <div class="toast-container" id="toastContainer"></div>

    <script>
        // Theme Management
        const theme = localStorage.getItem('dashboard-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        document.getElementById('themeIcon').textContent = theme === 'dark' ? '☀️' : '🌙';
        
        document.getElementById('themeToggle').addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('dashboard-theme', next);
            document.getElementById('themeIcon').textContent = next === 'dark' ? '☀️' : '🌙';
            showToast('Theme changed to ' + next, 'success');
        });
        
        // Toast Notifications
        function showToast(message, type = 'info') {
            const container = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = 'toast ' + type;
            toast.textContent = message;
            container.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
        
        // Export Functionality
        let metricsHistory = [];
        
        document.getElementById('exportBtn').addEventListener('click', () => {
            const data = {
                timestamp: new Date().toISOString(),
                metrics: metricsHistory.slice(-100),
                summary: {
                    totalRequests: metricsHistory.length,
                    avgLatency: metricsHistory.reduce((a, m) => a + m.fetchLatencyP50, 0) / metricsHistory.length || 0,
                    avgSuccessRate: metricsHistory.reduce((a, m) => a + m.fetchSuccessRate, 0) / metricsHistory.length || 0,
                }
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'dashboard-metrics-' + new Date().toISOString().slice(0, 19) + '.json';
            a.click();
            URL.revokeObjectURL(url);
            showToast('Metrics exported!', 'success');
        });
        
        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') {
                if (e.key === 'Escape') e.target.blur();
                return;
            }
            
            switch(e.key) {
                case 't':
                case 'T':
                    document.getElementById('themeToggle').click();
                    break;
                case 'e':
                case 'E':
                    document.getElementById('exportBtn').click();
                    break;
                case '?':
                    showShortcuts();
                    break;
                case 'f':
                case 'F':
                    document.getElementById('chatInput').focus();
                    break;
                case 'Escape':
                    document.activeElement.blur();
                    break;
            }
        });
        
        function showShortcuts() {
            showToast('T: Theme | E: Export | F: Focus | A: Clear Alerts | ?: Help | Esc: Close', 'info');
        }
        
        document.getElementById('shortcutsBtn').addEventListener('click', showShortcuts);
        
        // Alerts Management
        let activeAlerts = new Map();
        
        function updateAlerts(alerts) {
            const container = document.getElementById('alertsList');
            const count = document.getElementById('alertCount');
            
            if (!alerts || alerts.length === 0) {
                container.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.875rem; text-align: center; padding: 1rem;">No active alerts</div>';
                count.textContent = '0 active';
                return;
            }
            
            count.textContent = alerts.length + ' active';
            count.style.color = alerts.some(a => a.severity === 'critical') ? 'var(--accent-red)' : 
                               alerts.some(a => a.severity === 'warning') ? 'var(--accent-yellow)' : 'var(--accent-green)';
            
            container.innerHTML = alerts.map(alert => {
                const icon = alert.severity === 'critical' ? '🚨' : 
                           alert.severity === 'warning' ? '⚠️' : 'ℹ️';
                
                const time = new Date(alert.timestamp).toLocaleTimeString();
                
                return \`
                    <div class="alert-item \${alert.severity}" data-alert-id="\${alert.id}">
                        <div class="alert-icon">\${icon}</div>
                        <div class="alert-content">
                            <div class="alert-title">\${alert.ruleId.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase())}</div>
                            <div class="alert-message">\${alert.message}</div>
                            <div class="alert-meta">
                                <span>🕐 \${time}</span>
                                <span>📊 \${alert.value}</span>
                            </div>
                        </div>
                        <div class="alert-actions">
                            <button class="alert-btn" onclick="acknowledgeAlert('\${alert.id}')">Ack</button>
                            <button class="alert-btn" onclick="resolveAlert('\${alert.id}')">Resolve</button>
                        </div>
                    </div>
                \`;
            }).join('');
        }
        
        window.acknowledgeAlert = function(alertId) {
            // Send acknowledge to server
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'acknowledgeAlert', alertId }));
            }
            showToast('Alert acknowledged', 'success');
        };
        
        window.resolveAlert = function(alertId) {
            // Send resolve to server
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'resolveAlert', alertId }));
            }
            const element = document.querySelector(\`[data-alert-id="\${alertId}"]\`);
            if (element) {
                element.style.opacity = '0.5';
                element.style.textDecoration = 'line-through';
            }
            showToast('Alert resolved', 'success');
        };
        
        document.getElementById('clearAlerts').addEventListener('click', () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'clearAllAlerts' }));
            }
            activeAlerts.clear();
            updateAlerts([]);
            showToast('All alerts cleared', 'success');
        });
        
        // WebSocket Connection with Reconnect
        let ws;
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;
        
        function connect() {
            ws = new WebSocket('ws://localhost:4269/ws');
            
            ws.onopen = () => {
                reconnectAttempts = 0;
                showToast('Connected to dashboard', 'success');
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'metrics') {
                    metricsHistory.push(data.payload);
                    if (metricsHistory.length > 500) metricsHistory.shift();
                    updateMetrics(data.payload);
                } else if (data.type === 'chat') {
                    addChatMessage(data.payload.role, data.payload.content);
                } else if (data.type === 'alerts') {
                    updateAlerts(data.payload);
                    // Show toast for new critical alerts
                    const criticalAlerts = data.payload.filter(a => a.severity === 'critical' && !a.acknowledged);
                    criticalAlerts.forEach(alert => {
                        showToast(alert.message, 'error');
                    });
                } else if (data.type === 'alertTriggered') {
                    // Individual alert notification
                    showToast(data.payload.message, data.payload.severity);
                }
            };
            
            ws.onclose = () => {
                if (reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    showToast('Reconnecting... (' + reconnectAttempts + '/' + maxReconnectAttempts + ')', 'warning');
                    setTimeout(connect, 2000);
                } else {
                    showToast('Connection lost. Refresh to reconnect.', 'error');
                }
            };
            
            ws.onerror = () => {
                // Error handled by onclose
            };
        }
        
        connect();
        
        // Metrics Update
        const latencyHistory = [];
        const maxHistory = 60;
        let prevMetrics = null;
        
        function updateMetrics(m) {
            try {
                // Stats
                document.getElementById('poolSize').innerHTML = m.activeConnections + '<span class="stat-unit">/' + m.poolSize + '</span>';
                document.getElementById('activeConn').textContent = m.activeConnections;
                document.getElementById('successRate').innerHTML = m.fetchSuccessRate.toFixed(1) + '<span class="stat-unit">%</span>';
                document.getElementById('dnsCache').textContent = m.dnsCacheSize || 0;
                document.getElementById('throughput').textContent = m.fetchThroughputRps.toFixed(1) + ' RPS';
                document.getElementById('throughputVal').innerHTML = m.fetchThroughputRps.toFixed(1) + '<span class="stat-unit">rps</span>';
                document.getElementById('avgLatency').innerHTML = m.fetchLatencyP50.toFixed(0) + '<span class="stat-unit">ms</span>';
                
                // Trends
                if (prevMetrics) {
                    const connChange = ((m.activeConnections - prevMetrics.activeConnections) / (prevMetrics.activeConnections || 1)) * 100;
                    const trendEl = document.getElementById('connTrend');
                    trendEl.textContent = (connChange >= 0 ? '↑ ' : '↓ ') + Math.abs(connChange).toFixed(0) + '%';
                    trendEl.className = 'stat-change ' + (connChange >= 0 ? 'positive' : 'negative');
                }
                
                // Pool Visualization
                updatePoolViz(m.activeConnections, m.poolSize);
                
                // Percentiles
                document.getElementById('p50val').textContent = m.fetchLatencyP50.toFixed(0) + 'ms';
                document.getElementById('p95val').textContent = m.fetchLatencyP95.toFixed(0) + 'ms';
                document.getElementById('p99val').textContent = m.fetchLatencyP99.toFixed(0) + 'ms';
                
                const maxLat = Math.max(m.fetchLatencyP99, 100);
                document.getElementById('p50bar').style.width = (m.fetchLatencyP50 / maxLat * 100) + '%';
                document.getElementById('p95bar').style.width = (m.fetchLatencyP95 / maxLat * 100) + '%';
                document.getElementById('p99bar').style.width = (m.fetchLatencyP99 / maxLat * 100) + '%';
                
                // Latency Chart
                latencyHistory.push(m.fetchLatencyP50);
                if (latencyHistory.length > maxHistory) latencyHistory.shift();
                drawChart();
                
                // Memory
                document.getElementById('heapUsed').innerHTML = m.heapUsedMB.toFixed(1) + '<span class="stat-unit">MB</span>';
                document.getElementById('externalMem').innerHTML = m.externalMemoryMB.toFixed(1) + '<span class="stat-unit">MB</span>';
                document.getElementById('arrayBuffers').innerHTML = m.arrayBuffersMB.toFixed(1) + '<span class="stat-unit">MB</span>';
                document.getElementById('rssMem').innerHTML = m.rssMB.toFixed(1) + '<span class="stat-unit">MB</span>';
                document.getElementById('memoryTotal').textContent = m.heapTotalMB.toFixed(1) + ' MB total';
                
                const heapPercent = (m.heapUsedMB / m.heapTotalMB) * 100;
                document.getElementById('heapPercent').textContent = heapPercent.toFixed(1) + '%';
                document.getElementById('heapBar').style.width = heapPercent + '%';
                
                // Health Status with Colors
                updateHealthStatus(m);
                
                // RSS
                updateRssFeeds(m.rssFeeds || []);
                
                prevMetrics = m;
            } catch (e) {
                console.error('Update error:', e);
            }
        }
        
        function updatePoolViz(active, total) {
            const viz = document.getElementById('poolViz');
            viz.innerHTML = '';
            const slots = Math.min(total, 60);
            const activeCount = Math.round((active / total) * slots);
            
            for (let i = 0; i < slots; i++) {
                const slot = document.createElement('div');
                slot.className = 'pool-slot ' + (i < activeCount ? 'active' : 'idle');
                viz.appendChild(slot);
            }
        }
        
        function updateHealthStatus(m) {
            const isHealthy = m.fetchSuccessRate > 95 && m.activeConnections < m.poolSize * 0.9;
            const isCritical = m.fetchSuccessRate < 80 || m.activeConnections >= m.poolSize;
            
            let healthColor, healthHex, healthClass;
            if (isCritical) {
                healthColor = 'dot-red'; healthHex = '#FF3232'; healthClass = 'critical';
            } else if (isHealthy) {
                healthColor = 'dot-green'; healthHex = '#00FF64'; healthClass = 'healthy';
            } else {
                healthColor = 'dot-yellow'; healthHex = '#FFC800'; healthClass = 'warning';
            }
            
            const connStatus = document.getElementById('connStatus');
            const connDot = document.getElementById('connDot');
            const connHex = document.getElementById('connHex');
            const connPill = document.getElementById('connPill');
            
            if (connStatus) connStatus.textContent = isHealthy ? 'Healthy' : (isCritical ? 'Critical' : 'Degraded');
            if (connDot) connDot.className = 'dot ' + healthColor;
            if (connHex) connHex.textContent = healthHex;
            if (connPill) connPill.className = 'status-pill ' + healthClass;
            
            // Latency
            const isLatOk = m.fetchLatencyP95 < 1000;
            const isLatWarn = m.fetchLatencyP95 < 3000;
            let latColor, latHex, latClass, latText;
            
            if (isLatOk) {
                latColor = 'dot-green'; latHex = '#00FF64'; latClass = 'healthy'; latText = 'Latency OK';
            } else if (isLatWarn) {
                latColor = 'dot-yellow'; latHex = '#FFC800'; latClass = 'warning'; latText = 'Latency High';
            } else {
                latColor = 'dot-red'; latHex = '#FF3232'; latClass = 'critical'; latText = 'Latency Slow';
            }
            
            const latStatus = document.getElementById('latencyStatus');
            const latDot = document.getElementById('latencyDot');
            const latHexEl = document.getElementById('latencyHex');
            const latPill = document.getElementById('latencyPill');
            
            if (latStatus) latStatus.textContent = latText;
            if (latDot) latDot.className = 'dot ' + latColor;
            if (latHexEl) latHexEl.textContent = latHex;
            if (latPill) latPill.className = 'status-pill ' + latClass;
            
            // Pool
            const poolUsage = m.activeConnections / m.poolSize;
            let poolColor, poolHex, poolClass;
            if (poolUsage < 0.5) {
                poolColor = 'dot-green'; poolHex = '#00FF64'; poolClass = 'healthy';
            } else if (poolUsage < 0.8) {
                poolColor = 'dot-yellow'; poolHex = '#FFC800'; poolClass = 'warning';
            } else {
                poolColor = 'dot-red'; poolHex = '#FF3232'; poolClass = 'critical';
            }
            
            const poolDot = document.getElementById('poolDot');
            const poolHexEl = document.getElementById('poolHex');
            const poolPill = document.getElementById('poolPill');
            
            if (poolDot) poolDot.className = 'dot ' + poolColor;
            if (poolHexEl) poolHexEl.textContent = poolHex;
            if (poolPill) poolPill.className = 'status-pill ' + poolClass;
            
            // Health Badge
            const healthBadge = document.getElementById('healthBadge');
            if (healthBadge) {
                if (isHealthy && isLatOk) {
                    healthBadge.className = 'health-badge badge-health-ok';
                    healthBadge.innerHTML = '<span>●</span><span>HEALTH</span><span class="badge-hex-code">00FF64</span>';
                } else if (!isCritical && !isLatWarn) {
                    healthBadge.className = 'health-badge badge-health-warn';
                    healthBadge.innerHTML = '<span>●</span><span>HEALTH</span><span class="badge-hex-code">FFC800</span>';
                } else {
                    healthBadge.className = 'health-badge badge-health-error';
                    healthBadge.innerHTML = '<span>●</span><span>HEALTH</span><span class="badge-hex-code">FF3232</span>';
                }
            }
        }
        
        function updateRssFeeds(feeds) {
            const container = document.getElementById('rssFeeds');
            const count = document.getElementById('rssCount');
            if (!container || feeds.length === 0) return;
            
            count.textContent = feeds.length + ' feeds';
            container.innerHTML = feeds.map(function(f) {
                return '<div class="rss-card"><div class="rss-title">' + f.name + '</div><div class="rss-meta">' + f.itemCount + ' items</div></div>';
            }).join('');
        }
        
        function drawChart() {
            const canvas = document.getElementById('latencyChart');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            
            const w = canvas.width, h = canvas.height, pad = 30;
            ctx.clearRect(0, 0, w, h);
            
            if (latencyHistory.length < 2) return;
            
            const max = Math.max(...latencyHistory, 100);
            const min = Math.min(...latencyHistory);
            const range = max - min || 1;
            
            // Grid
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color');
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const y = pad + (h - 2 * pad) * (i / 4);
                ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
            }
            
            // Line
            const gradient = ctx.createLinearGradient(0, 0, w, 0);
            gradient.addColorStop(0, '#00d4ff');
            gradient.addColorStop(1, '#00ff64');
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            
            latencyHistory.forEach((lat, i) => {
                const x = pad + (w - 2 * pad) * (i / (maxHistory - 1));
                const y = h - pad - ((lat - min) / range) * (h - 2 * pad);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.stroke();
            
            // Fill
            ctx.fillStyle = 'rgba(0, 212, 255, 0.1)';
            ctx.lineTo(w - pad, h - pad); ctx.lineTo(pad, h - pad); ctx.closePath(); ctx.fill();
            
            // Current value indicator
            const lastY = h - pad - ((latencyHistory[latencyHistory.length - 1] - min) / range) * (h - 2 * pad);
            ctx.fillStyle = '#00ff64';
            ctx.beginPath();
            ctx.arc(w - pad, lastY, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Chat
        function addChatMessage(role, content) {
            const container = document.getElementById('chatMessages');
            const msg = document.createElement('div');
            msg.className = 'message message-' + role;
            msg.innerHTML = content;
            container.appendChild(msg);
            container.scrollTop = container.scrollHeight;
            
            if (role === 'assistant') {
                document.getElementById('kimiStatus').textContent = 'Ready';
                document.getElementById('sendBtn').disabled = false;
            }
        }
        
        function sendMessage() {
            const input = document.getElementById('chatInput');
            const text = input.value.trim();
            if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
            
            addChatMessage('user', text);
            input.value = '';
            document.getElementById('kimiStatus').textContent = 'Thinking...';
            document.getElementById('sendBtn').disabled = true;
            
            ws.send(JSON.stringify({ type: 'chat', payload: { message: text } }));
        }
        
        document.getElementById('sendBtn').addEventListener('click', sendMessage);
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        
        // Initial draw
        drawChart();
        window.addEventListener('resize', drawChart);
    </script>
</body>
</html>`;

interface WebSocketData {
	connectionId: string;
}

class DevDashboardServerV3 {
	private port = 4269;
	private clients = new Map<string, { ws: any; connectedAt: Date }>();
	private kimiClient: any = null;
	private driftMonitor = getDriftMonitorManager();
	private metricsCollector = getEnhancedMetricsCollector();
	private alertsManager = alertsManager;
	private metricsInterval?: Timer;
	private metricsHistory: any[] = [];

	async start(): Promise<void> {
		// Initialize Kimi
		try {
			this.kimiClient = await createKimiClient();
			console.log("✅ Kimi client initialized");
		} catch (e) {
			console.log("⚠️ Kimi not available:", (e as Error).message);
		}

		// Add RSS feeds
		this.metricsCollector.addRssFeed({
			url: "https://news.ycombinator.com/rss",
			name: "Hacker News",
			refreshIntervalMs: 60000,
			maxItems: 5,
		});
		this.metricsCollector.addRssFeed({
			url: "https://bun.sh/rss.xml",
			name: "Bun Blog",
			refreshIntervalMs: 300000,
			maxItems: 3,
		});

		// Start monitoring
		this.startMonitoring();

		// Start server
		const server = serve<WebSocketData>({
			port: this.port,
			websocket: {
				open: (ws) => this.onOpen(ws),
				message: (ws, msg) => this.onMessage(ws, msg),
				close: (ws) => this.onClose(ws),
			},
			fetch: (req, server) => this.onRequest(req, server),
		});

		console.log(`\n🚀 Dev Dashboard V3: http://localhost:${this.port}`);
		console.log(
			`📊 Features: Theme toggle · Export · Keyboard shortcuts · Reconnect`,
		);
		console.log(`⌨️  Shortcuts: T=Theme, E=Export, F=Focus, ?=Help`);
		console.log(`\nPress Ctrl+C to stop\n`);

		process.on("SIGINT", () => this.shutdown());
		process.on("SIGTERM", () => this.shutdown());
	}

	private onRequest(req: Request, server: any): Response | undefined {
		const url = new URL(req.url);

		if (url.pathname === "/ws") {
			if (
				server.upgrade(req, { data: { connectionId: crypto.randomUUID() } })
			) {
				return undefined;
			}
		}

		if (url.pathname === "/" || url.pathname === "/index.html") {
			return new Response(DASHBOARD_HTML, {
				headers: { "Content-Type": "text/html" },
			});
		}

		if (url.pathname === "/api/metrics") {
			return new Response(JSON.stringify(this.metricsHistory.slice(-100)), {
				headers: { "Content-Type": "application/json" },
			});
		}

		if (url.pathname === "/api/alerts") {
			return new Response(
				JSON.stringify(this.alertsManager.getActiveAlerts()),
				{
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		if (url.pathname === "/api/alerts/rules") {
			return new Response(JSON.stringify(this.alertsManager.getRules()), {
				headers: { "Content-Type": "application/json" },
			});
		}

		if (url.pathname === "/api/alerts/history") {
			const limit = parseInt(url.searchParams.get("limit") || "100");
			return new Response(
				JSON.stringify(this.alertsManager.getAlertHistory(limit)),
				{
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		return new Response("Not Found", { status: 404 });
	}

	private onOpen(ws: any): void {
		const { connectionId } = ws.data;
		this.clients.set(connectionId, { ws, connectedAt: new Date() });
		console.log(`[${new Date().toLocaleTimeString()}] Client connected`);
	}

	private async onMessage(ws: any, message: string | Buffer): Promise<void> {
		try {
			const data = JSON.parse(message.toString());

			if (data.type === "chat" && data.payload?.message) {
				await this.handleChat(ws, data.payload.message);
			} else if (data.type === "acknowledgeAlert" && data.alertId) {
				this.alertsManager.acknowledgeAlert(data.alertId);
				this.broadcastAlerts();
			} else if (data.type === "resolveAlert" && data.alertId) {
				this.alertsManager.resolveAlert(data.alertId);
				this.broadcastAlerts();
			} else if (data.type === "clearAllAlerts") {
				const activeAlerts = this.alertsManager.getActiveAlerts();
				activeAlerts.forEach((alert) =>
					this.alertsManager.resolveAlert(alert.id),
				);
				this.broadcastAlerts();
			}
		} catch (e) {
			console.error("Message error:", e);
		}
	}

	private async handleChat(ws: any, message: string): Promise<void> {
		if (!this.kimiClient) {
			ws.send(
				JSON.stringify({
					type: "chat",
					payload: { role: "system", content: "Kimi not initialized" },
				}),
			);
			return;
		}

		try {
			const response = await this.kimiClient.chatCompletion([
				{ role: "user", content: message },
			]);
			const content = response.choices[0]?.message?.content || "No response";

			ws.send(
				JSON.stringify({
					type: "chat",
					payload: { role: "assistant", content },
				}),
			);
		} catch (e) {
			ws.send(
				JSON.stringify({
					type: "chat",
					payload: {
						role: "system",
						content: `Error: ${(e as Error).message}`,
					},
				}),
			);
		}
	}

	private onClose(ws: any): void {
		this.clients.delete(ws.data.connectionId);
	}

	private startMonitoring(): void {
		this.driftMonitor.monitor("kimi-api", "https://api.moonshot.cn", {
			checkIntervalMs: 10000,
			thresholds: {
				latencyMs: 3000,
				latencyDriftPercent: 50,
				errorRatePercent: 10,
				timeoutMs: 10000,
				packetLossPercent: 5,
				jitterMs: 500,
			},
		});

		this.metricsInterval = setInterval(() => {
			const metrics = this.metricsCollector.getMetrics();
			const rssFeeds = this.metricsCollector.getRssFeeds();

			// Prepare metrics for alerts evaluation
			const alertMetrics = {
				...metrics,
				fetchLatencyP95: metrics.fetchLatencyP95 || 0,
				fetchLatencyP99: metrics.fetchLatencyP99 || 0,
				fetchSuccessRate: metrics.fetchSuccessRate || 100,
				heapUsedPercent: (metrics.heapUsedMB / metrics.heapTotalMB) * 100,
				poolUsagePercent: (metrics.activeConnections / metrics.poolSize) * 100,
			};

			// Evaluate alerts
			const triggeredAlerts = this.alertsManager.evaluateMetrics(alertMetrics);

			// Broadcast new alerts
			if (triggeredAlerts.length > 0) {
				triggeredAlerts.forEach((alert) => {
					const message = JSON.stringify({
						type: "alertTriggered",
						payload: alert,
					});
					for (const client of this.clients.values()) {
						client.ws.send(message);
					}
				});
			}

			// Broadcast active alerts
			this.broadcastAlerts();

			const data = {
				...metrics,
				rssFeeds: rssFeeds.map((f: any) => ({
					name: f.name,
					itemCount: f.itemCount,
					lastFetch: f.lastFetch,
				})),
				rssMB: Math.round(metrics.heapUsedMB + metrics.externalMemoryMB),
			};

			this.metricsHistory.push(data);
			if (this.metricsHistory.length > 500) this.metricsHistory.shift();

			const message = JSON.stringify({ type: "metrics", payload: data });
			for (const client of this.clients.values()) {
				client.ws.send(message);
			}
		}, 1000);
	}

	private broadcastAlerts(): void {
		const activeAlerts = this.alertsManager.getActiveAlerts();
		const message = JSON.stringify({
			type: "alerts",
			payload: activeAlerts,
		});
		for (const client of this.clients.values()) {
			client.ws.send(message);
		}
	}

	private shutdown(): void {
		console.log("\n🛑 Shutting down...");
		if (this.metricsInterval) clearInterval(this.metricsInterval);
		this.driftMonitor.stopAll();
		this.metricsCollector.stop();
		for (const client of this.clients.values()) client.ws.close();
		console.log("✅ Dashboard stopped");
		process.exit(0);
	}
}

if (import.meta.main) {
	new DevDashboardServerV3().start();
}

export { DevDashboardServerV3 };
