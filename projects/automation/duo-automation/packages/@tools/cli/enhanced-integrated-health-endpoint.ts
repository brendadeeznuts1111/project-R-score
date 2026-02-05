#!/usr/bin/env bun
// Enhanced Health Endpoint with ColorfulTypeContext, WebSocket, and CSS Integration
// Integrates dynamic color updates, real-time tension monitoring, and CSS variable generation

import { Elysia } from 'elysia';
import { DesignSystem } from '../terminal/src/design-system';
import { UnicodeTableFormatter, EmpireProDashboard } from '../terminal/src/enhanced-unicode-formatter';
import { WebSocketServer } from 'ws';

// =============================================================================
// COLORFUL TYPE CONTEXT INTEGRATION
// =============================================================================

/**
 * Color information structure for dynamic theming
 */
interface ColorInfo {
  /** Primary color for the context */
  primary: string;
  /** Secondary color for accents */
  secondary: string;
  /** Background color */
  background: string;
  /** Text color */
  text: string;
  /** Border color */
  border: string;
  /** Gradient based on tension */
  tensionGradient: string;
  /** Shadow color */
  shadow: string;
  /** Current tension level (0-100) */
  tension: number;
  /** Color scheme (light/dark) */
  scheme: 'light' | 'dark';
}

/**
 * Colorful Type Context for dynamic color management
 */
class ColorfulTypeContext {
  private readonly contextType: string;
  private readonly scope: string;
  private readonly domain: string;
  private colorInfo: ColorInfo;
  private subscribers: Set<(update: { tension: number; colors: ColorInfo }) => void> = new Set();

  constructor(contextType: string, scope: string, domain: string) {
    this.contextType = contextType;
    this.scope = scope;
    this.domain = domain;
    this.colorInfo = this.generateColorInfo();
  }

  /**
   * Generate color information based on context, scope, and domain
   */
  private generateColorInfo(): ColorInfo {
    const scopeColors = {
      'ENTERPRISE': {
        primary: '#10b981',      // emerald-500
        secondary: '#3b82f6',    // emerald-600
        background: '#3b82f6',   // emerald-50
        text: '#3b82f6',         // emerald-900
        border: '#3b82f6',       // emerald-200
        shadow: '#3b82f6',       // emerald-800
        scheme: 'light' as const
      },
      'DEVELOPMENT': {
        primary: '#3b82f6',      // blue-500
        secondary: '#3b82f6',    // blue-600
        background: '#3b82f6',   // blue-50
        text: '#3b82f6',         // blue-900
        border: '#dbeafe',       // blue-200
        shadow: '#1e40af',       // blue-800
        scheme: 'light' as const
      },
      'LOCAL-SANDBOX': {
        primary: '#8b5cf6',      // violet-500
        secondary: '#3b82f6',    // violet-600
        background: '#3b82f6',   // violet-50
        text: '#3b82f6',         // violet-900
        border: '#3b82f6',       // violet-200
        shadow: '#3b82f6',       // violet-800
        scheme: 'light' as const
      }
    };

    const baseColors = scopeColors[this.scope as keyof typeof scopeColors] || scopeColors['LOCAL-SANDBOX'];
    const tension = this.calculateTension();

    return {
      ...baseColors,
      tensionGradient: this.generateTensionGradient(baseColors.primary, baseColors.secondary, tension),
      tension
    };
  }

  /**
   * Calculate tension based on system health and context
   */
  private calculateTension(): number {
    // Simulate tension calculation based on various factors
    const baseTension = Math.random() * 30 + 10; // 10-40 base tension
    const contextMultiplier = this.contextType === 'STORAGE' ? 1.2 : 1.0;
    const scopeMultiplier = this.scope === 'ENTERPRISE' ? 0.8 : 1.1;
    
    return Math.min(100, baseTension * contextMultiplier * scopeMultiplier);
  }

  /**
   * Generate tension gradient based on colors and tension level
   */
  private generateTensionGradient(primary: string, secondary: string, tension: number): string {
    const angle = 135 + (tension * 0.9); // 135-225 degrees based on tension
    const opacity = 0.6 + (tension * 0.004); // 0.6-1.0 opacity based on tension
    
    return `linear-gradient(${angle}deg, ${primary}${Math.round(opacity * 255).toString(16)}, ${secondary}${Math.round(opacity * 255).toString(16)})`;
  }

  /**
   * Get current color information
   */
  get colorInfo(): ColorInfo {
    return this.colorInfo;
  }

  /**
   * Update tension and notify subscribers
   */
  updateTension(newTension: number): void {
    this.colorInfo.tension = Math.max(0, Math.min(100, newTension));
    this.colorInfo.tensionGradient = this.generateTensionGradient(
      this.colorInfo.primary,
      this.colorInfo.secondary,
      this.colorInfo.tension
    );
    
    // Notify all subscribers
    const update = {
      tension: this.colorInfo.tension,
      colors: this.colorInfo
    };
    
    this.subscribers.forEach(callback => callback(update));
  }

  /**
   * Subscribe to color updates
   */
  subscribe(callback: (update: { tension: number; colors: ColorInfo }) => void): () => void {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Generate CSS variables for this context
   */
  generateCSSVariables(): string {
    const { colorInfo } = this;
    const className = `${this.contextType.toLowerCase()}-${this.scope.toLowerCase().replace('_', '-')}`;
    
    return `
.${className} {
  --color-primary: ${colorInfo.primary};
  --color-secondary: ${colorInfo.secondary};
  --color-background: ${colorInfo.background};
  --color-text: ${colorInfo.text};
  --color-border: ${colorInfo.border};
  --color-shadow: ${colorInfo.shadow};
  --tension-gradient: ${colorInfo.tensionGradient};
  --tension-level: ${colorInfo.tension};
  --color-scheme: ${colorInfo.scheme};
}`;
  }
}

// =============================================================================
// WEBSOCKET INTEGRATION FOR REAL-TIME UPDATES
// =============================================================================

/**
 * WebSocket server for real-time tension and color updates
 */
class TensionWebSocketServer {
  private wss: WebSocketServer;
  private colorfulContexts: Map<string, ColorfulTypeContext> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(port: number = 8766) {
    this.wss = new WebSocketServer({ port });
    this.setupWebSocketHandlers();
    this.startTensionUpdates();
    
    console.log(UnicodeTableFormatter.colorize(`🌐 WebSocket server started on ws://localhost:${port}`, DesignSystem.status.operational));
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws, request) => {
      console.log(UnicodeTableFormatter.colorize('🔗 New WebSocket connection established', DesignSystem.text.accent.blue));
      
      // Send initial context data
      this.sendInitialContext(ws);
      
      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error(UnicodeTableFormatter.colorize(`❌ WebSocket message error: ${error}`, DesignSystem.status.downtime));
        }
      });
      
      // Handle disconnection
      ws.on('close', () => {
        console.log(UnicodeTableFormatter.colorize('🔌 WebSocket connection closed', DesignSystem.text.secondary));
      });
    });
  }

  /**
   * Send initial context data to new connection
   */
  private sendInitialContext(ws: WebSocket): void {
    const contexts = Array.from(this.colorfulContexts.entries()).map(([key, context]) => ({
      key,
      tension: context.colorInfo.tension,
      colors: context.colorInfo
    }));
    
    ws.send(JSON.stringify({
      type: 'initial',
      contexts,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscription(ws, message.context);
        break;
      case 'updateTension':
        this.handleTensionUpdate(message.context, message.tension);
        break;
      case 'getContexts':
        this.sendContexts(ws);
        break;
      default:
        console.log(UnicodeTableFormatter.colorize(`❓ Unknown message type: ${message.type}`, DesignSystem.text.secondary));
    }
  }

  /**
   * Handle subscription to specific context
   */
  private handleSubscription(ws: WebSocket, contextKey: string): void {
    const context = this.colorfulContexts.get(contextKey);
    if (context) {
      const unsubscribe = context.subscribe((update) => {
        ws.send(JSON.stringify({
          type: 'update',
          context: contextKey,
          tension: update.tension,
          colors: update.colors,
          timestamp: new Date().toISOString()
        }));
      });
      
      // Store unsubscribe function for cleanup
      (ws as any).unsubscribe = (ws as any).unsubscribe || new Map();
      (ws as any).unsubscribe.set(contextKey, unsubscribe);
      
      ws.send(JSON.stringify({
        type: 'subscribed',
        context: contextKey,
        timestamp: new Date().toISOString()
      }));
    }
  }

  /**
   * Handle tension update
   */
  private handleTensionUpdate(contextKey: string, tension: number): void {
    const context = this.colorfulContexts.get(contextKey);
    if (context) {
      context.updateTension(tension);
    }
  }

  /**
   * Send all contexts to client
   */
  private sendContexts(ws: WebSocket): void {
    const contexts = Array.from(this.colorfulContexts.entries()).map(([key, context]) => ({
      key,
      tension: context.colorInfo.tension,
      colors: context.colorInfo
    }));
    
    ws.send(JSON.stringify({
      type: 'contexts',
      contexts,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Register a colorful context
   */
  registerContext(key: string, context: ColorfulTypeContext): void {
    this.colorfulContexts.set(key, context);
    
    // Notify all clients about new context
    this.broadcast({
      type: 'contextAdded',
      key,
      tension: context.colorInfo.tension,
      colors: context.colorInfo,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: any): void {
    const messageStr = JSON.stringify(message);
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  /**
   * Start periodic tension updates
   */
  private startTensionUpdates(): void {
    this.updateInterval = setInterval(() => {
      // Simulate tension changes
      this.colorfulContexts.forEach((context, key) => {
        const currentTension = context.colorInfo.tension;
        const change = (Math.random() - 0.5) * 10; // -5 to +5 change
        const newTension = Math.max(0, Math.min(100, currentTension + change));
        
        if (Math.abs(newTension - currentTension) > 1) {
          context.updateTension(newTension);
        }
      });
    }, 2000); // Update every 2 seconds
  }

  /**
   * Close the WebSocket server
   */
  close(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.wss.close();
  }
}

// =============================================================================
// CSS INTEGRATION AND VARIABLE GENERATION
// =============================================================================

/**
 * CSS variable generator for dynamic theming
 */
class CSSVariableGenerator {
  private contexts: Map<string, ColorfulTypeContext> = new Map();

  /**
   * Register a context for CSS generation
   */
  registerContext(key: string, context: ColorfulTypeContext): void {
    this.contexts.set(key, context);
    
    // Subscribe to updates for real-time CSS refresh
    context.subscribe((update) => {
      this.generateCSSFile();
    });
  }

  /**
   * Generate complete CSS file with all context variables
   */
  generateCSSFile(): string {
    let css = `
/* Dynamically generated CSS variables for ColorfulTypeContext */
/* Generated at: ${new Date().toISOString()} */

:root {
  --default-tension: 50;
  --transition-duration: 0.3s;
  --transition-easing: ease-in-out;
}

/* Base transitions for all color variables */
* {
  transition: 
    background-color var(--transition-duration) var(--transition-easing),
    color var(--transition-duration) var(--transition-easing),
    border-color var(--transition-duration) var(--transition-easing),
    box-shadow var(--transition-duration) var(--transition-easing);
}
`;

    // Add CSS for each context
    this.contexts.forEach((context, key) => {
      css += context.generateCSSVariables();
      css += this.generateUtilityClasses(context, key);
    });

    // Add utility classes
    css += this.generateGlobalUtilities();

    return css;
  }

  /**
   * Generate utility classes for a context
   */
  private generateUtilityClasses(context: ColorfulTypeContext, key: string): string {
    const className = `${key.toLowerCase().replace('_', '-')}`;
    const { colorInfo } = context;

    return `
/* Utility classes for ${className} */
.${className} {
  background-color: var(--color-background);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 6px var(--color-shadow);
}

.${className} .primary {
  color: var(--color-primary);
}

.${className} .secondary {
  color: var(--color-secondary);
}

.${className} .bg-primary {
  background-color: var(--color-primary);
}

.${className} .bg-secondary {
  background-color: var(--color-secondary);
}

.${className} .border-primary {
  border-color: var(--color-primary);
}

.${className} .border-secondary {
  border-color: var(--color-secondary);
}

.${className} .tension-gradient {
  background: var(--tension-gradient);
}

.${className} .tension-indicator {
  width: calc(var(--tension-level) * 1%);
  height: 4px;
  background: var(--color-primary);
  border-radius: 2px;
  transition: width var(--transition-duration) var(--transition-easing);
}
`;
  }

  /**
   * Generate global utility classes
   */
  private generateGlobalUtilities(): string {
    return `
/* Global utility classes */
.tension-low { --tension-level: 25; }
.tension-medium { --tension-level: 50; }
.tension-high { --tension-level: 75; }
.tension-critical { --tension-level: 90; }

.scheme-light {
  --color-scheme: light;
}

.scheme-dark {
  --color-scheme: dark;
}

/* Responsive design utilities */
@media (prefers-color-scheme: dark) {
  :root {
    --color-scheme: dark;
  }
}

/* Animation utilities */
@keyframes tension-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.tension-pulse {
  animation: tension-pulse 2s infinite;
}

/* Gradient animations */
@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.animated-gradient {
  background-size: 200% 200%;
  animation: gradient-shift 3s ease infinite;
}
`;
  }

  /**
   * Get CSS file content
   */
  getCSS(): string {
    return this.generateCSSFile();
  }
}

// =============================================================================
// ENHANCED HEALTH ENDPOINT WITH INTEGRATION
// =============================================================================

/**
 * Enhanced health endpoint with ColorfulTypeContext integration
 */
function createEnhancedHealthEndpoint(): Elysia {
  const wsServer = new TensionWebSocketServer();
  const cssGenerator = new CSSVariableGenerator();

  // Create colorful contexts for different scopes and types
  const contexts = new Map<string, ColorfulTypeContext>();
  
  // Storage contexts for different scopes
  const storageContexts = ['ENTERPRISE', 'DEVELOPMENT', 'LOCAL-SANDBOX'].map(scope => {
    const context = new ColorfulTypeContext('STORAGE', scope, 'duoplus');
    const key = `storage-${scope.toLowerCase()}`;
    contexts.set(key, context);
    wsServer.registerContext(key, context);
    cssGenerator.registerContext(key, context);
    return { key, context };
  });

  // API contexts
  const apiContexts = ['ENTERPRISE', 'DEVELOPMENT', 'LOCAL-SANDBOX'].map(scope => {
    const context = new ColorfulTypeContext('API', scope, 'duoplus');
    const key = `api-${scope.toLowerCase()}`;
    contexts.set(key, context);
    wsServer.registerContext(key, context);
    cssGenerator.registerContext(key, context);
    return { key, context };
  });

  return new Elysia()
    // CSS endpoint for dynamic stylesheets
    .get('/colors.css', () => {
      const css = cssGenerator.getCSS();
      return new Response(css, {
        headers: {
          'Content-Type': 'text/css',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*'
        }
      });
    })

    // Context information endpoint
    .get('/contexts', () => {
      const contextData = Array.from(contexts.entries()).map(([key, context]) => ({
        key,
        type: context['contextType'],
        scope: context['scope'],
        domain: context['domain'],
        tension: context.colorInfo.tension,
        colors: context.colorInfo
      }));
      
      return {
        contexts: contextData,
        timestamp: new Date().toISOString(),
        webSocketUrl: 'ws://localhost:8766/ws-inspect'
      };
    })

    // Update tension for a specific context
    .post('/contexts/:key/tension', async ({ params, body }) => {
      const context = contexts.get(params.key);
      if (!context) {
        return { error: 'Context not found', status: 404 };
      }

      const { tension } = body as { tension?: number };
      if (typeof tension !== 'number' || tension < 0 || tension > 100) {
        return { error: 'Invalid tension value (must be 0-100)', status: 400 };
      }

      context.updateTension(tension);
      
      return {
        success: true,
        key: params.key,
        tension: context.colorInfo.tension,
        colors: context.colorInfo,
        timestamp: new Date().toISOString()
      };
    })

    // Enhanced health endpoint with color context
    .get('/health', async () => {
      // Simulate health check with color context integration
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        contexts: Array.from(contexts.entries()).map(([key, context]) => ({
          key,
          tension: context.colorInfo.tension,
          status: context.colorInfo.tension > 80 ? 'critical' : 
                  context.colorInfo.tension > 60 ? 'warning' : 'healthy',
          colors: context.colorInfo
        })),
        webSocket: {
          url: 'ws://localhost:8766/ws-inspect',
          status: 'connected',
          clients: wsServer['wss'].clients.size
        },
        css: {
          url: '/colors.css',
          lastGenerated: new Date().toISOString()
        }
      };

      return healthData;
    })

    // WebSocket connection info
    .get('/ws-info', () => {
      return {
        websocket: {
          url: 'ws://localhost:8766/ws-inspect',
          protocols: ['json'],
          status: 'active',
          connectedClients: wsServer['wss'].clients.size
        },
        usage: {
          subscribe: {
            method: 'SEND',
            message: '{"type": "subscribe", "context": "storage-enterprise"}'
          },
          updateTension: {
            method: 'SEND',
            message: '{"type": "updateTension", "context": "storage-enterprise", "tension": 75}'
          },
          getContexts: {
            method: 'SEND',
            message: '{"type": "getContexts"}'
          }
        }
      };
    })

    // Demo page with integration
    .get('/', () => {
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ColorfulTypeContext Integration Demo</title>
    <link rel="stylesheet" href="/colors.css">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #3b82f6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .context-card {
            margin: 20px 0;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .tension-bar {
            height: 8px;
            background: #3b82f6;
            border-radius: 4px;
            overflow: hidden;
            margin: 10px 0;
        }
        .tension-fill {
            height: 100%;
            transition: width 0.3s ease;
        }
        .controls {
            margin: 20px 0;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
        }
        button:hover {
            background: #3b82f6;
        }
        .status {
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .status.healthy { background: #3b82f6; color: #3b82f6; }
        .status.warning { background: #3b82f6; color: #92400e; }
        .status.critical { background: #fee2e2; color: #991b1b; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎨 ColorfulTypeContext Integration Demo</h1>
        
        <div class="controls">
            <h2>🔗 WebSocket Controls</h2>
            <p>Connection: <span id="ws-status">Connecting...</span></p>
            <button onclick="subscribeToAll()">Subscribe to All Contexts</button>
            <button onclick="updateRandomTension()">Update Random Tension</button>
            <button onclick="toggleAnimation()">Toggle Animation</button>
        </div>

        <div id="contexts-container">
            <!-- Context cards will be dynamically inserted here -->
        </div>

        <div class="controls">
            <h2>📊 Integration Info</h2>
            <p><strong>CSS Variables:</strong> <a href="/colors.css" target="_blank">/colors.css</a></p>
            <p><strong>WebSocket:</strong> ws://localhost:8766/ws-inspect</p>
            <p><strong>Health Endpoint:</strong> <a href="/health" target="_blank">/health</a></p>
            <p><strong>Contexts:</strong> <a href="/contexts" target="_blank">/contexts</a></p>
        </div>
    </div>

    <script>
        let ws = null;
        let animationInterval = null;

        function connectWebSocket() {
            ws = new WebSocket('ws://localhost:8766/ws-inspect');
            
            ws.onopen = () => {
                document.getElementById('ws-status').textContent = 'Connected';
                document.getElementById('ws-status').style.color = '#10b981';
                
                // Request initial contexts
                ws.send(JSON.stringify({ type: 'getContexts' }));
            };
            
            ws.onmessage = (event) => {
                const update = JSON.parse(event.data);
                handleWebSocketMessage(update);
            };
            
            ws.onclose = () => {
                document.getElementById('ws-status').textContent = 'Disconnected';
                document.getElementById('ws-status').style.color = '#ef4444';
                
                // Attempt to reconnect after 3 seconds
                setTimeout(connectWebSocket, 3000);
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                document.getElementById('ws-status').textContent = 'Error';
                document.getElementById('ws-status').style.color = '#ef4444';
            };
        }

        function handleWebSocketMessage(update) {
            switch (update.type) {
                case 'initial':
                case 'contexts':
                    renderContexts(update.contexts);
                    break;
                case 'update':
                    updateContextCard(update.context, update.tension, update.colors);
                    break;
            }
        }

        function renderContexts(contexts) {
            const container = document.getElementById('contexts-container');
            container.innerHTML = '';
            
            contexts.forEach(ctx => {
                const card = createContextCard(ctx);
                container.appendChild(card);
            });
        }

        function createContextCard(context) {
            const card = document.createElement('div');
            card.className = \`context-card \${context.key.toLowerCase().replace('_', '-')}\`;
            card.id = \`context-\${context.key}\`;
            
            const statusClass = context.tension > 80 ? 'critical' : 
                              context.tension > 60 ? 'warning' : 'healthy';
            
            card.innerHTML = \`
                <h3>\${context.key} (Tension: \${context.tension.toFixed(1)}%)</h3>
                <div class="status \${statusClass}">
                    Status: \${statusClass.toUpperCase()}
                </div>
                <div class="tension-bar">
                    <div class="tension-fill tension-gradient" style="width: \${context.tension}%"></div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px;">
                    <div class="primary">Primary</div>
                    <div class="secondary">Secondary</div>
                    <div class="bg-primary" style="color: white; padding: 5px; text-align: center;">BG Primary</div>
                    <div class="bg-secondary" style="color: white; padding: 5px; text-align: center;">BG Secondary</div>
                </div>
                <div style="margin-top: 10px; font-size: 12px; opacity: 0.7;">
                    Gradient: \${context.colors.tensionGradient}
                </div>
            \`;
            
            return card;
        }

        function updateContextCard(contextKey, tension, colors) {
            const card = document.getElementById(\`context-\${contextKey}\`);
            if (!card) return;
            
            // Update tension display
            const title = card.querySelector('h3');
            title.textContent = \`\${contextKey} (Tension: \${tension.toFixed(1)}%)\`;
            
            // Update status
            const status = card.querySelector('.status');
            const statusClass = tension > 80 ? 'critical' : 
                              tension > 60 ? 'warning' : 'healthy';
            status.className = \`status \${statusClass}\`;
            status.textContent = \`Status: \${statusClass.toUpperCase()}\`;
            
            // Update tension bar
            const tensionFill = card.querySelector('.tension-fill');
            tensionFill.style.width = \`\${tension}%\`;
            tensionFill.style.background = colors.tensionGradient;
        }

        function subscribeToAll() {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            
            const contextKeys = ['storage-enterprise', 'storage-development', 'storage-local-sandbox', 
                               'api-enterprise', 'api-development', 'api-local-sandbox'];
            
            contextKeys.forEach(key => {
                ws.send(JSON.stringify({ type: 'subscribe', context: key }));
            });
        }

        function updateRandomTension() {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            
            const contextKeys = ['storage-enterprise', 'storage-development', 'storage-local-sandbox'];
            const randomKey = contextKeys[Math.floor(Math.random() * contextKeys.length)];
            const randomTension = Math.floor(Math.random() * 100);
            
            ws.send(JSON.stringify({ 
                type: 'updateTension', 
                context: randomKey, 
                tension: randomTension 
            }));
        }

        function toggleAnimation() {
            if (animationInterval) {
                clearInterval(animationInterval);
                animationInterval = null;
            } else {
                animationInterval = setInterval(updateRandomTension, 1000);
            }
        }

        // Initialize WebSocket connection
        connectWebSocket();
    </script>
</body>
</html>`;
      
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    });
}

// =============================================================================
// DEMONSTRATION
// =============================================================================

/**
 * Demonstrate the enhanced integration
 */
async function demonstrateEnhancedIntegration(): Promise<void> {
  console.log(EmpireProDashboard.generateHeader(
    'ENHANCED HEALTH ENDPOINT WITH COLORFUL CONTEXT INTEGRATION',
    'WebSocket Real-time Updates, CSS Variables, and Dynamic Theming'
  ));

  const app = createEnhancedHealthEndpoint();
  const port = process.env.PORT || 3000;
  
  const server = app.listen(port);
  
  console.log(UnicodeTableFormatter.colorize('🚀 Enhanced Health Endpoint with Integration Started', DesignSystem.status.operational));
  console.log(UnicodeTableFormatter.colorize(`🌐 Main Server: http://localhost:${port}`, DesignSystem.text.accent.blue));
  console.log(UnicodeTableFormatter.colorize(`🎨 Demo Page: http://localhost:${port}/`, DesignSystem.text.accent.green));
  console.log(UnicodeTableFormatter.colorize(`📱 CSS Variables: http://localhost:${port}/colors.css`, DesignSystem.text.accent.purple));
  console.log(UnicodeTableFormatter.colorize(`🔗 WebSocket: ws://localhost:8766/ws-inspect`, DesignSystem.text.accent.yellow));
  console.log(UnicodeTableFormatter.colorize(`📊 Contexts: http://localhost:${port}/contexts`, DesignSystem.text.primary));
  console.log(UnicodeTableFormatter.colorize(`🏥 Health: http://localhost:${port}/health`, DesignSystem.status.operational));
  
  // Demonstrate ColorfulTypeContext usage
  console.log(UnicodeTableFormatter.colorize('\n🎨 COLORFUL TYPE CONTEXT DEMONSTRATION:', DesignSystem.text.accent.blue));
  
  // Create a context like in the example
  const ctx = new ColorfulTypeContext('STORAGE', 'ENTERPRISE', 'duoplus');
  console.log(UnicodeTableFormatter.colorize('📊 Color Information:', DesignSystem.text.primary));
  console.log(`  Primary: ${ctx.colorInfo.primary}`);
  console.log(`  Secondary: ${ctx.colorInfo.secondary}`);
  console.log(`  Tension: ${ctx.colorInfo.tension}%`);
  console.log(`  Gradient: ${ctx.colorInfo.tensionGradient}`);
  
  // Subscribe to updates
  console.log(UnicodeTableFormatter.colorize('\n🔗 SUBSCRIBING TO TENSION UPDATES:', DesignSystem.text.accent.blue));
  const unsubscribe = ctx.subscribe((update) => {
    console.log(UnicodeTableFormatter.colorize(`📈 Tension Update: ${update.tension.toFixed(1)}%`, DesignSystem.text.accent.green));
  });
  
  // Simulate some tension changes
  setTimeout(() => ctx.updateTension(75), 1000);
  setTimeout(() => ctx.updateTension(45), 2000);
  setTimeout(() => ctx.updateTension(90), 3000);
  
  // Demonstrate CSS integration
  console.log(UnicodeTableFormatter.colorize('\n🎨 CSS INTEGRATION DEMONSTRATION:', DesignSystem.text.accent.blue));
  const cssGenerator = new CSSVariableGenerator();
  cssGenerator.registerContext('storage-enterprise', ctx);
  
  const cssVariables = ctx.generateCSSVariables();
  console.log(UnicodeTableFormatter.colorize('📱 Generated CSS Variables:', DesignSystem.text.primary));
  console.log(cssVariables);
  
  console.log(EmpireProDashboard.generateFooter());
  
  console.log('\n🎉 ENHANCED INTEGRATION DEMO COMPLETE!');
  console.log('✅ ColorfulTypeContext with dynamic color management');
  console.log('✅ WebSocket server for real-time tension updates');
  console.log('✅ CSS variable generation with dynamic theming');
  console.log('✅ Interactive demo page with live updates');
  console.log('✅ Integration with existing health endpoint system');
  
  console.log('\n📋 INTEGRATION FEATURES:');
  console.log('  🎨 ColorfulTypeContext: Dynamic color management based on scope and tension');
  console.log('  🔗 WebSocket: Real-time updates for tension and color changes');
  console.log('  📱 CSS Variables: Dynamic stylesheet generation with utility classes');
  console.log('  🌐 Demo Page: Interactive demonstration with live updates');
  console.log('  🏥 Health Integration: Color-aware health monitoring');
  console.log('  ⚡ Real-time: Live tension updates with smooth transitions');
  
  console.log('\n🔧 USAGE EXAMPLES:');
  console.log('  // TypeScript - ColorfulTypeContext');
  console.log('  const ctx = new ColorfulTypeContext("STORAGE", scope, domain);');
  console.log('  console.log(ctx.colorInfo); // Get all colors');
  console.log('');
  console.log('  // JavaScript - WebSocket Integration');
  console.log('  const ws = new WebSocket("ws://localhost:8766/ws-inspect");');
  console.log('  ws.onmessage = (event) => {');
  console.log('    const update = JSON.parse(event.data);');
  console.log('    updateUI(update.tension, update.colors);');
  console.log('  };');
  console.log('');
  console.log('  // HTML - CSS Integration');
  console.log('  <link rel="stylesheet" href="/colors.css">');
  console.log('  <div class="storage-local-sandbox"');
  console.log('       style="--tension-gradient: linear-gradient(135deg, hsl(180, 80%, 60%), hsl(210, 80%, 40%))">');
  console.log('  </div>');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(UnicodeTableFormatter.colorize('\n🛑 Shutting down enhanced integration server...', DesignSystem.text.secondary));
    unsubscribe(); // Clean up subscription
    server.stop();
    process.exit(0);
  });
}

// Start the enhanced integration demonstration
demonstrateEnhancedIntegration().catch(error => {
  console.error(UnicodeTableFormatter.colorize(`❌ Failed to start enhanced integration: ${error}`, DesignSystem.status.downtime));
  process.exit(1);
});
