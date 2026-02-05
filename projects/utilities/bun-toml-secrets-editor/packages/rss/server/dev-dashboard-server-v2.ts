#!/usr/bin/env bun
/**
 * Dev Dashboard Server V2
 * Enhanced with Bun fetch pooling, RSS monitoring, and advanced metrics
 */

import { type ServerWebSocket, serve } from "bun";
import { createKimiClient } from "../integrations/kimi-api-client";
import { getDriftMonitorManager } from "../services/connection-drift-monitor";
import { getEnhancedMetricsCollector } from "../services/enhanced-metrics-collector";

// Enhanced Dashboard HTML
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dev Dashboard V2 - Enhanced Metrics & Pooling</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
            background: #0a0a0f;
            color: #e0e0e0;
            min-height: 100vh;
        }
        .header {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            padding: 1rem 2rem;
            border-bottom: 1px solid #2a2a3e;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 { font-size: 1.25rem; background: linear-gradient(90deg, #00d4ff, #00ff64); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
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
            transition: all 0.3s ease;
        }
        .status-pill.healthy {
            background: rgba(0, 255, 100, 0.1);
            border-color: #00ff64;
            box-shadow: 0 0 10px rgba(0, 255, 100, 0.2);
        }
        .status-pill.warning {
            background: rgba(255, 200, 0, 0.1);
            border-color: #ffc800;
            box-shadow: 0 0 10px rgba(255, 200, 0, 0.2);
        }
        .status-pill.critical {
            background: rgba(255, 50, 50, 0.1);
            border-color: #ff3232;
            box-shadow: 0 0 10px rgba(255, 50, 50, 0.2);
            animation: pulse-red 2s infinite;
        }
        .badge-hex {
            font-family: 'SF Mono', monospace;
            font-size: 0.6875rem;
            opacity: 0.7;
            margin-left: 0.25rem;
        }
        .dot { width: 6px; height: 6px; border-radius: 50%; animation: pulse 2s infinite; }
        .dot-green { background: #00ff64; }
        .dot-yellow { background: #ffc800; }
        .dot-red { background: #ff3232; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes pulse-red { 0%, 100% { box-shadow: 0 0 10px rgba(255, 50, 50, 0.2); } 50% { box-shadow: 0 0 20px rgba(255, 50, 50, 0.5); } }
        .health-badges {
            display: flex;
            gap: 0.5rem;
            align-items: center;
        }
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
        .badge-health-ok { background: #00ff64; color: #000; }
        .badge-health-warn { background: #ffc800; color: #000; }
        .badge-health-error { background: #ff3232; color: #fff; }
        .badge-hex-code {
            font-family: 'SF Mono', monospace;
            font-size: 0.625rem;
            opacity: 0.8;
            margin-left: 0.125rem;
        }
        
        .container {
            display: grid;
            grid-template-columns: 1fr 380px;
            gap: 1rem;
            padding: 1rem;
            max-width: 1800px;
            margin: 0 auto;
        }
        
        .panel {
            background: #111118;
            border: 1px solid #1e1e2e;
            border-radius: 10px;
            overflow: hidden;
        }
        .panel-header {
            background: #16161f;
            padding: 0.875rem 1rem;
            border-bottom: 1px solid #1e1e2e;
            font-weight: 600;
            font-size: 0.9375rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .panel-content { padding: 1rem; }
        
        /* Metrics Grid */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 0.75rem;
            margin-bottom: 1rem;
        }
        .metric-card {
            background: #0d0d12;
            border: 1px solid #1e1e2e;
            border-radius: 8px;
            padding: 0.875rem;
            position: relative;
            overflow: hidden;
        }
        .metric-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #00d4ff, #00ff64);
            opacity: 0.5;
        }
        .metric-label {
            font-size: 0.6875rem;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.375rem;
        }
        .metric-value {
            font-size: 1.5rem;
            font-weight: 700;
            font-family: 'SF Mono', monospace;
            color: #00d4ff;
        }
        .metric-unit {
            font-size: 0.75rem;
            color: #666;
            margin-left: 0.25rem;
        }
        .metric-sub {
            font-size: 0.75rem;
            color: #444;
            margin-top: 0.25rem;
        }
        
        /* Pool Visualization */
        .pool-visual {
            display: flex;
            gap: 2px;
            margin-top: 0.5rem;
            flex-wrap: wrap;
        }
        .pool-slot {
            width: 8px;
            height: 8px;
            border-radius: 2px;
            background: #1e1e2e;
        }
        .pool-slot.active { background: #00ff64; box-shadow: 0 0 4px #00ff64; }
        .pool-slot.idle { background: #00d4ff; }
        
        /* Charts */
        .chart-row {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        .chart-container {
            height: 180px;
            background: #0d0d12;
            border: 1px solid #1e1e2e;
            border-radius: 8px;
            position: relative;
            overflow: hidden;
        }
        .chart-canvas { width: 100%; height: 100%; }
        
        /* Percentile Bars */
        .percentile-bars {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            padding: 0.5rem 0;
        }
        .percentile-row {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 0.8125rem;
        }
        .percentile-label {
            width: 40px;
            color: #666;
        }
        .percentile-bar-bg {
            flex: 1;
            height: 6px;
            background: #1e1e2e;
            border-radius: 3px;
            overflow: hidden;
        }
        .percentile-bar-fill {
            height: 100%;
            border-radius: 3px;
            transition: width 0.3s;
        }
        .p50 { background: #00ff64; }
        .p95 { background: #ffc800; }
        .p99 { background: #ff6432; }
        .percentile-value {
            width: 50px;
            text-align: right;
            font-family: 'SF Mono', monospace;
            color: #888;
        }
        
        /* RSS Section */
        .rss-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
        }
        .rss-card {
            background: #0d0d12;
            border: 1px solid #1e1e2e;
            border-radius: 6px;
            padding: 0.75rem;
        }
        .rss-title {
            font-size: 0.8125rem;
            font-weight: 600;
            margin-bottom: 0.25rem;
        }
        .rss-meta {
            font-size: 0.75rem;
            color: #666;
        }
        
        /* Chat */
        .chat-container {
            display: flex;
            flex-direction: column;
            height: calc(100vh - 140px);
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
            padding: 0.75rem 1rem;
            border-radius: 12px;
            font-size: 0.875rem;
            line-height: 1.5;
        }
        .message-user {
            align-self: flex-end;
            background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%);
            color: white;
            border-bottom-right-radius: 4px;
        }
        .message-assistant {
            align-self: flex-start;
            background: #1e1e2e;
            border: 1px solid #2a2a3e;
            border-bottom-left-radius: 4px;
        }
        .chat-input-container {
            padding: 1rem;
            border-top: 1px solid #1e1e2e;
            display: flex;
            gap: 0.5rem;
        }
        .chat-input {
            flex: 1;
            background: #0d0d12;
            border: 1px solid #2a2a3e;
            border-radius: 8px;
            padding: 0.625rem 0.875rem;
            color: #e0e0e0;
            font-size: 0.875rem;
            outline: none;
        }
        .chat-input:focus { border-color: #00d4ff; }
        .btn {
            background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
            border: none;
            border-radius: 8px;
            padding: 0.625rem 1.25rem;
            color: #0a0a0f;
            font-weight: 600;
            font-size: 0.875rem;
            cursor: pointer;
        }
        .btn:hover { opacity: 0.9; }
        
        /* Memory Bar */
        .memory-bar {
            height: 8px;
            background: #1e1e2e;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 0.5rem;
        }
        .memory-fill {
            height: 100%;
            border-radius: 4px;
            background: linear-gradient(90deg, #00d4ff, #00ff64);
            transition: width 0.3s;
        }
        
        @media (max-width: 1400px) {
            .container { grid-template-columns: 1fr; }
            .chat-container { height: 400px; min-height: auto; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔧 Dev Dashboard V2</h1>
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
    </div>

    <div class="container">
        <div class="main-column">
            <!-- Fetch Pool & Network Metrics -->
            <div class="panel" style="margin-bottom: 1rem;">
                <div class="panel-header">
                    <span>🌊 Bun Fetch Pool & Network Metrics</span>
                    <span id="throughput" style="font-size: 0.8125rem; color: #00d4ff;">0 RPS</span>
                </div>
                <div class="panel-content">
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-label">Pool Size</div>
                            <div class="metric-value" id="poolSize">100</div>
                            <div class="pool-visual" id="poolVisual"></div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">Active Conn</div>
                            <div class="metric-value" id="activeConn">0</div>
                            <div class="metric-sub" id="idleConn">Idle: 100</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">Success Rate</div>
                            <div class="metric-value" id="successRate">100<span class="metric-unit">%</span></div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">DNS Cache</div>
                            <div class="metric-value" id="dnsCache">0</div>
                            <div class="metric-sub">entries</div>
                        </div>
                    </div>
                    
                    <div class="chart-row">
                        <div class="chart-container">
                            <canvas id="latencyChart"></canvas>
                        </div>
                        <div style="background: #0d0d12; border: 1px solid #1e1e2e; border-radius: 8px; padding: 1rem;">
                            <div style="font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.75rem;">Latency Percentiles</div>
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
                    <span id="memoryTotal" style="font-size: 0.8125rem; color: #888;">-- MB</span>
                </div>
                <div class="panel-content">
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-label">Heap Used</div>
                            <div class="metric-value" id="heapUsed">--<span class="metric-unit">MB</span></div>
                            <div class="memory-bar"><div class="memory-fill" id="heapBar" style="width: 0%"></div></div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">External</div>
                            <div class="metric-value" id="externalMem">--<span class="metric-unit">MB</span></div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">ArrayBuffers</div>
                            <div class="metric-value" id="arrayBuffers">--<span class="metric-unit">MB</span></div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-label">RSS</div>
                            <div class="metric-value" id="rssMem">--<span class="metric-unit">MB</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- RSS Feeds -->
            <div class="panel">
                <div class="panel-header">
                    <span>📰 RSS Feeds</span>
                    <span id="rssCount" style="font-size: 0.8125rem; color: #888;">0 feeds</span>
                </div>
                <div class="panel-content">
                    <div class="rss-grid" id="rssFeeds">
                        <div style="color: #666; font-size: 0.875rem;">No RSS feeds configured</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="side-column">
            <!-- Kimi Chat -->
            <div class="panel chat-container">
                <div class="panel-header">
                    <span>🤖 Kimi Chat</span>
                    <span id="kimiStatus" style="font-size: 0.75rem; color: #666;">Ready</span>
                </div>
                <div class="chat-messages" id="chatMessages">
                    <div class="message message-assistant">Enhanced dashboard active! Bun fetch pooling with 100 connections, RSS monitoring, and real-time memory metrics.</div>
                </div>
                <div class="chat-input-container">
                    <input type="text" class="chat-input" id="chatInput" placeholder="Ask about metrics, pooling, etc..." />
                    <button class="btn" id="sendBtn">Send</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const ws = new WebSocket('ws://localhost:4269/ws');
        const latencyHistory = [];
        const maxHistory = 60;
        
        const els = {
            poolStatus: document.getElementById('poolStatus'),
            poolHex: document.getElementById('poolHex'),
            poolSize: document.getElementById('poolSize'),
            activeConn: document.getElementById('activeConn'),
            idleConn: document.getElementById('idleConn'),
            successRate: document.getElementById('successRate'),
            dnsCache: document.getElementById('dnsCache'),
            throughput: document.getElementById('throughput'),
            poolVisual: document.getElementById('poolVisual'),
            p50val: document.getElementById('p50val'),
            p95val: document.getElementById('p95val'),
            p99val: document.getElementById('p99val'),
            p50bar: document.getElementById('p50bar'),
            p95bar: document.getElementById('p95bar'),
            p99bar: document.getElementById('p99bar'),
            heapUsed: document.getElementById('heapUsed'),
            externalMem: document.getElementById('externalMem'),
            arrayBuffers: document.getElementById('arrayBuffers'),
            rssMem: document.getElementById('rssMem'),
            memoryTotal: document.getElementById('memoryTotal'),
            heapBar: document.getElementById('heapBar'),
            connStatus: document.getElementById('connStatus'),
            connDot: document.getElementById('connDot'),
            connHex: document.getElementById('connHex'),
            chatMessages: document.getElementById('chatMessages'),
            chatInput: document.getElementById('chatInput'),
            sendBtn: document.getElementById('sendBtn'),
            kimiStatus: document.getElementById('kimiStatus'),
            rssFeeds: document.getElementById('rssFeeds'),
            rssCount: document.getElementById('rssCount'),
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'metrics') updateMetrics(data.payload);
            else if (data.type === 'chat') addChatMessage(data.payload.role, data.payload.content);
        };

        function updateMetrics(m) {
            // Pool metrics
            els.poolStatus.textContent = 'Pool: ' + m.activeConnections + '/' + m.poolSize;
            els.poolSize.textContent = m.poolSize;
            els.activeConn.textContent = m.activeConnections;
            els.idleConn.textContent = 'Idle: ' + (m.poolSize - m.activeConnections);
            els.successRate.innerHTML = m.fetchSuccessRate.toFixed(1) + '<span class="metric-unit">%</span>';
            els.dnsCache.textContent = m.dnsCacheSize || 0;
            els.throughput.textContent = m.fetchThroughputRps.toFixed(1) + ' RPS';
            
            // Pool visualization
            updatePoolVisual(m.activeConnections, m.poolSize);
            
            // Percentiles
            els.p50val.textContent = m.fetchLatencyP50.toFixed(0) + 'ms';
            els.p95val.textContent = m.fetchLatencyP95.toFixed(0) + 'ms';
            els.p99val.textContent = m.fetchLatencyP99.toFixed(0) + 'ms';
            
            const maxLat = Math.max(m.fetchLatencyP99, 100);
            els.p50bar.style.width = (m.fetchLatencyP50 / maxLat * 100) + '%';
            els.p95bar.style.width = (m.fetchLatencyP95 / maxLat * 100) + '%';
            els.p99bar.style.width = (m.fetchLatencyP99 / maxLat * 100) + '%';
            
            // Latency chart
            latencyHistory.push(m.fetchLatencyP50);
            if (latencyHistory.length > maxHistory) latencyHistory.shift();
            drawChart();
            
            // Memory
            els.heapUsed.innerHTML = m.heapUsedMB.toFixed(1) + '<span class="metric-unit">MB</span>';
            els.externalMem.innerHTML = m.externalMemoryMB.toFixed(1) + '<span class="metric-unit">MB</span>';
            els.arrayBuffers.innerHTML = m.arrayBuffersMB.toFixed(1) + '<span class="metric-unit">MB</span>';
            els.rssMem.innerHTML = m.rssMB.toFixed(1) + '<span class="metric-unit">MB</span>';
            els.memoryTotal.textContent = 'Total: ' + m.heapTotalMB.toFixed(1) + ' MB';
            
            const heapPercent = (m.heapUsedMB / m.heapTotalMB) * 100;
            els.heapBar.style.width = heapPercent + '%';
            els.heapBar.style.background = heapPercent > 80 ? '#ff3232' : heapPercent > 60 ? '#ffc800' : 'linear-gradient(90deg, #00d4ff, #00ff64)';
            
            // Connection status with hex color coding
            try {
                const isHealthy = m.fetchSuccessRate > 95 && m.activeConnections < m.poolSize * 0.9;
                const isCritical = m.fetchSuccessRate < 80 || m.activeConnections >= m.poolSize;
                
                // Determine health color
                let healthColor, healthHex, healthClass;
                if (isCritical) {
                    healthColor = 'dot-red';
                    healthHex = '#FF3232';
                    healthClass = 'critical';
                } else if (isHealthy) {
                    healthColor = 'dot-green';
                    healthHex = '#00FF64';
                    healthClass = 'healthy';
                } else {
                    healthColor = 'dot-yellow';
                    healthHex = '#FFC800';
                    healthClass = 'warning';
                }
                
                els.connStatus.textContent = isHealthy ? 'Healthy' : (isCritical ? 'Critical' : 'Degraded');
                els.connDot.className = 'dot ' + healthColor;
                if (els.connHex) els.connHex.textContent = healthHex;
                
                // Update connection pill class
                const connPill = document.getElementById('connPill');
                if (connPill) connPill.className = 'status-pill ' + healthClass;
                
                // Latency status with hex color
                const isLatOk = m.fetchLatencyP95 < 1000;
                const isLatWarn = m.fetchLatencyP95 < 3000;
                let latColor, latHex, latClass, latText;
                if (isLatOk) {
                    latColor = 'dot-green';
                    latHex = '#00FF64';
                    latClass = 'healthy';
                    latText = 'Latency OK';
                } else if (isLatWarn) {
                    latColor = 'dot-yellow';
                    latHex = '#FFC800';
                    latClass = 'warning';
                    latText = 'Latency High';
                } else {
                    latColor = 'dot-red';
                    latHex = '#FF3232';
                    latClass = 'critical';
                    latText = 'Latency Slow';
                }
                
                const latStatus = document.getElementById('latencyStatus');
                const latDot = document.getElementById('latencyDot');
                const latHexEl = document.getElementById('latencyHex');
                const latPill = document.getElementById('latencyPill');
                
                if (latStatus) latStatus.textContent = latText;
                if (latDot) latDot.className = 'dot ' + latColor;
                if (latHexEl) latHexEl.textContent = latHex;
                if (latPill) latPill.className = 'status-pill ' + latClass;
                
                // Pool status with hex color
                const poolUsage = m.activeConnections / m.poolSize;
                let poolColor, poolHex, poolClass;
                if (poolUsage < 0.5) {
                    poolColor = 'dot-green';
                    poolHex = '#00FF64';
                    poolClass = 'healthy';
                } else if (poolUsage < 0.8) {
                    poolColor = 'dot-yellow';
                    poolHex = '#FFC800';
                    poolClass = 'warning';
                } else {
                    poolColor = 'dot-red';
                    poolHex = '#FF3232';
                    poolClass = 'critical';
                }
                
                const poolDot = document.getElementById('poolDot');
                const poolHexEl = document.getElementById('poolHex');
                const poolPill = document.getElementById('poolPill');
                
                if (poolDot) poolDot.className = 'dot ' + poolColor;
                if (poolHexEl) poolHexEl.textContent = poolHex;
                if (poolPill) poolPill.className = 'status-pill ' + poolClass;
                
                // Update health badge
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
            } catch (e) {
                console.error('Error updating metrics:', e);
            }
            
            // RSS
            updateRssFeeds(m.rssFeeds || []);
        }
        
        function updatePoolVisual(active, total) {
            els.poolVisual.innerHTML = '';
            const displaySlots = Math.min(total, 50);
            for (let i = 0; i < displaySlots; i++) {
                const slot = document.createElement('div');
                slot.className = 'pool-slot';
                const activeThreshold = (active / total) * displaySlots;
                if (i < activeThreshold) slot.classList.add('active');
                else slot.classList.add('idle');
                els.poolVisual.appendChild(slot);
            }
        }
        
        function updateRssFeeds(feeds) {
            if (feeds.length === 0) return;
            els.rssCount.textContent = feeds.length + ' feeds';
            els.rssFeeds.innerHTML = feeds.map(function(f) {
                return '<div class="rss-card"><div class="rss-title">' + f.name + '</div><div class="rss-meta">' + f.itemCount + ' items</div></div>';
            }).join('');
        }

        function drawChart() {
            const canvas = document.getElementById('latencyChart');
            const ctx = canvas.getContext('2d');
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            
            const w = canvas.width, h = canvas.height, pad = 20;
            ctx.clearRect(0, 0, w, h);
            
            if (latencyHistory.length < 2) return;
            
            const max = Math.max(...latencyHistory, 100);
            
            // Grid
            ctx.strokeStyle = '#1e1e2e';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const y = pad + (h - 2 * pad) * (i / 4);
                ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
            }
            
            // Line
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            latencyHistory.forEach((lat, i) => {
                const x = pad + (w - 2 * pad) * (i / (maxHistory - 1));
                const y = h - pad - (lat / max) * (h - 2 * pad);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.stroke();
            
            // Fill
            ctx.fillStyle = 'rgba(0, 212, 255, 0.1)';
            ctx.lineTo(w - pad, h - pad); ctx.lineTo(pad, h - pad); ctx.closePath(); ctx.fill();
        }

        function addChatMessage(role, content) {
            const msg = document.createElement('div');
            msg.className = 'message message-' + role;
            msg.textContent = content;
            els.chatMessages.appendChild(msg);
            els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
            if (role === 'assistant') { els.kimiStatus.textContent = 'Ready'; els.sendBtn.disabled = false; }
        }

        function sendMessage() {
            const text = els.chatInput.value.trim();
            if (!text) return;
            addChatMessage('user', text);
            els.chatInput.value = '';
            els.kimiStatus.textContent = 'Thinking...';
            els.sendBtn.disabled = true;
            ws.send(JSON.stringify({ type: 'chat', payload: { message: text } }));
        }

        els.sendBtn.addEventListener('click', sendMessage);
        els.chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
        
        drawChart();
        window.addEventListener('resize', drawChart);
    </script>
</body>
</html>`;

interface WebSocketData {
	connectionId: string;
}

class EnhancedDashboardServer {
	private port = 4269;
	private clients = new Map<
		string,
		{ ws: ServerWebSocket<WebSocketData>; connectedAt: Date }
	>();
	private kimiClient: Awaited<ReturnType<typeof createKimiClient>> | null =
		null;
	private driftMonitor = getDriftMonitorManager();
	private metricsCollector = getEnhancedMetricsCollector();
	private metricsInterval?: Timer;

	async start(): Promise<void> {
		// Initialize Kimi
		try {
			this.kimiClient = await createKimiClient();
			console.log("✅ Kimi client initialized");
		} catch (e) {
			console.log("⚠️ Kimi not available:", (e as Error).message);
		}

		// Add sample RSS feeds
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
		const _server = serve<WebSocketData>({
			port: this.port,
			websocket: {
				open: (ws) => this.onOpen(ws),
				message: (ws, msg) => this.onMessage(ws, msg),
				close: (ws) => this.onClose(ws),
			},
			fetch: (req, server) => this.onRequest(req, server),
		});

		console.log(`\n🚀 Enhanced Dev Dashboard: http://localhost:${this.port}`);
		console.log(
			`📊 Features: Bun fetch pooling · RSS monitoring · Memory metrics`,
		);
		console.log(`Press Ctrl+C to stop\n`);

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

		return new Response("Not Found", { status: 404 });
	}

	private onOpen(ws: ServerWebSocket<WebSocketData>): void {
		const { connectionId } = ws.data;
		this.clients.set(connectionId, { ws, connectedAt: new Date() });
		console.log(`[${new Date().toLocaleTimeString()}] Client connected`);
	}

	private async onMessage(
		ws: ServerWebSocket<WebSocketData>,
		message: string | Buffer,
	): Promise<void> {
		try {
			const data = JSON.parse(message.toString());
			if (data.type === "chat" && data.payload?.message) {
				await this.handleChat(ws, data.payload.message);
			}
		} catch (e) {
			console.error("Message error:", e);
		}
	}

	private async handleChat(
		ws: ServerWebSocket<WebSocketData>,
		message: string,
	): Promise<void> {
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

	private onClose(ws: ServerWebSocket<WebSocketData>): void {
		this.clients.delete(ws.data.connectionId);
	}

	private startMonitoring(): void {
		// Connection drift monitoring
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

		// Enhanced metrics broadcast
		this.metricsInterval = setInterval(() => {
			const metrics = this.metricsCollector.getMetrics();
			const rssFeeds = this.metricsCollector.getRssFeeds();

			const message = JSON.stringify({
				type: "metrics",
				payload: {
					...metrics,
					rssFeeds: rssFeeds.map((f) => ({
						name: f.name,
						itemCount: f.itemCount,
						lastFetch: f.lastFetch,
					})),
				},
			});

			for (const client of this.clients.values()) {
				client.ws.send(message);
			}
		}, 1000);
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
	new EnhancedDashboardServer().start();
}

export { EnhancedDashboardServer };
