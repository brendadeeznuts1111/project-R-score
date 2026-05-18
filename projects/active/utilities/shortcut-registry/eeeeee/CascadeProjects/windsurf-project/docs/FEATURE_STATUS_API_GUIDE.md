# 🚀 Feature Status API & CLI System

## 📋 Overview

The Feature Status API provides comprehensive monitoring and management capabilities for all 127 features implemented in the Windsurf Project. It includes a REST API server and a command-line interface for complete feature registry access.

## 🏗️ Architecture

### **Components**
1. **Feature Status API Server** (`config/feature-status-api.ts`)
2. **Feature Status CLI Tool** (`cli/feature-status-cli.ts`)
3. **Feature Registry** (127 tracked features)
4. **Service Health Monitoring** (12 core services)

### **API Server**
- **Port**: 3010 (Config Management port)
- **Protocol**: HTTP/REST
- **Format**: JSON
- **Timeout**: 10 seconds
- **Features**: Real-time status, health checks, feature toggling

### **CLI Tool**
- **Language**: TypeScript/Bun
- **Interface**: Command-line with colored output
- **Integration**: Full API client implementation
- **Features**: Status monitoring, feature management, service health

## 🛠️ Installation & Setup

### **Prerequisites**
- Bun runtime installed
- Node.js 18+ (for compatibility)
- Access to the Windsurf Project directory

### **Quick Start**
```bash
# Start the Feature Status API server
bun run features:api

# In another terminal, check system status
bun run features:status

# List all features with details
bun run features:list

# Check service health
bun run features:health
```

## 📡 API Endpoints

### **System Status**
```http
GET /api/status
```
Returns comprehensive system status including all features, services, and health metrics.

**Response:**
```json
{
  "timestamp": "2026-01-22T17:00:00.000Z",
  "environment": "development",
  "version": "1.0.0",
  "uptime": 3600,
  "totalFeatures": 127,
  "activeFeatures": 45,
  "inactiveFeatures": 70,
  "errorFeatures": 8,
  "maintenanceFeatures": 4,
  "overallHealth": "healthy",
  "features": [...],
  "services": [...]
}
```

### **Feature Registry**
```http
GET /api/features
```
Lists all features with basic information.

**Response:**
```json
{
  "total": 127,
  "features": [
    {
      "id": "cross-family-network-dashboard",
      "name": "Cross-Family Network Dashboard",
      "category": "dashboard",
      "enabled": true,
      "status": "active",
      "health": "healthy",
      "version": "1.0.0"
    }
  ]
}
```

### **Feature Details**
```http
GET /api/features/:id
```
Returns detailed information about a specific feature.

**Response:**
```json
{
  "id": "cross-family-network-dashboard",
  "name": "Cross-Family Network Dashboard",
  "description": "Interactive network visualization with real-time graph rendering",
  "enabled": true,
  "category": "dashboard",
  "status": "active",
  "health": "healthy",
  "lastChecked": "2026-01-22T17:00:00.000Z",
  "dependencies": ["guardian-network-engine", "websocket-server"],
  "endpoints": ["/api/network/visualize", "/api/network/dashboard"],
  "metrics": {
    "performance": 95,
    "uptime": 99.9,
    "errorRate": 0.1
  },
  "version": "1.0.0",
  "deploymentStatus": "deployed"
}
```

### **Health Check**
```http
GET /api/health
```
Simple health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-22T17:00:00.000Z",
  "uptime": 3600,
  "activeFeatures": 45,
  "totalFeatures": 127
}
```

### **Service Status**
```http
GET /api/services
```
Returns status of all core services.

**Response:**
```json
[
  {
    "name": "Main API",
    "status": "running",
    "port": 3000,
    "health": "healthy",
    "lastCheck": "2026-01-22T17:00:00.000Z"
  }
]
```

### **Feature Toggle**
```http
POST /api/features/:id/toggle
```
Enable or disable a specific feature.

**Response:**
```json
{
  "message": "Feature cross-family-network-dashboard enabled",
  "feature": {
    "id": "cross-family-network-dashboard",
    "enabled": true,
    "status": "active"
  }
}
```

## 💻 CLI Commands

### **System Status**
```bash
# Basic system status
bun run features:status

# System status with feature list
bun run features:status --features

# Detailed system status
bun run features:status --features --detailed
```

**Output:**
```text
🏗️ SYSTEM STATUS
══════════════════════════════════════════════════
Environment: development
Version: 1.0.0
Uptime: 1h 0m
Overall Health: ● HEALTHY

📊 FEATURE SUMMARY
────────────────────────────────
Total Features: 127
Active: 45
Inactive: 70
Error: 8
Maintenance: 4
```

### **Feature Management**
```bash
# List all features
bun run features:list

# Get detailed feature information
bun run cli/feature-status-cli.ts feature cross-family-network-dashboard

# Enable/disable a feature
bun run features:toggle cross-family-network-dashboard

# List available features
bun run cli/feature-status-cli.ts list
```

### **Health & Services**
```bash
# Check system health
bun run features:health

# Check service status
bun run features:services
```

### **Direct CLI Usage**
```bash
# Show help
bun run cli/feature-status-cli.ts --help

# Direct command execution
bun run cli/feature-status-cli.ts status --features --detailed
bun run cli/feature-status-cli.ts features --detailed
bun run cli/feature-status-cli.ts feature <feature-id>
bun run cli/feature-status-cli.ts health
bun run cli/feature-status-cli.ts services
bun run cli/feature-status-cli.ts toggle <feature-id>
bun run cli/feature-status-cli.ts list
```

## 📊 Feature Categories

### **Dashboard Features (45)**
- **Cross-Family Network Dashboard** - Interactive graph visualization
- **Family Controls Component** - Spend limits and teen management
- **Guardian Portal** - Real-time oversight and approvals
- **Guardian Risk Dashboard** - AI risk visualization
- **Premium Billing Panel** - Payment processing

### **Backend Features (82)**
- **Guardian Network Engine** - Graph-based networks
- **AI Suspension Risk Engine** - ML risk prediction
- **Cash App Pay Integration** - Payment processing
- **Family Controls Manager** - Core management
- **Configuration System** - Environment and deployment

### **Infrastructure Features (11)**
- **Service Registry** - Service discovery
- **Environment Manager** - Multi-environment config
- **Deployment Manager** - Kubernetes automation

## 🔧 Configuration

### **Environment Variables**
```bash
# API server URL (for CLI)
export FEATURE_API_URL="http://localhost:3010"

# Environment
export NODE_ENV="development"

# Feature flags
export PREMIUM_ENABLED="true"
export DEBUG_MODE="false"
```

### **Feature Configuration**
Features are configured in `config/features.toml`:

```toml
[variants.premium]
enabled = ["CORE", "PREMIUM", "PERFORMANCE_POLISH"]
disabled = ["DEBUG", "BETA_FEATURES", "MOCK_API"]
description = "Premium tier - full features, billing included"
```

## 🚨 Error Handling

### **API Errors**
```json
{
  "error": "Feature not found",
  "code": 404,
  "message": "The requested feature does not exist"
}
```

### **CLI Errors**
```text
Error: API Error: 404 Not Found
Error: Feature not found
Error: Connection timeout
```

### **Troubleshooting**
1. **API Server Not Running**: Start with `bun run features:api`
2. **Port Conflict**: Check if port 3010 is available
3. **Feature Not Found**: Verify feature ID with `bun run cli/feature-status-cli.ts list`
4. **Connection Issues**: Check `FEATURE_API_URL` environment variable

## 📈 Monitoring & Metrics

### **Available Metrics**
- **Performance**: Feature performance percentage (0-100)
- **Uptime**: Service uptime percentage
- **Error Rate**: Error rate percentage
- **Health Status**: Overall system health
- **Feature Count**: Active/inactive/error counts

### **Real-time Updates**
- WebSocket connections for live updates
- Automatic health checks every 30 seconds
- Dependency validation
- Service discovery integration

## 🔒 Security

### **Authentication**
- API key support (configurable)
- IP whitelisting capabilities
- Rate limiting built-in

### **Authorization**
- Feature-level access control
- Role-based permissions
- Audit logging

## 🚀 Production Deployment

### **Docker Deployment**
```dockerfile
FROM oven/bun:latest
COPY . /app
WORKDIR /app
EXPOSE 3010
CMD ["bun", "run", "config/feature-status-api.ts"]
```

### **Kubernetes Deployment**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: feature-status-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: feature-status-api
  template:
    metadata:
      labels:
        app: feature-status-api
    spec:
      containers:
      - name: api
        image: feature-status-api:latest
        ports:
        - containerPort: 3010
```

### **Monitoring Integration**
- Prometheus metrics endpoint
- Grafana dashboard templates
- Alertmanager rules
- Log aggregation with ELK stack

## 🧪 Testing

### **API Tests**
```bash
# Test API endpoints
curl http://localhost:3010/api/health
curl http://localhost:3010/api/status
curl http://localhost:3010/api/features
```

### **CLI Tests**
```bash
# Test CLI commands
bun run cli/feature-status-cli.ts health
bun run cli/feature-status-cli.ts status
bun run cli/feature-status-cli.ts list
```

### **Integration Tests**
```bash
# Full integration test
bun run features:api &
sleep 2
bun run features:status
bun run features:health
bun run features:list
```

## 📚 Advanced Usage

### **Custom Feature Registration**
```typescript
// Add custom feature to registry
const customFeature: FeatureStatus = {
  id: 'custom-feature',
  name: 'Custom Feature',
  description: 'My custom feature',
  enabled: true,
  category: 'custom',
  status: 'active',
  health: 'healthy',
  // ... other properties
};
```

### **Custom Health Checks**
```typescript
// Implement custom health check
async function customHealthCheck(feature: FeatureStatus): Promise<string> {
  // Custom health check logic
  return 'healthy';
}
```

### **Webhook Integration**
```typescript
// Setup webhook notifications
const webhookUrl = 'https://hooks.slack.com/...';
// Send status updates to webhook
```

## 🎯 Best Practices

1. **Monitor Regularly**: Use `bun run features:status` daily
2. **Health Checks**: Implement custom health checks for critical features
3. **Feature Toggles**: Use toggle functionality for gradual rollouts
4. **Documentation**: Keep feature descriptions up to date
5. **Testing**: Test all API endpoints before production deployment

## 🆘 Support

### **Common Issues**
- **Port conflicts**: Change port in API server
- **Feature not found**: Check feature registry
- **Connection timeout**: Verify API server is running
- **Permission errors**: Check file permissions

### **Getting Help**
```bash
# Show CLI help
bun run cli/feature-status-cli.ts --help

# Check API documentation
curl http://localhost:3010/
```

---

**Status: PRODUCTION READY** 🚀

The Feature Status API & CLI system provides comprehensive monitoring and management capabilities for all 127 features in the Windsurf Project, with real-time health checks, detailed metrics, and complete CLI integration.
