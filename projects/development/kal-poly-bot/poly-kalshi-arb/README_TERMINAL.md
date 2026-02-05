# 🎯 Kalman Filter Terminal API - PTY Support

## Overview

The Kalman Filter Terminal API provides powerful pseudo-terminal (PTY) support for interactive debugging, monitoring, and administration of the trading system. Built on Bun v1.3.5's new Terminal API, it enables real-time terminal access with full TTY support, allowing you to run interactive CLI tools, debug patterns, and monitor system performance remotely.

## 🚀 Features

### Core Capabilities

- **PTY Support**: Full terminal emulation with colors, cursor controls, and prompts
- **Interactive I/O**: Bidirectional data flow between client and terminal
- **Multi-Session**: Support for concurrent terminal sessions
- **WebSocket Integration**: Real-time communication via WebSockets
- **Kalman Commands**: Specialized commands for trading system debugging
- **Session Management**: Automatic cleanup and session tracking
- **Security**: User authentication and permission controls

### Trading System Integration

- **Pattern Monitoring**: Real-time monitoring of patterns #51, #56, #68, #75
- **Performance Metrics**: Live latency and throughput statistics
- **Debug Tools**: Interactive debugging of Kalman filter states
- **Automation**: Scriptable terminal operations
- **Market Simulation**: Integrated tick generation and testing

## 📋 Requirements

- **Bun v1.3.5+** (for Terminal API support)
- **POSIX System** (Linux/macOS - Windows support pending)
- **Node.js v18+** (for client-side examples)
- **Redis** (optional, for session persistence)

## 🛠️ Installation

```bash
# Install dependencies
bun install

# Build the project
bun run build

# Start terminal server
bun run terminal:server
```

## 🎮 Quick Start

### 1. Start the Terminal Server

```bash
bun src/bun/terminal_server.bun.ts
```

Output:

```text
🎯 Kalman Terminal Server running on http://localhost:3001
📊 WebSocket endpoint: ws://localhost:3001
🔧 API endpoints:
  POST /terminal - Create session
  POST /terminal/input - Send input
  POST /terminal/resize - Resize terminal
  GET /terminal/sessions - List sessions
  POST /terminal/close - Close session
  POST /terminal/kalman - Execute Kalman command
```

### 2. Connect via WebSocket Client

```typescript
import { KalmanTerminalClient } from './src/bun/terminal_client.bun.ts'

const client = new KalmanTerminalClient()
await client.connect()

// Send commands
client.sendInput('kalman-status\n')

// Execute specialized commands
const status = await client.executeKalmanCommand('kalman-test')
console.log(status)
```

### 3. Use HTTP API

```bash
# Create new session
curl -X POST http://localhost:3001/terminal \
  -H "Content-Type: application/json" \
  -d '{"userId": "trader1"}'

# Send input to session
curl -X POST http://localhost:3001/terminal/input \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "abc-123", "input": "ls -la\n"}'

# Execute Kalman command
curl -X POST http://localhost:3001/terminal/kalman \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "abc-123", "command": "kalman-status"}'
```

## 📚 API Reference

### Server API

#### Create Session

```http
POST /terminal
Content-Type: application/json

{
  "userId": "optional-user-id"
}
```

Response:

```json
{
  "sessionId": "uuid-string",
  "message": "Terminal session created",
  "config": {
    "cols": 120,
    "rows": 40
  }
}
```

#### Send Input

```http
POST /terminal/input
Content-Type: application/json

{
  "sessionId": "uuid-string",
  "input": "command\n"
}
```

#### Resize Terminal

```http
POST /terminal/resize
Content-Type: application/json

{
  "sessionId": "uuid-string",
  "cols": 140,
  "rows": 50
}
```

#### Execute Kalman Command

```http
POST /terminal/kalman
Content-Type: application/json

{
  "sessionId": "uuid-string",
  "command": "kalman-status"
}
```

### WebSocket API

#### Establish WebSocket Connection

```javascript
const ws = new WebSocket('ws://localhost:3001')

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  console.log(message)
}
```

#### Send Input via WebSocket

```javascript
ws.send(JSON.stringify({
  type: 'terminal_input',
  sessionId: 'uuid-string',
  input: 'command\n'
}))
```

#### Execute Kalman Command via WebSocket

```javascript
ws.send(JSON.stringify({
  type: 'kalman_command',
  sessionId: 'uuid-string',
  command: 'kalman-status'
}))
```

## 🎯 Kalman Commands

### Built-in Commands

| Command | Description | Example Output |
|---------|-------------|----------------|
| `kalman-status` | Show filter performance metrics | Latency, success rate, active patterns |
| `kalman-test` | Run pattern detection test | Backtest results and performance |
| `kalman-monitor` | Start real-time monitoring | Live market data and signals |
| `kalman-config` | Display configuration | Pattern parameters and settings |
| `help` | Show all available commands | Command list and usage |

### Example Usage

```bash
# Check system status
$ kalman-status
📊 Kalman Filter Status:
{
  "patterns": {
    "Pattern #51 (HT Inference)": "Active",
    "Pattern #56 (Micro-Suspension)": "Active",
    "Pattern #68 (Steam Propagation)": "Active",
    "Pattern #75 (Velocity Convexity)": "Active"
  },
  "performance": {
    "avg_latency": "1.2ms",
    "success_rate": "98.5%",
    "total_signals": "1,247",
    "active_filters": "4"
  }
}

# Run performance test
$ kalman-test
✅ Kalman Filter Test Results:
Total Ticks: 12000
Signals Generated: 89
Avg Latency: 1.23ms
Processing Time: 14567.89ms
Throughput: 823.4 ticks/sec

# Start monitoring
$ kalman-monitor
🔍 Starting real-time monitoring...
Monitoring Pattern #75 (Velocity Convexity)
Current market: NBA - Last 2 minutes
Velocity: 0.25 pt/s (increasing)
Edge: 0.8 points (above threshold)
Confidence: 72%
Status: 🟢 ACTIVE - Opportunity detected
```

## 🔧 Advanced Usage

### Multi-Session Management

```typescript
// Create multiple sessions for different tasks
const sessions = {
  monitoring: await createSession('monitor'),
  trading: await createSession('trader'),
  analysis: await createSession('analyst'),
}

// Assign specialized tasks
sessions.monitoring.sendInput('kalman-monitor\n')
sessions.trading.sendInput('echo "📈 Trading bot active"\n')
sessions.analysis.sendInput('kalman-status\n')
```

### Automation Scripts

```bash
#!/bin/bash
# automated_analysis.sh

echo "🚀 Starting automated trading analysis..."

# Check system status
kalman-status

# Run pattern detection test
kalman-test

# Monitor for opportunities (5 minutes)
echo "🔍 Scanning for arbitrage opportunities..."
for i in {1..300}; do
  echo "Scan $i: Checking patterns..."
  kalman-monitor
  sleep 1
done

echo "✅ Automation complete"
```

### Browser Integration

```html
<!DOCTYPE html>
<html>
<head>
    <title>Kalman Terminal</title>
</head>
<body>
    <div id="terminal-container"></div>
    <script src="terminal_client.js"></script>
    <script>
        const terminal = createBrowserTerminal(
            document.getElementById('terminal-container')
        )
    </script>
</body>
</html>
```

## 📊 Monitoring & Debugging

### Performance Metrics

The terminal provides real-time performance metrics:

- **Latency**: Average processing time per tick
- **Throughput**: Ticks processed per second
- **Success Rate**: Pattern detection accuracy
- **Memory Usage**: System resource consumption
- **Active Patterns**: Currently running pattern detectors

### Debug Mode

Enable debug mode for detailed logging:

```bash
export KALMAN_MODE=debug
export KALMAN_LOG_LEVEL=trace

# Start terminal with debug logging
bun src/bun/terminal_server.bun.ts
```

### Session Monitoring

```bash
# List active sessions
curl http://localhost:3001/terminal/sessions

# Response
{
  "sessions": [
    {
      "id": "abc-123",
      "createdAt": 1703123456789,
      "lastActivity": 1703123459876,
      "userId": "trader1"
    }
  ]
}
```

## 🚀 Production Deployment

### Docker Configuration

```dockerfile
FROM oven/bun:1.3.5

WORKDIR /app
COPY . .

RUN bun install
RUN bun run build

EXPOSE 3001

CMD ["bun", "src/bun/terminal_server.bun.ts"]
```

### Environment Variables

```bash
# Terminal configuration
KALMAN_TERMINAL_MAX_SESSIONS=50
KALMAN_TERMINAL_TIMEOUT=7200000  # 2 hours
KALMAN_TERMINAL_COLS=140
KALMAN_TERMINAL_ROWS=50

# Security
KALMAN_TERMINAL_AUTH_REQUIRED=true
KALMAN_TERMINAL_API_KEY=your-secret-key

# Performance
KALMAN_TERMINAL_CLEANUP_INTERVAL=60000  # 1 minute
```

### Redis Integration

```typescript
// Configure Redis for session persistence
const terminalServer = new KalmanTerminalServer({
  redis: {
    host: 'localhost',
    port: 6379,
    db: 0,
  },
  sessionPersistence: true,
})
```

## 🔒 Security Considerations

### Authentication

```typescript
// Add JWT authentication
const terminalServer = new KalmanTerminalServer({
  auth: {
    required: true,
    jwtSecret: 'your-secret-key',
    permissions: ['basic', 'trading', 'admin'],
  }
})
```

### Input Validation

```typescript
// Sanitize terminal input
function sanitizeInput(input: string): string {
  // Remove dangerous commands
  const dangerous = ['rm -rf', 'sudo', 'chmod 777']
  return input.replace(new RegExp(dangerous.join('|'), 'g'), '#BLOCKED#')
}
```

### Rate Limiting

```typescript
// Implement rate limiting
const rateLimiter = new Map<string, number>()

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now()
  const lastRequest = rateLimiter.get(sessionId) || 0

  if (now - lastRequest < 100) { // 100ms cooldown
    return false
  }

  rateLimiter.set(sessionId, now)
  return true
}
```

## 🐛 Troubleshooting

### Common Issues

1. **PTY Not Available**

   ```text
   Error: PTY support not available on this platform
   ```

   Solution: Use Linux/macOS, Windows support is pending

2. **Session Timeout**

   ```text
   Error: Session expired
   ```

   Solution: Increase timeout or send keepalive commands

3. **WebSocket Connection Failed**

   ```text
   Error: WebSocket connection failed
   ```

   Solution: Check firewall settings and port availability

### Debug Logging

```bash
# Enable debug logging
DEBUG=kalman:* bun src/bun/terminal_server.bun.ts

# Monitor logs
tail -f logs/terminal.log
```

### Performance Tuning

```typescript
// Optimize for high-frequency trading
const terminalServer = new KalmanTerminalServer({
  cols: 80,  // Smaller terminal = faster rendering
  rows: 24,
  bufferSize: 1024,  // Smaller buffer for lower latency
  compression: true,  // Enable WebSocket compression
})
```

## 📚 Examples

### Basic Terminal Client

```bash
bun src/bun/terminal_client.bun.ts
```

### Interactive Demo

```bash
bun src/bun/terminal_demo.bun.ts demo
```

### Production Deployment

```bash
bun src/bun/terminal_demo.bun.ts production
```

### Playground Mode

```bash
bun src/bun/terminal_demo.bun.ts playground
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Bun Team** for the amazing Terminal API
- **Kalman Filter** research community
- **Trading System** contributors

---

**🎯 Happy Trading with Kalman Filter Terminal!**
