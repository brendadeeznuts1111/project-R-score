# Tension Field MCP Integration Guide

## 🤖 Model Context Protocol (MCP) Integration

The Tension Field system now includes an MCP (Model Context Protocol) server, enabling seamless integration with AI assistants and external tools for advanced tension field management and analysis.

---

## 🎯 What is MCP?

MCP is a protocol that allows AI assistants to interact with external systems through a standardized interface. Our MCP server exposes the tension field system's capabilities as callable tools that AI assistants can use to:

- Analyze tension patterns
- Control propagation
- Assess risks
- Query historical data
- Monitor system health

---

## 🚀 Quick Start

### 1. Start the MCP Server

```bash
# Start the MCP server on default port 3002
bun run mcp:server

# Or with custom configuration
MCP_PORT=3003 MCP_HOST=0.0.0.0 bun run mcp:server
```

### 2. Verify Server is Running

```bash
# Check server status
curl http://localhost:3002/

# Should return:
# {
#   "name": "tension-field-mcp",
#   "version": "1.0.0",
#   "description": "Tension Field Analysis and Control MCP Server",
#   "tools": [...]
# }
```

### 3. Run the Demo Client

```bash
# In another terminal
bun run mcp:demo
```

---

## 🛠️ Available Tools

### 1. `analyze_tension`
Analyze tension in the graph for specific nodes or the entire network.

```json
{
  "name": "analyze_tension",
  "description": "Analyze tension in the graph",
  "inputSchema": {
    "properties": {
      "nodeId": "string (optional)",
      "depth": "number (default: 3)",
      "includePredictions": "boolean (default: false)"
    }
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3002/call \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "analyze_tension",
    "arguments": {
      "nodeId": "node-42",
      "includePredictions": true
    }
  }'
```

### 2. `propagate_tension`
Trigger tension propagation from source nodes.

```json
{
  "name": "propagate_tension",
  "description": "Trigger tension propagation",
  "inputSchema": {
    "properties": {
      "sourceNodes": "string | string[] (required)",
      "config": {
        "decayRate": "number",
        "inertiaFactor": "number",
        "maxIterations": "number"
      }
    }
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3002/call \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "propagate_tension",
    "arguments": {
      "sourceNodes": ["node-1", "node-2"],
      "config": {
        "decayRate": 0.1,
        "maxIterations": 100
      }
    }
  }'
```

### 3. `assess_risk`
Assess risk levels for nodes or the entire network.

```json
{
  "name": "assess_risk",
  "description": "Assess risk levels",
  "inputSchema": {
    "properties": {
      "nodeId": "string (optional)",
      "timeHorizon": "number (default: 24, hours)"
    }
  }
}
```

### 4. `query_history`
Query historical tension data and metrics.

```json
{
  "name": "query_history",
  "description": "Query historical data",
  "inputSchema": {
    "properties": {
      "timeRange": {
        "start": "datetime",
        "end": "datetime"
      },
      "nodeId": "string (optional)",
      "metrics": ["tension", "volatility", "predictions", "anomalies", "risk"]
    }
  }
}
```

### 5. `get_system_status`
Get current system status and health metrics.

```json
{
  "name": "get_system_status",
  "description": "Get system status",
  "inputSchema": {
    "properties": {
      "includeDetails": "boolean (default: false)"
    }
  }
}
```

### 6. `get_errors`
Retrieve recent errors and system issues.

```json
{
  "name": "get_errors",
  "description": "Get recent errors",
  "inputSchema": {
    "properties": {
      "severity": "low | medium | high | critical",
      "timeRange": "number (default: 24, hours)",
      "limit": "number (default: 50)"
    }
  }
}
```

---

## 🔌 Client Integration

### TypeScript Client

```typescript
import { TensionMCPClient } from './examples/mcp-client-demo';

const client = new TensionMCPClient('localhost', 3002);

// Analyze tension
const analysis = await client.callTool('analyze_tension', {
  nodeId: 'critical-node',
  includePredictions: true
});

// Propagate tension
const result = await client.callTool('propagate_tension', {
  sourceNodes: ['source-1', 'source-2'],
  config: { decayRate: 0.05 }
});

// Get system status
const status = await client.callTool('get_system_status', {
  includeDetails: true
});
```

### Python Client

```python
import requests
import json

class TensionMCPClient:
    def __init__(self, host='localhost', port=3002):
        self.base_url = f'http://{host}:{port}'
    
    def call_tool(self, tool_name, arguments=None):
        response = requests.post(
            f'{self.base_url}/call',
            json={
                'tool': tool_name,
                'arguments': arguments or {}
            }
        )
        return response.json()

# Usage
client = TensionMCPClient()
analysis = client.call_tool('analyze_tension', {
    'nodeId': 'node-42',
    'includePredictions': True
})
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_PORT` | 3002 | MCP server port |
| `MCP_HOST` | localhost | MCP server host |

### Server Configuration

The MCP server can be configured by modifying the `MCP_SERVER_CONFIG` object in `mcp-server.ts`:

```typescript
const MCP_SERVER_CONFIG = {
  name: 'tension-field-mcp',
  version: '1.0.0',
  description: 'Tension Field Analysis and Control MCP Server',
  port: parseInt(process.env.MCP_PORT || '3002'),
  host: process.env.MCP_HOST || 'localhost'
};
```

---

## 🤖 AI Assistant Integration

### Claude Integration

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "tension-field": {
      "command": "bun",
      "args": ["/path/to/your/project/mcp-server.ts"],
      "env": {
        "MCP_PORT": "3002"
      }
    }
  }
}
```

### Example AI Prompts

```text
Analyze the tension levels in the network and identify any nodes with unusually high tension.

Propagate tension from node-42 with a low decay rate and assess the impact on neighboring nodes.

Check the system status and report any critical errors that need attention.

Query the historical data for the last 24 hours and identify any tension anomalies.
```

---

## 🔒 Security Considerations

1. **Network Access**: By default, the MCP server only listens on localhost. For production, consider:
   - Using reverse proxy (nginx, traefik)
   - Implementing authentication
   - Using HTTPS/TLS

2. **Rate Limiting**: Consider implementing rate limiting for production deployments

3. **Input Validation**: All inputs are validated, but additional validation may be needed for specific use cases

---

## 📊 Monitoring and Logging

The MCP server integrates with the existing error handling system:

- All errors are logged to the error database
- Critical errors trigger notifications
- Performance metrics are tracked

### Monitoring Endpoints

```bash
# Get system status
curl http://localhost:3002/call \
  -H "Content-Type: application/json" \
  -d '{"tool": "get_system_status", "arguments": {"includeDetails": true}}'

# Check recent errors
curl http://localhost:3002/call \
  -H "Content-Type: application/json" \
  -d '{"tool": "get_errors", "arguments": {"severity": "critical"}}'
```

---

## 🚀 Production Deployment

### Docker Deployment

```dockerfile
FROM oven/bun:latest

WORKDIR /app
COPY . .

RUN bun install

EXPOSE 3002

CMD ["bun", "mcp-server.ts"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  tension-mcp:
    build: .
    ports:
      - "3002:3002"
    environment:
      - MCP_PORT=3002
      - MCP_HOST=0.0.0.0
    volumes:
      - ./data:/app/data
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tension-mcp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tension-mcp
  template:
    metadata:
      labels:
        app: tension-mcp
    spec:
      containers:
      - name: tension-mcp
        image: tension-field:latest
        ports:
        - containerPort: 3002
        env:
        - name: MCP_PORT
          value: "3002"
        - name: MCP_HOST
          value: "0.0.0.0"
```

---

## 🎉 Summary

The MCP integration provides:

- ✅ **Standardized API** for AI assistant integration
- ✅ **Real-time Control** of tension field operations
- ✅ **Comprehensive Tools** for analysis and monitoring
- ✅ **Type Safety** with TypeScript
- ✅ **Error Handling** with detailed logging
- ✅ **Production Ready** with deployment guides

The tension field system is now accessible to AI assistants, enabling intelligent automation and advanced analysis capabilities! 🤖😈
