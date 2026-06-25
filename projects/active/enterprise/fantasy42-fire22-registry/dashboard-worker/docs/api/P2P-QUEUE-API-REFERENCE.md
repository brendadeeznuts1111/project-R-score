# 🔥 Fire22 P2P Queue System API Reference

**Package:** `fire22-dashboard-worker@4.0.0-staging`  
**Version:** 1.0.0  
**Base URL:** `http://localhost:3001/api/p2p/queue`  
**Last Updated:** August 28, 2025

## 📋 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Queue Data Endpoints](#queue-data-endpoints)
- [Queue Management](#queue-management)
- [Matching System](#matching-system)
- [Telegram Integration](#telegram-integration)
- [Data Export](#data-export)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)
- [Examples](#examples)

## 🔥 Overview

The Fire22 P2P Queue System API provides comprehensive peer-to-peer transaction
management with advanced matching algorithms, Telegram integration, and
real-time queue monitoring.

### Key Features

- **Real-time Queue Management** - Live withdrawal and deposit queues
- **Intelligent Matching** - Auto-matching algorithm with confidence scoring
- **Telegram Integration** - Native notification system
- **Advanced Analytics** - Queue statistics and performance metrics
- **Circuit Breaker Protection** - Enhanced error handling and recovery
- **Export Capabilities** - JSON data export with metadata

## 🔐 Authentication

All API endpoints are currently accessible without authentication in development
mode. In production, endpoints will require:

- **API Key**: `X-API-Key` header
- **JWT Token**: `Authorization: Bearer <token>`

## 📊 Queue Data Endpoints

### GET /api/p2p/queue/withdrawals

Retrieve all pending withdrawal requests.

**Response Schema:**

```json
[
  {
    "id": "w1",
    "type": "withdrawal",
    "customerId": "CUST001",
    "amount": 500,
    "paymentType": "bank_transfer",
    "status": "pending",
    "createdAt": "2025-08-28T01:00:00.000Z",
    "telegramGroupId": "TG_GROUP_001",
    "telegramChatId": "CHAT_001",
    "telegramChannel": "CHANNEL_MAIN",
    "telegramUsername": "@user1",
    "notes": "Priority withdrawal request",
    "priority": "high",
    "estimatedProcessingTime": "2-4 hours",
    "feeTier": "standard"
  }
]
```

**Status Codes:**

- `200` - Success
- `500` - Server Error

### GET /api/p2p/queue/deposits

Retrieve all pending deposit requests.

**Response Schema:**

```json
[
  {
    "id": "d1",
    "type": "deposit",
    "customerId": "CUST003",
    "amount": 800,
    "paymentType": "bank_transfer",
    "status": "pending",
    "createdAt": "2025-08-28T01:30:00.000Z",
    "telegramGroupId": "TG_GROUP_001",
    "telegramChatId": "CHAT_003",
    "telegramChannel": "CHANNEL_MAIN",
    "telegramUsername": "@user3",
    "notes": "New customer deposit - verify identity",
    "priority": "normal",
    "verificationStatus": "pending",
    "depositMethod": "wire_transfer"
  }
]
```

### GET /api/p2p/queue/matches

Retrieve available matching opportunities.

**Response Schema:**

```json
[
  {
    "id": "m1",
    "withdrawalId": "w1",
    "depositId": "d1",
    "withdrawalAmount": 500,
    "depositAmount": 800,
    "paymentType": "bank_transfer",
    "matchScore": 85,
    "waitTime": 3600000,
    "confidence": "high",
    "riskScore": "low",
    "estimatedSettlementTime": "2 hours",
    "fees": {
      "withdrawalFee": 5,
      "depositFee": 8,
      "matchingFee": 2
    }
  }
]
```

### GET /api/p2p/queue/stats

Retrieve comprehensive queue statistics.

**Response Schema:**

```json
{
  "totalItems": 6,
  "matchedPairs": 2,
  "successRate": 94.7,
  "totalVolume": 4050,
  "averageProcessingTime": "1.5 hours",
  "activeUsers": 156,
  "telegramGroups": 3,
  "pendingWithdrawals": 2,
  "pendingDeposits": 3,
  "completedToday": 47,
  "revenue": {
    "today": 1247.5,
    "thisWeek": 8930.25,
    "thisMonth": 34562.75
  },
  "performance": {
    "uptimePercentage": 99.8,
    "avgResponseTime": "145ms",
    "errorRate": 0.2
  }
}
```

## ⚙️ Queue Management

### POST /api/p2p/queue/cancel

Cancel a specific queue item.

**Request Body:**

```json
{
  "itemId": "w1",
  "reason": "Customer request"
}
```

**Response:**

```json
{
  "success": true,
  "itemId": "w1",
  "previousStatus": "pending",
  "newStatus": "cancelled",
  "reason": "Customer request",
  "cancelledAt": "2025-08-28T02:00:00.000Z",
  "refundInitiated": true
}
```

### PUT /api/p2p/queue/update

Update queue item details.

**Request Body:**

```json
{
  "itemId": "w1",
  "updates": {
    "notes": "Updated priority",
    "priority": "high",
    "amount": 550
  }
}
```

**Response:**

```json
{
  "success": true,
  "itemId": "w1",
  "updatedFields": ["notes", "priority", "amount"],
  "updatedAt": "2025-08-28T02:05:00.000Z",
  "item": {
    "id": "w1",
    "notes": "Updated priority",
    "priority": "high",
    "amount": 550,
    "lastModified": "2025-08-28T02:05:00.000Z"
  }
}
```

### GET /api/p2p/queue/item/{id}

Get detailed information for a specific queue item.

**Response:**

```json
{
  "id": "w1",
  "type": "withdrawal",
  "customerId": "CUST_W1",
  "amount": 1247,
  "status": "pending",
  "createdAt": "2025-08-28T02:10:00.000Z",
  "lastUpdated": "2025-08-28T02:10:00.000Z",
  "telegramData": {
    "groupId": "TG_GROUP_001",
    "chatId": "CHAT_W1",
    "username": "@user_w1",
    "channel": "CHANNEL_MAIN"
  },
  "transactionHistory": [
    {
      "timestamp": "2025-08-28T02:10:00.000Z",
      "action": "created",
      "details": "Queue item created"
    }
  ],
  "metadata": {
    "priority": "normal",
    "processingTime": "1-2 hours",
    "fees": {
      "base": 5.0,
      "percentage": 0.5
    }
  }
}
```

## 🤖 Matching System

### POST /api/p2p/queue/auto-match

Run the automated matching algorithm.

**Response:**

```json
{
  "success": true,
  "matchesFound": 3,
  "matchesApproved": 2,
  "totalVolume": 2150,
  "processingTime": "2.1s",
  "matches": [
    {
      "id": "m_auto_1",
      "withdrawalId": "w1",
      "depositId": "d1",
      "amount": 500,
      "confidence": 0.89,
      "autoApproved": true
    },
    {
      "id": "m_auto_2",
      "withdrawalId": "w3",
      "depositId": "d3",
      "amount": 300,
      "confidence": 0.76,
      "autoApproved": true
    }
  ]
}
```

### POST /api/p2p/queue/approve

Approve a specific match.

**Request Body:**

```json
{
  "matchId": "m1"
}
```

**Response:**

```json
{
  "success": true,
  "matchId": "m1",
  "status": "approved",
  "approvedAt": "2025-08-28T02:15:00.000Z",
  "estimatedSettlement": "2025-08-28T04:15:00.000Z",
  "transactionIds": {
    "withdrawal": "tx_w_1724803000000",
    "deposit": "tx_d_1724803000000"
  }
}
```

### POST /api/p2p/queue/reject

Reject a specific match.

**Request Body:**

```json
{
  "matchId": "m1",
  "reason": "Risk assessment failed"
}
```

**Response:**

```json
{
  "success": true,
  "matchId": "m1",
  "status": "rejected",
  "reason": "Risk assessment failed",
  "rejectedAt": "2025-08-28T02:20:00.000Z",
  "itemsReturnedToQueue": true
}
```

## 📱 Telegram Integration

### POST /api/p2p/queue/telegram/notify

Send Telegram notification to customers.

**Request Body:**

```json
{
  "itemId": "w1",
  "telegramChatId": "CHAT_001",
  "message": "Your withdrawal is being processed"
}
```

**Response:**

```json
{
  "success": true,
  "messageSent": true,
  "telegramMessageId": "tg_msg_1724803200000",
  "chatId": "CHAT_001",
  "timestamp": "2025-08-28T02:25:00.000Z",
  "message": "P2P Queue Update: Your withdrawal is being processed"
}
```

## 📤 Data Export

### GET /api/p2p/queue/export

Export complete queue data as JSON.

**Response:**

```json
{
  "metadata": {
    "exportedAt": "2025-08-28T02:30:00.000Z",
    "exportedBy": "system",
    "version": "4.0.0-staging",
    "totalRecords": 8
  },
  "data": {
    "withdrawals": [...],
    "deposits": [...],
    "matches": [...],
    "statistics": {...}
  },
  "summary": {
    "withdrawalCount": 3,
    "depositCount": 3,
    "matchCount": 2,
    "totalVolume": 4050
  }
}
```

## 🛡️ Error Handling

The API implements comprehensive error handling with circuit breaker patterns:

### Standard Error Response

```json
{
  "error": "Resource not found",
  "code": "P2P001",
  "timestamp": "2025-08-28T02:35:00.000Z",
  "requestId": "req_1724803500000_abc123"
}
```

### Circuit Breaker States

- **CLOSED**: Normal operation
- **OPEN**: Service temporarily unavailable
- **HALF_OPEN**: Testing service recovery

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `405` - Method Not Allowed
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error
- `503` - Service Unavailable (Circuit Breaker Open)

## ⏱️ Rate Limits

- **Standard Operations**: 100 requests per minute
- **Auto-matching**: 10 requests per minute
- **Export Operations**: 5 requests per hour
- **Bulk Updates**: 20 requests per minute

Rate limit headers:

- `X-RateLimit-Limit`: Requests per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Window reset time

## 📝 Examples

### JavaScript/TypeScript

```javascript
// Fetch withdrawal queue
const withdrawals = await fetch('/api/p2p/queue/withdrawals').then(res =>
  res.json()
);

// Run auto-matching
const matchResult = await fetch('/api/p2p/queue/auto-match', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
}).then(res => res.json());

// Send Telegram notification
const notification = await fetch('/api/p2p/queue/telegram/notify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    itemId: 'w1',
    telegramChatId: 'CHAT_001',
    message: 'Processing update',
  }),
}).then(res => res.json());
```

### cURL

```bash
# Get queue statistics
curl -X GET http://localhost:3001/api/p2p/queue/stats

# Cancel queue item
curl -X POST http://localhost:3001/api/p2p/queue/cancel \
  -H "Content-Type: application/json" \
  -d '{"itemId": "w1", "reason": "Customer request"}'

# Export queue data
curl -X GET http://localhost:3001/api/p2p/queue/export \
  -o "p2p-queue-export-$(date +%Y-%m-%d).json"
```

### Python

```python
import requests
import json

# Fetch deposits
response = requests.get('http://localhost:3001/api/p2p/queue/deposits')
deposits = response.json()

# Approve match
match_data = {'matchId': 'm1'}
response = requests.post(
    'http://localhost:3001/api/p2p/queue/approve',
    headers={'Content-Type': 'application/json'},
    data=json.dumps(match_data)
)
result = response.json()
```

---

## 📞 Support & Resources

- **HMR Development Server**: http://localhost:3001
- **Dashboard**: http://localhost:3001/p2p-queue-system.html
- **Reference Guide**: http://localhost:3001/reference
- **Health Check**: http://localhost:3001/health

**Package**: fire22-dashboard-worker@4.0.0-staging  
**Enhanced with**: Bun v1.01.04-alpha features and circuit breaker protection  
**Last Updated**: August 28, 2025
