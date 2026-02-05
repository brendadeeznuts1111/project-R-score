// dev-hq/spawn-server.ts - Enhanced Automation as a Service
/// <reference types="bun" />
import { AutomationActions, AutomationService } from "../core/automation.js";

/// <reference path="../scripts/types.d.ts" />

interface ServerConfiguration {
  port: number;
  hostname: string;
  maxConnections: number;
  timeout: number;
  enableAuth: boolean;
  enableMetrics: boolean;
  enableWebSocket: boolean;
}

interface AuthenticationToken {
  token: string;
  expires: number;
  permissions: string[];
}

interface ExecutionRequest {
  command: string[];
  workingDirectory?: string;
  environment?: Record<string, string>;
  stream?: boolean;
  timeout?: number;
  auth?: string;
}

interface ServerMetrics {
  startTime: number;
  requestsServed: number;
  activeConnections: number;
  totalCommands: number;
  failedCommands: number;
  averageResponseTime: number;
}

class AutomationServer {
  private automation: AutomationService;
  private server: any;
  private config: ServerConfiguration;
  private metrics: ServerMetrics;
  private authTokens: Map<string, AuthenticationToken> = new Map();
  private activeConnections: Set<any> = new Set();
  private commandHistory: Array<{
    timestamp: number;
    command: string[];
    success: boolean;
    duration: number;
  }> = [];

  constructor(configuration: Partial<ServerConfiguration> = {}) {
    this.automation = new AutomationService();
    this.config = {
      port: 0,
      hostname: "0.0.0.0",
      maxConnections: 100,
      timeout: 30000,
      enableAuth: true,
      enableMetrics: true,
      enableWebSocket: true,
      ...configuration
    };

    this.metrics = {
      startTime: Date.now(),
      requestsServed: 0,
      activeConnections: 0,
      totalCommands: 0,
      failedCommands: 0,
      averageResponseTime: 0
    };

    this.initializeAuth();
  }

  private initializeAuth(): void {
    if (this.config.enableAuth) {
      // Generate a secure token for development
      const devToken = this.generateAuthToken('dev', ['read', 'write', 'execute']);
      console.log(`🔐 Development Auth Token: ${devToken.token}`);
      console.log(`🔑 Token expires: ${new Date(devToken.expires).toISOString()}`);
    }
  }

  private generateAuthToken(role: string, permissions: string[]): AuthenticationToken {
    const token = Buffer.from(`${role}:${Date.now()}:${Math.random()}`).toString('base64');
    const authToken: AuthenticationToken = {
      token,
      expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      permissions
    };
    this.authTokens.set(token, authToken);
    return authToken;
  }

  private validateAuth(authHeader?: string): boolean {
    if (!this.config.enableAuth) return true;
    if (!authHeader) return false;

    const authToken: AuthenticationToken | undefined = this.authTokens.get(authHeader);
    if (!authToken || authToken.expires < Date.now()) {
      return false;
    }

    return true;
  }

  private updateMetrics(responseTime: number, success: boolean): void {
    this.metrics.requestsServed++;
    this.metrics.totalCommands++;

    if (!success) {
      this.metrics.failedCommands++;
    }

    // Update average response time
    const total = this.metrics.averageResponseTime * (this.metrics.requestsServed - 1) + responseTime;
    this.metrics.averageResponseTime = total / this.metrics.requestsServed;
  }

  private logCommand(command: string[], success: boolean, duration: number): void {
    this.commandHistory.push({
      timestamp: Date.now(),
      command,
      success,
      duration
    });

    // Keep only last 100 commands
    if (this.commandHistory.length > 100) {
      this.commandHistory.shift();
    }
  }

  private async handleCommandRequest(req: Request): Promise<Response> {
    const startTime = Date.now();

    try {
      const body: ExecutionRequest = await req.json();

      // Validate authentication
      if (!this.validateAuth(body.auth)) {
        return new Response('Unauthorized', { status: 401 });
      }

      // Validate command
      if (!body.command || !Array.isArray(body.command) || body.command.length === 0) {
        return new Response('Invalid command', { status: 400 });
      }

      // Security check - prevent dangerous commands
      const dangerousCommands = ['rm -rf', 'sudo rm', 'format', 'del /f'];
      const commandString = body.command.join(' ');
      if (dangerousCommands.some(dangerous => commandString.includes(dangerous))) {
        return new Response('Dangerous command detected', { status: 403 });
      }

      const result = await this.automation.executeCommand("user-command", body.command, {
        workingDirectory: body.workingDirectory,
        environment: body.environment,
        stream: body.stream,
        timeout: body.timeout
      });

      if (body.stream && "stdout" in result) {
        // Stream output in real-time with enhanced error handling
        return new Response(
          new ReadableStream({
            async start(controller) {
              const reader = (result as any).stdout.getReader();
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  controller.enqueue(value);
                }
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                controller.enqueue(Buffer.from(`Error: ${errorMessage}\n`));
              } finally {
                reader.releaseLock();
                controller.close();
              }
            },
          }),
          {
            headers: {
              "Content-Type": "text/plain",
              "X-Command-ID": Buffer.from(Date.now().toString()).toString('base64')
            }
          }
        );
      }

      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime, true);
      this.logCommand(body.command, true, responseTime);

      return Response.json({
        ...result,
        metrics: {
          executionTime: responseTime,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime, false);

      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logCommand([], false, responseTime);

      return new Response(errorMessage, { status: 500 });
    }
  }

  private async handleWebSocketUpgrade(req: Request): Promise<Response> {
    if (!this.config.enableWebSocket) {
      return new Response('WebSocket not enabled', { status: 426 });
    }

    // Enhanced WebSocket implementation would go here
    return new Response('WebSocket upgrade', { status: 101 });
  }

  private getHealthStatus(): Response {
    const uptime = Date.now() - this.metrics.startTime;
    const memoryUsage = process.memoryUsage();

    return Response.json({
      status: 'healthy',
      uptime,
      metrics: this.metrics,
      memory: {
        rss: memoryUsage.rss,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external
      },
      connections: {
        active: this.activeConnections.size,
        max: this.config.maxConnections
      },
      config: {
        auth: this.config.enableAuth,
        metrics: this.config.enableMetrics,
        websocket: this.config.enableWebSocket
      }
    });
  }

  private getCommandHistory(): Response {
    // Return recent command history
    return Response.json({
      history: this.commandHistory.slice(-20), // Last 20 commands
      total: this.commandHistory.length
    });
  }

  public start(): void {
    const self = this; // Preserve context for fetch function

    this.server = Bun.serve({
      port: this.config.port,
      hostname: this.config.hostname,
      maxRequestBodySize: 10 * 1024 * 1024, // 10MB
      development: process.env.NODE_ENV !== 'production',

      async fetch(req, server) {
        const startTime = Date.now();
        const url = new URL(req.url);

        // Track active connections
        self.activeConnections.add(req);
        self.metrics.activeConnections = self.activeConnections.size;

        try {
          // CORS headers for development
          const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
          };

          // Handle CORS preflight
          if (req.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
          }

          // 🏃‍♂️ Execute commands via API
          if (url.pathname === "/run" && req.method === 'POST') {
            const body: ExecutionRequest = await req.json() as ExecutionRequest;
            const response = await self.handleCommandRequest(req);
            return new Response(response.body, {
              status: response.status,
              headers: { ...response.headers, ...corsHeaders }
            });
          }

          // 📊 Pre-built insights
          if (url.pathname === "/git-insights") {
            const insights = await AutomationActions.getGitInsights();
            return Response.json(insights, { headers: corsHeaders });
          }

          if (url.pathname === "/cloc") {
            const analysis = await AutomationActions.analyzeCodeWithCLOC();
            return Response.json(analysis, { headers: corsHeaders });
          }

          // 📈 Enhanced resource monitoring
          if (url.pathname === "/resources") {
            const resources = await self.automation.getResourceStatistics();
            return Response.json(resources, { headers: corsHeaders });
          }

          // 🏥 Health check endpoint
          if (url.pathname === "/health") {
            return self.getHealthStatus();
          }

          // 📜 Command history
          if (url.pathname === "/history") {
            return self.getCommandHistory();
          }

          // 🔐 Authentication endpoint
          if (url.pathname === "/auth" && req.method === 'POST') {
            const { role = 'dev' } = await req.json();
            const token = self.generateAuthToken(role, ['read', 'write', 'execute']);
            return Response.json({
              token: token.token,
              expires: token.expires,
              permissions: token.permissions
            }, { headers: corsHeaders });
          }

          // 📈 Metrics endpoint
          if (url.pathname === "/metrics") {
            return Response.json(self.metrics, { headers: corsHeaders });
          }

          // 🎮 Enhanced interactive terminal dashboard
          return new Response(self.generateEnhancedDashboard(server.port || 0), {
            headers: {
              "Content-Type": "text/html",
              ...corsHeaders
            },
          });

        } finally {
          // Clean up connection tracking
          self.activeConnections.delete(req);
          self.metrics.activeConnections = self.activeConnections.size;

          const responseTime = Date.now() - startTime;
          if (self.config.enableMetrics) {
            console.log(`📊 Request: ${req.method} ${url.pathname} - ${responseTime}ms`);
          }
        }
      },

      error(error) {
        console.error('🚨 Server error:', error);
        return new Response('Internal Server Error', { status: 500 });
      },
    });

    console.log(`🤖 Enhanced Dev HQ Automation Server: http://localhost:${this.server.port}`);
    console.log(`🎮 Terminal Dashboard: http://localhost:${this.server.port}`);
    console.log(`📊 Enhanced API Endpoints:`);
    console.log(`   POST /run - Execute commands (with auth)`);
    console.log(`   POST /auth - Get authentication token`);
    console.log(`   GET /git-insights - Git analysis`);
    console.log(`   GET /cloc - Code analysis`);
    console.log(`   GET /resources - Resource monitoring`);
    console.log(`   GET /health - Server health status`);
    console.log(`   GET /history - Command history`);
    console.log(`   GET /metrics - Server metrics`);
    console.log(`🔐 Authentication: ${this.config.enableAuth ? 'Enabled' : 'Disabled'}`);
    console.log(`📈 Metrics: ${this.config.enableMetrics ? 'Enabled' : 'Disabled'}`);
    console.log(`🌐 WebSocket: ${this.config.enableWebSocket ? 'Enabled' : 'Disabled'}`);
  }

  private generateEnhancedDashboard(port: number): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>🤖 Enhanced Dev HQ Automation Terminal</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
            color: #00ff00; margin: 0; padding: 20px; min-height: 100vh;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header {
            text-align: center; margin-bottom: 30px;
            background: rgba(26, 26, 46, 0.8); padding: 20px; border-radius: 12px;
            border: 1px solid #00ff00; box-shadow: 0 4px 20px rgba(0, 255, 0, 0.1);
        }
        .terminal {
            background: #1a1a1a; border: 2px solid #00ff00; border-radius: 8px;
            padding: 20px; height: 400px; overflow-y: auto; margin-bottom: 20px;
            white-space: pre-wrap; font-size: 14px; line-height: 1.4;
            box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.5);
        }
        .controls {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px; margin-bottom: 20px;
        }
        .control-group {
            background: rgba(26, 26, 46, 0.9); padding: 20px; border-radius: 12px;
            border: 1px solid #333; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        .control-group h3 {
            margin-top: 0; color: #00ff00;
            display: flex; align-items: center; gap: 8px;
        }
        input, button, select, textarea {
            background: rgba(42, 42, 42, 0.8); color: #00ff00; border: 1px solid #00ff00;
            padding: 10px 12px; border-radius: 6px; font-family: monospace;
            width: 100%; margin-bottom: 10px; transition: all 0.3s ease;
        }
        input:focus, button:focus, select:focus, textarea:focus {
            outline: none; box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
            border-color: #00ff88;
        }
        button {
            cursor: pointer; transition: all 0.3s ease; font-weight: bold;
            background: linear-gradient(135deg, #2a2a2a 0%, #3a3a3a 100%);
        }
        button:hover {
            background: linear-gradient(135deg, #00ff00 0%, #00cc00 100%);
            color: #1a1a1a; transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0, 255, 0, 0.3);
        }
        button:active { transform: translateY(0); }
        .output {
            margin-top: 10px; padding: 12px; background: rgba(42, 42, 42, 0.6);
            border-radius: 6px; max-height: 200px; overflow-y: auto;
            border: 1px solid #333;
        }
        .status {
            padding: 15px; background: rgba(26, 26, 46, 0.9); border-radius: 8px;
            margin-bottom: 20px; border: 1px solid #333;
            display: flex; justify-content: space-between; align-items: center;
        }
        .success { color: #00ff00; }
        .error { color: #ff4444; }
        .warning { color: #ffaa00; }
        .info { color: #00aaff; }
        .prompt::after { content: '▋'; animation: blink 1s infinite; }
        @keyframes blink { 50% { opacity: 0; } }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px; margin: 10px 0;
        }
        .metric {
            background: rgba(42, 42, 42, 0.6); padding: 10px; border-radius: 6px;
            text-align: center; border: 1px solid #333;
        }
        .metric-value { font-size: 1.2em; font-weight: bold; color: #00ff88; }
        .metric-label { font-size: 0.8em; color: #888; }
        .auth-status {
            padding: 8px 12px; border-radius: 6px; font-size: 0.9em;
            background: rgba(0, 255, 0, 0.1); border: 1px solid #00ff00;
        }
        .loading {
            display: inline-block; width: 20px; height: 20px;
            border: 2px solid #333; border-top: 2px solid #00ff00;
            border-radius: 50%; animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Enhanced Dev HQ Automation Terminal</h1>
            <p>Port: ${port} | Powered by Bun.serve with Advanced Features</p>
            <div class="auth-status" id="auth-status">🔐 Authentication Required</div>
        </div>

        <div class="status" id="status">
            <span class="success">✅ Enhanced Server Ready</span>
            <div class="metrics" id="server-metrics">
                <div class="metric">
                    <div class="metric-value" id="uptime">0s</div>
                    <div class="metric-label">Uptime</div>
                </div>
                <div class="metric">
                    <div class="metric-value" id="requests">0</div>
                    <div class="metric-label">Requests</div>
                </div>
                <div class="metric">
                    <div class="metric-value" id="commands">0</div>
                    <div class="metric-label">Commands</div>
                </div>
            </div>
        </div>

        <div class="controls">
            <div class="control-group">
                <h3>🔐 Authentication</h3>
                <input type="text" id="auth-token" placeholder="Enter auth token or click 'Get Token'" />
                <button onclick="getAuthToken()">Get Dev Token</button>
                <button onclick="setAuthToken()">Set Token</button>
                <div id="auth-output" class="output"></div>
            </div>

            <div class="control-group">
                <h3>🏃‍♂️ Enhanced Command Runner</h3>
                <input type="text" id="command" placeholder="Enter command (e.g., ls -la)" />
                <input type="text" id="cwd" placeholder="Working directory (optional)" />
                <button onclick="runCommand()">Run Command</button>
                <div id="command-output" class="output"></div>
            </div>

            <div class="control-group">
                <h3>📊 Quick Actions</h3>
                <button onclick="getGitInsights()">🔍 Git Insights</button>
                <button onclick="getCLOC()">📈 Code Analysis</button>
                <button onclick="getResources()">💻 Resource Usage</button>
                <button onclick="getHealth()">🏥 Health Check</button>
                <button onclick="getHistory()">📜 Command History</button>
                <div id="action-output" class="output"></div>
            </div>

            <div class="control-group">
                <h3>🧪 Testing & Build</h3>
                <button onclick="runTests()">🧪 Run Tests</button>
                <button onclick="buildProject()">🔨 Build Project</button>
                <button onclick="lintCode()">✨ Lint Code</button>
                <button onclick="typeCheck()">🔍 Type Check</button>
                <div id="test-output" class="output"></div>
            </div>
        </div>

        <div class="terminal" id="terminal">
            <div class="prompt">$ Welcome to Enhanced Dev HQ Automation Terminal</div>
            <div>🚀 Features: Authentication, Metrics, History, Enhanced Security</div>
            <div>🔐 Please authenticate to execute commands</div>
            <div>💡 All commands run via Bun.serve with real-time streaming</div>
        </div>
    </div>

    <script>
        let authToken = localStorage.getItem('devhq-auth-token') || '';
        let serverMetrics = { uptime: 0, requestsServed: 0, totalCommands: 0 };

        const terminal = document.getElementById('terminal');
        const status = document.getElementById('status');

        function log(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            const className = type === 'error' ? 'error' :
                           type === 'warning' ? 'warning' :
                           type === 'success' ? 'success' : 'info';
            terminal.innerHTML += \`<div class="\${className}">[\${timestamp}] \${message}</div>\`;
            terminal.scrollTop = terminal.scrollHeight;
        }

        function updateStatus(message, type = 'success', showLoading = false) {
            const loadingHtml = showLoading ? '<span class="loading"></span> ' : '';
            status.innerHTML = \`<span class="\${type}">\${loadingHtml}\${message}</span>\`;
        }

        function updateAuthStatus(authenticated) {
            const authStatus = document.getElementById('auth-status');
            if (authenticated) {
                authStatus.innerHTML = '🔓 Authenticated';
                authStatus.style.background = 'rgba(0, 255, 0, 0.2)';
            } else {
                authStatus.innerHTML = '🔐 Authentication Required';
                authStatus.style.background = 'rgba(255, 68, 68, 0.2)';
            }
        }

        function updateMetrics() {
            document.getElementById('uptime').textContent = formatDuration(serverMetrics.uptime);
            document.getElementById('requests').textContent = serverMetrics.requestsServed;
            document.getElementById('commands').textContent = serverMetrics.totalCommands;
        }

        function formatDuration(ms) {
            if (ms < 1000) return \`\${ms}ms\`;
            if (ms < 60000) return \`\${Math.floor(ms / 1000)}s\`;
            return \`\${Math.floor(ms / 60000)}m \${Math.floor((ms % 60000) / 1000)}s\`;
        }

        async function makeRequest(url, options = {}) {
            const headers = {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': \`Bearer \${authToken}\` }),
                ...options.headers
            };

            const response = await fetch(url, { ...options, headers });

            if (response.status === 401) {
                authToken = '';
                localStorage.removeItem('devhq-auth-token');
                updateAuthStatus(false);
                throw new Error('Authentication required');
            }

            return response;
        }

        async function getAuthToken() {
            try {
                updateStatus('🔐 Getting authentication token...', 'info', true);
                const response = await makeRequest('/auth', { method: 'POST' });
                const auth = await response.json();

                authToken = auth.token;
                localStorage.setItem('devhq-auth-token', authToken);

                document.getElementById('auth-token').value = authToken;
                updateAuthStatus(true);
                log(\`🔐 Auth token obtained (expires: \${new Date(auth.expires).toLocaleString()})\`, 'success');
                updateStatus('✅ Authentication successful');
            } catch (error) {
                log(\`❌ Failed to get auth token: \${error.message}\`, 'error');
                updateStatus('❌ Authentication failed', 'error');
            }
        }

        function setAuthToken() {
            const tokenInput = document.getElementById('auth-token').value.trim();
            if (tokenInput) {
                authToken = tokenInput;
                localStorage.setItem('devhq-auth-token', authToken);
                updateAuthStatus(true);
                log('🔐 Authentication token set', 'success');
            }
        }

        async function runCommand() {
            const commandInput = document.getElementById('command').value;
            const cwdInput = document.getElementById('cwd').value;

            if (!commandInput) {
                log('⚠️ Please enter a command', 'warning');
                return;
            }

            if (!authToken) {
                log('🔐 Please authenticate first', 'warning');
                return;
            }

            const cmd = commandInput.split(' ');
            log(\`▶️ Running: \${commandInput}\`);
            updateStatus('🏃‍♂️ Executing command...', 'info', true);

            try {
                const response = await makeRequest('/run', {
                    method: 'POST',
                    body: JSON.stringify({
                        cmd,
                        cwd: cwdInput || undefined,
                        stream: true,
                        auth: authToken
                    })
                });

                if (response.ok) {
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let output = '';

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const text = decoder.decode(value);
                        output += text;
                        log(text.trim(), 'info');
                    }

                    log('✅ Command completed', 'success');
                    updateStatus('✅ Command executed successfully');
                    await refreshMetrics();
                } else {
                    const errorText = await response.text();
                    log(\`❌ Command failed: \${errorText}\`, 'error');
                    updateStatus('❌ Command failed', 'error');
                }
            } catch (error) {
                log(\`❌ Error: \${error.message}\`, 'error');
                updateStatus('❌ Network error', 'error');
            }

            document.getElementById('command').value = '';
        }

        async function getGitInsights() {
            await performAction('📊 Fetching Git insights...', '/git-insights', 'Git analysis complete');
        }

        async function getCLOC() {
            await performAction('🔍 Analyzing code with CLOC...', '/cloc', 'Code analysis complete');
        }

        async function getResources() {
            await performAction('📈 Checking resource usage...', '/resources', 'Resource monitoring complete');
        }

        async function getHealth() {
            await performAction('🏥 Checking server health...', '/health', 'Health check complete');
        }

        async function getHistory() {
            try {
                updateStatus('📜 Loading command history...', 'info', true);
                const response = await makeRequest('/history');
                const history = await response.json();

                log('📜 Recent Command History:', 'success');
                history.history.slice(-10).reverse().forEach(entry => {
                    const status = entry.success ? '✅' : '❌';
                    const duration = entry.duration ? \`(\${entry.duration}ms)\` : '';
                    log(\`  \${status} \${new Date(entry.timestamp).toLocaleTimeString()}: \${entry.command.join(' ')} \${duration}\`);
                });

                updateStatus('✅ History loaded');
            } catch (error) {
                log(\`❌ Failed to load history: \${error.message}\`, 'error');
                updateStatus('❌ History load failed', 'error');
            }
        }

        async function runTests() {
            await executeCommand(['bun', 'test', '--coverage'], '🧪 Running tests...');
        }

        async function buildProject() {
            await executeCommand(['bun', 'run', 'build'], '🔨 Building project...');
        }

        async function lintCode() {
            await executeCommand(['bun', 'run', 'lint'], '✨ Linting code...');
        }

        async function typeCheck() {
            await executeCommand(['bun', 'run', 'type-check'], '🔍 Type checking...');
        }

        async function performAction(loadingMessage, endpoint, successMessage) {
            updateStatus(loadingMessage, 'info', true);

            try {
                const response = await makeRequest(endpoint);
                const data = await response.json();

                log(\`📊 Results:\`, 'success');
                Object.entries(data).forEach(([key, value]) => {
                    if (value && typeof value !== 'object') {
                        log(\`  \${key}: \${value}\`);
                    } else if (value && typeof value === 'object') {
                        log(\`  \${key}: \${JSON.stringify(value, null, 2)}\`);
                    }
                });

                updateStatus(\`✅ \${successMessage}\`);
            } catch (error) {
                log(\`❌ Action failed: \${error.message}\`, 'error');
                updateStatus('❌ Action failed', 'error');
            }
        }

        async function executeCommand(cmd, loadingMessage) {
            if (!authToken) {
                log('🔐 Please authenticate first', 'warning');
                return;
            }

            log(loadingMessage);
            updateStatus(loadingMessage, 'info', true);

            try {
                const response = await makeRequest('/run', {
                    method: 'POST',
                    body: JSON.stringify({ cmd, stream: true, auth: authToken })
                });

                if (response.ok) {
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const text = decoder.decode(value);
                        log(text.trim());
                    }

                    updateStatus('✅ Command completed');
                    await refreshMetrics();
                }
            } catch (error) {
                log(\`❌ Command failed: \${error.message}\`, 'error');
                updateStatus('❌ Command failed', 'error');
            }
        }

        async function refreshMetrics() {
            try {
                const response = await makeRequest('/metrics');
                serverMetrics = await response.json();
                updateMetrics();
            } catch (error) {
                console.warn('Failed to refresh metrics:', error);
            }
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            // Check for existing auth token
            if (authToken) {
                document.getElementById('auth-token').value = authToken;
                updateAuthStatus(true);
            }

            // Set up event listeners
            document.getElementById('command').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') runCommand();
            });

            // Start metrics updates
            setInterval(refreshMetrics, 5000);
            refreshMetrics();

            log('🚀 Enhanced Dev HQ Automation Terminal initialized');
            log('🔐 Please authenticate to execute commands');
            log('💡 Features: Authentication, Metrics, History, Enhanced Security');
        });
    </script>
</body>
</html>`;
  }

  public stop(): void {
    if (this.server) {
      this.server.stop();
      console.log('🛑 Enhanced Dev HQ Server stopped');
    }
  }

  public getServerPort(): number {
    return this.server?.port || 0;
  }

  public getServerURL(): string {
    const port = this.getServerPort();
    return `http://localhost:${port}`;
  }
}

// Create and start the enhanced server
const server = new AutomationServer({
  enableAuth: process.env.NODE_ENV !== 'development',
  enableMetrics: true,
  enableWebSocket: true,
  maxConnections: 100,
  timeout: 30000
});

if (import.meta.main) {
  server.start();
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Enhanced Dev HQ Server...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Enhanced Dev HQ Server...');
  server.stop();
  process.exit(0);
});

export { EnhancedDevHQServer };
