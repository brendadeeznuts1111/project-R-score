# 🏰 FactoryWager 3D Secret Field API Documentation

## Overview

The FactoryWager 3D Secret Field API provides real-time visualization and management of secret exposure patterns through a sophisticated 3D field representation. This API combines machine learning analysis, Redis HyperLogLog tracking, and interactive 3D visualization to provide unprecedented insight into secret security posture.

## 🚀 Quick Start

```bash
# Start the API server
bun run scripts/secrets-field-server.ts --port 3001

# Open the 3D visualization
open public/3d-secret-field.html
```

## 📡 API Endpoints

### GET /api/secrets/field
Returns 3D field visualization data with secret exposure patterns.

**Query Parameters:**
- `systemId` (optional): System identifier for multi-tenant environments

**Response:**
```json
{
  "timestamp": "2026-02-06T03:05:21.204Z",
  "systemId": "factorywager-default",
  "points": [
    {
      "x": 1.0,
      "y": 0.0,
      "z": 0.58,
      "value": 0.058,
      "type": "api",
      "risk": "low"
    }
  ],
  "maxExposure": 0.82,
  "anomaly": "SECURE",
  "riskScore": 45.2,
  "metadata": {
    "totalSecrets": 12,
    "activeRotations": 2,
    "complianceScore": 85,
    "recentActivity": 24
  }
}
```

**Field Point Properties:**
- `x, y, z`: 3D coordinates in field space
- `value`: Exposure intensity (0.0-1.0)
- `type`: Secret type (`api`, `database`, `csrf`, `vault`, `session`, `encryption`, `backup`, `audit`)
- `risk`: Risk level (`low`, `medium`, `high`, `critical`)

### POST /api/secrets/rotate
Automatically rotates secrets based on risk analysis.

**Request Body:**
```json
{
  "secretKey": "api:github-token",    // Optional: specific secret to rotate
  "force": false,                     // Optional: force rotation even if not needed
  "reason": "security review",        // Optional: reason for rotation
  "requestedBy": "api-test"           // Optional: user/system requesting rotation
}
```

**Response:**
```json
{
  "success": true,
  "rotated": [
    {
      "key": "api:github-token",
      "oldValue": "ghp_xxx...",
      "newValue": "ghp_yyy...",
      "timestamp": "2026-02-06T03:05:26.870Z"
    }
  ],
  "metadata": {
    "totalRotated": 1,
    "duration": 1250,
    "requestedBy": "api-test"
  }
}
```

### GET /api/health
Health check endpoint with system status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-06T03:05:33.922Z",
  "version": "5.1",
  "endpoints": {
    "field": "/api/secrets/field",
    "rotate": "/api/secrets/rotate",
    "websocket": "/ws/secrets-3d"
  },
  "connections": {
    "http": "active",
    "websocket": 0
  }
}
```

### GET /api
Complete API documentation in JSON format.

## 🔌 WebSocket API

### WS /ws/secrets-3d
Real-time 3D field updates with compressed data transmission.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:3002/ws/secrets-3d');

ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'subscribe' }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'field-update') {
    updateVisualization(message.data);
  }
};
```

**WebSocket Messages:**

**Subscribe to Updates:**
```json
{
  "type": "subscribe"
}
```

**Field Update (Server → Client):**
```json
{
  "type": "field-update",
  "data": {
    "timestamp": "2026-02-06T03:05:21.204Z",
    "points": [...],
    "compressed": true
  },
  "timestamp": "2026-02-06T03:05:21.204Z"
}
```

**Ping/Pong:**
```json
// Client → Server
{ "type": "ping" }

// Server → Client
{ "type": "pong", "timestamp": "2026-02-06T03:05:21.204Z" }
```

## 🎮 3D Visualization Client

### Features
- **Real-time 3D field visualization** using Three.js
- **Interactive camera controls** with mouse movement
- **Live WebSocket updates** for real-time monitoring
- **Risk-based color coding** (green → yellow → red)
- **Secret rotation controls** directly from visualization
- **Responsive design** for desktop and mobile

### Risk Color Coding
- 🟢 **Low Risk** (0.0-0.3): Normal exposure levels
- 🟡 **Medium Risk** (0.3-0.6): Elevated exposure, monitor closely
- 🟠 **High Risk** (0.6-0.8): High exposure, consider rotation
- 🔴 **Critical Risk** (0.8-1.0): Immediate action required

### Controls
- **Mouse Movement**: Rotate camera view
- **Rotate Secrets**: Trigger automatic secret rotation
- **Pause/Resume**: Control field animation
- **Reset View**: Return to default camera position

## 🔧 Technical Architecture

### Data Flow
```text
1. Secret Access → Redis HyperLogLog → Exposure Tracking
2. Exposure Data → ML Analysis → 3D Field Generation
3. Field Data → WebSocket → Real-time Visualization
4. User Actions → API → Secret Rotation → Field Update
```

### Components

**SecretsFieldAPI Class:**
- 3D point generation from exposure data
- Risk scoring and anomaly detection
- WebSocket compression and optimization
- Secret rotation orchestration

**Redis Vault Integration:**
- HyperLogLog exposure tracking
- Real-time analytics and trends
- Anomaly detection algorithms
- Performance-optimized cardinality estimation

**ML Enhancement:**
- Non-linear field transformations
- Risk-specific boosting factors
- Pattern recognition for anomalies
- Predictive analytics

### Performance Features

**WebSocket Compression:**
- Data compression for >1000 points
- Delta compression for incremental updates
- Binary encoding for efficient transmission
- Automatic connection management

**Caching Strategy:**
- Field data caching with TTL
- Exposure analytics caching
- Redis-based distributed caching
- Memory-efficient storage

**Error Handling:**
- Graceful degradation on failures
- Automatic reconnection for WebSockets
- Fallback to Security Citadel metrics
- Comprehensive error logging

## 📊 Usage Examples

### Basic Field Retrieval
```bash
curl http://localhost:3001/api/secrets/field
```

### System-Specific Field
```bash
curl "http://localhost:3001/api/secrets/field?systemId=production-api"
```

### Rotate High-Risk Secrets
```bash
curl -X POST http://localhost:3001/api/secrets/rotate \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Quarterly security review",
    "requestedBy": "security-team"
  }'
```

### Rotate Specific Secret
```bash
curl -X POST http://localhost:3001/api/secrets/rotate \
  -H "Content-Type: application/json" \
  -d '{
    "secretKey": "database:primary-password",
    "force": true,
    "reason": "Suspicious activity detected"
  }'
```

### JavaScript Client Example
```javascript
// Fetch field data
const response = await fetch('/api/secrets/field');
const fieldData = await response.json();

// Rotate secrets
const rotationResult = await fetch('/api/secrets/rotate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reason: 'Manual rotation',
    requestedBy: 'dashboard-user'
  })
});

const result = await rotationResult.json();
console.log(`Rotated ${result.metadata.totalRotated} secrets`);
```

### WebSocket Client
```javascript
class SecretFieldClient {
  constructor(systemId = 'default') {
    this.ws = new WebSocket(`ws://localhost:3002/ws/secrets-3d?systemId=${systemId}`);
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    this.ws.onopen = () => {
      console.log('Connected to 3D field updates');
      this.ws.send(JSON.stringify({ type: 'subscribe' }));
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'field-update') {
        this.onFieldUpdate(message.data);
      }
    };
    
    this.ws.onclose = () => {
      console.log('Disconnected, reconnecting...');
      setTimeout(() => this.connect(), 5000);
    };
  }
  
  onFieldUpdate(data) {
    console.log('Field updated:', data.points.length, 'points');
    // Update 3D visualization
  }
}

const client = new SecretFieldClient('production');
```

## 🔍 Monitoring & Analytics

### Exposure Metrics
- **Total Exposures**: Cumulative secret access count
- **Risk Score**: Weighted risk calculation (0-100)
- **Anomaly Detection**: Pattern-based threat identification
- **Trend Analysis**: Historical exposure patterns

### Performance Metrics
- **WebSocket Latency**: Real-time update performance
- **Field Generation Time**: ML processing duration
- **API Response Times**: Endpoint performance
- **Memory Usage**: 3D visualization memory footprint

### Security Monitoring
- **Access Patterns**: Unusual secret access detection
- **Rotation Frequency**: Automated rotation tracking
- **Compliance Score**: Regulatory compliance metrics
- **Audit Trail**: Complete operation logging

## 🛡️ Security Features

### Authentication & Authorization
- API key support (configurable)
- Role-based access control
- System-based isolation
- Request rate limiting

### Data Protection
- End-to-end encryption for WebSocket
- Secure secret value handling
- Audit logging for all operations
- GDPR compliance features

### Threat Detection
- Real-time anomaly detection
- Pattern-based threat identification
- Automated response capabilities
- Integration with SIEM systems

## 🚀 Deployment

### Development
```bash
# Start development server
bun run scripts/secrets-field-server.ts --port 3001

# Open visualization
open public/3d-secret-field.html
```

### Production
```bash
# Set environment variables
export NODE_ENV=production
export SYSTEM_ID=production-system
export API_SECRET=your-api-secret

# Start with PM2
pm2 start scripts/secrets-field-server.ts --name "secret-field-api" -- --port 3001
```

### Docker
```dockerfile
FROM oven/bun:latest
WORKDIR /app
COPY . .
RUN bun install
EXPOSE 3001 3002
CMD ["bun", "run", "scripts/secrets-field-server.ts"]
```

## 📚 Integration Examples

### Grafana Dashboard
```javascript
// Query field data for Grafana
const fieldData = await fetch('http://localhost:3001/api/secrets/field');
const data = await fieldData.json();

return {
  fields: [
    { name: 'Risk Score', values: [data.riskScore] },
    { name: 'Max Exposure', values: [data.maxExposure * 100] },
    { name: 'Total Secrets', values: [data.metadata.totalSecrets] }
  ]
};
```

### Slack Integration
```javascript
// Send alerts to Slack
async function sendSecurityAlert(fieldData) {
  if (fieldData.anomaly !== 'SECURE') {
    await fetch('https://hooks.slack.com/services/xxx', {
      method: 'POST',
      body: JSON.stringify({
        text: `🚨 Security Alert: ${fieldData.anomaly}`,
        attachments: [{
          fields: [
            { title: 'Risk Score', value: fieldData.riskScore, short: true },
            { title: 'Max Exposure', value: `${(fieldData.maxExposure * 100).toFixed(1)}%`, short: true }
          ]
        }]
      })
    });
  }
}
```

## 🔧 Configuration

### Environment Variables
```bash
# Server Configuration
PORT=3001                    # HTTP server port
WS_PORT=3002                 # WebSocket port
NODE_ENV=development         # Environment

# System Configuration
SYSTEM_ID=factorywager-default  # System identifier
API_SECRET=your-secret-key       # API authentication

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# FactoryWager Integration
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=secrets
```

### Field Configuration
```typescript
// Custom field weights
const FIELD_WEIGHTS = {
  api: 0.9,
  database: 1.0,
  csrf: 0.7,
  vault: 1.2,
  session: 0.8,
  encryption: 0.6,
  backup: 0.5,
  audit: 0.4
};

// Risk thresholds
const RISK_THRESHOLDS = {
  low: 0.3,
  medium: 0.6,
  high: 0.8,
  critical: 0.95
};
```

## 🐛 Troubleshooting

### Common Issues

**WebSocket Connection Failed:**
- Check if WebSocket server is running on correct port
- Verify firewall settings
- Check browser console for errors

**Empty Field Data:**
- Verify Redis connection
- Check system ID configuration
- Review secret access patterns

**Rotation Failed:**
- Check R2 configuration
- Verify secret permissions
- Review audit logs

### Debug Mode
```bash
# Enable debug logging
DEBUG=secrets-field:* bun run scripts/secrets-field-server.ts
```

### Health Checks
```bash
# Check API health
curl http://localhost:3001/api/health

# Check WebSocket connectivity
wscat -c ws://localhost:3002/ws/secrets-3d
```

## 📄 License

FactoryWager Security Citadel v5.1 - Enterprise Secret Management Platform

© 2026 FactoryWager. All rights reserved.

---

**🏰 FactoryWager Security Citadel** - Enterprise-grade secret management with 3D visualization, real-time monitoring, and automated security responses.
