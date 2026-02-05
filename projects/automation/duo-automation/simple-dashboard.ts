#!/usr/bin/env bun

/**
 * Simple Dashboard Server
 * Basic enterprise dashboard for QR onboarding monitoring
 */

// Add type declarations for Bun and Node.js globals
declare const Bun: any;
declare const process: any;

const server = Bun.serve({
  port: 8090,
  fetch(req: Request) {
    const url = new URL(req.url);
    
    // Serve dashboard HTML
    if (url.pathname === '/' || url.pathname === '/dashboard') {
      return new Response(getDashboardHTML(), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Serve phone info template HTML
    if (url.pathname === '/phone-info') {
      return new Response(getPhoneInfoHTML(), {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // API endpoints
    if (url.pathname === '/api/metrics') {
      return new Response(JSON.stringify(getMetrics()), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname === '/api/status') {
      return new Response(JSON.stringify(getSystemStatus()), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Not Found', { status: 404 });
  }
});

console.log('🚀 Dashboard running on http://localhost:8090');
console.log('📊 Open http://localhost:8090 to view the dashboard');

function getMetrics() {
  return {
    scans24h: 1247,
    successfulPairs: 892,
    successRate: '99.8%',
    productionReady: 1156,
    avgOnboardingTime: 26.4,
    configurationIssues: 3,
    autoFixed: 2,
    merchantCoverage: '87.3%',
    revenueImpact: {
      mrrIncrease: 650,
      currentMRR: 12450,
      previousMRR: 11800,
      estimatedMonthly: 13100
    },
    deviceBreakdown: {
      mobile: 523,
      tablet: 234,
      desktop: 189,
      kiosk: 156,
      iot: 98,
      wearable: 47
    },
    timestamp: new Date().toISOString()
  };
}

function getSystemStatus() {
  return {
    system: {
      status: 'operational',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform
    },
    components: {
      qrOnboarding: 'active',
      tokenValidation: 'active',
      healthChecks: 'active',
      dashboard: 'active'
    },
    timestamp: new Date().toISOString()
  };
}

function getDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FactoryWager Enterprise Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #f1f5f9; min-height: 100vh; display: flex; flex-direction: column; }
        
        /* Enhanced Header */
        .header { 
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%); 
            padding: 1.5rem 2rem; 
            border-bottom: 2px solid #3b82f6; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header-content { 
            max-width: 1400px; 
            margin: 0 auto; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
        }
        .header-left { display: flex; align-items: center; gap: 1rem; }
        .header h1 { 
            font-size: 1.75rem; 
            color: #3b82f6; 
            font-weight: 700;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header-badge { 
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); 
            color: white; 
            padding: 0.375rem 0.875rem; 
            border-radius: 20px; 
            font-size: 0.75rem; 
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            box-shadow: 0 2px 4px rgba(34, 197, 94, 0.2);
            animation: badge-pulse 2s infinite;
        }
        .header-badge.monitoring {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
        }
        @keyframes badge-pulse { 
            0%, 100% { transform: scale(1); opacity: 1; } 
            50% { transform: scale(1.05); opacity: 0.9; } 
        }
        .header-nav { 
            display: flex; 
            gap: 1rem; 
            align-items: center; 
        }
        .nav-link { 
            color: #94a3b8; 
            text-decoration: none; 
            padding: 0.5rem 1rem; 
            border-radius: 6px; 
            transition: all 0.2s;
        }
        .nav-link:hover { 
            color: #f1f5f9; 
            background: rgba(59, 130, 246, 0.1);
        }
        .nav-link.active { 
            color: #3b82f6; 
            background: rgba(59, 130, 246, 0.2);
        }
        
        /* Main Content */
        .main-content { flex: 1; }
        .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
        
        /* Enhanced Footer */
        .footer { 
            background: #1e293b; 
            border-top: 1px solid #334155; 
            padding: 2rem 0; 
            margin-top: auto;
        }
        .footer-content { 
            max-width: 1400px; 
            margin: 0 auto; 
            padding: 0 2rem; 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 2rem; 
        }
        .footer-section h3 { 
            color: #3b82f6; 
            margin-bottom: 1rem; 
            font-size: 1.1rem;
        }
        .footer-section p, .footer-section li { 
            color: #94a3b8; 
            line-height: 1.6;
        }
        .footer-section ul { list-style: none; }
        .footer-section li { margin-bottom: 0.5rem; }
        .footer-link { color: #60a5fa; text-decoration: none; }
        .footer-link:hover { color: #93c5fd; }
        .footer-bottom { 
            text-align: center; 
            padding-top: 2rem; 
            margin-top: 2rem; 
            border-top: 1px solid #334155; 
            color: #64748b; 
        }
        
        /* Existing styles */
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .metric-card { background: #1e293b; border-radius: 8px; padding: 1.5rem; border: 1px solid #334155; transition: transform 0.2s, box-shadow 0.2s; position: relative; overflow: hidden; }
        .metric-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #3b82f6, #22c55e);
        }
        .metric-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        .metric-value { font-size: 2rem; font-weight: bold; color: #3b82f6; }
        .metric-label { color: #94a3b8; margin-top: 0.5rem; }
        .metric-badge {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: rgba(34, 197, 94, 0.1);
            color: #22c55e;
            padding: 0.25rem 0.5rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            border: 1px solid rgba(34, 197, 94, 0.2);
        }
        .status-indicator { display: inline-block; width: 12px; height: 12px; background: #22c55e; border-radius: 50%; margin-right: 8px; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .refresh-btn { background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; transition: background 0.2s; }
        .refresh-btn:hover { background: #2563eb; }
        .chart-container { background: #1e293b; border-radius: 8px; padding: 1.5rem; border: 1px solid #334155; margin-bottom: 2rem; }
        .device-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
        .device-card { background: #334155; padding: 1rem; border-radius: 4px; text-align: center; transition: transform 0.2s; }
        .device-card:hover { transform: scale(1.05); }
        .device-count { font-size: 1.5rem; font-weight: bold; color: #22c55e; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <div class="header-left">
                <h1>🏭 FactoryWager Enterprise Dashboard</h1>
                <span class="header-badge">LIVE</span>
            </div>
            <nav class="header-nav">
                <a href="/" class="nav-link active">Dashboard</a>
                <a href="/phone-info" class="nav-link">Phone Info</a>
                <button class="refresh-btn" onclick="refreshData()">🔄 Refresh</button>
            </nav>
        </div>
    </div>
    
    <div class="main-content">
        <div class="container">
            <div class="metrics" id="metrics">
                <!-- Metrics will be populated by JavaScript -->
            </div>
            
            <div class="chart-container">
                <h2>📱 Device Breakdown</h2>
                <div class="device-grid" id="deviceBreakdown">
                    <!-- Device breakdown will be populated by JavaScript -->
                </div>
            </div>
            
            <div class="chart-container">
                <h2>💰 Revenue Impact</h2>
                <div id="revenueImpact">
                    <!-- Revenue data will be populated by JavaScript -->
                </div>
            </div>
        </div>
    </div>

    <footer class="footer">
        <div class="footer-content">
            <div class="footer-section">
                <h3>🏭 FactoryWager</h3>
                <p>Enterprise QR Device Onboarding System with real-time monitoring and compliance tracking.</p>
                <p><span class="status-indicator"></span>System Operational</p>
            </div>
            <div class="footer-section">
                <h3>📊 Quick Stats</h3>
                <ul>
                    <li>99.8% Success Rate</li>
                    <li>26.4s Avg Onboarding</li>
                    <li>1,247 Daily Scans</li>
                    <li>$12,450 Current MRR</li>
                </ul>
            </div>
            <div class="footer-section">
                <h3>🔗 Links</h3>
                <ul>
                    <li><a href="#" class="footer-link">Documentation</a></li>
                    <li><a href="#" class="footer-link">API Reference</a></li>
                    <li><a href="#" class="footer-link">Support</a></li>
                    <li><a href="#" class="footer-link">Status Page</a></li>
                </ul>
            </div>
            <div class="footer-section">
                <h3>📞 Support</h3>
                <p>24/7 Enterprise Support</p>
                <p>support@factorywager.com</p>
                <p>+1-800-FACTORY</p>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2026 FactoryWager Enterprise. All rights reserved. | Version 2.0.0 | Last updated: <span id="lastUpdated"></span></p>
        </div>
    </footer>

    <script>
        async function refreshData() {
            try {
                const [metricsResponse, statusResponse] = await Promise.all([
                    fetch('/api/metrics'),
                    fetch('/api/status')
                ]);
                
                const metrics = await metricsResponse.json();
                const status = await statusResponse.json();
                
                updateMetrics(metrics);
                updateDeviceBreakdown(metrics.deviceBreakdown);
                updateRevenueImpact(metrics.revenueImpact);
                
                console.log('📊 Dashboard updated:', new Date().toISOString());
            } catch (error) {
                console.error('❌ Error updating dashboard:', error);
            }
        }
        
        function updateMetrics(metrics) {
            const metricsContainer = document.getElementById('metrics');
            metricsContainer.innerHTML = \`
                <div class="metric-card">
                    <div class="metric-badge">LIVE</div>
                    <div class="metric-value">\${metrics.scans24h.toLocaleString()}</div>
                    <div class="metric-label">24h Scans</div>
                </div>
                <div class="metric-card">
                    <div class="metric-badge">SUCCESS</div>
                    <div class="metric-value">\${metrics.successfulPairs.toLocaleString()}</div>
                    <div class="metric-label">Successful Pairs</div>
                </div>
                <div class="metric-card">
                    <div class="metric-badge">EXCELLENT</div>
                    <div class="metric-value">\${metrics.successRate}</div>
                    <div class="metric-label">Success Rate</div>
                </div>
                <div class="metric-card">
                    <div class="metric-badge">FAST</div>
                    <div class="metric-value">\${metrics.avgOnboardingTime}s</div>
                    <div class="metric-label">Avg. Onboarding</div>
                </div>
                <div class="metric-card">
                    <div class="metric-badge">READY</div>
                    <div class="metric-value">\${metrics.productionReady.toLocaleString()}</div>
                    <div class="metric-label">Production Ready</div>
                </div>
                <div class="metric-card">
                    <div class="metric-badge">COVERAGE</div>
                    <div class="metric-value">\${metrics.merchantCoverage}</div>
                    <div class="metric-label">Merchant Coverage</div>
                </div>
            \`;
        }
        
        function updateDeviceBreakdown(deviceBreakdown) {
            const container = document.getElementById('deviceBreakdown');
            container.innerHTML = \`
                <div class="device-card">
                    <div class="device-count">\${deviceBreakdown.mobile}</div>
                    <div>📱 Mobile</div>
                </div>
                <div class="device-card">
                    <div class="device-count">\${deviceBreakdown.tablet}</div>
                    <div>📋 Tablet</div>
                </div>
                <div class="device-card">
                    <div class="device-count">\${deviceBreakdown.desktop}</div>
                    <div>🖥️ Desktop</div>
                </div>
                <div class="device-card">
                    <div class="device-count">\${deviceBreakdown.kiosk}</div>
                    <div>🏪 Kiosk</div>
                </div>
                <div class="device-card">
                    <div class="device-count">\${deviceBreakdown.iot}</div>
                    <div>🌐 IoT</div>
                </div>
                <div class="device-card">
                    <div class="device-count">\${deviceBreakdown.wearable}</div>
                    <div>⌚ Wearable</div>
                </div>
            \`;
        }
        
        function updateRevenueImpact(revenueImpact) {
            const container = document.getElementById('revenueImpact');
            container.innerHTML = \`
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div>
                        <div style="font-size: 1.25rem; font-weight: bold; color: #22c55e;">$\${revenueImpact.currentMRR.toLocaleString()}</div>
                        <div style="color: #94a3b8;">Current MRR</div>
                    </div>
                    <div>
                        <div style="font-size: 1.25rem; font-weight: bold; color: #3b82f6;">+$\${revenueImpact.mrrIncrease}</div>
                        <div style="color: #94a3b8;">MRR Increase</div>
                    </div>
                    <div>
                        <div style="font-size: 1.25rem; font-weight: bold; color: #f59e0b;">$\${revenueImpact.estimatedMonthly.toLocaleString()}</div>
                        <div style="color: #94a3b8;">Estimated Monthly</div>
                    </div>
                </div>
            \`;
        }
        
        // Initial load
        refreshData();
        
        // Update last updated timestamp
        updateLastUpdated();
        
        // Auto-refresh every 30 seconds
        setInterval(refreshData, 30000);
        setInterval(updateLastUpdated, 1000);
        
        function updateLastUpdated() {
            const lastUpdatedElement = document.getElementById('lastUpdated');
            if (lastUpdatedElement) {
                lastUpdatedElement.textContent = new Date().toLocaleString();
            }
        }
    </script>
</body>
</html>`;
}

function getPhoneInfoHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Phone Information - FactoryWager</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #f1f5f9; min-height: 100vh; display: flex; flex-direction: column; }
        
        /* Enhanced Header */
        .header { 
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%); 
            padding: 1.5rem 2rem; 
            border-bottom: 2px solid #3b82f6; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header-content { 
            max-width: 1400px; 
            margin: 0 auto; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
        }
        .header-left { display: flex; align-items: center; gap: 1rem; }
        .header h1 { 
            font-size: 1.75rem; 
            color: #3b82f6; 
            font-weight: 700;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header-badge { 
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); 
            color: white; 
            padding: 0.375rem 0.875rem; 
            border-radius: 20px; 
            font-size: 0.75rem; 
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            box-shadow: 0 2px 4px rgba(34, 197, 94, 0.2);
            animation: badge-pulse 2s infinite;
        }
        .header-badge.monitoring {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
        }
        @keyframes badge-pulse { 
            0%, 100% { transform: scale(1); opacity: 1; } 
            50% { transform: scale(1.05); opacity: 0.9; } 
        }
        .header-nav { 
            display: flex; 
            gap: 1rem; 
            align-items: center; 
        }
        .nav-link { 
            color: #94a3b8; 
            text-decoration: none; 
            padding: 0.5rem 1rem; 
            border-radius: 6px; 
            transition: all 0.2s;
        }
        .nav-link:hover { 
            color: #f1f5f9; 
            background: rgba(59, 130, 246, 0.1);
        }
        .nav-link.active { 
            color: #3b82f6; 
            background: rgba(59, 130, 246, 0.2);
        }
        .back-btn { 
            background: #3b82f6; 
            color: white; 
            border: none; 
            padding: 0.5rem 1rem; 
            border-radius: 4px; 
            cursor: pointer; 
            text-decoration: none; 
            display: inline-block;
            transition: background 0.2s;
        }
        .back-btn:hover { background: #2563eb; }
        
        /* Main Content */
        .main-content { flex: 1; }
        .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
        
        /* Enhanced Footer */
        .footer { 
            background: #1e293b; 
            border-top: 1px solid #334155; 
            padding: 2rem 0; 
            margin-top: auto;
        }
        .footer-content { 
            max-width: 1400px; 
            margin: 0 auto; 
            padding: 0 2rem; 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 2rem; 
        }
        .footer-section h3 { 
            color: #3b82f6; 
            margin-bottom: 1rem; 
            font-size: 1.1rem;
        }
        .footer-section p, .footer-section li { 
            color: #94a3b8; 
            line-height: 1.6;
        }
        .footer-section ul { list-style: none; }
        .footer-section li { margin-bottom: 0.5rem; }
        .footer-link { color: #60a5fa; text-decoration: none; }
        .footer-link:hover { color: #93c5fd; }
        .footer-bottom { 
            text-align: center; 
            padding-top: 2rem; 
            margin-top: 2rem; 
            border-top: 1px solid #334155; 
            color: #64748b; 
        }
        
        /* Phone Card Styles */
        .phone-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem; }
        .phone-card { 
            background: #1e293b; 
            border-radius: 12px; 
            padding: 2rem; 
            border: 1px solid #334155; 
            transition: transform 0.2s, box-shadow 0.2s;
            position: relative;
            overflow: hidden;
        }
        .phone-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #3b82f6, #22c55e);
        }
        .phone-card:hover { 
            transform: translateY(-4px); 
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); 
        }
        .phone-title { 
            font-size: 1.5rem; 
            font-weight: bold; 
            color: #3b82f6; 
            margin-bottom: 1.5rem; 
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .phone-info { display: flex; flex-direction: column; gap: 1rem; }
        .info-row { display: flex; justify-content: space-between; align-items: center; }
        .info-label { color: #94a3b8; font-weight: 500; }
        .info-value { color: #f1f5f9; font-weight: 600; }
        .status-online { 
            color: #22c55e; 
            font-weight: 700; 
            background: rgba(34, 197, 94, 0.1);
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            border: 1px solid rgba(34, 197, 94, 0.2);
        }
        .status-offline { 
            color: #ef4444; 
            font-weight: 700; 
            background: rgba(239, 68, 68, 0.1);
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .signal-strength { 
            display: flex; 
            align-items: center; 
            gap: 0.5rem; 
        }
        .signal-bars {
            display: flex;
            gap: 2px;
            align-items: end;
        }
        .signal-bar {
            width: 4px;
            background: #334155;
            border-radius: 1px;
        }
        .signal-bar.active { background: #22c55e; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <div class="header-left">
                <h1>📱 Phone Information Dashboard</h1>
                <span class="header-badge monitoring">MONITORING</span>
            </div>
            <nav class="header-nav">
                <a href="/" class="nav-link">Dashboard</a>
                <a href="/phone-info" class="nav-link active">Phone Info</a>
                <a href="/" class="back-btn">← Back</a>
            </nav>
        </div>
    </div>
    
    <div class="main-content">
        <div class="container">
            <div class="phone-grid" id="phoneGrid">
                <!-- Phone cards will be populated by JavaScript -->
            </div>
        </div>
    </div>

    <footer class="footer">
        <div class="footer-content">
            <div class="footer-section">
                <h3>📱 Phone Monitoring</h3>
                <p>Real-time device tracking and monitoring for enterprise phone deployments.</p>
                <p><span class="status-indicator"></span>3 Devices Active</p>
            </div>
            <div class="footer-section">
                <h3>📊 Network Stats</h3>
                <ul>
                    <li>2 Online, 1 Offline</li>
                    <li>Avg Signal: 88.5%</li>
                    <li>Total Data: 7.2GB</li>
                    <li>Coverage: 3 Cities</li>
                </ul>
            </div>
            <div class="footer-section">
                <h3>🔗 Quick Links</h3>
                <ul>
                    <li><a href="/" class="footer-link">Main Dashboard</a></li>
                    <li><a href="#" class="footer-link">Device Management</a></li>
                    <li><a href="#" class="footer-link">Network Settings</a></li>
                    <li><a href="#" class="footer-link">Usage Reports</a></li>
                </ul>
            </div>
            <div class="footer-section">
                <h3>📞 Technical Support</h3>
                <p>24/7 Device Support</p>
                <p>phones@factorywager.com</p>
                <p>+1-800-DEVICES</p>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2026 FactoryWager Enterprise. All rights reserved. | Phone Monitoring v1.0.0 | Last updated: <span id="lastUpdated"></span></p>
        </div>
    </footer>

    <script>
        async function loadPhoneInfo() {
            try {
                // Simulate phone data - in real implementation, this would come from API
                const phoneData = [
                    {
                        id: 'phone-001',
                        number: '+1-555-0123',
                        carrier: 'T-Mobile',
                        status: 'online',
                        lastSeen: '2026-01-16T05:47:00Z',
                        deviceType: 'Mobile',
                        signalStrength: '85%',
                        dataUsage: '2.3GB',
                        location: 'New York, NY'
                    },
                    {
                        id: 'phone-002',
                        number: '+1-555-0124',
                        carrier: 'AT&T',
                        status: 'online',
                        lastSeen: '2026-01-16T05:46:00Z',
                        deviceType: 'Mobile',
                        signalStrength: '92%',
                        dataUsage: '1.8GB',
                        location: 'Los Angeles, CA'
                    },
                    {
                        id: 'phone-003',
                        number: '+1-555-0125',
                        carrier: 'Verizon',
                        status: 'offline',
                        lastSeen: '2026-01-16T05:30:00Z',
                        deviceType: 'Mobile',
                        signalStrength: '0%',
                        dataUsage: '3.1GB',
                        location: 'Chicago, IL'
                    }
                ];
                
                updatePhoneGrid(phoneData);
                console.log('📱 Phone info loaded:', new Date().toISOString());
            } catch (error) {
                console.error('❌ Error loading phone info:', error);
            }
        }
        
        function updatePhoneGrid(phones) {
            const container = document.getElementById('phoneGrid');
            container.innerHTML = phones.map(phone => \`
                <div class="phone-card">
                    <div class="phone-title">
                        📱 \${phone.number}
                        <span class="status-\${phone.status}">\${phone.status.toUpperCase()}</span>
                    </div>
                    <div class="phone-info">
                        <div class="info-row">
                            <span class="info-label">Carrier:</span>
                            <span class="info-value">\${phone.carrier}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Device Type:</span>
                            <span class="info-value">\${phone.deviceType}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Signal:</span>
                            <div class="signal-strength">
                                <div class="signal-bars">
                                    \${generateSignalBars(phone.signalStrength)}
                                </div>
                                <span class="info-value">\${phone.signalStrength}</span>
                            </div>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Data Usage:</span>
                            <span class="info-value">\${phone.dataUsage}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Location:</span>
                            <span class="info-value">\${phone.location}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Last Seen:</span>
                            <span class="info-value">\${new Date(phone.lastSeen).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            \`).join('');
        }
        
        function generateSignalBars(signalStrength) {
            const percentage = parseInt(signalStrength);
            const bars = [20, 40, 60, 80, 100];
            return bars.map(height => {
                const isActive = percentage >= height;
                return \`<div class="signal-bar \${isActive ? 'active' : ''}" style="height: \${height / 25}px;"></div>\`;
            }).join('');
        }
        
        // Initial load
        loadPhoneInfo();
        
        // Update last updated timestamp
        updateLastUpdated();
        
        // Auto-refresh every 60 seconds
        setInterval(loadPhoneInfo, 60000);
        setInterval(updateLastUpdated, 1000);
        
        function updateLastUpdated() {
            const lastUpdatedElement = document.getElementById('lastUpdated');
            if (lastUpdatedElement) {
                lastUpdatedElement.textContent = new Date().toLocaleString();
            }
        }
    </script>
</body>
</html>`;
}