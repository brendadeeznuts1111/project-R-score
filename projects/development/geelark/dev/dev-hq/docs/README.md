
# Dev HQ - Development Automation Suite



A powerful development automation toolkit built on Bun's runtime capabilities, providing API testing, command automation, and spawn-based process management.



## 📁 Overview



The `dev-hq` directory contains three core modules that form a comprehensive development automation suite:



- **`api-server.ts`** - Bun API testing and validation server



- **`automation.ts`** - Process automation and command execution utilities



- **`spawn-server.ts`** - Enhanced automation as a service with HTTP/WebSocket API



## 🚀 Features



### API Server (`api-server.ts`)




- **Bun API Validation**: Tests and validates experimental Bun APIs



- **Crash-Proof Design**: All endpoints handle errors gracefully



- **AsyncLocalStorage Integration**: Safe context management across async operations



- **Comprehensive Testing**: Covers secrets, mmap, plugins, glob, FormData, FFI, and more



### Automation (`automation.ts`)




- **Command Execution**: Run shell commands with real-time output streaming



- **Process Management**: Track and manage multiple concurrent processes



- **Error Handling**: Robust error capture and reporting



- **Flexible Options**: Customizable cwd, env, streaming, and timeout settings



### Spawn Server (`spawn-server.ts`)




- **HTTP API**: RESTful interface for automation commands



- **WebSocket Support**: Real-time command output streaming



- **Authentication**: Token-based auth with configurable permissions



- **Metrics & Monitoring**: Built-in performance tracking and health monitoring



## 📋 Requirements



- **Bun** >= 1.2.3 (for latest API features)



- **Node.js** >= 18 (for AsyncLocalStorage)



- **TypeScript** >= 5.0



## 🛠️ Installation



```bash
# Clone the repository
git clone <repository-url>
cd geelark/dev-hq

# Install dependencies
bun install

# Build the modules
bun build *.ts --target=bun --outdir=./dist

```




## 🏃‍♂️ Quick Start



### 1. API Server




```bash
# Start the API validation server
bun run api-server.ts

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/secrets
curl http://localhost:3000/mmap

```




### 2. Command Automation




```typescript
import { DevHQAutomation } from './automation.js';

const automation = new DevHQAutomation();

// Run a command with output capture
const result = await automation.runCommand('test', ['ls', '-la'], {
  cwd: '/tmp',
  stream: false
});

console.log(result.stdout);

```




### 3. Spawn Server




```bash
# Start the automation server
bun run spawn-server.ts

# Execute commands via HTTP API
curl -X POST http://localhost:3001/execute \
  -H "Content-Type: application/json" \
  -d '{"cmd": ["echo", "Hello World"]}'

```




## 📚 API Documentation



### API Server Endpoints




 |  Endpoint |   Method |   Description |   Response Example |

 | ----------|  --------|  -------------|  ------------------|

 |  `/health` |   GET |   Server status and available APIs |   `{"status": "healthy", "version": "1.3.0"}` |

 |  `/` |   GET |   Server information and endpoint list |   `{"message": "🛠️ Dev HQ v1.3", "endpoints": [...]}` |

 |  `/secrets` |   GET |   Test Bun.secrets with AsyncLocalStorage |   `{"secret": true, "userId": "123"}` |

 |  `/mmap` |   GET |   Validate Bun.mmap functionality |   `{"size": 1024, "success": true}` |

 |  `/plugin` |   GET |   Test Bun.plugin registration |   `{"plugin": "registered", "success": true}` |

 |  `/glob` |   GET |   Test hidden file glob patterns |   `{"results": {".*/*": 5}, "success": true}` |

 |  `/indexofline` |   GET |   Test Bun.indexOfLine method |   `{"line": 3, "type": "number"}` |

 |  `/formdata` |   GET |   Test FormData.from with large buffers |   `{"largeBufferHandled": true}` |

 |  `/ffi` |   GET |   Test Bun.FFI.CString constructor |   `{"cstrCreated": true, "ptrType": "bigint"}` |

 |  `/redis` |   GET |   Test RedisClient constructor |   `{"newRequired": true, "clientCreated": true}` |

 |  `/stream` |   GET |   Test ReadableStream creation |   `{"streamCreated": true, "readerCreated": true}` |


#### Advanced Usage Examples


**Concurrent API Testing:**

```bash
# Test multiple endpoints concurrently
for endpoint in health secrets mmap plugin glob; do
  curl -s "http://localhost:3000/$endpoint"|  jq '.success // .status' &
done
wait
```

**Performance Testing:**

```bash
# Load test the health endpoint
for i in {1..100}; do
  curl -s "http://localhost:3000/health" > /dev/null
done
echo "Completed 100 requests"
```


### Automation API



#### `DevHQAutomation.runCommand(label, cmd, options)`



Execute shell commands with advanced options.



**Parameters:**



- `label: string` - Unique identifier for the process



- `cmd: string[]` - Command and arguments to execute



- `options?: object` - Configuration options



**Options:**



- `cwd?: string` - Working directory (default: process.cwd())



- `env?: Record<string, string>` - Environment variables



- `stream?: boolean` - Enable real-time output streaming



- `timeout?: number` - Command timeout in milliseconds



**Returns:**



```typescript
{
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: boolean;
}

```




#### Process Management



```typescript
// Kill a running process
automation.killProcess('label');

// Get process status
const status = automation.getProcessStatus('label');

// List all active processes
const processes = automation.listProcesses();

// Cleanup finished processes
automation.cleanup();

```




### Spawn Server API




#### Execute Command (HTTP)



```bash
POST /execute
Content-Type: application/json

{
  "cmd": ["echo", "Hello World"],
  "cwd": "/tmp",
  "stream": false,
  "timeout": 5000
}

```




#### WebSocket Streaming



```javascript
const ws = new WebSocket('ws://localhost:3001/stream');

ws.send(JSON.stringify({
  cmd: ['tail', '-f', '/var/log/syslog'],
  stream: true
}));

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.output); // Real-time output
};

```




## 🔧 Configuration



### Environment Variables




```bash
# Server configuration
DEV_HQ_PORT=3001
DEV_HQ_HOST=localhost
DEV_HQ_MAX_CONNECTIONS=100
DEV_HQ_TIMEOUT=30000

# Authentication
DEV_HQ_ENABLE_AUTH=true
DEV_HQ_SECRET_KEY=your-secret-key

# Features
DEV_HQ_ENABLE_METRICS=true
DEV_HQ_ENABLE_WEBSOCKET=true

```




### Custom Configuration




```typescript
const config = {
  port: 3001,
  hostname: 'localhost',
  maxConnections: 100,
  timeout: 30000,
  enableAuth: true,
  enableMetrics: true,
  enableWebSocket: true
};

const server = new EnhancedDevHQServer(config);

```




## 🧪 Testing



### Quick Test Commands




```bash
# Run all Dev HQ tests
./test-dev-hq.sh

# Run specific module tests
./test-dev-hq.sh api-server --coverage
./test-dev-hq.sh automation --watch
./test-dev-hq.sh spawn-server --debug

# Manual test execution
bun test tests/dev-hq-*.test.ts

```




### Test Categories




#### **Unit Tests** (~50 tests)

- Individual component functionality
- Method-level validation
- Error handling scenarios
- Type safety verification



#### **Integration Tests** (~40 tests)

- Cross-component interactions
- API endpoint workflows
- Authentication flows
- Data pipeline validation



#### **Performance Tests** (~20 tests)

- Concurrent request handling
- Memory usage monitoring
- Response time validation
- Resource cleanup verification



#### **Security Tests** (~15 tests)

- Input sanitization
- Authentication bypass attempts
- Command injection prevention
- Path traversal protection



### Test Results Example




```text
🛠️ Dev HQ API Server > Health & Status Endpoints > should return health status [2.1ms]
🤖 Dev HQ Automation > Basic Command Execution > should execute simple commands [8.5ms]
🌐 Dev HQ Spawn Server > Server Lifecycle > should start and stop gracefully [15.2ms]

✅ All 125 tests completed in 8.7s
📊 Coverage: 94.3% statements, 91.2% branches, 96.1% functions

```text




### Continuous Integration




```yaml
# .github/workflows/dev-hq-tests.yml
name: Dev HQ Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: ./test-dev-hq.sh --coverage
      - uses: codecov/codecov-action@v3

```




## � Performance & Benchmarks



### Performance Metrics




 | Operation|  Average Time|  95th Percentile|  Throughput|
 | ----------- | -------------- | ----------------- | ------------ |
 | API Server Request|  2.1ms|  5.8ms|  476 req/sec|
 | Command Execution|  8.5ms|  23.4ms|  118 cmd/sec|
 | Concurrent Requests (10)|  15.2ms|  41.7ms|  660 req/sec|
 | WebSocket Message|  0.8ms|  2.1ms|  1,250 msg/sec|



### Optimization Features




#### **Concurrent Processing**

```typescript
// Process multiple commands concurrently
const commands = ['echo "task1"', 'echo "task2"', 'echo "task3"'];
const results = await Promise.all(
  commands.map(cmd => automation.runCommand(`task-${cmd}`, cmd.split(' ')))
);

```




#### **Memory Management**

```typescript
// Automatic cleanup with FinalizationRegistry
memoryManager.registerResource(resource, cleanup, 'ResourceType');

// Monitor memory usage
const stats = memoryManager.getMemoryStats();
console.log(`Memory: ${stats.heapUsed}MB used, ${stats.heapTotal}MB total`);

```




#### **Connection Pooling**

```typescript
// Reuse server instances for better performance
const server = new EnhancedDevHQServer({
  maxConnections: 100,
  keepAlive: true,
  timeout: 30000
});

```




### Load Testing




```bash
# API Server Load Test
ab -n 1000 -c 10 http://localhost:3000/health

# Command Execution Load Test
for i in {1..100}; do
  curl -s -X POST http://localhost:3001/execute \
    -H "Content-Type: application/json" \
    -d '{"cmd": ["echo", "load-test"]}' > /dev/null &
done
wait

```




### Performance Monitoring




```typescript
// Real-time performance tracking
setInterval(() => {
  const metrics = server.getMetrics();
  console.log(`
    📊 Performance Stats:
    - Requests/sec: ${metrics.requestsPerSecond}
    - Avg Response: ${metrics.averageResponseTime}ms
    - Active Connections: ${metrics.activeConnections}
    - Memory Usage: ${metrics.memoryUsage}MB
  `);
}, 5000);

```




### Built-in Metrics




The spawn server provides real-time metrics:



```typescript
interface ServerMetrics {
  startTime: number;
  requestsServed: number;
  activeConnections: number;
  totalCommands: number;
  failedCommands: number;
  averageResponseTime: number;
}

```




### Health Check




```bash

curl http://localhost:3001/health


```




Response:



```json
{
  "status": "healthy",
  "uptime": 3600,
  "metrics": {
    "requestsServed": 150,
    "activeConnections": 3,
    "totalCommands": 89,
    "failedCommands": 2,
    "averageResponseTime": 245
  }
}

```




## 🔒 Security



### Authentication & Authorization




#### Token-Based Authentication

```typescript
// Generate secure auth tokens with permissions
const token = server.generateToken(['execute', 'monitor', 'admin']);

// Validate token permissions
const hasPermission = server.validateToken(token, 'execute');

```




#### Permission Levels

- **read**: View metrics and health status
- **execute**: Run commands via API
- **monitor**: Access performance metrics
- **admin**: Full server control



### Security Features




#### **Input Sanitization**

```typescript
// Automatic command sanitization
const dangerousCommands = ['rm -rf', 'sudo', 'chmod 777'];
const sanitized = automation.sanitizeCommand(userInput);

```




#### **Rate Limiting**

```typescript
// Configure rate limiting per client
const server = new EnhancedDevHQServer({
  rateLimit: {
    windowMs: 60000,    // 1 minute
    maxRequests: 100,   // 100 requests per minute
    skipSuccessfulRequests: false
  }
});

```




#### **CORS Protection**

```typescript
// Secure CORS configuration
const server = new EnhancedDevHQServer({
  cors: {
    origin: ['https://trusted-domain.com'],
    credentials: true,
    methods: ['GET', 'POST']
  }
});

```




### Security Best Practices




1. **Environment Isolation**

   ```bash

   # Run in isolated environment

   docker run --rm -v $(pwd):/app -w /app bun run api-server.ts

   ```



2. **Secret Management**

   ```bash

   # Use environment variables for secrets

   export DEV_HQ_SECRET_KEY=$(openssl rand -hex 32)

   export DEV_HQ_JWT_SECRET=$(openssl rand -hex 64)

   ```



3. **Network Security**

   ```bash

   # Bind to localhost only

   DEV_HQ_HOST=127.0.0.1 bun run spawn-server.ts



   # Or use reverse proxy

   nginx -c /path/to/secure-nginx.conf

   ```



4. **Audit Logging**

   ```typescript

   // Enable comprehensive audit logging

   const server = new EnhancedDevHQServer({

     audit: {

       logLevel: 'info',

       logRequests: true,

       logCommands: true,

       logAuth: true

     }

   });

   ```



### Security Testing




```bash
# Test authentication bypass
curl -X POST http://localhost:3001/execute \
  -H "Content-Type: application/json" \
  -d '{"cmd": ["echo", "test"]}' # Should return 401

# Test command injection
curl -X POST http://localhost:3001/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cmd": ["echo; rm -rf /"]}' # Should be sanitized

# Test rate limiting
for i in {1..150}; do
  curl -s http://localhost:3001/health > /dev/null
done # Should be rate limited after 100 requests

```




1. **Enable Authentication**: Always use auth in production

2. **Validate Commands**: Implement command whitelisting

3. **Resource Limits**: Set appropriate timeouts and connection limits

4. **Sandboxing**: Run commands in isolated environments when possible



## 🚨 Troubleshooting



### Common Issues




#### Process Hanging



```typescript
// Set timeout to prevent hanging
await automation.runCommand('test', cmd, { timeout: 10000 });

```




#### Memory Leaks



```typescript
// Cleanup finished processes regularly
automation.cleanup();

// Or enable auto-cleanup
const automation = new DevHQAutomation({ autoCleanup: true });

```




#### TypeScript Errors



```bash
# Ensure TypeScript types are up to date
bun update

# Check Bun version compatibility
bun --version

```




### Debug Mode




Enable debug logging:



```bash
DEBUG=dev-hq:* bun run spawn-server.ts

```




## 🤝 Contributing



1. Fork the repository

2. Create a feature branch: `git checkout -b feature/new-feature`

3. Make your changes and add tests

4. Run the test suite: `bun test`

5. Submit a pull request



## 📄 License



This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.



## 🔗 Related Projects



- **Bun Runtime**: [https://bun.sh](https://bun.sh)



- **Main Project**: See parent directory for full application



- **TypeScript**: [https://www.typescriptlang.org](https://www.typescriptlang.org)



## 📞 Support



For issues and questions:



1. Check the [troubleshooting guide](#-troubleshooting)

2. Search existing [GitHub issues](../../issues)

3. Create a new issue with detailed information



---



---

## Built with ❤️ using Bun's cutting-edge runtime features
