#!/usr/bin/env bun
/**
 * Water Dashboard Standalone Server
 * Production-ready executable with embedded runtime configuration
 */

import { serve } from "bun";
import { logger } from "../scripts/enhanced-logging-system";

// Runtime configuration display
const RUNTIME_INFO = {
  version: "2.1.0.2024",
  userAgent: "WaterDashboard/2.1.0.2024",
  buildDate: "2025-08-28T00:40:55.009Z",
  platform: process.platform,
  execArgv: process.execArgv || [],
  standalone: true
};

// Enhanced ANSI colors for production logs
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m", 
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m"
};

// Format logs with ANSI colors
function formatLog(level: string, message: string, useColors = true): string {
  if (!useColors) return Bun.stripANSI(`[${level.toUpperCase()}] ${message}`);
  
  const colorMap = {
    info: colors.cyan,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
    debug: colors.dim
  };
  
  const color = colorMap[level] || colors.white;
  return `${color}[${level.toUpperCase()}]${colors.reset} ${message}`;
}

// Clean logs for production (strips ANSI)
function cleanLog(message: string): string {
  return Bun.stripANSI(message);
}

// Enhanced dashboard HTML with runtime info
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Water Dashboard - Production</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
    <style>
        :root {
            --primary: #2563eb;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --light: #f8fafc;
            --dark: #1e293b;
            --background: #0f172a;
            --card-bg: #1e293b;
            --border: #334155;
            --bun-gradient: linear-gradient(135deg, #fb7185, #f97316, #f59e0b);
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background: var(--background);
            color: var(--light);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            background: var(--card-bg);
            border-bottom: 1px solid var(--border);
            border-radius: 8px;
            margin-bottom: 1rem;
        }
        
        .logo h1 {
            font-size: 1.5rem;
            background: var(--bun-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .runtime-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        
        .info-card {
            background: var(--card-bg);
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid var(--border);
        }
        
        .info-title {
            color: var(--warning);
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        
        .info-value {
            font-family: monospace;
            color: var(--light);
            font-size: 0.9rem;
        }
        
        .status-indicators {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            margin-bottom: 2rem;
        }
        
        .status-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: var(--dark);
            border-radius: 20px;
            font-size: 0.9rem;
        }
        
        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }
        
        .online {
            background: var(--success);
        }
        
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }
        
        .metric-card {
            background: var(--card-bg);
            border-radius: 8px;
            padding: 1rem;
            text-align: center;
            border: 1px solid var(--border);
        }
        
        .metric-value {
            font-size: 2rem;
            font-weight: 700;
            margin: 0.5rem 0;
            background: var(--bun-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .metric-label {
            color: var(--light);
            font-size: 0.9rem;
        }
    </style>
</head>
<body x-data="dashboard()">
    <div class="container">
        <header class="header">
            <div class="logo">
                <h1>Water Dashboard - Production</h1>
            </div>
            <div class="status-indicators">
                <div class="status-item">
                    <div class="status-dot online"></div>
                    <span>Standalone Mode</span>
                </div>
                <div class="status-item">
                    <div class="status-dot online"></div>
                    <span>Bun Runtime</span>
                </div>
            </div>
        </header>
        
        <div class="runtime-info">
            <div class="info-card">
                <div class="info-title">Runtime Version</div>
                <div class="info-value" x-text="runtimeInfo.version"></div>
            </div>
            <div class="info-card">
                <div class="info-title">User Agent</div>
                <div class="info-value" x-text="runtimeInfo.userAgent"></div>
            </div>
            <div class="info-card">
                <div class="info-title">Platform</div>
                <div class="info-value" x-text="runtimeInfo.platform"></div>
            </div>
            <div class="info-card">
                <div class="info-title">Build Date</div>
                <div class="info-value" x-text="runtimeInfo.buildDate"></div>
            </div>
        </div>
        
        <div class="metrics">
            <div class="metric-card">
                <div class="metric-label">Active Logs</div>
                <div class="metric-value" x-text="formatNumber(stats.activeLogs)">1,245,789</div>
                <div class="metric-label">D1 Database</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Cache Hits</div>
                <div class="metric-value" x-text="formatNumber(stats.cacheHits)">12,456</div>
                <div class="metric-label">KV Storage</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Avg. Response</div>
                <div class="metric-value" x-text="stats.avgResponse + 'ms'">42ms</div>
                <div class="metric-label">Bun Enhanced</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Uptime</div>
                <div class="metric-value" x-text="formatUptime(stats.uptime)">24h</div>
                <div class="metric-label">Process</div>
            </div>
        </div>
    </div>
    
    <script>
        function dashboard() {
            return {
                runtimeInfo: ${JSON.stringify(RUNTIME_INFO)},
                stats: {
                    activeLogs: 1245789,
                    cacheHits: 12456,
                    avgResponse: 42,
                    uptime: 0
                },
                
                init() {
                    this.loadStats();
                    setInterval(() => this.updateStats(), 5000);
                },
                
                async loadStats() {
                    try {
                        const response = await fetch('/api/stats');
                        const data = await response.json();
                        this.stats = { ...this.stats, ...data };
                    } catch (error) {
                        console.warn('Failed to load stats:', error);
                    }
                },
                
                updateStats() {
                    this.stats.activeLogs += Math.floor(Math.random() * 100);
                    this.stats.cacheHits += Math.floor(Math.random() * 10);
                    this.stats.avgResponse = 40 + Math.floor(Math.random() * 10);
                    this.stats.uptime = Date.now() - new Date('${RUNTIME_INFO.buildDate}').getTime();
                },
                
                formatNumber(num) {
                    return new Intl.NumberFormat().format(num);
                },
                
                formatUptime(ms) {
                    const hours = Math.floor(ms / (1000 * 60 * 60));
                    if (hours < 24) return `${hours}h`;
                    const days = Math.floor(hours / 24);
                    return `${days}d`;
                }
            };
        }
    </script>
</body>
</html>`;

// API for fetching Fire22 data with custom user agent
async function fetchFire22Data(endpoint: string): Promise<any> {
  try {
    const response = await fetch(`https://fire22.ag/cloud/api${endpoint}`, {
      headers: {
        "User-Agent": RUNTIME_INFO.userAgent,
        "Accept": "application/json",
        "X-Powered-By": "Bun-Standalone-Dashboard"
      }
    });
    
    return response.json();
  } catch (error) {
    logger.error("FIRE22_API", "2.1.0", `Failed to fetch ${endpoint}: ${error}`, "E7001");
    return null;
  }
}

// Main server
const server = serve({
  port: 3001,
  
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Log with colors in development, clean in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    const logMessage = formatLog('info', `${request.method} ${url.pathname}`, isDevelopment);
    console.log(logMessage);
    
    try {
      switch (url.pathname) {
        case '/':
          return new Response(DASHBOARD_HTML, {
            headers: { 
              'Content-Type': 'text/html',
              'X-Powered-By': RUNTIME_INFO.userAgent
            }
          });
          
        case '/api/runtime':
          return Response.json(RUNTIME_INFO);
          
        case '/api/stats':
          const stats = {
            activeLogs: Math.floor(Math.random() * 1000000) + 1000000,
            cacheHits: Math.floor(Math.random() * 50000) + 10000,
            avgResponse: Math.floor(Math.random() * 20) + 30,
            uptime: process.uptime() * 1000,
            memory: process.memoryUsage(),
            platform: process.platform,
            version: process.version
          };
          return Response.json(stats);
          
        case '/api/fire22/customers':
          // Fetch real Fire22 data with custom user agent
          const customers = await fetchFire22Data('/customers');
          return Response.json(customers || { error: 'Failed to fetch Fire22 data' });
          
        case '/health':
          return Response.json({
            status: 'healthy',
            version: RUNTIME_INFO.version,
            userAgent: RUNTIME_INFO.userAgent,
            standalone: true,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: Date.now()
          });
          
        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      const errorLog = formatLog('error', `Request failed: ${error}`, isDevelopment);
      console.error(errorLog);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
});

// Startup logs with colors
console.log(formatLog('success', `🚀 Water Dashboard Standalone Server started on port ${server.port}`));
console.log(formatLog('info', `Version: ${RUNTIME_INFO.version}`));
console.log(formatLog('info', `User Agent: ${RUNTIME_INFO.userAgent}`));
console.log(formatLog('info', `Platform: ${RUNTIME_INFO.platform}`));
console.log(formatLog('info', `Runtime Args: ${RUNTIME_INFO.execArgv.join(' ')}`));

// Production log (clean)
const cleanStartupMessage = cleanLog(`Water Dashboard v${RUNTIME_INFO.version} started successfully on port ${server.port}`);
if (process.env.NODE_ENV === 'production') {
  console.log(cleanStartupMessage);
}
