# Staging API Server

The Staging API Server provides a complete staging environment API for the Quantum Terminal Dashboard, implementing health checks, metrics collection, tension monitoring, predictive analytics, and A/B testing capabilities.

## 🚀 Quick Start

```bash
# Start the staging API server
bun run src/api/staging-api-server.js
```

The server will start on `https://staging-api.example.com` and provide a web interface with health checks and analytics endpoints.

## 📡 API Endpoints

### Root Endpoint
**GET /** - API Overview
- Returns an HTML page with API documentation and testing interface
- Includes current request information and curl examples

### Health Check
**GET /api/v1/health**
- Comprehensive health check with system metrics
- Returns server status, memory usage, uptime, and configuration

Response:
```json
{
  "status": "healthy",
  "environment": "staging",
  "timestamp": "2024-01-18T18:51:09.000Z",
  "uptime": 3600.5,
  "version": "v1",
  "server": {
    "host": "staging-api.example.com",
    "port": 443,
    "staging_domain": "staging-api.example.com"
  },
  "quantum": {
    "tension_threshold": 0.8,
    "decay_rate": 0.05,
    "health_check_interval": 30000
  }
}
```

### Metrics Collection
**GET /api/v1/metrics**
- Real-time system and performance metrics
- Includes memory usage, CPU stats, and API performance

Response:
```json
{
  "timestamp": "2024-01-18T18:51:09.000Z",
  "environment": "staging",
  "system": {
    "uptime": 3600.5,
    "memory_usage": {...},
    "cpu_usage": {...}
  },
  "performance": {
    "simd_enabled": true,
    "worker_threads": 4,
    "monitoring_enabled": true
  },
  "api_metrics": {
    "requests_per_minute": 750,
    "average_response_time": 45,
    "error_rate": 0.0234
  }
}
```

### Tension Monitoring
**GET /api/v1/tension**
- Quantum system tension monitoring
- Component-level tension tracking and health assessment

Response:
```json
{
  "timestamp": "2024-01-18T18:51:09.000Z",
  "threshold": 0.8,
  "decay_rate": 0.05,
  "components": [
    {
      "name": "qsimd-scene",
      "tension": 0.65,
      "status": "normal",
      "last_updated": "2024-01-18T18:51:09.000Z"
    }
  ],
  "system_health": {
    "overall_tension": 0.72,
    "status": "healthy",
    "recommendations": []
  }
}
```

### Predictive Analytics
**GET /api/v1/analytics**
- Requires `predictive_analytics` feature flag to be enabled
- Provides load predictions and system recommendations

Response:
```json
{
  "timestamp": "2024-01-18T18:51:09.000Z",
  "environment": "staging",
  "predictions": {
    "next_hour": {
      "expected_load": 800,
      "tension_prediction": 0.034,
      "confidence": 0.87
    },
    "next_day": {
      "peak_load_time": "14:00 UTC",
      "expected_tension_spike": false
    }
  },
  "current_metrics": {
    "active_users": 125,
    "request_rate": 45,
    "error_rate": 0.015
  }
}
```

### A/B Testing
**GET /api/v1/experiments**
- Requires `a_b_testing` feature flag to be enabled
- Active experiment tracking and variant assignment

Response:
```json
{
  "timestamp": "2024-01-18T18:51:09.000Z",
  "environment": "staging",
  "active_experiments": [
    {
      "name": "quantum_ui_redesign",
      "variant": "A",
      "traffic_split": 0.5,
      "start_date": "2024-01-15",
      "metrics": {
        "conversion_rate": 0.0345,
        "engagement_score": 78
      }
    }
  ]
}
```

### Configuration
**GET /api/v1/config**
- Public configuration data (sensitive data removed)
- Feature flags, performance settings, and quantum parameters

## 🏗️ Architecture

The Staging API Server is built with:

- **Bun Runtime** - Leverages Bun's fast HTTP server and fetch capabilities
- **Environment Management** - CompleteEnvironmentManager for configuration
- **CORS Support** - Full CORS headers for web applications
- **Error Handling** - Comprehensive error responses with proper HTTP status codes
- **Feature Flags** - Conditional endpoints based on enabled features

## 🔧 Configuration

The server uses the CompleteEnvironmentManager for configuration:

```javascript
import { CompleteEnvironmentManager } from "../config/complete-environment-manager.js";

const configManager = new CompleteEnvironmentManager("staging");
```

### Required Environment Variables
- `STAGING_API_URL` - API base URL
- `QUANTUM_TENSION_THRESHOLD` - Tension monitoring threshold
- `QUANTUM_DECAY_RATE` - Tension decay rate

### Feature Flags
- `predictive_analytics` - Enables analytics endpoints
- `a_b_testing` - Enables experiment endpoints
- `advanced_logging` - Enhanced logging capabilities

## 🧪 Testing

### Health Check Test
```bash
curl 'https://staging-api.example.com/api/v1/health'
```

### Metrics Test
```bash
curl 'https://staging-api.example.com/api/v1/metrics'
```

### Full Test Suite
```bash
bun run examples/tests/test-staging-api-example.js
```

## 📊 Performance

- **Boot Time**: < 50ms
- **Memory Footprint**: ~25MB baseline
- **Concurrent Requests**: 1000+ supported
- **Response Time**: < 10ms average

## 🔐 Security

- CORS headers configured for staging domain
- Input validation on all endpoints
- Environment-specific error messages
- No sensitive data in public endpoints

## 🚀 Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Configure TLS certificates
3. Update CORS origins
4. Enable production feature flags
5. Set up monitoring and logging

## 📝 Examples

See `examples/tests/test-staging-api-example.js` for complete usage examples including error handling and feature flag testing.