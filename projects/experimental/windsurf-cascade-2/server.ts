#!/usr/bin/env bun
import { serve } from "bun";

// Enhanced Color Constants with Comprehensive Type Definitions and Descriptive Properties
// Bright ANSI Theme with detailed metadata for each color
const COLOR_CONSTANTS = {
  // Primary theme colors - Bright ANSI colors with enhanced metadata
  PRIMARY_CYAN: {
    name: 'PRIMARY_CYAN' as const,
    hex: '#00ffff',
    HEX: '#00FFFF',
    rgb: { r: 0, g: 255, b: 255 },
    rgba: { r: 0, g: 255, b: 255, a: 1 },
    hsl: { h: 180, s: 100, l: 50 },
    rgbArray: [0, 255, 255] as const,
    rgbaArray: [0, 255, 255, 255] as const,
    ansi: '\x1b[96m', // Bright cyan
    description: 'Primary bright cyan color used for main UI elements and highlights',
    usage: 'Main accent color for the dashboard interface',
    category: 'Primary'
  },
  
  SECONDARY_BLUE: {
    name: 'SECONDARY_BLUE' as const,
    hex: '#4444ff',
    HEX: '#4444FF',
    rgb: { r: 68, g: 68, b: 255 },
    rgba: { r: 68, g: 68, b: 255, a: 1 },
    hsl: { h: 240, s: 100, l: 63 },
    rgbArray: [68, 68, 255] as const,
    rgbaArray: [68, 68, 255, 255] as const,
    ansi: '\x1b[94m', // Bright blue
    description: 'Secondary bright blue color for complementary UI elements',
    usage: 'Secondary accent color for buttons and interactive elements',
    category: 'Secondary'
  },
  
  // Status colors - Bright ANSI variants with semantic meaning
  SUCCESS_GREEN: {
    name: 'SUCCESS_GREEN' as const,
    hex: '#00ff00',
    HEX: '#00FF00',
    rgb: { r: 0, g: 255, b: 0 },
    rgba: { r: 0, g: 255, b: 0, a: 1 },
    hsl: { h: 120, s: 100, l: 50 },
    rgbArray: [0, 255, 0] as const,
    rgbaArray: [0, 255, 0, 255] as const,
    ansi: '\x1b[92m', // Bright green
    description: 'Success bright green color indicating positive status or completion',
    usage: 'Success messages, connected status, positive indicators',
    category: 'Status'
  },
  
  ERROR_RED: {
    name: 'ERROR_RED' as const,
    hex: '#ff0000',
    HEX: '#FF0000',
    rgb: { r: 255, g: 0, b: 0 },
    rgba: { r: 255, g: 0, b: 0, a: 1 },
    hsl: { h: 0, s: 100, l: 50 },
    rgbArray: [255, 0, 0] as const,
    rgbaArray: [255, 0, 0, 255] as const,
    ansi: '\x1b[91m', // Bright red
    description: 'Error bright red color indicating failures or critical issues',
    usage: 'Error messages, disconnected status, critical alerts',
    category: 'Status'
  },
  
  WARNING_YELLOW: {
    name: 'WARNING_YELLOW' as const,
    hex: '#ffff00',
    HEX: '#FFFF00',
    rgb: { r: 255, g: 255, b: 0 },
    rgba: { r: 255, g: 255, b: 0, a: 1 },
    hsl: { h: 60, s: 100, l: 50 },
    rgbArray: [255, 255, 0] as const,
    rgbaArray: [255, 255, 0, 255] as const,
    ansi: '\x1b[93m', // Bright yellow
    description: 'Warning bright yellow color indicating caution or pending status',
    usage: 'Warning messages, connecting status, pending operations',
    category: 'Status'
  },
  
  INFO_MAGENTA: {
    name: 'INFO_MAGENTA' as const,
    hex: '#ff00ff',
    HEX: '#FF00FF',
    rgb: { r: 255, g: 0, b: 255 },
    rgba: { r: 255, g: 0, b: 255, a: 1 },
    hsl: { h: 300, s: 100, l: 50 },
    rgbArray: [255, 0, 255] as const,
    rgbaArray: [255, 0, 255, 255] as const,
    ansi: '\x1b[95m', // Bright magenta
    description: 'Info bright magenta color for informational messages and data',
    usage: 'Informational messages, data visualization, neutral indicators',
    category: 'Status'
  },
  
  DEBUG_WHITE: {
    name: 'DEBUG_WHITE' as const,
    hex: '#ffffff',
    HEX: '#FFFFFF',
    rgb: { r: 255, g: 255, b: 255 },
    rgba: { r: 255, g: 255, b: 255, a: 1 },
    hsl: { h: 0, s: 0, l: 100 },
    rgbArray: [255, 255, 255] as const,
    rgbaArray: [255, 255, 255, 255] as const,
    ansi: '\x1b[97m', // Bright white
    description: 'Debug bright white color for detailed output and debugging information',
    usage: 'Debug output, detailed logs, technical information',
    category: 'Status'
  }
} as const;

// Enhanced type definitions for color constants with additional metadata
interface ColorMetadata {
  usage: string;
  category: string;
}

type ColorConstant = typeof COLOR_CONSTANTS[keyof typeof COLOR_CONSTANTS] & ColorMetadata;
type ColorName = keyof typeof COLOR_CONSTANTS;
type RGBObject = { r: number; g: number; b: number };
type RGBAObject = { r: number; g: number; b: number; a: number };
type HSLObject = { h: number; s: number; l: number };
type RGBArray = readonly [number, number, number];
type RGBAArray = readonly [number, number, number, number];

// Enhanced Stream Dashboard Manager class with improved naming conventions and structure
class StreamDashboardManager {
  private readonly connections = new Map<number, WebSocket>();
  private connectionId = 0; // Make this mutable
  private readonly stats = {
    totalConnections: 0,
    activeConnections: 0,
    messagesReceived: 0,
    messagesSent: 0,
    bytesReceived: 0,
    bytesSent: 0,
    startTime: new Date()
  };
  
  // Readonly properties for color theming
  public readonly themeColors = COLOR_CONSTANTS;
  public readonly defaultColor = COLOR_CONSTANTS.PRIMARY_CYAN;
  public readonly statusColors = {
    connected: COLOR_CONSTANTS.SUCCESS_GREEN,
    disconnected: COLOR_CONSTANTS.ERROR_RED,
    connecting: COLOR_CONSTANTS.WARNING_YELLOW,
    error: COLOR_CONSTANTS.ERROR_RED,
    info: COLOR_CONSTANTS.INFO_MAGENTA,
    debug: COLOR_CONSTANTS.DEBUG_WHITE
  } as const;

  // Custom Bun.inspect implementation
  [Bun.inspect.custom]() {
    return {
      type: 'StreamDashboardManager',
      stats: this.stats,
      connections: this.connections.size,
      uptime: `${Math.floor((Date.now() - this.stats.startTime.getTime()) / 1000)}s`
    };
  }

  addConnection(ws: WebSocket): number {
    const id = ++this.connectionId;
    this.connections.set(id, ws);
    this.stats.totalConnections++;
    this.stats.activeConnections++;
    return id;
  }

  removeConnection(id: number) {
    this.connections.delete(id);
    this.stats.activeConnections--;
  }

  getStats() {
    return { ...this.stats };
  }

  incrementMessagesReceived(bytes: number) {
    this.stats.messagesReceived++;
    this.stats.bytesReceived += bytes;
  }

  incrementMessagesSent(bytes: number) {
    this.stats.messagesSent++;
    this.stats.bytesSent += bytes;
  }

  getConnectionInfo() {
    return {
      activeConnections: this.stats.activeConnections,
      totalConnections: this.stats.totalConnections,
      messagesReceived: this.stats.messagesReceived,
      messagesSent: this.stats.messagesSent,
      bytesReceived: this.stats.bytesReceived,
      bytesSent: this.stats.bytesSent,
      uptime: Date.now() - this.stats.startTime.getTime()
    };
  }

  // Enhanced color utility methods
  getColorConstant(name: ColorName): ColorConstant {
    return this.themeColors[name];
  }

  getAllColorConstants(): typeof COLOR_CONSTANTS {
    return this.themeColors;
  }

  getStatusColor(status: keyof typeof this.statusColors): ColorConstant {
    return this.statusColors[status];
  }

  formatWithColor(value: number, colorName: ColorName): string {
    const color = this.getColorConstant(colorName);
    return `${color.ansi}${value}\x1b[0m`;
  }

  formatWithStatusColor(value: number, status: keyof typeof this.statusColors): string {
    const color = this.getStatusColor(status);
    return `${color.ansi}${value}\x1b[0m`;
  }

  getColorForValue(value: number, max: number): ColorConstant {
    const ratio = Math.min(value / max, 1);
    if (ratio > 0.7) return this.statusColors.error;
    if (ratio > 0.4) return this.statusColors.connecting;
    return this.statusColors.connected;
  }

  displayStats() {
    console.log('\n📊 Stream Dashboard Statistics:');
    console.log('═'.repeat(Bun.stringWidth('Stream Dashboard Statistics:') + 4));
    
    // Calculate additional metrics
    const uptimeMs = Date.now() - this.stats.startTime.getTime();
    const messagesPerSecond = uptimeMs > 0 ? 
      ((this.stats.messagesReceived + this.stats.messagesSent) / (uptimeMs / 1000)).toFixed(2) : '0.00';
    const avgMessageSize = (this.stats.messagesReceived + this.stats.messagesSent) > 0 ?
      ((this.stats.bytesReceived + this.stats.bytesSent) / (this.stats.messagesReceived + this.stats.messagesSent)).toFixed(2) : '0.00';
    
    const statsTable = [
      {
        Metric: '🔌 Total Connections',
        Value: this.formatWithStatusColor(this.stats.totalConnections, 'connected'),
        Unit: 'connections',
        Description: 'Total WebSocket connections since startup'
      },
      {
        Metric: '📡 Active Connections', 
        Value: this.formatWithStatusColor(this.stats.activeConnections, 'connecting'),
        Unit: 'active',
        Description: 'Currently active WebSocket connections'
      },
      {
        Metric: '📨 Messages Received',
        Value: this.formatWithStatusColor(this.stats.messagesReceived, 'info'),
        Unit: 'messages',
        Description: 'Total messages received from clients'
      },
      {
        Metric: '📤 Messages Sent',
        Value: this.formatWithStatusColor(this.stats.messagesSent, 'debug'),
        Unit: 'messages',
        Description: 'Total messages sent to clients'
      },
      {
        Metric: '📥 Bytes Received',
        Value: this.formatBytes(this.stats.bytesReceived),
        Unit: 'data',
        Description: 'Total data received from clients'
      },
      {
        Metric: '📦 Bytes Sent',
        Value: this.formatBytes(this.stats.bytesSent),
        Unit: 'data',
        Description: 'Total data sent to clients'
      },
      {
        Metric: '⏱️  Uptime',
        Value: this.formatUptime(uptimeMs),
        Unit: 'duration',
        Description: 'Time since server started'
      },
      {
        Metric: '📈 Messages/Second',
        Value: this.formatWithStatusColor(parseFloat(messagesPerSecond), 'info'),
        Unit: 'rate',
        Description: 'Average message throughput'
      },
      {
        Metric: '📊 Avg Message Size',
        Value: this.formatBytes(parseFloat(avgMessageSize)),
        Unit: 'bytes',
        Description: 'Average size of messages'
      }
    ];

    // Display the enhanced statistics table
    Bun.inspect.table(statsTable);
    
    // Display color theme information
    console.log('\n🎨 Active Color Theme:');
    console.log('═'.repeat(Bun.stringWidth('Active Color Theme:') + 4));
    
    const colorThemeTable = [
      { Category: 'Primary', Color: 'Cyan', Hex: this.themeColors.PRIMARY_CYAN.hex, Usage: this.themeColors.PRIMARY_CYAN.usage },
      { Category: 'Secondary', Color: 'Blue', Hex: this.themeColors.SECONDARY_BLUE.hex, Usage: this.themeColors.SECONDARY_BLUE.usage },
      { Category: 'Status', Color: 'Green', Hex: this.themeColors.SUCCESS_GREEN.hex, Usage: this.themeColors.SUCCESS_GREEN.usage },
      { Category: 'Status', Color: 'Red', Hex: this.themeColors.ERROR_RED.hex, Usage: this.themeColors.ERROR_RED.usage },
      { Category: 'Status', Color: 'Yellow', Hex: this.themeColors.WARNING_YELLOW.hex, Usage: this.themeColors.WARNING_YELLOW.usage },
      { Category: 'Status', Color: 'Magenta', Hex: this.themeColors.INFO_MAGENTA.hex, Usage: this.themeColors.INFO_MAGENTA.usage },
      { Category: 'Status', Color: 'White', Hex: this.themeColors.DEBUG_WHITE.hex, Usage: this.themeColors.DEBUG_WHITE.usage }
    ];
    
    Bun.inspect.table(colorThemeTable);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

const connectionManager = new StreamDashboardManager();

// Store WebSocket connection IDs
const wsConnectionIds = new WeakMap<WebSocket, number>();

// Serve the dashboard with random port (0 = auto-assign)
const server = serve({
  port: 0, // Random available port
  async fetch(req, server) {
    const url = new URL(req.url);
    
    // Serve dashboard HTML
    if (url.pathname === '/') {
      return new Response(Bun.file('dashboard.html'), {
        headers: {
          'Content-Type': 'text/html'
        }
      });
    }
    
    // WebSocket endpoint for stream management
    if (url.pathname === '/ws') {
      // Extract the Sec-WebSocket-Protocol header
      const protocols = req.headers.get('Sec-WebSocket-Protocol');
      const protocolArray = protocols ? protocols.split(',').map(p => p.trim()) : [];
      
      // Upgrade with protocol support
      const upgraded = server.upgrade(req, {
        // Pass the first protocol as the selected protocol
        headers: protocols ? { 'Sec-WebSocket-Protocol': protocolArray[0] || '' } : undefined
      });
      
      if (!upgraded) {
        return new Response('WebSocket upgrade failed', { status: 400 });
      }
      return; // Don't return a response for WebSocket upgrades
    }
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return Response.json({
        status: 'healthy',
        server: {
          port: server.port,
          uptime: connectionManager.getConnectionInfo().uptime,
          bunVersion: Bun.version
        },
        connections: connectionManager.getConnectionInfo()
      });
    }
    
    // Stats endpoint
    if (url.pathname === '/stats') {
      return Response.json(connectionManager.getConnectionInfo());
    }
    
    return new Response('Not found', { status: 404 });
  },
  
  websocket: {
    open(ws) {
      const connId = connectionManager.addConnection(ws as any);
      wsConnectionIds.set(ws as any, connId);
      
      console.log(`\n✅ WebSocket connection opened (ID: ${connId})`);
      
      // Display connection info using Bun.inspect.table
      const connectionInfo = [
        { Property: 'Connection ID', Value: connId.toString() },
        { Property: 'Active Connections', Value: connectionManager.getStats().activeConnections.toString() },
        { Property: 'Total Connections', Value: connectionManager.getStats().totalConnections.toString() },
        { Property: 'Server Port', Value: server.port.toString() }
      ];
      
      Bun.inspect.table(connectionInfo);
      
      // Send welcome message with server info
      const welcomeMsg = JSON.stringify({
        type: 'welcome',
        message: `Connected to Bun Stream Manager (Port: ${server.port})`,
        port: server.port,
        bunVersion: Bun.version,
        connectionId: connId,
        themeColors: connectionManager.getAllColorConstants()
      });
      
      ws.send(welcomeMsg);
      connectionManager.incrementMessagesSent(welcomeMsg.length);
    },
    
    async message(ws, message) {
      const messageStr = message.toString();
      connectionManager.incrementMessagesReceived(messageStr.length);
      
      try {
        const data = JSON.parse(messageStr);
        const connId = wsConnectionIds.get(ws);
        
        console.log(`\n📨 Message received from connection ${connId}:`);
        console.log(`   Type: ${data.type}`);
        
        if (data.type === 'readStdin') {
          console.log('📖 Reading from stdin...');
          
          // Check if stdin has data
          const stdinSize = Bun.stdin.size;
          console.log(`   Stdin size: ${stdinSize} bytes`);
          
          let stdinData = '';
          if (stdinSize > 0) {
            try {
              stdinData = await Bun.stdin.text();
              console.log(`   Read ${Bun.stringWidth(stdinData)} characters from stdin`);
            } catch (error) {
              console.error('   Error reading stdin:', error);
              stdinData = 'Error: Could not read stdin';
            }
          } else {
            stdinData = 'No stdin data available (stdin size: 0)';
            console.log('   ℹ️  No stdin data available');
          }
          
          const response = JSON.stringify({ 
            type: 'stdinData', 
            data: stdinData 
          });
          
          ws.send(response);
          connectionManager.incrementMessagesSent(response.length);
          
        } else if (data.type === 'writeStdout') {
          const message = data.data;
          const escapedMessage = Bun.escapeHTML(message);
          
          console.log(`📤 Writing to stdout (escaped): ${escapedMessage}`);
          
          // Write to stdout
          Bun.stdout.write(`[STDOUT] ${message}\n`);
          
          // Echo back to WebSocket with escaped HTML
          const response = JSON.stringify({ 
            type: 'stdoutWrite', 
            data: escapedMessage 
          });
          
          ws.send(response);
          connectionManager.incrementMessagesSent(response.length);
          
        } else if (data.type === 'writeStderr') {
          const message = data.data;
          const escapedMessage = Bun.escapeHTML(message);
          
          console.log(`⚠️  Writing to stderr (escaped): ${escapedMessage}`);
          
          // Write to stderr
          Bun.stderr.write(`[STDERR] ${message}\n`);
          
          // Echo back to WebSocket with escaped HTML
          const response = JSON.stringify({ 
            type: 'stderrWrite', 
            data: escapedMessage 
          });
          
          ws.send(response);
          connectionManager.incrementMessagesSent(response.length);
          
        } else if (data.type === 'testColor') {
          const colorInput = data.data;
          console.log(`🎨 Testing color: ${colorInput}`);
          
          try {
            // Test different color formats using Bun.color
            const colorInfo = {
              input: colorInput,
              hex: Bun.color(colorInput, "hex"),
              HEX: Bun.color(colorInput, "HEX"),
              rgb: Bun.color(colorInput, "{rgb}"),
              rgba: Bun.color(colorInput, "{rgba}"),
              rgbArray: Bun.color(colorInput, "[rgb]"),
              rgbaArray: Bun.color(colorInput, "[rgba]"),
              ansi: Bun.color(colorInput, "ansi"),
              css: Bun.color(colorInput, "css")
            };
            
            // Display color information in console with colors
            console.log('\n🎨 Color Analysis:');
            console.log('═'.repeat(20));
            console.log(`Input: ${colorInput}`);
            console.log(`HEX: ${colorInfo.hex || 'Invalid'}`);
            console.log(`RGB: ${colorInfo.rgb ? `(${colorInfo.rgb.r}, ${colorInfo.rgb.g}, ${colorInfo.rgb.b})` : 'Invalid'}`);
            console.log(`RGBA: ${colorInfo.rgba ? `(${colorInfo.rgba.r}, ${colorInfo.rgba.g}, ${colorInfo.rgba.b}, ${colorInfo.rgba.a})` : 'Invalid'}`);
            console.log(`CSS: ${colorInfo.css || 'Invalid'}`);
            console.log(`ANSI: ${colorInfo.ansi || 'Invalid'}`);
            
            // Send color info back to dashboard
            const response = JSON.stringify({
              type: 'colorInfo',
              data: colorInfo
            });
            
            ws.send(response);
            connectionManager.incrementMessagesSent(response.length);
            
          } catch (error) {
            console.error('❌ Error processing color:', error);
            const errorResponse = JSON.stringify({
              type: 'colorError',
              message: error instanceof Error ? error.message : 'Invalid color format',
              input: colorInput
            });
            ws.send(errorResponse);
            connectionManager.incrementMessagesSent(errorResponse.length);
          }
          
        } else if (data.type === 'getStats') {
          console.log('📊 Stats requested');
          connectionManager.displayStats();
          
          const response = JSON.stringify({
            type: 'connectionInfo',
            info: connectionManager.getConnectionInfo()
          });
          
          ws.send(response);
          connectionManager.incrementMessagesSent(response.length);
        }
        
      } catch (error) {
        console.error('❌ Error processing message:', error);
        const errorResponse = JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
        ws.send(errorResponse);
        connectionManager.incrementMessagesSent(errorResponse.length);
      }
    },
    
    close(ws) {
      const connId = wsConnectionIds.get(ws);
      connectionManager.removeConnection(connId!);
      wsConnectionIds.delete(ws);
      
      console.log(`\n❌ WebSocket connection closed (ID: ${connId})`);
      console.log(`   Active connections: ${connectionManager.getStats().activeConnections}`);
      
      // Display final stats for this connection
      connectionManager.displayStats();
    }
  }
});

// Display server startup information
console.log('\n' + '═'.repeat(60));
console.log('🚀 Bun Stream Dashboard Server Started!');
console.log('═'.repeat(60));

const serverInfo = [
  { Property: 'Server URL', Value: `http://localhost:${server.port}` },
  { Property: 'WebSocket URL', Value: `ws://localhost:${server.port}/ws` },
  { Property: 'Port', Value: server.port.toString() },
  { Property: 'Bun Version', Value: Bun.version },
  { Property: 'Hot Reload', Value: process.argv.includes('--hot') ? '✅ Enabled' : '❌ Disabled' },
  { Property: 'Watch Mode', Value: process.argv.includes('--watch') ? '✅ Enabled' : '❌ Disabled' }
];

Bun.inspect.table(serverInfo);

console.log('\n📋 Available Endpoints:');
console.log(`   • Dashboard:  http://localhost:${server.port}/`);
console.log(`   • WebSocket:  ws://localhost:${server.port}/ws`);
console.log(`   • Health:     http://localhost:${server.port}/health`);
console.log(`   • Stats:      http://localhost:${server.port}/stats`);

console.log('\n💡 Tips:');
console.log('   • Use hot reload: bun --hot server.ts');
console.log('   • Use watch mode: bun --watch server.ts');
console.log('   • Pipe to stdin:  echo "test data" | bun --hot server.ts');
console.log('   • View in browser: open http://localhost:' + server.port);

console.log('\n' + '═'.repeat(60) + '\n');

// Display connection manager inspection
console.log('🔍 Connection Manager State:');
console.log(Bun.inspect(connectionManager, { colors: true, depth: 2 }));
console.log('\n');

// Periodic stats display (every 30 seconds)
setInterval(() => {
  if (connectionManager.getStats().activeConnections > 0) {
    console.log('\n⏰ Periodic Stats Update:');
    connectionManager.displayStats();
  }
}, 30000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  connectionManager.displayStats();
  process.exit(0);
});

// Deep equality check example (for debugging)
const serverConfig = {
  port: server.port,
  hostname: server.hostname,
  development: server.development
};

const expectedConfig = {
  port: server.port,
  hostname: server.hostname || 'localhost',
  development: server.development
};

if (Bun.deepEquals(serverConfig, expectedConfig)) {
  console.log('✅ Server configuration matches expected values\n');
} else {
  console.log('⚠️  Server configuration differs from expected values\n');
}

// Demonstrate Bun color utilities
console.log('🎨 Bun Color Utilities Demo:');
console.log('═'.repeat(Bun.stringWidth('Bun Color Utilities Demo:') + 4));

// Example colors
const colors = [
  { name: 'Success Green', hex: '#10b981' },
  { name: 'Error Red', hex: '#ef4444' },
  { name: 'Warning Orange', hex: '#f59e0b' },
  { name: 'Primary Purple', hex: '#667eea' }
];

const colorData = colors.map(({ name, hex }) => {
  const red = Bun.color(hex, 'css').red();
  const green = Bun.color(hex, 'css').green();
  const blue = Bun.color(hex, 'css').blue();
  const alpha = Bun.color(hex, 'css').alpha();
  
  return {
    Name: name,
    Hex: hex,
    Red: red.toString(),
    Green: green.toString(),
    Blue: blue.toString(),
    Alpha: alpha.toString(),
    RGB: `rgb(${red}, ${green}, ${blue})`
  };
});

Bun.inspect.table(colorData);
console.log('\n');

// Benchmark all utilities
function benchmark() {
  const iterations = 10000;
  const largeObject = Array.from({ length: 1000 }, (_, i) => ({ 
    id: i, 
    data: `item-${i}-${"🎉".repeat(i % 5)}`,
    nested: { value: Math.random(), list: Array.from({ length: 10 }, (_, j) => j) }
  }));

  console.log("\n⚡ Performance Benchmarks (10k iterations):");
  
  // Bun.deepEquals benchmark
  const copy = JSON.parse(JSON.stringify(largeObject));
  console.time("Bun.deepEquals");
  for (let i = 0; i < 10; i++) { // Reduced due to size
    Bun.deepEquals(largeObject, copy);
  }
  console.timeEnd("Bun.deepEquals");

  // Bun.escapeHTML benchmark
  const htmlString = "<script>alert('test')</script>".repeat(100);
  console.time("Bun.escapeHTML");
  for (let i = 0; i < iterations; i++) {
    Bun.escapeHTML(htmlString);
  }
  console.timeEnd("Bun.escapeHTML");

  // Bun.stringWidth benchmark
  const testString = "Hello 🌍 World! 👨‍👩‍👧‍👦".repeat(50);
  console.time("Bun.stringWidth");
  for (let i = 0; i < iterations; i++) {
    Bun.stringWidth(testString);
  }
  console.timeEnd("Bun.stringWidth");

  // Bun.inspect.table benchmark
  const smallData = largeObject.slice(0, 10);
  console.time("Bun.inspect.table");
  for (let i = 0; i < iterations / 10; i++) {
    Bun.inspect.table(smallData);
  }
  console.timeEnd("Bun.inspect.table");
}

// Run benchmarks
benchmark();

export { server, connectionManager };
