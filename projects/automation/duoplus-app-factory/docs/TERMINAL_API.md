# Terminal Management API Documentation

## Overview

The Nebula-Flow™ Terminal Management API provides secure, scalable pseudo-terminal (PTY) support using Bun's built-in Terminal API. This enables interactive terminal applications, remote shell access, and terminal-based debugging tools within the DuoPlus ecosystem.

## Features

- **Secure PTY Sessions**: Isolated terminal environments with configurable limits
- **WebSocket Support**: Real-time bidirectional communication
- **REST API**: Complete CRUD operations for terminal management
- **Session Management**: Automatic cleanup, timeouts, and resource limits
- **POSIX Compliance**: Full TTY support on Linux/macOS systems
- **GDPR Compliance**: Secure logging with data masking

## Quick Start

### CLI Usage

```bash
# Create a new terminal session
bun run terminal:create --shell /bin/zsh --cols 120 --rows 30

# List active sessions
bun run terminal:list

# Start interactive shell
bun run terminal:shell

# Attach to existing session
bun run terminal attach <session-id>
```

### API Usage

```bash
# Create terminal session
curl -X POST http://localhost:3000/api/terminal/create \
  -H "Content-Type: application/json" \
  -d '{"cols": 80, "rows": 24, "shell": "/bin/bash"}'

# List sessions
curl http://localhost:3000/api/terminal/list

# Write to terminal
curl -X POST http://localhost:3000/api/terminal/write?sessionId=pty-123 \
  -H "Content-Type: text/plain" \
  -d "ls -la\n"
```

## API Reference

### REST Endpoints

#### POST /api/terminal/create
Create a new terminal session.

**Request Body:**
```json
{
  "cols": 80,
  "rows": 24,
  "shell": "/bin/bash",
  "cwd": "/app",
  "env": {"KEY": "value"}
}
```

**Response:**
```json
{
  "sessionId": "pty-1643723400000-abc123",
  "status": "created"
}
```

#### GET /api/terminal/list
List all active terminal sessions.

**Response:**
```json
[
  {
    "id": "pty-1643723400000-abc123",
    "startTime": "2024-01-22T14:30:00.000Z",
    "lastActivity": "2024-01-22T14:35:00.000Z",
    "isActive": true,
    "shell": "/bin/bash",
    "pid": 12345
  }
]
```

#### POST /api/terminal/write?sessionId={id}
Write data to a terminal session.

**Request:** Plain text data to send to terminal
**Response:** `{"success": true, "bytesWritten": 6}`

#### POST /api/terminal/resize?sessionId={id}&cols={cols}&rows={rows}
Resize terminal dimensions.

**Response:** `{"success": true, "cols": 120, "rows": 30}`

#### DELETE /api/terminal/close?sessionId={id}
Close a terminal session.

**Response:** `{"success": true, "sessionId": "pty-123"}`

#### GET /api/terminal/stats
Get service statistics.

**Response:**
```json
{
  "totalSessions": 5,
  "activeSessions": 3,
  "maxSessions": 10,
  "uptime": 3600000
}
```

### WebSocket Endpoints

#### GET /ws/terminal?sessionId={id}
Establish WebSocket connection for real-time terminal communication.

**Message Format:**
- Client → Server: Terminal input (raw bytes)
- Server → Client: Terminal output (raw bytes)

**Example:**
```javascript
const ws = new WebSocket('ws://localhost:3000/ws/terminal?sessionId=pty-123');

ws.onmessage = (event) => {
  console.log('Terminal output:', event.data);
};

ws.send('ls -la\n');
```

## Configuration

### Environment Variables

```bash
# Terminal service configuration
TERMINAL_MAX_SESSIONS=10          # Maximum concurrent sessions
TERMINAL_SESSION_TIMEOUT=1800000  # Session timeout in ms (30 min)
TERMINAL_DEFAULT_SHELL=/bin/bash  # Default shell
```

### Security Features

- **Session Isolation**: Each terminal runs in isolated environment
- **Resource Limits**: Configurable max sessions and timeout
- **Input Validation**: All parameters validated and sanitized
- **Audit Logging**: Complete session lifecycle logging
- **GDPR Compliance**: Sensitive data masking in logs

## Error Handling

### Common Error Codes

- `400 Bad Request`: Invalid parameters
- `404 Not Found`: Session not found
- `429 Too Many Requests`: Max sessions reached
- `500 Internal Server Error`: Server error

### Error Response Format

```json
{
  "error": "Descriptive error message",
  "code": "ERROR_CODE",
  "details": "Additional context"
}
```

## Examples

### Node.js Client

```javascript
import { TerminalClient } from '@duoplus/terminal-client';

const client = new TerminalClient('http://localhost:3000');

// Create session
const session = await client.createTerminal({
  cols: 120,
  rows: 30,
  shell: '/bin/zsh'
});

// Send command
await client.write(session.id, 'npm install\n');

// Get output via WebSocket
const ws = client.connectWebSocket(session.id);
ws.on('data', console.log);
```

### Python Client

```python
import requests
import websocket

# Create session
response = requests.post('http://localhost:3000/api/terminal/create', json={
    'cols': 80,
    'rows': 24,
    'shell': '/bin/bash'
})
session = response.json()

# Connect via WebSocket
ws = websocket.WebSocket()
ws.connect(f'ws://localhost:3000/ws/terminal?sessionId={session["sessionId"]}')
ws.send('ls -la\n')
```

## Performance Metrics

- **Session Creation**: < 100ms
- **Input Latency**: < 10ms
- **Max Concurrent Sessions**: 10 (configurable)
- **Memory Usage**: ~2MB per session
- **Session Timeout**: 30 minutes (configurable)

## Limitations

- **Platform Support**: Linux and macOS only (POSIX systems)
- **Windows**: Not supported due to Bun Terminal API limitations
- **Resource Usage**: Each session consumes system resources
- **Network Latency**: WebSocket performance depends on network quality

## Troubleshooting

### Common Issues

1. **"Maximum sessions reached"**
   - Increase `TERMINAL_MAX_SESSIONS` environment variable
   - Close inactive sessions

2. **"Session not found"**
   - Verify session ID is correct
   - Check if session expired due to timeout

3. **WebSocket connection failed**
   - Ensure session is active before connecting
   - Check network connectivity

4. **Permission denied errors**
   - Verify shell path exists and is executable
   - Check working directory permissions

### Debug Mode

Enable debug logging:
```bash
DEBUG=terminal* bun run start
```

## Integration Guide

### Adding to Existing Services

```typescript
import { ptyService } from './services/ptyService';

// Create terminal for debugging
const debugTerminal = await ptyService.createSession({
  shell: '/bin/bash',
  cwd: '/app/logs',
  onData: (data) => logger.debug(data)
});
```

### Custom Authentication

```typescript
import { authMiddleware } from './middleware/authMiddleware';

// Protect terminal routes
app.use('/api/terminal', authMiddleware);
```

## Support

For issues and feature requests, please visit:
- [GitHub Issues](https://github.com/brendadeeznuts1111/duoplus-app-factory/issues)
- [Documentation](https://github.com/brendadeeznuts1111/duoplus-app-factory/tree/main/docs)
- [Discord Community](https://discord.gg/duoplus)