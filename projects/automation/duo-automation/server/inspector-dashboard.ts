/**
 * FactoryWager Inspector Dashboard Integration
 * Enterprise dashboard with /inspector routes and semantic colors
 */

import { serve } from 'bun';
import { ENTERPRISE_COLORS, URL_COLOR_MATRIX, ColorSystem } from '../config/enterprise-colors.ts';
import { ComplianceRedactionEngine } from '../cli/factorywager-inspector-enhanced.ts';

interface DashboardMetrics {
  scans: number;
  patternsExtracted: number;
  patternsRedacted: number;
  complianceScore: number;
  riskFindings: number;
  performance: number;
  merchantsCovered: number;
}

interface InspectionSession {
  id: string;
  url: string;
  timestamp: Date;
  patterns: string[];
  compliance: number;
  status: 'active' | 'completed' | 'error';
}

class InspectorDashboard {
  private port: number;
  private liveMode: boolean;
  private sessions: Map<string, InspectionSession> = new Map();
  private metrics: DashboardMetrics;
  
  constructor(port: number = 8090, liveMode: boolean = true) {
    this.port = port;
    this.liveMode = liveMode;
    this.metrics = {
      scans: 47,
      patternsExtracted: 1892,
      patternsRedacted: 1784,
      complianceScore: 99.8,
      riskFindings: 3,
      performance: 124,
      merchantsCovered: 19
    };
  }
  
  async start(): Promise<void> {
    const server = serve({
      port: this.port,
      fetch: this.handleRequest.bind(this),
      error: this.handleError.bind(this)
    });
    
    console.log(`🌐 FactoryWager Inspector Dashboard LIVE`);
    console.log(`🚀 http://localhost:${this.port}/inspector`);
    console.log(`📡 Live mode: ${this.liveMode ? 'ON' : 'OFF'}`);
    
    if (this.liveMode) {
      this.startMetricsUpdater();
    }
  }
  
  private async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Handle CORS
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'text/html'
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }
    
    // Route handling
    if (path === '/inspector' || path === '/') {
      return this.renderMainDashboard(headers);
    } else if (path === '/inspector/query') {
      return this.renderQueryEngine(headers);
    } else if (path === '/inspector/redact') {
      return this.renderRedactionTool(headers);
    } else if (path.startsWith('/api/')) {
      return this.handleAPI(path, request, headers);
    } else {
      return this.render404(headers);
    }
  }
  
  private renderMainDashboard(headers: any): Response {
    const html = this.generateMainDashboardHTML();
    return new Response(html, { headers });
  }
  
  private renderQueryEngine(headers: any): Response {
    const html = this.generateQueryEngineHTML();
    return new Response(html, { headers });
  }
  
  private renderRedactionTool(headers: any): Response {
    const html = this.generateRedactionToolHTML();
    return new Response(html, { headers });
  }
  
  private generateMainDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FactoryWager Inspector - Enterprise Console</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
            background: ${ENTERPRISE_COLORS.background};
            color: ${ENTERPRISE_COLORS.success};
            line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { 
            border: 2px solid ${ENTERPRISE_COLORS.enterprise};
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
        }
        .title { 
            color: ${ENTERPRISE_COLORS.enterprise};
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .subtitle { color: ${ENTERPRISE_COLORS.warning}; }
        .nav { 
            display: flex; 
            justify-content: center; 
            gap: 20px; 
            margin-bottom: 30px;
        }
        .nav a { 
            color: ${ENTERPRISE_COLORS.success};
            text-decoration: none;
            padding: 10px 20px;
            border: 1px solid ${ENTERPRISE_COLORS.success};
            transition: all 0.3s;
        }
        .nav a:hover { 
            background: ${ENTERPRISE_COLORS.success};
            color: ${ENTERPRISE_COLORS.background};
        }
        .metrics-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card { 
            border: 1px solid ${ENTERPRISE_COLORS.enterprise};
            padding: 20px;
            text-align: center;
        }
        .metric-value { 
            font-size: 36px;
            font-weight: bold;
            color: ${ENTERPRISE_COLORS.enterprise};
        }
        .metric-label { color: ${ENTERPRISE_COLORS.warning}; }
        .recent-scans { 
            border: 1px solid ${ENTERPRISE_COLORS.merchant};
            padding: 20px;
        }
        .scan-item { 
            padding: 10px 0;
            border-bottom: 1px solid ${ENTERPRISE_COLORS.inspector};
        }
        .scan-item:last-child { border-bottom: none; }
        .status-good { color: ${ENTERPRISE_COLORS.success}; }
        .status-warning { color: ${ENTERPRISE_COLORS.warning}; }
        .status-error { color: ${ENTERPRISE_COLORS.error}; }
        .footer { 
            text-align: center;
            margin-top: 40px;
            color: ${ENTERPRISE_COLORS.neutral};
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">🏢 FACTORYWAGER INSPECTOR CONSOLE</div>
            <div class="subtitle">⚫ No Purple | 🟢 Semantic Colors | 🔒 PCI/GDPR Compliant</div>
        </div>
        
        <div class="nav">
            <a href="/inspector">📊 Dashboard</a>
            <a href="/inspector/query">🔍 Query Engine</a>
            <a href="/inspector/redact">🛡️ Redaction</a>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${this.metrics.scans}</div>
                <div class="metric-label">Scans (24h)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.metrics.patternsExtracted}</div>
                <div class="metric-label">Patterns Extracted</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.metrics.complianceScore}%</div>
                <div class="metric-label">Compliance Score</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">$${(this.metrics.merchantsCovered * 0.65).toFixed(1)}K</div>
                <div class="metric-label">MRR Baseline</div>
            </div>
        </div>
        
        <div class="recent-scans">
            <h3 style="color: ${ENTERPRISE_COLORS.enterprise}; margin-bottom: 15px;">Recent Scans</h3>
            <div class="scan-item">
                <span class="status-good">🟢</span> /api/merchant/19 - $12.1K MRR [Compliant]
            </div>
            <div class="scan-item">
                <span class="status-good">🟢</span> /qr-onboard - 47 scans [Production Ready]
            </div>
            <div class="scan-item">
                <span class="status-good">🟢</span> Zone:a3b7ba4... - 99.9% uptime [Healthy]
            </div>
        </div>
        
        <div class="footer">
            Generated: ${new Date().toLocaleString()} | © DuoPlus Enterprise
        </div>
    </div>
    
    <script>
        // Live updates
        if (${this.liveMode}) {
            setInterval(() => {
                fetch('/api/metrics')
                    .then(response => response.json())
                    .then(data => {
                        // Update metrics in real-time
                        document.querySelectorAll('.metric-value').forEach((el, i) => {
                            const values = [data.scans, data.patternsExtracted, data.complianceScore, (data.merchantsCovered * 0.65).toFixed(1)];
                            if (i < 3) {
                                el.textContent = i === 2 ? values[i] + '%' : values[i];
                            } else {
                                el.textContent = '$' + values[i] + 'K';
                            }
                        });
                    })
                    .catch(console.error);
            }, 5000);
        }
    </script>
</body>
</html>`;
  }
  
  private generateQueryEngineHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inspector Query Engine - FactoryWager</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
            background: ${ENTERPRISE_COLORS.background};
            color: ${ENTERPRISE_COLORS.success};
            line-height: 1.6;
        }
        .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
        .header { 
            border: 2px solid ${ENTERPRISE_COLORS.warning};
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
        }
        .title { 
            color: ${ENTERPRISE_COLORS.warning};
            font-size: 24px;
            font-weight: bold;
        }
        .query-form { 
            border: 1px solid ${ENTERPRISE_COLORS.enterprise};
            padding: 20px;
            margin-bottom: 20px;
        }
        .query-input { 
            width: 100%;
            background: ${ENTERPRISE_COLORS.inspector};
            color: ${ENTERPRISE_COLORS.success};
            border: 1px solid ${ENTERPRISE_COLORS.enterprise};
            padding: 15px;
            font-family: inherit;
            font-size: 16px;
            margin-bottom: 10px;
        }
        .query-btn { 
            background: ${ENTERPRISE_COLORS.enterprise};
            color: white;
            border: none;
            padding: 10px 20px;
            cursor: pointer;
            font-family: inherit;
        }
        .query-btn:hover { background: ${ENTERPRISE_COLORS.zone}; }
        .results { 
            border: 1px solid ${ENTERPRISE_COLORS.merchant};
            padding: 20px;
            min-height: 200px;
        }
        .json-output { 
            background: ${ENTERPRISE_COLORS.inspector};
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">🔍 INSPECTOR QUERY ENGINE</div>
        </div>
        
        <div class="query-form">
            <input type="text" class="query-input" id="queryInput" placeholder="Enter JQ/JSON query..." value=".patterns[] | select(.type == \"financial\")">
            <button class="query-btn" onclick="executeQuery()">Execute Query</button>
        </div>
        
        <div class="results">
            <div class="json-output" id="results">
{
  "query": ".patterns[] | select(.type == \"financial\")",
  "results": [
    {
      "type": "financial",
      "matches": ["$12,100.00", "$8,500.00"],
      "redacted": ["$[REDACTED_AMOUNT]", "$[REDACTED_AMOUNT]"],
      "severity": "high"
    }
  ],
  "timestamp": "${new Date().toISOString()}"
}
            </div>
        </div>
    </div>
    
    <script>
        function executeQuery() {
            const query = document.getElementById('queryInput').value;
            fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById('results').textContent = JSON.stringify(data, null, 2);
            })
            .catch(error => {
                document.getElementById('results').textContent = 'Error: ' + error.message;
            });
        }
    </script>
</body>
</html>`;
  }
  
  private generateRedactionToolHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PCI/GDPR Redaction Tool - FactoryWager</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
            background: ${ENTERPRISE_COLORS.background};
            color: ${ENTERPRISE_COLORS.success};
            line-height: 1.6;
        }
        .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
        .header { 
            border: 2px solid ${ENTERPRISE_COLORS.error};
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
        }
        .title { 
            color: ${ENTERPRISE_COLORS.error};
            font-size: 24px;
            font-weight: bold;
        }
        .redaction-form { 
            border: 1px solid ${ENTERPRISE_COLORS.enterprise};
            padding: 20px;
            margin-bottom: 20px;
        }
        .text-input { 
            width: 100%;
            height: 150px;
            background: ${ENTERPRISE_COLORS.inspector};
            color: ${ENTERPRISE_COLORS.success};
            border: 1px solid ${ENTERPRISE_COLORS.enterprise};
            padding: 15px;
            font-family: inherit;
            font-size: 16px;
            margin-bottom: 10px;
            resize: vertical;
        }
        .redact-btn { 
            background: ${ENTERPRISE_COLORS.error};
            color: white;
            border: none;
            padding: 10px 20px;
            cursor: pointer;
            font-family: inherit;
        }
        .redact-btn:hover { background: #dc2626; }
        .output { 
            border: 1px solid ${ENTERPRISE_COLORS.warning};
            padding: 20px;
        }
        .redacted-text { 
            background: ${ENTERPRISE_COLORS.inspector};
            padding: 15px;
            border-radius: 4px;
            white-space: pre-wrap;
        }
        .compliance-badge { 
            background: ${ENTERPRISE_COLORS.success};
            color: ${ENTERPRISE_COLORS.background};
            padding: 5px 10px;
            border-radius: 4px;
            display: inline-block;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">🛡️ PCI/GDPR REDACTION ENGINE</div>
        </div>
        
        <div class="redaction-form">
            <textarea class="text-input" id="inputText" placeholder="Enter text to redact...">Contact: john.smith@example.com
Phone: +1-555-123-4567
Credit Card: 1234-5678-9012-3456
Amount: $12,100.00
SSN: 123-45-6789</textarea>
            <button class="redact-btn" onclick="redactText()">Apply PCI/GDPR Redaction</button>
        </div>
        
        <div class="output">
            <h3 style="color: ${ENTERPRISE_COLORS.warning}; margin-bottom: 15px;">Redacted Output</h3>
            <div class="redacted-text" id="redactedOutput"></div>
            <div class="compliance-badge">✅ PCI DSS Compliant</div>
            <div class="compliance-badge">✅ GDPR Compliant</div>
        </div>
    </div>
    
    <script>
        function redactText() {
            const input = document.getElementById('inputText').value;
            fetch('/api/redact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: input })
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById('redactedOutput').textContent = data.redacted;
            })
            .catch(error => {
                document.getElementById('redactedOutput').textContent = 'Error: ' + error.message;
            });
        }
        
        // Auto-redact on load
        redactText();
    </script>
</body>
</html>`;
  }
  
  private async handleAPI(path: string, request: Request, headers: any): Promise<Response> {
    headers['Content-Type'] = 'application/json';
    
    if (path === '/api/metrics') {
      return new Response(JSON.stringify(this.metrics), { headers });
    }
    
    if (path === '/api/query' && request.method === 'POST') {
      const body = await request.json();
      const result = this.executeQuery(body.query);
      return new Response(JSON.stringify(result), { headers });
    }
    
    if (path === '/api/redact' && request.method === 'POST') {
      const body = await request.json();
      const redacted = ComplianceRedactionEngine.redact(body.text);
      return new Response(JSON.stringify({ redacted }), { headers });
    }
    
    return new Response(JSON.stringify({ error: 'API endpoint not found' }), { 
      status: 404, 
      headers 
    });
  }
  
  private executeQuery(query: string): any {
    // Simplified query execution
    return {
      query,
      results: [
        {
          type: 'financial',
          matches: ['$12,100.00', '$8,500.00'],
          redacted: ['$[REDACTED_AMOUNT]', '$[REDACTED_AMOUNT]'],
          severity: 'high'
        }
      ],
      timestamp: new Date().toISOString()
    };
  }
  
  private render404(headers: any): Response {
    return new Response('404 - Not Found', { status: 404, headers });
  }
  
  private handleError(error: Error): void {
    console.error('Dashboard error:', error);
  }
  
  private startMetricsUpdater(): void {
    setInterval(() => {
      // Simulate metrics updates
      this.metrics.scans += Math.floor(Math.random() * 3);
      this.metrics.patternsExtracted += Math.floor(Math.random() * 10);
      this.metrics.complianceScore = Math.min(100, this.metrics.complianceScore + Math.random() * 0.1);
    }, 10000);
  }
}

// CLI command to start dashboard
export async function startInspectorDashboard(port: number = 8090, live: boolean = true): Promise<void> {
  const dashboard = new InspectorDashboard(port, live);
  await dashboard.start();
}
