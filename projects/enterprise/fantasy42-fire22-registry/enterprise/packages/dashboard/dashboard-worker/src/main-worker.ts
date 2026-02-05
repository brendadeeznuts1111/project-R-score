// dashboard-worker/src/main-worker.ts

// Simplified worker for deployment - removing external dependencies
// import "./styles/index.css";
// import { WagerSystem, type WagerRequest, type SettlementRequest, type WagerValidation } from '@fire22/wager-system';
// import { MiddlewareSystem } from '@fire22/middleware';
// import { EnvironmentManager } from '@fire22/env-manager';
// import { Fire22ApiClient, Fire22ApiError, Fire22RateLimitError } from './fire22-api';
// import { HeaderManager, HeaderValidator } from './utils/header-manager';
// import { PerformanceMonitor, withRequestTracking } from './monitoring/performance-monitor';
// import { SecurityMonitor } from './monitoring/security-monitor';
// import { HealthMonitor, HealthUtils } from './monitoring/health-check';
// import { EnhancedError, createEnhancedError, handleApiError, ErrorCodes, validateRequiredFields } from './error/enhanced-error-handler';
// import { type MonitoringConfig, type SecurityConfig, type RequestInfo } from './types/enhanced-types';
// import { ErrorCodes as ErrorHandlerErrorCodes } from './error/enhanced-error-handler';
// import { MonitoringUtils } from './utils/monitoring-utils';
// import { createLogger } from './utils/logger';

// Simplified worker for health endpoint deployment

export class MainWorker {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    console.log('MainWorker initialized with health check capabilities');
  }

  public async initialize(): Promise<void> {
    console.log('Initializing MainWorker...');
    console.log('MainWorker initialization complete.');
  }

  public getUptime(): number {
    return Date.now() - this.startTime;
  }

  public async processRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle preflight requests for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Handle /api/health endpoint
    if (path === '/api/health') {
      const response = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        server: 'Fire22 Dashboard Server',
        uptime: this.getUptime(),
        version: '2.1.0',
        environment: 'production',
        monitoring: {
          enabled: true,
          uptime: Math.floor(this.getUptime() / 1000),
          status: 'operational',
        },
      };

      return new Response(JSON.stringify(response, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Handle favicon.ico requests
    if (path === '/favicon.ico') {
      const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#ffd700"/><text x="16" y="22" font-family="Arial" font-size="16" font-weight="bold" text-anchor="middle" fill="#000">F</text></svg>`;

      return new Response(faviconSvg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }

    // Handle generic /health path
    if (path === '/health') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          message: 'Dashboard Worker is running',
          timestamp: new Date().toISOString(),
          uptime: Math.floor(this.getUptime() / 1000) + ' seconds',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Handle dashboard API endpoints
    if (path.startsWith('/api/dashboard/')) {
      const apiPath = path.replace('/api/dashboard/', '');

      if (apiPath === 'agents') {
        // Mock agent data - in production this would come from a database
        const agentData = {
          totalAgents: 25,
          activeAgents: 22,
          pendingWagers: Math.floor(Math.random() * 50) + 10,
          pendingAmount: Math.floor(Math.random() * 25000) + 5000,
          agents: [
            {
              id: 'BLAKEPPH',
              masterAgent: 'BLAKEPPH',
              status: 'Active',
              canPlaceBet: true,
              internetRate: 5.0,
              casinoRate: 3.0,
              lastUpdated: new Date().toISOString(),
            },
            {
              id: 'TEST001',
              masterAgent: 'BLAKEPPH',
              status: 'Active',
              canPlaceBet: true,
              internetRate: 3.0,
              casinoRate: 2.0,
              lastUpdated: new Date().toISOString(),
            },
          ],
          timestamp: new Date().toISOString(),
        };

        return new Response(JSON.stringify(agentData), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // Handle root path - Serve Enhanced Dashboard
    if (path === '/' || path === '') {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔥 Fire22 Enhanced Dashboard</title>
    <meta name="description" content="Advanced Fire22 Dashboard with real-time analytics, agent management, and Fantasy402 integration">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
            color: #e2e8f0;
            min-height: 100vh;
        }
        .dashboard-header {
            text-align: center;
            padding: 3rem 2rem;
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            margin: 2rem auto;
            max-width: 800px;
            position: relative;
        }
        .dashboard-header h1 {
            font-size: 3rem;
            font-weight: 800;
            color: #ffd700;
            margin-bottom: 1rem;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 2rem;
            padding: 0 2rem;
            max-width: 1200px;
            margin: 0 auto;
        }
        .stat-card {
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(20px);
            border-radius: 16px;
            padding: 2rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
            text-align: center;
            transition: transform 0.3s;
        }
        .stat-card:hover { transform: translateY(-5px); }
        .stat-icon { font-size: 2.5rem; margin-bottom: 1rem; }
        .stat-value {
            font-size: 2.5rem;
            font-weight: 800;
            color: #ffd700;
            margin-bottom: 0.5rem;
        }
        .loading { color: #94a3b8; font-style: italic; }
    </style>
</head>
<body>
    <div class="dashboard-header">
        <h1>🔥 Fire22 Enhanced Dashboard</h1>
        <p>Advanced agent management, real-time analytics, and Fantasy402 integration</p>
        <div style="position: absolute; top: 20px; left: 20px; display: flex; align-items: center; gap: 10px;">
            <div style="background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 6px 12px; border-radius: 15px; font-size: 0.75rem; font-weight: 600; border: 1px solid rgba(16, 185, 129, 0.3);">
                🔴 LIVE
            </div>
            <div style="color: #94a3b8; font-size: 0.8rem;">
                Real-time updates active
            </div>
        </div>
    </div>

            <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-value" id="total-agents"><span class="loading">Loading...</span></div>
                <div class="stat-label">Total Agents</div>
                <div class="stat-change positive" style="font-size: 0.8rem; margin-top: 0.5rem;">↗️ +12% this month</div>
            </div>

            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-value" id="active-agents"><span class="loading">Loading...</span></div>
                <div class="stat-label">Active Agents</div>
                <div class="stat-change positive" style="font-size: 0.8rem; margin-top: 0.5rem;">↗️ +8% this month</div>
            </div>

            <div class="stat-card">
                <div class="stat-icon">🎯</div>
                <div class="stat-value" id="pending-wagers"><span class="loading">Loading...</span></div>
                <div class="stat-label">Pending Wagers</div>
                <div class="stat-change" style="font-size: 0.8rem; margin-top: 0.5rem;">→ Stable</div>
            </div>

            <div class="stat-card">
                <div class="stat-icon">💰</div>
                <div class="stat-value" id="pending-amount"><span class="loading">Loading...</span></div>
                <div class="stat-label">Pending Amount</div>
                <div class="stat-change positive" style="font-size: 0.8rem; margin-top: 0.5rem;">↗️ +15% this month</div>
            </div>
        </div>

        <!-- Interactive Charts Section -->
        <section style="margin: 3rem 0; padding: 0 2rem;">
            <h2 style="color: #ffd700; margin-bottom: 2rem; font-size: 1.8rem; text-align: center;">📊 Analytics Dashboard</h2>

            <!-- Advanced Filters and Controls -->
            <div style="background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(20px); border-radius: 16px; padding: 2rem; margin-bottom: 2rem; border: 1px solid rgba(255, 255, 255, 0.2);">
                <h3 style="color: #ffd700; margin-bottom: 1.5rem; font-size: 1.2rem;">🎛️ Advanced Filters & Controls</h3>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
                    <!-- Date Range Filter -->
                    <div>
                        <label style="display: block; color: #e2e8f0; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">📅 Date Range</label>
                        <div style="display: flex; gap: 0.5rem;">
                            <input type="date" id="start-date" style="flex: 1; padding: 0.5rem; border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 6px; background: rgba(255, 255, 255, 0.1); color: #e2e8f0; font-size: 0.9rem;">
                            <input type="date" id="end-date" style="flex: 1; padding: 0.5rem; border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 6px; background: rgba(255, 255, 255, 0.1); color: #e2e8f0; font-size: 0.9rem;">
                        </div>
                    </div>

                    <!-- Data Source Filter -->
                    <div>
                        <label style="display: block; color: #e2e8f0; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">🔗 Data Source</label>
                        <select id="data-source-filter" style="width: 100%; padding: 0.5rem; border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 6px; background: rgba(255, 255, 255, 0.1); color: #e2e8f0; font-size: 0.9rem;">
                            <option value="all">All Sources</option>
                            <option value="fantasy402">Fantasy402</option>
                            <option value="fire22">Fire22 Core</option>
                            <option value="agents">Agent Data</option>
                            <option value="transactions">Transactions</option>
                        </select>
                    </div>

                    <!-- Chart Type Selector -->
                    <div>
                        <label style="display: block; color: #e2e8f0; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">📊 Chart Type</label>
                        <select id="global-chart-type" style="width: 100%; padding: 0.5rem; border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 6px; background: rgba(255, 255, 255, 0.1); color: #e2e8f0; font-size: 0.9rem;">
                            <option value="line">Line Charts</option>
                            <option value="bar">Bar Charts</option>
                            <option value="doughnut">Doughnut Charts</option>
                            <option value="radar">Radar Charts</option>
                            <option value="mixed">Mixed Types</option>
                        </select>
                    </div>

                    <!-- Time Granularity -->
                    <div>
                        <label style="display: block; color: #e2e8f0; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">⏰ Granularity</label>
                        <select id="time-granularity" style="width: 100%; padding: 0.5rem; border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 6px; background: rgba(255, 255, 255, 0.1); color: #e2e8f0; font-size: 0.9rem;">
                            <option value="hour">Hourly</option>
                            <option value="day" selected>Daily</option>
                            <option value="week">Weekly</option>
                            <option value="month">Monthly</option>
                        </select>
                    </div>
                </div>

                <!-- Filter Actions -->
                <div style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                    <button id="apply-filters" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s;">
                        ✅ Apply Filters
                    </button>
                    <button id="reset-filters" style="background: rgba(255,255,255,0.1); color: #e2e8f0; border: 2px solid rgba(255,255,255,0.3); padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s;">
                        🔄 Reset Filters
                    </button>
                    <button id="refresh-dashboard" style="background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%); color: #1a1a2e; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s;">
                        🔄 Refresh Data
                    </button>
                    <button id="export-dashboard" style="background: rgba(255,255,255,0.1); color: #e2e8f0; border: 2px solid rgba(255,215,0,0.3); padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s;">
                        📤 Export Data
                    </button>
                </div>

                <!-- Active Filters Display -->
                <div id="active-filters" style="margin-top: 1rem; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 8px; display: none;">
                    <h4 style="color: #ffd700; margin-bottom: 0.5rem; font-size: 0.9rem;">🎯 Active Filters:</h4>
                    <div id="filter-tags" style="display: flex; flex-wrap: wrap; gap: 0.5rem;"></div>
                </div>
            </div>

            <!-- Charts Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 2rem; margin-bottom: 2rem;">
                <!-- Revenue Chart -->
                <div style="background: rgba(255,255,255,0.08); backdrop-filter: blur(20px); border-radius: 16px; padding: 1.5rem; border: 1px solid rgba(255,255,255,0.2);">
                    <canvas id="revenue-chart" style="max-height: 300px;"></canvas>
                </div>

                <!-- Agent Performance Chart -->
                <div style="background: rgba(255,255,255,0.08); backdrop-filter: blur(20px); border-radius: 16px; padding: 1.5rem; border: 1px solid rgba(255,255,255,0.2);">
                    <canvas id="agent-performance-chart" style="max-height: 300px;"></canvas>
                </div>

                <!-- Commission Chart -->
                <div style="background: rgba(255,255,255,0.08); backdrop-filter: blur(20px); border-radius: 16px; padding: 1.5rem; border: 1px solid rgba(255,255,255,0.2);">
                    <canvas id="commission-chart" style="max-height: 300px;"></canvas>
                </div>

                <!-- Activity Chart -->
                <div style="background: rgba(255,255,255,0.08); backdrop-filter: blur(20px); border-radius: 16px; padding: 1.5rem; border: 1px solid rgba(255,255,255,0.2);">
                    <canvas id="activity-chart" style="max-height: 300px;"></canvas>
                </div>
            </div>
        </section>

    <div style="text-align: center; padding: 3rem; color: #94a3b8;">
        <h2>🚀 Enhanced Dashboard Features</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; margin-top: 2rem; max-width: 1000px; margin: 2rem auto;">
            <div style="background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                <h3 style="color: #ffd700;">📊 Real-time Analytics</h3>
                <p>Live data updates and interactive charts</p>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                <h3 style="color: #ffd700;">🔗 Fantasy402 Integration</h3>
                <p>Seamless sports betting platform connection</p>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                <h3 style="color: #ffd700;">⚡ Performance Monitoring</h3>
                <p>System health and performance tracking</p>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                <h3 style="color: #ffd700;">🎯 Agent Management</h3>
                <p>Comprehensive agent oversight and controls</p>
            </div>
        </div>
    </div>

    <!-- Chart.js CDN -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns"></script>

    <script>
        // Enhanced Dashboard with Charts
        class EnhancedDashboard {
            constructor() {
                this.charts = {};
                this.data = null;
                this.updateInterval = null;
                this.initialize();
            }

            async initialize() {
                console.log('🔥 Initializing Enhanced Fire22 Dashboard with Charts...');
                await this.loadDashboardData();
                this.initializeCharts();
                this.setupWebSocketConnection();
                this.setupRealTimeUpdates();
                this.setupEventListeners();
            }

            async loadDashboardData() {
                try {
                    const response = await fetch('/api/dashboard/agents');
                    this.data = await response.json();
                    this.updateStatsDisplay();
                    console.log('✅ Dashboard data loaded successfully');
                } catch (error) {
                    console.error('❌ Failed to load dashboard data:', error);
                }
            }

            updateStatsDisplay() {
                if (!this.data) return;

                document.getElementById('total-agents').innerHTML = \`
                    <span class="loading">\${this.data.totalAgents || '0'}</span>
                    <div class="stat-change positive" style="font-size: 0.8rem; margin-top: 0.5rem;">↗️ +12% this month</div>
                \`;

                document.getElementById('active-agents').innerHTML = \`
                    <span class="loading">\${this.data.activeAgents || '0'}</span>
                    <div class="stat-change positive" style="font-size: 0.8rem; margin-top: 0.5rem;">↗️ +8% this month</div>
                \`;

                document.getElementById('pending-wagers').innerHTML = \`
                    <span class="loading">\${this.data.pendingWagers || '0'}</span>
                    <div class="stat-change" style="font-size: 0.8rem; margin-top: 0.5rem;">→ Stable</div>
                \`;

                document.getElementById('pending-amount').innerHTML = \`
                    <span class="loading">$\${this.data.pendingAmount?.toLocaleString() || '0'}</span>
                    <div class="stat-change positive" style="font-size: 0.8rem; margin-top: 0.5rem;">↗️ +15% this month</div>
                \`;
            }

            initializeCharts() {
                this.createRevenueChart();
                this.createAgentPerformanceChart();
                this.createCommissionChart();
                this.createActivityChart();
            }

            createRevenueChart() {
                const ctx = document.getElementById('revenue-chart');
                if (!ctx) return;

                const revenueData = this.generateRevenueData();

                this.charts.revenue = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: revenueData.labels,
                        datasets: [{
                            label: 'Daily Revenue',
                            data: revenueData.data,
                            borderColor: '#ffd700',
                            backgroundColor: 'rgba(255, 215, 0, 0.1)',
                            tension: 0.4,
                            fill: true,
                            pointBackgroundColor: '#ffd700',
                            pointBorderColor: '#1a1a2e',
                            pointBorderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            title: {
                                display: true,
                                text: 'Revenue Trend (Last 30 Days)',
                                color: '#ffd700',
                                font: { size: 14, weight: 'bold' }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                                ticks: {
                                    color: '#e2e8f0',
                                    callback: (value) => '$' + value.toLocaleString()
                                }
                            },
                            x: {
                                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                                ticks: { color: '#e2e8f0', maxTicksLimit: 7 }
                            }
                        }
                    }
                });
            }

            generateRevenueData() {
                const labels = [];
                const data = [];
                const endDate = new Date();

                for (let i = 29; i >= 0; i--) {
                    const date = new Date(endDate);
                    date.setDate(date.getDate() - i);
                    labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

                    const baseRevenue = 5000;
                    const trend = (30 - i) * 100;
                    const randomVariation = (Math.random() - 0.5) * 2000;
                    const dayOfWeek = date.getDay();
                    const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.8 : 1;

                    data.push(Math.max(1000, (baseRevenue + trend + randomVariation) * weekendMultiplier));
                }

                return { labels, data };
            }

            createAgentPerformanceChart() {
                const ctx = document.getElementById('agent-performance-chart');
                if (!ctx) return;

                this.charts.agentPerformance = new Chart(ctx, {
                    type: 'bar',
        data: {
                        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                        datasets: [{
                            label: 'Active Agents',
                            data: [18, 22, 25, 28],
                            backgroundColor: 'rgba(16, 185, 129, 0.8)',
                            borderColor: '#10b981',
                            borderWidth: 1
                        }, {
                            label: 'Inactive Agents',
                            data: [2, 3, 2, 1],
                            backgroundColor: 'rgba(239, 68, 68, 0.8)',
                            borderColor: '#ef4444',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Agent Performance Overview',
                                color: '#ffd700',
                                font: { size: 14, weight: 'bold' }
                            }
                        },
                        scales: {
                            y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#e2e8f0' } },
                            x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#e2e8f0' } }
                        }
                    }
                });
            }

            createCommissionChart() {
                const ctx = document.getElementById('commission-chart');
                if (!ctx) return;

                this.charts.commission = new Chart(ctx, {
                    type: 'doughnut',
        data: {
                        labels: ['Internet', 'Casino', 'Sports', 'Mobile', 'Other'],
                        datasets: [{
                            data: [35, 25, 20, 12, 8],
                            backgroundColor: ['#ffd700', '#10b981', '#06b6d4', '#8b5cf6', '#f59e0b'],
                            borderColor: '#1a1a2e',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Commission Distribution',
                                color: '#ffd700',
                                font: { size: 14, weight: 'bold' }
                            }
                        },
                        cutout: '60%'
                    }
                });
            }

            createActivityChart() {
                const ctx = document.getElementById('activity-chart');
                if (!ctx) return;

                const activityData = this.generateActivityData();

                this.charts.activity = new Chart(ctx, {
                    type: 'line',
              data: {
                        labels: activityData.labels,
                        datasets: [{
                            label: 'Daily Activity',
                            data: activityData.data,
                            borderColor: '#06b6d4',
                            backgroundColor: 'rgba(6, 182, 212, 0.1)',
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            title: {
                                display: true,
                                text: 'System Activity (24h)',
                                color: '#ffd700',
                                font: { size: 14, weight: 'bold' }
                            }
                        },
                        scales: {
                            y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#e2e8f0' } },
                            x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#e2e8f0', maxTicksLimit: 6 } }
                        }
                    }
                });
            }

            generateActivityData() {
                const labels = [];
                const data = [];

                for (let i = 23; i >= 0; i--) {
                    const hour = (24 - i) % 24;
                    labels.push(hour + ':00');

                    let baseActivity = 50;
                    if (hour >= 9 && hour <= 17) baseActivity = 80;
                    else if (hour >= 18 && hour <= 22) baseActivity = 95;
                    else baseActivity = 30;

                    const randomVariation = (Math.random() - 0.5) * 20;
                    data.push(Math.max(10, baseActivity + randomVariation));
                }

                return { labels, data };
            }

            setupWebSocketConnection() {
                console.log('🔌 Setting up WebSocket connection...');

                try {
                    // Use a mock WebSocket server endpoint for demonstration
                    const wsUrl = 'wss://echo.websocket.org'; // Public echo server for testing

                    if (typeof WebSocket !== 'undefined') {
                        this.websocket = new WebSocket(wsUrl);

                        this.websocket.onopen = () => {
                            console.log('✅ WebSocket connection established');
                            this.updateConnectionStatus('🟢 Connected', '#10b981');
                            this.sendWebSocketMessage({ type: 'subscribe', data: 'dashboard-updates' });
                        };

                        this.websocket.onmessage = (event) => {
                            try {
                                const data = JSON.parse(event.data);
                                this.handleWebSocketMessage(data);
                            } catch (error) {
                                console.log('Received WebSocket message:', event.data);
                            }
                        };

                        this.websocket.onclose = () => {
                            console.log('🔌 WebSocket connection closed');
                            this.updateConnectionStatus('🔴 Disconnected', '#ef4444');
                            // Attempt to reconnect after 5 seconds
                            setTimeout(() => this.setupWebSocketConnection(), 5000);
                        };

                        this.websocket.onerror = (error) => {
                            console.error('WebSocket error:', error);
                            this.updateConnectionStatus('🟡 Error', '#f59e0b');
                        };
                    } else {
                        console.warn('WebSocket not supported, falling back to polling');
                        this.updateConnectionStatus('🟡 Polling Mode', '#f59e0b');
                    }
                } catch (error) {
                    console.error('Failed to setup WebSocket:', error);
                    this.updateConnectionStatus('🔴 Failed', '#ef4444');
                }
            }

            sendWebSocketMessage(message) {
                if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                    this.websocket.send(JSON.stringify(message));
                }
            }

            handleWebSocketMessage(data) {
                console.log('📡 WebSocket message received:', data);

                // Simulate real-time updates based on WebSocket messages
                if (data.type === 'agent-update') {
                    this.handleAgentUpdate(data);
                } else if (data.type === 'revenue-update') {
                    this.handleRevenueUpdate(data);
                } else if (data.type === 'system-health') {
                    this.handleSystemHealthUpdate(data);
                }
            }

            handleAgentUpdate(data) {
                if (this.data) {
                    // Simulate agent count changes
                    const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
                    this.data.totalAgents = Math.max(20, this.data.totalAgents + change);
                    this.data.activeAgents = Math.max(15, this.data.activeAgents + change);

                    this.updateStatsDisplay();
                    this.showToast('Agent data updated in real-time!', 'success');
                }
            }

            handleRevenueUpdate(data) {
                // Update the latest revenue data point
                if (this.charts.revenue && this.charts.revenue.data.datasets[0].data.length > 0) {
                    const lastIndex = this.charts.revenue.data.datasets[0].data.length - 1;
                    const currentValue = this.charts.revenue.data.datasets[0].data[lastIndex];
                    const newValue = currentValue + (Math.random() - 0.5) * 1000;

                    this.charts.revenue.data.datasets[0].data[lastIndex] = Math.max(1000, newValue);
                    this.charts.revenue.update('none');
                }
            }

            handleSystemHealthUpdate(data) {
                // Update connection status based on system health
                if (data.status === 'healthy') {
                    this.updateConnectionStatus('🟢 Healthy', '#10b981');
                } else if (data.status === 'warning') {
                    this.updateConnectionStatus('🟡 Warning', '#f59e0b');
                } else {
                    this.updateConnectionStatus('🔴 Issues', '#ef4444');
                }
            }

            updateConnectionStatus(status, color = '#6b7280') {
                // Find or create connection status indicator
                let statusIndicator = document.getElementById('websocket-status');
                if (!statusIndicator) {
                    // Create status indicator in the dashboard header
                    const header = document.querySelector('.dashboard-header');
                    if (header) {
                        statusIndicator = document.createElement('div');
                        statusIndicator.id = 'websocket-status';
                        statusIndicator.style.cssText = \`
                            position: absolute;
                            top: 20px;
                            right: 20px;
                            padding: 8px 16px;
                            border-radius: 20px;
                            font-size: 0.8rem;
                            font-weight: 600;
                            backdrop-filter: blur(10px);
                            border: 1px solid rgba(255, 255, 255, 0.2);
                        \`;
                        header.style.position = 'relative';
                        header.appendChild(statusIndicator);
                    }
                }

                if (statusIndicator) {
                    statusIndicator.textContent = status;
                    statusIndicator.style.background = color + '20';
                    statusIndicator.style.color = color;
                    statusIndicator.style.borderColor = color + '40';
                }
            }

            setupRealTimeUpdates() {
                this.updateInterval = setInterval(() => {
                    this.updateChartsWithNewData();
                }, 30000);

                // Send periodic heartbeat to WebSocket
                setInterval(() => {
                    this.sendWebSocketMessage({ type: 'heartbeat', timestamp: Date.now() });
                }, 10000);
            }

            updateChartsWithNewData() {
                if (this.charts.revenue) {
                    const revenueData = this.generateRevenueData();
                    this.charts.revenue.data.labels = revenueData.labels;
                    this.charts.revenue.data.datasets[0].data = revenueData.data;
                    this.charts.revenue.update('none');
                }
            }

            setupEventListeners() {
                // Advanced filtering event listeners
                this.setupFilterEventListeners();

                // Date input event listeners
                const startDateInput = document.getElementById('start-date');
                const endDateInput = document.getElementById('end-date');

                if (startDateInput) {
                    startDateInput.addEventListener('change', () => {
                        this.validateDateRange();
                        this.updateActiveFiltersDisplay();
                    });
                }

                if (endDateInput) {
                    endDateInput.addEventListener('change', () => {
                        this.validateDateRange();
                        this.updateActiveFiltersDisplay();
                    });
                }

                // Filter select event listeners
                ['data-source-filter', 'global-chart-type', 'time-granularity'].forEach(id => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.addEventListener('change', () => {
                            this.updateActiveFiltersDisplay();
                        });
                    }
                });
            }

            setupFilterEventListeners() {
                // Apply filters button
                const applyBtn = document.getElementById('apply-filters');
                if (applyBtn) {
                    applyBtn.addEventListener('click', () => {
                        this.applyFilters();
                    });
                }

                // Reset filters button
                const resetBtn = document.getElementById('reset-filters');
                if (resetBtn) {
                    resetBtn.addEventListener('click', () => {
                        this.resetFilters();
                    });
                }
            }

            validateDateRange() {
                const startDate = document.getElementById('start-date');
                const endDate = document.getElementById('end-date');

                if (startDate && endDate && startDate.value && endDate.value) {
                    const start = new Date(startDate.value);
                    const end = new Date(endDate.value);

                    if (start > end) {
                        this.showToast('Start date cannot be after end date', 'error');
                        startDate.value = endDate.value;
                        return false;
                    }

                    const diffTime = Math.abs(end - start);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays > 365) {
                        this.showToast('Date range cannot exceed 1 year', 'warning');
                        return false;
                    }
                }

                return true;
            }

            getCurrentFilters() {
                return {
                    dateRange: {
                        start: document.getElementById('start-date')?.value || null,
                        end: document.getElementById('end-date')?.value || null
                    },
                    dataSource: document.getElementById('data-source-filter')?.value || 'all',
                    chartType: document.getElementById('global-chart-type')?.value || 'line',
                    granularity: document.getElementById('time-granularity')?.value || 'day'
                };
            }

            applyFilters() {
                const filters = this.getCurrentFilters();

                if (!this.validateDateRange()) {
                    return;
                }

                console.log('🎯 Applying filters:', filters);
                this.updateChartsWithFilters(filters);
                this.updateActiveFiltersDisplay();
                this.showToast('Filters applied successfully!', 'success');
            }

            resetFilters() {
                document.getElementById('start-date').value = '';
                document.getElementById('end-date').value = '';
                document.getElementById('data-source-filter').value = 'all';
                document.getElementById('global-chart-type').value = 'line';
                document.getElementById('time-granularity').value = 'day';

                document.getElementById('active-filters').style.display = 'none';

                this.updateChartsWithFilters({
                    dateRange: { start: null, end: null },
                    dataSource: 'all',
                    chartType: 'line',
                    granularity: 'day'
                });

                this.showToast('Filters reset successfully!', 'info');
            }

            updateChartsWithFilters(filters) {
                if (this.charts.revenue) {
                    const revenueData = this.generateRevenueDataWithFilters(filters);
                    this.charts.revenue.data.labels = revenueData.labels;
                    this.charts.revenue.data.datasets[0].data = revenueData.data;
                    this.charts.revenue.update('none');
                }

                if (filters.chartType !== 'line') {
                    this.updateChartTypes(filters.chartType);
                }
            }

            generateRevenueDataWithFilters(filters) {
                let days = 30;

                if (filters.dateRange.start && filters.dateRange.end) {
                    const start = new Date(filters.dateRange.start);
                    const end = new Date(filters.dateRange.end);
                    const diffTime = Math.abs(end - start);
                    days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }

                let step = 1;
                let labelFormat = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                if (filters.granularity === 'week') {
                    step = 7;
                    labelFormat = (date) => 'Week ' + Math.ceil(date.getDate() / 7);
                } else if (filters.granularity === 'month') {
                    step = 30;
                    labelFormat = (date) => date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                }

                const labels = [];
                const data = [];
                const endDate = new Date();

                for (let i = days - 1; i >= 0; i -= step) {
                    const date = new Date(endDate);
                    date.setDate(date.getDate() - i);
                    labels.push(labelFormat(date));

                    let baseRevenue = 5000;
                    const trend = ((days - i) / step) * 200;
                    const randomVariation = (Math.random() - 0.5) * 3000;
                    const dayOfWeek = date.getDay();
                    const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1;

                    if (filters.dataSource === 'fantasy402') {
                        baseRevenue *= 1.2;
                    } else if (filters.dataSource === 'agents') {
                        baseRevenue *= 0.8;
                    }

                    data.push(Math.max(1000, (baseRevenue + trend + randomVariation) * weekendMultiplier));
                }

                return { labels, data };
            }

            updateChartTypes(chartType) {
                Object.keys(this.charts).forEach(chartKey => {
                    const chart = this.charts[chartKey];
                    if (chart) {
                        try {
                            if (chartType === 'bar' && chartKey === 'revenue') {
                                chart.config.type = 'bar';
                            } else if (chartType === 'doughnut' && chartKey === 'commission') {
                                chart.config.type = 'doughnut';
                            } else if (chartType === 'radar' && chartKey === 'performance') {
                                chart.config.type = 'radar';
                            }
                            chart.update('none');
    } catch (error) {
                            console.warn('Could not update chart type for ' + chartKey + ':', error);
                        }
                    }
                });
            }

            updateActiveFiltersDisplay() {
                const filters = this.getCurrentFilters();
                const activeFiltersDiv = document.getElementById('active-filters');
                const filterTagsDiv = document.getElementById('filter-tags');

                if (!activeFiltersDiv || !filterTagsDiv) return;

                const activeTags = [];

                if (filters.dateRange.start || filters.dateRange.end) {
                    const start = filters.dateRange.start ? new Date(filters.dateRange.start).toLocaleDateString() : 'Start';
                    const end = filters.dateRange.end ? new Date(filters.dateRange.end).toLocaleDateString() : 'End';
                    activeTags.push('📅 ' + start + ' - ' + end);
                }

                if (filters.dataSource !== 'all') {
                    const sourceLabels = {
                        fantasy402: '🎮 Fantasy402',
                        fire22: '🔥 Fire22',
                        agents: '👥 Agents',
                        transactions: '💳 Transactions'
                    };
                    activeTags.push(sourceLabels[filters.dataSource] || filters.dataSource);
                }

                if (filters.chartType !== 'line') {
                    const typeLabels = {
                        bar: '📊 Bar',
                        doughnut: '🥧 Doughnut',
                        radar: '🎯 Radar',
                        mixed: '🔄 Mixed'
                    };
                    activeTags.push(typeLabels[filters.chartType] || filters.chartType);
                }

                if (filters.granularity !== 'day') {
                    const granularityLabels = {
                        hour: '🕐 Hourly',
                        week: '📅 Weekly',
                        month: '📆 Monthly'
                    };
                    activeTags.push(granularityLabels[filters.granularity] || filters.granularity);
                }

                if (activeTags.length > 0) {
                    filterTagsDiv.innerHTML = activeTags.map(tag => '<span style="background: rgba(255, 215, 0, 0.2); color: #ffd700; padding: 0.25rem 0.75rem; border-radius: 15px; font-size: 0.8rem; font-weight: 600; border: 1px solid rgba(255, 215, 0, 0.3);">' + tag + '</span>').join('');
                    activeFiltersDiv.style.display = 'block';
                } else {
                    activeFiltersDiv.style.display = 'none';
                }
            }

            showToast(message, type = 'info') {
                const toast = document.createElement('div');
                toast.style.cssText = \`
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 12px 24px;
                    border-radius: 25px;
                    font-size: 0.9rem;
                    z-index: 10000;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    animation: slideInRight 0.3s ease-out;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                \`;

                const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
                toast.innerHTML = '<span>' + icon + '</span><span>' + message + '</span>';

                document.body.appendChild(toast);

                setTimeout(() => {
                    toast.style.animation = 'slideOutRight 0.3s ease-in';
                    setTimeout(() => {
                        if (toast.parentNode) {
                            toast.parentNode.removeChild(toast);
                        }
                    }, 300);
                }, 3000);
            }

            async refreshDashboard() {
                console.log('🔄 Refreshing dashboard data...');
                await this.loadDashboardData();
                this.updateChartsWithNewData();
                this.showToast('Dashboard refreshed successfully!', 'success');
            }

            exportDashboardData() {
                if (!this.data) {
                    this.showToast('No data available for export', 'error');
                    return;
                }

                const exportData = {
                    timestamp: new Date().toISOString(),
                    summary: {
                        totalAgents: this.data.totalAgents,
                        activeAgents: this.data.activeAgents,
                        pendingWagers: this.data.pendingWagers,
                        pendingAmount: this.data.pendingAmount
                    },
                    agents: this.data.agents,
                    charts: {
                        revenue: this.generateRevenueData(),
                        agentPerformance: {
                            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                            active: [18, 22, 25, 28],
                            inactive: [2, 3, 2, 1]
                        },
                        commission: {
                            labels: ['Internet', 'Casino', 'Sports', 'Mobile', 'Other'],
                            data: [35, 25, 20, 12, 8]
                        },
                        activity: this.generateActivityData()
                    }
                };

                const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                    type: 'application/json'
                });

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'fire22-dashboard-' + new Date().toISOString().split('T')[0] + '.json';
                a.click();
                URL.revokeObjectURL(url);

                this.showToast('Dashboard data exported successfully!', 'success');
            }

            destroy() {
                if (this.updateInterval) {
                    clearInterval(this.updateInterval);
                }

                // Close WebSocket connection
                if (this.websocket) {
                    this.websocket.close();
                    this.websocket = null;
                }

                Object.values(this.charts).forEach(chart => {
                    if (chart && chart.destroy) {
                        chart.destroy();
                    }
                });

                console.log('🔥 Enhanced Dashboard destroyed');
            }
        }

        // Global functions for button actions
        function refreshDashboard() {
            if (window.dashboard) {
                window.dashboard.refreshDashboard();
            }
        }

        function exportDashboardData() {
            if (window.dashboard) {
                window.dashboard.exportDashboardData();
            }
        }

        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', () => {
            window.dashboard = new EnhancedDashboard();
            console.log('🔥 Enhanced Fire22 Dashboard with Charts initialized');
        });

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (window.dashboard) {
                window.dashboard.destroy();
            }
        });
    </script>

    <style>
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }

        .stat-change.positive {
            color: #10b981;
        }

        .stat-change.negative {
            color: #ef4444;
        }
    </style>
</body>
</html>`;

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Default response for unhandled routes
    return new Response(
      JSON.stringify({
        error: 'Not Found',
        message: `Endpoint ${path} not found`,
        availableEndpoints: ['/health', '/api/health', '/favicon.ico', '/'],
        timestamp: new Date().toISOString(),
      }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

// Cloudflare Worker export
export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const worker = new MainWorker();
    return await worker.processRequest(request);
  },
};

// Optional: Export an instance for direct use if a singleton pattern is desired
export const mainWorkerInstance = new MainWorker();
