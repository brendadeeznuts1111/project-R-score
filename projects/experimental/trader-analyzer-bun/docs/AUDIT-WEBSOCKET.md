# **WebSocket Audit Server - Real-Time Monitoring**

**Version:** 9.1.5.21.0.0.0 - 9.1.5.23.0.0.0  
**Status:** ✅ Complete & Operational

---

## **Overview**

The WebSocket Audit Server provides real-time monitoring of documentation audits via Bun's high-performance WebSocket implementation. Clients can connect, subscribe to audit topics, and receive live updates as audits progress.

### **Key Features**

- ✅ **Real-Time Updates**: Live progress, matches, and orphan detection
- ✅ **Pub/Sub Topics**: Topic-based message broadcasting
- ✅ **Multiple Clients**: Support for concurrent connections
- ✅ **HTTP API**: REST endpoints for audit control
- ✅ **High Performance**: Built on Bun's 7x faster WebSocket implementation

---

## **Quick Start**

### **Start the Server**

```bash
# Default port 3002
bun run audit:websocket

# Custom port
AUDIT_WS_PORT=8080 bun run audit:websocket

# Custom hostname and port
AUDIT_WS_PORT=8080 AUDIT_WS_HOSTNAME=0.0.0.0 bun run audit:websocket
```

### **Connect a Client**

```bash
# Run example client
bun run examples/audit-websocket-client.ts

# Or connect from browser
const socket = new WebSocket('ws://localhost:3002/audit/ws');
```

---

## **WebSocket API**

### **Connection**

```typescript
const socket = new WebSocket('ws://localhost:3002/audit/ws');
```

### **Message Types**

#### **Client → Server**

```typescript
// Subscribe to topic
{
  type: "subscribe",
  payload: { topic: "audit:progress" }
}

// Unsubscribe from topic
{
  type: "unsubscribe",
  payload: { topic: "audit:progress" }
}

// Start audit
{
  type: "start_audit",
  payload: {
    patterns: ["\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+"],
    directory: "src/",
    useWorkers: false
  }
}

// Stop audit
{
  type: "stop_audit",
  payload: { auditId: "audit-123" }
}

// Ping (keepalive)
{
  type: "ping"
}
```

#### **Server → Client**

```typescript
// Connection established
{
  type: "connected",
  clientId: "client-123",
  timestamp: "2024-...",
  topics: ["audit:progress", "audit:matches"]
}

// Subscription confirmed
{
  type: "subscribed",
  topic: "audit:progress",
  subscriptions: ["audit:progress", "audit:matches"]
}

// Audit started
{
  type: "audit_started",
  auditId: "audit-123",
  timestamp: "2024-..."
}

// Progress update
{
  type: "progress",
  auditId: "audit-123",
  progress: 50,
  status: "running"
}

// Pattern match found
{
  type: "match",
  auditId: "audit-123",
  pattern: "Bun\\.inspect",
  file: "src/audit/orphan-detector.ts",
  line: 42
}

// Orphan detected
{
  type: "orphan",
  auditId: "audit-123",
  docNumber: "9.1.5.7.0.0.0",
  file: "docs/orphan-doc.md"
}

// Audit completed
{
  type: "audit_completed",
  auditId: "audit-123",
  result: {
    duration: 1234,
    totalMatches: 1095,
    totalOrphans: 3,
    totalUndocumented: 5,
    mode: "spawn"
  }
}

// Error
{
  type: "error",
  message: "Error description"
}

// Pong (response to ping)
{
  type: "pong",
  timestamp: 1234567890
}
```

---

## **Topics**

### **Available Topics**

| Topic | Description | Message Types |
|-------|-------------|---------------|
| `audit:progress` | Audit progress updates | `progress` |
| `audit:matches` | Pattern matches found | `match` |
| `audit:orphans` | Orphaned documentation | `orphan` |
| `audit:results` | Final audit results | `audit_completed` |
| `audit:errors` | Audit errors | `audit_error` |
| `audit:system` | System events | `client_connected`, `client_disconnected`, `audit_started`, `audit_stopped` |

### **Subscribing to Topics**

```typescript
socket.addEventListener('open', () => {
  // Subscribe to progress updates
  socket.send(JSON.stringify({
    type: "subscribe",
    payload: { topic: "audit:progress" }
  }));

  // Subscribe to matches
  socket.send(JSON.stringify({
    type: "subscribe",
    payload: { topic: "audit:matches" }
  }));
});
```

---

## **HTTP API**

### **Health Check**

```bash
curl http://localhost:3002/audit/health
```

**Response:**
```json
{
  "status": "ok",
  "clients": 3,
  "activeAudits": 1,
  "timestamp": "2024-..."
}
```

### **Start Audit**

```bash
curl -X POST http://localhost:3002/audit/start \
  -H "Content-Type: application/json" \
  -d '{
    "patterns": ["\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+"],
    "directory": "src/",
    "useWorkers": false
  }'
```

**Response:**
```json
{
  "auditId": "audit-123",
  "status": "started",
  "timestamp": "2024-..."
}
```

### **Stop Audit**

```bash
curl -X POST http://localhost:3002/audit/stop \
  -H "Content-Type: application/json" \
  -d '{
    "auditId": "audit-123"
  }'
```

**Response:**
```json
{
  "auditId": "audit-123",
  "status": "stopped"
}
```

---

## **Example Client**

See `examples/audit-websocket-client.ts` for a complete example:

```typescript
import { WebSocket } from 'bun';

const socket = new WebSocket('ws://localhost:3002/audit/ws');

socket.addEventListener('open', () => {
  // Subscribe to topics
  socket.send(JSON.stringify({
    type: "subscribe",
    payload: { topic: "audit:progress" }
  }));

  // Start audit
  socket.send(JSON.stringify({
    type: "start_audit",
    payload: {
      patterns: ["\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+"],
      directory: "src/",
      useWorkers: false
    }
  }));
});

socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data as string);
  console.log('Received:', data);
});
```

---

## **Browser Integration**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Audit Monitor</title>
</head>
<body>
  <div id="status">Connecting...</div>
  <div id="progress"></div>
  <div id="matches"></div>
  <div id="orphans"></div>

  <script>
    const socket = new WebSocket('ws://localhost:3002/audit/ws');

    socket.addEventListener('open', () => {
      document.getElementById('status').textContent = 'Connected';
      
      // Subscribe to topics
      socket.send(JSON.stringify({
        type: "subscribe",
        payload: { topic: "audit:progress" }
      }));
      
      socket.send(JSON.stringify({
        type: "subscribe",
        payload: { topic: "audit:matches" }
      }));
      
      socket.send(JSON.stringify({
        type: "subscribe",
        payload: { topic: "audit:orphans" }
      }));
    });

    socket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      
      switch(data.type) {
        case 'progress':
          document.getElementById('progress').textContent = 
            `Progress: ${data.progress}%`;
          break;
        case 'match':
          const matchesDiv = document.getElementById('matches');
          matchesDiv.innerHTML += `<div>Match: ${data.pattern} in ${data.file}</div>`;
          break;
        case 'orphan':
          const orphansDiv = document.getElementById('orphans');
          orphansDiv.innerHTML += `<div>Orphan: ${data.docNumber} in ${data.file}</div>`;
          break;
      }
    });
  </script>
</body>
</html>
```

---

## **Performance**

Bun's WebSocket implementation provides:

- **7x more throughput** than Node.js + `ws`
- **~700,000 messages/second** on Linux x64
- **Low latency** for real-time updates
- **Efficient memory usage** with shared handlers

---

## **Configuration**

### **Environment Variables**

```bash
# WebSocket server port
AUDIT_WS_PORT=3002

# WebSocket server hostname
AUDIT_WS_HOSTNAME=localhost

# WebSocket URL (for clients)
AUDIT_WS_URL=ws://localhost:3002/audit/ws
```

### **Server Options**

The WebSocket server uses Bun's default WebSocket settings:

- **idleTimeout**: 120 seconds (default)
- **maxPayloadLength**: 16 MB (default)
- **perMessageDeflate**: false (default)
- **backpressureLimit**: 1 MB (default)

---

## **Cross-References**

- **9.1.5.21.0.0.0** → WebSocket Audit Server
- **9.1.5.22.0.0.0** → WebSocket Audit Server CLI
- **9.1.5.23.0.0.0** → WebSocket Audit Client Example
- **9.1.5.11.0.0.0** → RealTimeProcessManager
- **9.1.5.18.0.0.0** → Main Audit Orchestrator
- **7.4.6.0.0.0.0** → Bun WebSocket API Documentation

---

## **Troubleshooting**

### **Connection Refused**

```bash
# Check if server is running
curl http://localhost:3002/audit/health

# Check port availability
lsof -i :3002
```

### **No Messages Received**

- Verify topic subscription
- Check WebSocket connection status
- Ensure audit is started

### **High Memory Usage**

- Reduce concurrent connections
- Increase `idleTimeout` to close idle connections
- Use compression for large payloads

---

## **Future Enhancements**

- [ ] WebSocket authentication
- [ ] Rate limiting per client
- [ ] Audit history persistence
- [ ] WebSocket clustering support
- [ ] GraphQL over WebSocket

---

**Last Updated:** 2024  
**Status:** ✅ Production Ready
