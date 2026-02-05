# Bun Terminal API (PTY Support) Implementation Guide

This guide demonstrates the comprehensive implementation of Bun v1.3.5's new `Bun.Terminal` API, providing powerful pseudo-terminal (PTY) support for backend applications.

## 🚀 Features

- **Interactive PTY Sessions**: Spawn and control TTY-aware subprocesses (bash, vim, htop, etc.)
- **Real-time Communication**: WebSocket support for bidirectional terminal interaction
- **Session Management**: Automatic cleanup, timeout handling, and multi-session support
- **Security**: Input validation, command sanitization, and access controls
- **Reusable Terminals**: Share PTY instances across multiple operations
- **Resize Support**: Dynamic terminal resizing for responsive applications
- **Comprehensive Testing**: Full test suite covering all PTY functionality

## 📁 Project Structure

```
kal-poly-bot/
├── src/
│   ├── terminal-server.ts      # Main PTY server with HTTP/WebSocket API
│   └── terminal-utils.ts       # Reusable PTY utility functions
├── examples/
│   └── terminal-pty-examples.ts # Demonstrations of PTY capabilities
├── __tests__/
│   └── terminal-pty.test.ts    # Comprehensive test suite
├── demo-app/
│   └── terminal-client.html    # Web-based terminal client
├── docs/
│   └── BUN_TERMINAL_API_GUIDE.md # This guide
└── package.json                # Updated with PTY scripts
```

## 🛠️ Installation & Setup

### Prerequisites

- **Bun v1.3.5+**: Required for Terminal API support
- **POSIX System**: Linux/macOS (Windows support pending)

### Quick Start

```bash
# Clone and install dependencies
bun install

# Start the PTY server
bun run terminal:server

# Open the web client (in another terminal)
bun run terminal:client

# Run examples
bun run terminal:examples

# Run tests
bun run terminal:test
```

## 🔧 Core Components

### 1. Terminal Server (`src/terminal-server.ts`)

The main server providing HTTP API and WebSocket support for PTY operations.

**Key Features:**
- Session management with UUID-based identification
- Real-time bidirectional communication via WebSockets
- Security validation and input sanitization
- Automatic cleanup of inactive sessions
- Support for multiple shells (bash, zsh, sh, fish)

**API Endpoints:**
```
POST /api/sessions           # Create new terminal session
GET  /api/sessions           # List active sessions
GET  /api/sessions/output    # Get session output
POST /api/sessions/input     # Send input to session
DELETE /api/sessions         # Delete session
WS   /ws                     # WebSocket for real-time interaction
```

### 2. Terminal Utilities (`src/terminal-utils.ts`)

Reusable utility functions for PTY operations.

**Main Classes:**
- `TerminalSecurity`: Input validation and sanitization
- `TerminalManager`: Session lifecycle management
- `CommandExecutor`: Command execution helpers
- `OutputProcessor`: Output formatting and parsing
- `TerminalResizer`: Dynamic terminal sizing
- `FileTerminalOps`: File operations via PTY
- `ProcessMonitor`: System monitoring utilities

### 3. Examples (`examples/terminal-pty-examples.ts`)

Comprehensive demonstrations of PTY capabilities:

- Basic shell interaction with command sequences
- Interactive programs (vim, htop, nano)
- Reusable terminal instances
- Terminal resize operations
- Process monitoring

### 4. Web Client (`demo-app/terminal-client.html`)

Full-featured web-based terminal client with:

- Real-time terminal display using xterm.js
- Session management interface
- Quick command buttons
- Terminal resize controls
- Connection status monitoring
- Session statistics

## 📖 Usage Examples

### Basic PTY Shell

```typescript
import { spawn } from "bun";

const commands = [
  "echo 'Welcome to PTY!'",
  "ls -la",
  "pwd",
  "exit"
];

const proc = spawn(["bash"], {
  terminal: {
    cols: 80,
    rows: 24,
    data(terminal, data) {
      const output = new TextDecoder().decode(data);
      console.log(output);

      if (output.includes("$ ")) {
        const cmd = commands.shift();
        if (cmd) terminal.write(cmd + "\n");
      }
    },
  },
});

await proc.exited;
proc.terminal?.close();
```

### Interactive Program (vim)

```typescript
const proc = spawn(["vim", "README.md"], {
  terminal: {
    cols: 120,
    rows: 40,
    data(term, data) {
      process.stdout.write(data);
    },
  },
});

// Handle resize
process.stdout.on("resize", () => {
  proc.terminal?.resize(process.stdout.columns, process.stdout.rows);
});

// Forward input
process.stdin.setRawMode(true);
process.stdin.on("data", (chunk) => {
  proc.terminal?.write(chunk);
});
```

### Reusable Terminal

```typescript
await using terminal = new Bun.Terminal({
  cols: 80,
  rows: 24,
  data(term, data) {
    console.log(new TextDecoder().decode(data));
  },
});

// Multiple commands on same terminal
const proc1 = spawn(["echo", "First"], { terminal });
await proc1.exited;

const proc2 = spawn(["pwd"], { terminal });
await proc2.exited;

// Auto-cleanup with await using
```

### HTTP API Usage

```bash
# Create session
curl -X POST http://localhost:3000/api/sessions \
  -H 'Content-Type: application/json' \
  -d '{"shell": "bash", "cols": 120, "rows": 40}'

# Send input
curl -X POST http://localhost:3000/api/sessions/input \
  -H 'Content-Type: application/json' \
  -d '{"sessionId": "uuid", "input": "ls -la"}'

# Get output
curl "http://localhost:3000/api/sessions/output?sessionId=uuid"

# WebSocket connection
const ws = new WebSocket('ws://localhost:3000/ws?sessionId=uuid');
```

## 🔒 Security Features

### Input Sanitization

```typescript
// Dangerous input filtering
const dangerous = ['&&', '||', ';', '|', '`', '$(', '${', '>', '>>', '<'];
// Automatic removal of command injection attempts
```

### Command Validation

```typescript
// Blocked dangerous commands
const blocked = ['rm -rf', 'sudo rm', 'mkfs', 'dd if=', 'format'];
// Shell validation (bash, zsh, sh, fish only)
```

### Session Security

- UUID-based session identification
- Automatic session timeout (30 minutes default)
- Maximum session limits (100 concurrent)
- Secure WebSocket connections

## 🧪 Testing

Run the comprehensive test suite:

```bash
bun run terminal:test
```

**Test Coverage:**
- Terminal security validation
- Session management
- Command execution
- Output processing
- Terminal resizing
- File operations
- Process monitoring
- Error handling
- Integration tests

## 🎯 Advanced Use Cases

### 1. Remote Development Environment

```typescript
// Create development container PTY
const devSession = TerminalManager.createSession({
  shell: 'bash',
  cols: 120,
  rows: 40,
  env: {
    NODE_ENV: 'development',
    EDITOR: 'vim'
  }
});

// Stream to web client
devSession.terminal.data = (term, data) => {
  websocket.send(JSON.stringify({
    type: 'output',
    data: new TextDecoder().decode(data)
  }));
};
```

### 2. Automated Testing Framework

```typescript
// Run tests in PTY for accurate TTY behavior
async function runTestsInPTY() {
  const commands = [
    'npm install',
    'npm test',
    'npm run coverage'
  ];

  const result = await CommandExecutor.executeInteractive(
    commands,
    { cols: 120, rows: 40 },
    (output) => console.log(output)
  );

  return result;
}
```

### 3. System Monitoring Dashboard

```typescript
// Real-time system monitoring
const monitorSession = TerminalManager.createSession();

setInterval(async () => {
  await ProcessMonitor.getSystemInfo({}, monitorSession.terminal);
}, 5000);
```

### 4. Interactive Tutorial System

```typescript
// Step-by-step tutorial with PTY guidance
const tutorialCommands = [
  'echo "Welcome to the tutorial!"',
  'ls -la',
  'echo "Try editing a file with vim"',
  'vim tutorial.txt'
];

CommandExecutor.executeInteractive(tutorialCommands, {
  cols: 100,
  rows: 30
}, (output) => {
  // Parse output and provide guidance
  if (output.includes('vim')) {
    console.log('You are now in vim. Press :q to exit.');
  }
});
```

## 🔧 Configuration

### Server Configuration

```typescript
const config = {
  PORT: 3000,
  HOST: "0.0.0.0",
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  MAX_SESSIONS: 100,
  DEFAULT_SHELL: "bash",
  DEFAULT_SIZE: { cols: 120, rows: 40 }
};
```

### Terminal Options

```typescript
const terminalConfig = {
  cols: 120,           // Terminal width
  rows: 40,            // Terminal height
  shell: "bash",       // Shell type
  env: {               // Environment variables
    TERM: "xterm-256color",
    NODE_ENV: "development"
  },
  timeout: 60000       // Session timeout in ms
};
```

## 📊 Performance Considerations

### Memory Management

- Output buffering limited to 1000 lines per session
- Automatic cleanup of inactive sessions
- Efficient WebSocket message handling

### Concurrency

- Support for 100+ concurrent sessions
- Non-blocking I/O operations
- Efficient process management

### Optimization Tips

```typescript
// Use reusable terminals for batch operations
await using terminal = new Bun.Terminal({...});

// Batch commands to reduce overhead
const commands = ['cmd1', 'cmd2', 'cmd3'];
await CommandExecutor.executeInteractive(commands);

// Clean up sessions promptly
TerminalManager.cleanupInactiveSessions();
```

## 🐛 Troubleshooting

### Common Issues

1. **PTY not supported**: Ensure Bun v1.3.5+ on POSIX system
2. **WebSocket connection failed**: Check server URL and session ID
3. **Command not executing**: Verify command validation and sanitization
4. **Terminal display issues**: Check terminal size and resize handling

### Debug Mode

```typescript
// Enable debug logging
process.env.DEBUG = 'terminal:*';

// Monitor session activity
setInterval(() => {
  console.log('Active sessions:', TerminalManager.listSessions().length);
}, 10000);
```

## 🚀 Production Deployment

### Security Recommendations

1. **Authentication**: Add API key or JWT validation
2. **Rate Limiting**: Implement request throttling
3. **Network Security**: Use HTTPS/WSS for production
4. **Resource Limits**: Configure appropriate session limits
5. **Monitoring**: Track session metrics and errors

### Scaling Considerations

```typescript
// Redis for session storage in production
import Redis from 'ioredis';
const redis = new Redis();

// Session persistence
await redis.setex(`session:${sessionId}`, 1800, sessionData);

// Load balancing with sticky sessions
const sessionRouter = (sessionId) => {
  return hash(sessionId) % numServers;
};
```

## 📚 API Reference

### TerminalManager

```typescript
static createSession(config?: TerminalConfig): TerminalSession
static getSession(sessionId: string): TerminalSession | undefined
static destroySession(sessionId: string): boolean
static listSessions(): TerminalSession[]
static cleanupInactiveSessions(maxAge?: number): number
```

### CommandExecutor

```typescript
static executeCommand(command: string, config?: TerminalConfig): Promise<CommandResult>
static executeInteractive(commands: string[], config?: TerminalConfig, onOutput?: Function): Promise<CommandResult>
```

### TerminalSecurity

```typescript
static sanitizeInput(input: string): string
static validateShell(shell: string): boolean
static validateCommand(command: string): boolean
static generateSessionId(): string
static validateSessionId(sessionId: string): boolean
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Related Resources

- [Bun Documentation](https://bun.sh/docs)
- [Terminal API Specification](https://bun.sh/docs/api/terminal)
- [PTY Best Practices](https://www.man7.org/linux/man-pages/man7/pty.7.html)
- [WebSocket Security](https://tools.ietf.org/html/rfc6455)

---

**Built with ❤️ using Bun v1.3.5 Terminal API**
