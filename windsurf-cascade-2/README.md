# 🚀 Bun Stream Dashboard

An interactive WebSocket dashboard for managing and monitoring Bun's stdin, stdout, and stderr streams in real-time. Built with Bun's latest utilities including `Bun.inspect.table()`, `Bun.inspect.custom`, `Bun.deepEquals()`, `Bun.escapeHTML()`, and `Bun.stringWidth()`.

## ✨ Features

- **📡 Real-time WebSocket Communication** - Live stream management through WebSocket
- **🎲 Random Port Assignment** - No port conflicts, auto-assigns available port
- **🔥 Hot Reloading** - Instant updates during development with `--hot` flag
- **👁️ Connection Inspection** - Beautiful tabular display of connection stats using `Bun.inspect.table()`
- **🔒 HTML Escaping** - Safe HTML rendering with `Bun.escapeHTML()`
- **📊 Advanced Metrics** - Track messages, bytes, connections, and uptime
- **🎨 Beautiful UI** - Modern gradient design with smooth animations
- **📥 Stdin Reading** - Read and display stdin data
- **📤 Stdout Writing** - Send messages to stdout
- **⚠️ Stderr Writing** - Send error messages to stderr
- **🔄 Auto-reconnect** - WebSocket auto-reconnection on disconnect
- **📈 Periodic Stats** - Automatic statistics updates every 30 seconds

## 📂 Repository Structure

- `src/`: Categorized source code and core logic:
  - `core/`: Configuration, database, and security foundations
  - `net/`: Proxy engines, HTTP agents, and routing
  - `observability/`: Logging, metrics, and performance monitoring
  - `platform/`: AI analyzers, eBPF tracers, and WASM accelerators
  - `ui/`: React components and LSP dashboards
  - `dev/`: Internal demos and verification tools
  - `trading/`: High-performance trading domain logic
- `scripts/`: Automation, deployment, and cross-platform compilation
- `demos/`: Interactive demos and visual performance dashboards
- `packages/`: Formalized Bun workspaces including `@mycompany/registry`
- `tests/`: Comprehensive test suites for all sub-systems
- `docs/`: Technical guides and architectural assessments
- `data/`: Persistent SQLite databases and operational logs
- `configs/`: Environment templates and integration settings

## �️ Technology Stack

- **Runtime:** Bun v1.3+
- **Server:** Bun's native HTTP server with WebSocket support
- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Type Safety:** TypeScript with @types/bun

## �📋 Prerequisites

- [Bun](https://bun.sh) v1.0.0 or higher

## 🚀 Quick Start

### Installation

```bash
# Clone or navigate to the project
cd windsurf-project-2

# Install dependencies (already done if you see this)
bun install
```

### Running the Server

```bash
# Start with hot reload and watch mode (recommended)
bun run dev

# Or just start normally
bun run start

# Start with hot reload only
bun run hot

# Start with watch mode only
bun run watch
```

The server will start on a **random available port** to avoid port conflicts. Check the console output for the actual port:

```
═════════════════════════════════════════════════════════════
🚀 Bun Stream Dashboard Server Started!
═════════════════════════════════════════════════════════════
┌──────────────┬────────────────────────────────────────────┐
│ Property     │ Value                                      │
├──────────────┼────────────────────────────────────────────┤
│ Server URL   │ http://localhost:54321                     │
│ WebSocket URL│ ws://localhost:54321/ws                    │
│ Port         │ 54321                                      │
│ Bun Version  │ 1.3.5                                      │
│ Hot Reload   │ ✅ Enabled                                  │
│ Watch Mode   │ ✅ Enabled                                  │
└──────────────┴────────────────────────────────────────────┘
```

### Testing with Stdin

```bash
# Pipe data to stdin
echo 'Hello from stdin!' | bun --hot server.ts

# Or use the npm script
bun run stdin-demo
```

## 📖 Usage

### Opening the Dashboard

Once the server is running, open your browser to the URL shown in the console (e.g., `http://localhost:54321`).

The dashboard provides three main sections:

1. **📥 stdin** - Click "Read Stdin" to read available stdin data
2. **📤 stdout** - Enter a message and click "Send" to write to stdout
3. **⚠️ stderr** - Enter a message and click "Send" to write to stderr

### Available Endpoints

- `GET /` - Dashboard UI
- `GET /ws` - WebSocket endpoint
- `GET /health` - Health check endpoint
- `GET /stats` - Statistics JSON endpoint

### Example: Health Check

```bash
# Replace PORT with your actual port from server output
curl http://localhost:PORT/health
```

Response:
```json
{
  "status": "healthy",
  "server": {
    "port": 54321,
    "uptime": 12345,
    "bunVersion": "1.3.5"
  },
  "connections": {
    "activeConnections": 1,
    "totalConnections": 3,
    "messagesReceived": 15,
    "messagesSent": 18,
    "bytesReceived": 450,
    "bytesSent": 1250,
    "uptime": 12345
  }
}
```

## 🔧 Bun Utilities Used

This project showcases Bun's powerful utility functions:

### 1. `Bun.inspect.table()`
Displays beautiful tabular data in the console:
```typescript
Bun.inspect.table([
  { Property: 'Server URL', Value: 'http://localhost:54321' },
  { Property: 'Port', Value: '54321' }
]);
```

### 2. `Bun.inspect.custom`
Custom object inspection for the ConnectionManager class:
```typescript
[Bun.inspect.custom]() {
  return {
    type: 'ConnectionManager',
    stats: this.stats,
    connections: this.connections.size
  };
}
```

### 3. `Bun.deepEquals()`
Deep equality checking for configuration validation:
```typescript
if (Bun.deepEquals(serverConfig, expectedConfig)) {
  console.log('✅ Server configuration matches');
}
```

### 4. `Bun.escapeHTML()`
Safe HTML escaping for user input:
```typescript
const escapedMessage = Bun.escapeHTML(message);
```

### 5. `Bun.stringWidth()`
Unicode-aware string width calculation:
```typescript
const width = Bun.stringWidth('Connection Statistics:');
console.log('═'.repeat(width + 4));
```

## 📊 Connection Statistics

The server tracks and displays comprehensive statistics:

- Total connections made
- Currently active connections
- Messages received/sent
- Bytes received/sent
- Server uptime
- Connection events with timestamps

Statistics are displayed:
- On WebSocket connection open/close
- Every 30 seconds (for active connections)
- On server shutdown (Ctrl+C)

## 🎯 Features in Detail

### Random Port Assignment
The server uses `port: 0` in the Bun serve configuration, which automatically assigns an available port. This prevents port conflicts and makes it easy to run multiple instances.

### Hot Reloading
Start the server with the `--hot` flag for instant code updates without manual restarts:
```bash
bun --hot server.ts
```

### Watch Mode
Use `--watch` to restart the server when files change:
```bash
bun --watch server.ts
```

### Combine Both
For the ultimate development experience:
```bash
bun --hot --watch server.ts
# or simply
bun run dev
```

### Connection Inspection
All WebSocket events are logged with beautiful table formatting showing:
- Connection ID
- Active connection count
- Total connections
- Server port

### Graceful Shutdown
Press Ctrl+C to gracefully shut down the server with a final statistics display.

## 🎨 Dashboard UI

The dashboard features:
- Gradient purple background
- Responsive card-based layout
- Real-time connection status indicator (Connected/Connecting/Disconnected)
- Message counters
- Auto-scrolling output areas
- Clear buttons for each stream section
- Keyboard shortcuts (Enter to send)
- Automatic reconnection with retry counter

## 🔐 Security

- All user input is sanitized using `Bun.escapeHTML()`
- WebSocket messages are validated before processing
- Error handling for all stream operations
- Safe HTML rendering in the dashboard

## 📝 Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `bun --hot --watch server.ts` | Development mode with hot reload and watch |
| `start` | `bun server.ts` | Start production server |
| `hot` | `bun --hot server.ts` | Start with hot reload only |
| `watch` | `bun --watch server.ts` | Start with watch mode only |
| `stdin-demo` | `echo 'Hello from stdin!' \| bun --hot server.ts` | Demo with stdin input |
| `open` | Auto-open browser (macOS) | Opens dashboard in default browser |

## 🐛 Troubleshooting

### Server won't start
- Make sure Bun is installed: `bun --version`
- Check if another process is using the port (unlikely with random ports)
- Ensure dependencies are installed: `bun install`

### WebSocket connection fails
- Check browser console for errors
- Verify the server is running
- Try refreshing the page
- Check for firewall/antivirus blocking WebSocket connections

### Stdin not reading
- Ensure you're piping data before the server starts: `echo "data" | bun server.ts`
- Stdin can only be read once when the process starts
- After reading, stdin will show "No stdin data available"

## 🚀 Performance

This dashboard is optimized for performance:
- Minimal dependencies (only TypeScript types)
- Efficient WebSocket message handling
- Automatic connection cleanup
- Memory-efficient statistics tracking
- Periodic stats display only when connections are active

## 📄 License

MIT

## 🤝 Contributing

Feel free to open issues or submit pull requests!

## 🌟 Acknowledgments

Built with [Bun](https://bun.sh) - The incredibly fast JavaScript runtime.

---

**Made with ❤️ using Bun's powerful utilities**
