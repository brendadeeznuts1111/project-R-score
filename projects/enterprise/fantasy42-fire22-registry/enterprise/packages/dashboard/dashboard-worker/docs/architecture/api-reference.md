# 🔗 **Crystal Clear Architecture: API Reference**

## **Overview**

This document provides comprehensive technical specifications for all domain
APIs, including endpoints, request/response formats, authentication
requirements, and error handling.

---

## **1. Collections Domain API**

### **Base URL**

```
https://api.fire22.com/collections
```

### **Authentication**

All endpoints require Bearer token authentication:

```
Authorization: Bearer <jwt-token>
```

### **Endpoints**

#### **GET /collections/dashboard**

Get collections dashboard data with key performance indicators.

**Parameters:**

- `period` (optional): `today`, `week`, `month` (default: `today`)

**Response:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalPendingSettlements": 12,
      "totalSettledToday": 8,
      "totalPayoutAmount": 2450.75,
      "averageProcessingTime": "2.3 hours",
      "overdueSettlements": 3
    },
    "priorityBreakdown": {
      "high": 4,
      "medium": 6,
      "low": 2
    },
    "statusBreakdown": {
      "ready_for_settlement": 7,
      "awaiting_verification": 3,
      "awaiting_result": 2
    },
    "recentActivity": [
      {
        "id": "ACT_001",
        "type": "settlement_processed",
        "description": "Processed settlement for John Doe - $166.67",
        "timestamp": "2025-01-26T14:30:00Z",
        "processedBy": "Agent Smith"
      }
    ]
  },
  "metadata": {
    "generatedAt": "2025-01-26T15:00:00Z",
    "period": "today",
    "dataSource": "Collections Management System"
  }
}
```

#### **GET /collections/pending-settlements**

Retrieve paginated list of pending settlements.

**Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `priority` (optional): `high`, `medium`, `low`, `all` (default: `all`)
- `customerId` (optional): Filter by customer ID

**Response:**

```json
{
  "success": true,
  "data": {
    "settlements": [
      {
        "id": "PEN_001",
        "customerId": "CUST_001",
        "customerName": "John Doe",
        "wagerId": "WAGER_001",
        "event": "Chiefs vs Bills",
        "betType": "moneyline",
        "stake": 100.0,
        "potentialPayout": 166.67,
        "priority": "high",
        "dueDate": "2025-01-26T17:00:00Z",
        "status": "ready_for_settlement"
      }
    ],
    "summary": {
      "totalPending": 12,
      "highPriority": 4,
      "overdueCount": 1,
      "totalPotentialPayout": 2450.75
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalSettlements": 12,
      "totalPages": 1
    }
  }
}
```

#### **POST /collections/process-settlement**

Process a settlement payment.

**Request Body:**

```json
{
  "settlementId": "PEN_001",
  "customerId": "CUST_001",
  "amount": 166.67,
  "notes": "VIP customer settlement",
  "processedBy": "Agent Smith"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "settlementId": "PEN_001",
    "customerId": "CUST_001",
    "amount": 166.67,
    "status": "processed",
    "processedAt": "2025-01-26T15:30:00Z",
    "transactionId": "TXN_1234567890",
    "confirmationNumber": "CONF_PEN_001_1234567890"
  },
  "message": "Settlement processed successfully. Amount: $166.67 paid to customer CUST_001"
}
```

---

## **2. Distributions Domain API**

### **Base URL**

```
https://api.fire22.com/distributions
```

### **Endpoints**

#### **GET /distributions/overview**

Get distribution overview and revenue breakdown.

**Parameters:**

- `period` (optional): `current_month`, `last_month`, `current_year`,
  `last_year`
- `includeDetails` (optional): `true` to include recipients and transactions

**Response:**

```json
{
  "success": true,
  "data": {
    "totalRevenue": 125000.0,
    "totalDistributed": 87500.0,
    "distributionRate": 70.0,
    "breakdown": {
      "affiliateCommissions": 25000.0,
      "agentCommissions": 18750.0,
      "partnerShares": 15000.0,
      "referralBonuses": 8750.0
    }
  }
}
```

#### **POST /distributions/payment**

Process a distribution payment.

**Request Body:**

```json
{
  "recipientId": "AFF_001",
  "amount": 6250.0,
  "paymentMethod": "wire_transfer",
  "reference": "AFF_COM_202501",
  "notes": "Monthly affiliate commission",
  "processedBy": "Finance Manager"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "distributionId": "DIST_1234567890",
    "recipientId": "AFF_001",
    "amount": 6250.0,
    "status": "completed",
    "processedAt": "2025-01-26T16:00:00Z",
    "transactionId": "TXN_DIST_1234567890"
  }
}
```

---

## **3. Free Play Domain API**

### **Base URL**

```
https://api.fire22.com/free-play
```

### **Endpoints**

#### **GET /free-play/overview**

Get free play overview and statistics.

**Parameters:**

- `period` (optional): `current_month`, `last_month`, `current_year`,
  `last_year`
- `includeDetails` (optional): `true` to include customer and transaction
  details

**Response:**

```json
{
  "success": true,
  "data": {
    "totalFreePlayIssued": 150000.0,
    "totalFreePlayRedeemed": 87500.0,
    "remainingFreePlay": 50000.0,
    "redemptionRate": 58.3,
    "breakdown": {
      "welcomeBonuses": 45000.0,
      "depositMatchBonuses": 37500.0,
      "freeBets": 25000.0
    }
  }
}
```

#### **POST /free-play/create**

Create a new free play transaction.

**Request Body:**

```json
{
  "customerId": "CUST_001",
  "type": "welcome_bonus",
  "amount": 500.0,
  "description": "Welcome bonus for new customer",
  "wageringRequirement": 10,
  "expiresInDays": 30,
  "reference": "WELCOME_2025",
  "processedBy": "Marketing Manager"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "transactionId": "FP_1234567890",
    "customerId": "CUST_001",
    "amount": 500.0,
    "status": "available",
    "issuedAt": "2025-01-26T17:00:00Z",
    "expiresAt": "2025-02-25T17:00:00Z"
  }
}
```

#### **POST /free-play/redeem**

Redeem a free play transaction.

**Request Body:**

```json
{
  "transactionId": "FP_1234567890",
  "customerId": "CUST_001",
  "redemptionAmount": 250.0,
  "wagerAmount": 2500.0,
  "processedBy": "Customer Service"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "transactionId": "FP_1234567890",
    "originalAmount": 500.0,
    "redemptionAmount": 250.0,
    "remainingAmount": 250.0,
    "status": "partially_redeemed",
    "creditedTo": "CUST_001",
    "reference": "REDEEM_FP_1234567890_1234567890"
  }
}
```

---

## **4. Balance Domain API**

### **Base URL**

```
https://api.fire22.com/balances
```

### **Endpoints**

#### **GET /balances/customer**

Get customer balance information.

**Parameters:**

- `customerId` (required): Customer identifier
- `includeHistory` (optional): Include transaction history

**Response:**

```json
{
  "success": true,
  "data": {
    "customerId": "CUST_001",
    "customerName": "John Doe",
    "currentBalance": 1250.75,
    "availableBalance": 1250.75,
    "pendingWithdrawals": 0.0,
    "creditLimit": 5000.0,
    "accountStatus": "active",
    "lastUpdated": "2025-01-26T18:00:00Z"
  }
}
```

#### **POST /balances/update**

Update customer balance.

**Request Body:**

```json
{
  "customerId": "CUST_001",
  "amount": 500.0,
  "transactionType": "deposit",
  "description": "Bank deposit",
  "reference": "DEP_1234567890",
  "processedBy": "Teller"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "customerId": "CUST_001",
    "previousBalance": 750.75,
    "newBalance": 1250.75,
    "amount": 500.0,
    "transactionId": "BAL_1234567890",
    "timestamp": "2025-01-26T18:30:00Z"
  }
}
```

---

## **5. Adjustment Domain API**

### **Base URL**

```
https://api.fire22.com/adjustments
```

### **Endpoints**

#### **GET /adjustments/history**

Get adjustment history with filtering.

**Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by adjustment type
- `customerId` (optional): Filter by customer
- `processedBy` (optional): Filter by processor

**Response:**

```json
{
  "success": true,
  "data": {
    "adjustments": [
      {
        "id": "ADJ_001",
        "customerId": "CUST_001",
        "type": "balance_adjustment",
        "amount": 150.0,
        "description": "Manual balance correction",
        "status": "completed",
        "processedBy": "Agent Smith",
        "processedAt": "2025-01-25T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalAdjustments": 25,
      "totalPages": 2
    }
  }
}
```

#### **POST /adjustments/create**

Create a new adjustment.

**Request Body:**

```json
{
  "customerId": "CUST_001",
  "type": "balance_adjustment",
  "amount": 150.0,
  "description": "Manual balance correction for lost wager",
  "reason": "Customer reported lost wager not reflected",
  "notes": "Verified wager ID: WAGER_12345",
  "processedBy": "Agent Smith",
  "requiresApproval": true
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "adjustmentId": "ADJ_1234567890",
    "customerId": "CUST_001",
    "amount": 150.0,
    "status": "pending_approval",
    "createdAt": "2025-01-26T19:00:00Z"
  }
}
```

#### **POST /adjustments/approve**

Approve a pending adjustment.

**Request Body:**

```json
{
  "adjustmentId": "ADJ_1234567890",
  "approvedBy": "Manager Johnson",
  "notes": "Approved - valid correction request"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "adjustmentId": "ADJ_1234567890",
    "status": "completed",
    "approvedBy": "Manager Johnson",
    "approvedAt": "2025-01-26T19:30:00Z"
  }
}
```

---

## **6. Common API Patterns**

### **Authentication**

All endpoints require JWT Bearer token authentication:

```
Authorization: Bearer <jwt-token>
```

### **Rate Limiting**

- Standard endpoints: 100 requests per minute
- Bulk operations: 10 requests per minute
- Real-time endpoints: 1000 requests per minute

### **Pagination**

Standard pagination parameters:

```json
{
  "page": 1,
  "limit": 20,
  "totalItems": 150,
  "totalPages": 8,
  "hasNextPage": true,
  "hasPrevPage": false
}
```

### **Filtering**

Common filter parameters:

```json
{
  "customerId": "CUST_001",
  "status": "active",
  "dateFrom": "2025-01-01T00:00:00Z",
  "dateTo": "2025-01-31T23:59:59Z",
  "type": "commission"
}
```

---

## **7. Error Handling**

### **HTTP Status Codes**

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error

### **Error Response Format**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Customer ID is required",
    "details": {
      "field": "customerId",
      "value": null,
      "constraint": "required"
    }
  },
  "timestamp": "2025-01-26T20:00:00Z",
  "requestId": "req_1234567890"
}
```

### **Common Error Codes**

- `VALIDATION_ERROR` - Input validation failed
- `AUTHENTICATION_ERROR` - Invalid or missing credentials
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `NOT_FOUND_ERROR` - Resource not found
- `CONFLICT_ERROR` - Resource state conflict
- `RATE_LIMIT_ERROR` - Rate limit exceeded
- `INTERNAL_ERROR` - Server error

---

## **8. Webhooks & Real-time Updates**

### **Settlement Webhooks**

```json
{
  "event": "settlement.processed",
  "data": {
    "settlementId": "PEN_001",
    "customerId": "CUST_001",
    "amount": 166.67,
    "status": "completed",
    "processedAt": "2025-01-26T20:30:00Z"
  },
  "timestamp": "2025-01-26T20:30:00Z"
}
```

### **Distribution Webhooks**

```json
{
  "event": "distribution.completed",
  "data": {
    "distributionId": "DIST_1234567890",
    "recipientId": "AFF_001",
    "amount": 6250.0,
    "paymentMethod": "wire_transfer",
    "completedAt": "2025-01-26T21:00:00Z"
  }
}
```

---

## **9. SDK & Client Libraries**

### **Available SDKs**

- **JavaScript/TypeScript**: `@fire22/api-client`
- **Python**: `fire22-api-client`
- **Java**: `fire22-api-client`
- **Go**: `fire22-api-client`

### **Example Usage**

```javascript
import { Fire22API } from '@fire22/api-client';

const client = new Fire22API({
  apiKey: 'your-api-key',
  baseURL: 'https://api.fire22.com',
});

// Get collections dashboard
const dashboard = await client.collections.getDashboard({
  period: 'today',
});

// Process settlement
const result = await client.collections.processSettlement({
  settlementId: 'PEN_001',
  customerId: 'CUST_001',
  amount: 166.67,
  processedBy: 'Agent Smith',
});
```

---

## **10. Testing & Development**

### **Sandbox Environment**

```
https://sandbox-api.fire22.com
```

### **Test Data**

Pre-populated test data available in sandbox:

- Test customers: `CUST_TEST_001` through `CUST_TEST_100`
- Test settlements: `PEN_TEST_001` through `PEN_TEST_050`
- Test distributions: `DIST_TEST_001` through `DIST_TEST_030`

### **API Testing Tools**

- **Postman Collection**: Available in `/docs/postman/`
- **OpenAPI Specification**: Available at `/docs/openapi.json`
- **GraphQL Playground**: Available at `/graphql`

---

## **11. Support & Documentation**

### **Developer Portal**

- **Documentation**: https://developers.fire22.com
- **API Status**: https://status.fire22.com
- **Changelog**: https://changelog.fire22.com

### **Support Channels**

- **Email**: api-support@fire22.com
- **Slack**: #api-support
- **GitHub Issues**: https://github.com/fire22/api-client/issues

### **Versioning**

- **Current Version**: v2.1.0
- **Sunset Policy**: 12 months notice for deprecated endpoints
- **Breaking Changes**: Major version increments

---

_This API reference is automatically updated with each deployment. For the
latest specifications, see the [OpenAPI documentation](./openapi.json)._
