# 📚 API Documentation

## 📋 Overview

The **Sovereign Unit \[01\]** API provides a comprehensive, enterprise-grade interface for financial technology operations, including **AI-powered risk prediction**, **cross-family guardian networks**, **Cash App Priority integration**, and **real-time fraud detection**.

### **Key Features**
- **🧠 AI Risk Prediction**: 94% accuracy with sub-50ms response times
- **🕸️ Guardian Networks**: Cross-family kinship webs with 96% resilience
- **💚 Cash App Priority**: QR-based payments with instant verification
- **🛡️ Enterprise Security**: Multi-layer validation and audit trails
- **📊 Real-time Monitoring**: WebSocket-based live updates

## 🌐 Base URLs

### **Production Environment**
```
https://api.sovereign-unit-01.com
```

### **Development Environment**
```
http://localhost:3227
```

### **Regional Endpoints**
- **US East**: `https://api-us-east.sovereign-unit-01.com`
- **EU West**: `https://api-eu-west.sovereign-unit-01.com`
- **Asia Pacific**: `https://api-apac.sovereign-unit-01.com`

## 🔐 Authentication

### **Authentication Methods**

| Method | Type | Usage | Security Level |
|--------|------|-------|----------------|
| **JWT Bearer** | Stateful | API access | High |
| **API Key** | Stateless | Service-to-service | Medium |
| **OAuth 2.0** | Delegated | Third-party apps | High |
| **mTLS** | Certificate | Zero-trust | Very High |

### **JWT Authentication Example**

```javascript
// Generate JWT token
const token = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'your-username',
    password: 'your-password'
  })
});

const { jwt } = await token.json();

// Use token in API calls
const response = await fetch('/api/risk/score', {
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  }
});
```

### **API Key Authentication**

```javascript
const response = await fetch('/api/risk/score', {
  headers: {
    'X-API-Key': 'your-api-key-here',
    'Content-Type': 'application/json'
  }
});
```

## 🛠️ Core Endpoints

### **Health Check**

```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "2.1.0",
  "uptime": 1234567,
  "timestamp": "2026-01-22T11:10:00Z",
  "services": {
    "database": "healthy",
    "ai_engine": "healthy",
    "guardian_networks": "healthy",
    "cash_app_priority": "healthy"
  }
}
```

### **Enhanced Risk Scoring**

```http
POST /api/risk/enhanced
```

**Request Body:**
```json
{
  "sessionId": "session-123",
  "merchantId": "merchant-456",
  "userId": "user-789",
  "features": {
    "vpn_active": 0,
    "thermal_spike": 15.2,
    "biometric_fail": 2,
    "proxy_hop_count": 3,
    "device_risk_score": 0.25,
    "location_anomaly": 0.1
  },
  "enableExternalAPIs": true,
  "networkOptimization": true,
  "externalSources": [
    "device_intelligence",
    "geolocation",
    "threat_intelligence",
    "behavioral_analysis"
  ]
}
```

**Response:**
```json
{
  "sessionId": "session-123",
  "riskScore": 0.73,
  "confidence": 0.94,
  "riskLevel": "HIGH",
  "factors": [
    {
      "name": "thermal_spike",
      "weight": 0.25,
      "value": 15.2,
      "impact": "positive"
    },
    {
      "name": "biometric_fail",
      "weight": 0.15,
      "value": 2,
      "impact": "positive"
    }
  ],
  "externalData": {
    "deviceRisk": 0.68,
    "locationRisk": 0.45,
    "threatScore": 0.82
  },
  "recommendations": [
    "Enable secondary verification",
    "Request additional documentation"
  ],
  "processingTime": 45,
  "modelVersion": "v2.1.0"
}
```

### **Guardian Network Management**

#### **Initialize Guardian Network**

```http
POST /api/family/network/initialize
```

**Request Body:**
```json
{
  "teenId": "teen-001",
  "guardians": [
    {
      "id": "guardian-001",
      "relationship": "parent",
      "permissions": ["view_transactions", "set_limits"]
    },
    {
      "id": "guardian-002",
      "relationship": "grandparent",
      "permissions": ["view_transactions"]
    }
  ],
  "settings": {
    "maxSpendLimit": 1000,
    "dailyTransactionLimit": 500,
    "requireApproval": true
  }
}
```

**Response:**
```json
{
  "networkId": "network-123",
  "status": "active",
  "guardians": [
    {
      "id": "guardian-001",
      "status": "active",
      "permissions": ["view_transactions", "set_limits"]
    }
  ],
  "settings": {
    "maxSpendLimit": 1000,
    "dailyTransactionLimit": 500,
    "requireApproval": true
  },
  "createdAt": "2026-01-22T11:10:00Z"
}
```

#### **Add Cross-Family Link**

```http
POST /api/family/cross-link
```

**Request Body:**
```json
{
  "sourceNetworkId": "network-123",
  "targetNetworkId": "network-456",
  "linkType": "emergency_contact",
  "permissions": ["emergency_access", "critical_notifications"]
}
```

### **Cash App Priority**

#### **Generate QR Code**

```http
POST /api/cashapp/qr
```

**Request Body:**
```json
{
  "amount": 2500,
  "currency": "USD",
  "recipient": "cashapp-$cashtag",
  "memo": "Family allowance",
  "expiresIn": 3600,
  "familySponsorship": true
}
```

**Response:**
```json
{
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "paymentUrl": "https://cash.app/$cashtag/2500",
  "expiresAt": "2026-01-22T12:10:00Z",
  "transactionId": "txn-123456",
  "status": "pending"
}
```

#### **Create Family Sponsorship**

```http
POST /api/family/sponsor
```

**Request Body:**
```json
{
  "sponsorId": "sponsor-001",
  "familyId": "family-123",
  "monthlyAllowance": 50000,
  "memberAllowances": [
    {
      "memberId": "teen-001",
      "allowance": 25000,
      "restrictions": ["no_gambling", "no_alcohol"]
    }
  ],
  "autoApprove": false,
  "notificationSettings": {
    "email": true,
    "sms": true,
    "push": true
  }
}
```

## 📊 Analytics & Monitoring

### **Risk Analytics**

```http
GET /api/analytics/risk?period=7d&granularity=hour
```

**Response:**
```json
{
  "period": "7d",
  "granularity": "hour",
  "data": [
    {
      "timestamp": "2026-01-22T00:00:00Z",
      "totalTransactions": 1250,
      "highRiskTransactions": 45,
      "averageRiskScore": 0.32,
      "fraudDetectionRate": 0.036
    }
  ],
  "summary": {
    "totalTransactions": 8750,
    "highRiskTransactions": 315,
    "averageRiskScore": 0.31,
    "fraudDetectionRate": 0.036
  }
}
```

### **System Metrics**

```http
GET /api/metrics/system
```

**Response:**
```json
{
  "timestamp": "2026-01-22T11:10:00Z",
  "performance": {
    "responseTime": 45,
    "throughput": 1250,
    "errorRate": 0.001
  },
  "resources": {
    "cpuUsage": 0.65,
    "memoryUsage": 0.78,
    "diskUsage": 0.45,
    "networkIO": 1024000
  },
  "services": {
    "database": {
      "connections": 25,
      "queryTime": 12,
      "status": "healthy"
    },
    "aiEngine": {
      "inferenceTime": 8,
      "modelAccuracy": 0.94,
      "status": "healthy"
    }
  }
}
```

## 🔄 Real-time Updates

### **WebSocket Connection**

```javascript
const ws = new WebSocket('wss://api.sovereign-unit-01.com/ws/risk-live');

ws.onopen = () => {
  console.log('Connected to real-time risk monitoring');
  
  // Subscribe to specific events
  ws.send(JSON.stringify({
    action: 'subscribe',
    channels: ['risk_score_update', 'fraud_detection', 'system_health']
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'risk_score_update':
      console.log('Risk score updated:', data.payload);
      break;
    case 'fraud_detection':
      console.log('Fraud detected:', data.payload);
      break;
    case 'system_health':
      console.log('System health:', data.payload);
      break;
  }
};
```

### **WebSocket Events**

| Event | Description | Payload |
|-------|-------------|---------|
| `risk_score_update` | Real-time risk score changes | `{ sessionId, riskScore, confidence }` |
| `fraud_detection` | New fraud detection events | `{ transactionId, fraudType, severity }` |
| `guardian_network_alert` | Network status updates | `{ networkId, status, message }` |
| `system_health` | System performance metrics | `{ cpu, memory, responseTime }` |

## 🚨 Error Handling

### **HTTP Status Codes**

| Status | Meaning | Action |
|--------|---------|--------|
| **200** | Success | Process response |
| **400** | Bad Request | Fix request parameters |
| **401** | Unauthorized | Authenticate with valid credentials |
| **403** | Forbidden | Check permissions |
| **429** | Rate Limited | Wait and retry |
| **500** | Server Error | Retry with backoff |

### **Error Response Format**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "sessionId",
      "reason": "Required field missing"
    },
    "timestamp": "2026-01-22T11:10:00Z",
    "requestId": "req_123456789",
    "retryable": false
  }
}
```

### **Retry Logic**

```javascript
async function apiCallWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const error = await response.json();
        
        // Don't retry on client errors
        if (response.status >= 400 && response.status < 500) {
          throw new Error(error.error.message);
        }
        
        // Retry on server errors
        if (attempt < maxRetries && response.status >= 500) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw new Error(error.error.message);
      }
      
      return await response.json();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## 📈 Rate Limiting

### **Rate Limits by Tier**

| Tier | Requests/Hour | Burst Limit | Features |
|------|---------------|-------------|----------|
| **Free** | 100 | 10 | Basic APIs |
| **Pro** | 1,000 | 100 | Enhanced risk scoring |
| **Enterprise** | 10,000 | 1,000 | Full features |
| **Unlimited** | Unlimited | 10,000 | Custom features |

### **Rate Limit Headers**

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642857600
X-RateLimit-Retry-After: 60
```

## 🧪 Testing the API

### **Using curl**

```bash
# Health check
curl http://localhost:3227/api/health

# Risk scoring with authentication
curl -X POST http://localhost:3227/api/risk/enhanced \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test", "features": {"vpn_active": 0}}'

# WebSocket testing
wscat -c ws://localhost:3227/ws/risk-live
```

### **Using Postman**

Import the Postman collection:
```json
{
  "info": {
    "name": "Sovereign Unit [01] API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3227"
    },
    {
      "key": "jwtToken",
      "value": ""
    }
  ]
}
```

## 📚 SDK & Libraries

### **JavaScript/TypeScript**

```bash
npm install @sovereign-unit/sdk
```

```javascript
import { SovereignUnitAPI } from '@sovereign-unit/sdk';

const api = new SovereignUnitAPI({
  apiKey: 'your-api-key',
  baseURL: 'https://api.sovereign-unit-01.com'
});

// Enhanced risk scoring
const riskResult = await api.risk.enhanced({
  sessionId: 'session-123',
  features: { vpn_active: 0, thermal_spike: 12.5 }
});

// Guardian network management
const network = await api.family.initializeNetwork({
  teenId: 'teen-001',
  guardians: ['guardian-001', 'guardian-002']
});
```

### **Python**

```bash
pip install sovereign-unit-sdk
```

```python
from sovereign_unit_sdk import SovereignUnitAPI

api = SovereignUnitAPI(
    api_key='your-api-key',
    base_url='https://api.sovereign-unit-01.com'
)

# Enhanced risk scoring
result = api.risk.enhanced(
    session_id='session-123',
    features={'vpn_active': 0, 'thermal_spike': 12.5}
)

print(f"Risk Score: {result.risk_score}")
print(f"Risk Level: {result.risk_level}")
```

## 🔧 Advanced Features

### **Batch Processing**

```http
POST /api/risk/batch
```

**Request Body:**
```json
{
  "requests": [
    {
      "sessionId": "session-1",
      "features": {"vpn_active": 0}
    },
    {
      "sessionId": "session-2", 
      "features": {"vpn_active": 1}
    }
  ],
  "priority": "high"
}
```

### **Custom Models**

```http
POST /api/risk/custom
```

**Request Body:**
```json
{
  "modelId": "custom-model-123",
  "features": customFeatureVector,
  "parameters": {
    "threshold": 0.8,
    "includeExplainability": true
  }
}
```

### **Webhook Integration**

```json
{
  "webhook": {
    "url": "https://your-app.com/webhooks/risk",
    "events": ["risk_score_update", "fraud_detection"],
    "secret": "your-webhook-secret"
  }
}
```

## 📖 Additional Resources

### **Documentation**
- [📋 Configuration Guide](Configuration-Guide) - Environment setup
- [🔒 Security Guide](Security-Guide) - Security best practices
- [🆘 Troubleshooting](Troubleshooting) - Common issues and solutions

### **Support**
- **📚 Documentation**: [docs.sovereign-unit.com](https://docs.sovereign-unit.com)
- **💬 Community**: [slack.sovereign-unit.com](https://slack.sovereign-unit.com)
- **💬 Community**: [slack.sovereign-unit-01.com](https://slack.sovereign-unit-01.com)
- **🐛 Issues**: [GitHub Issues](https://github.com/brendadeeznuts1111/nolarose-windsurf-project/issues)
- **📧 Support**: [api-support@sovereign-unit-01.com](mailto:api-support@sovereign-unit-01.com)

---

## 🎯 Ready to Build?

**Start integrating the Sovereign Unit \[01\] API today:**

🚀 **[Get Your API Key](https://dashboard.sovereign-unit-01.com/register)**  
📚 **[View Full API Reference](https://docs.sovereign-unit-01.com/api)**  
💬 **[Join Developer Community](https://slack.sovereign-unit-01.com)**  
🔧 **[Download SDKs](https://github.com/sovereign-unit/sdks)**

---

**Built with ❤️ for developers building the future of financial technology**

*© 2026 Sovereign Unit \[01\] - All Rights Reserved*
