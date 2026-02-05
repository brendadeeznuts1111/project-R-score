# Bun Payment Linker API Documentation

## Overview

The Bun Payment Linker API provides a comprehensive RESTful interface for enterprise-grade auto-underwriting, risk assessment, and payment processing.

## Base URL

```
Development: http://localhost:3000/api/v1
Production: https://api.bun-payment-linker.com/v1
```

## Authentication

All API endpoints require JWT authentication:

```bash
Authorization: Bearer <your-jwt-token>
```

### Getting Access Token

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

## API Endpoints

### Underwriting

#### Submit Application
```bash
POST /underwriting/applications
Content-Type: application/json

{
  "name": "John Doe",
  "ssn": "123-45-6789",
  "income": 75000,
  "employment": "employed",
  "requestedLimit": 10000,
  "creditScore": 720
}
```

#### Get Applications
```bash
GET /underwriting/applications?page=1&limit=20&status=processed
```

#### Get Application Details
```bash
GET /underwriting/applications/{applicationId}
```

#### Update Decision (Manual Review)
```bash
PATCH /underwriting/applications/{applicationId}/decision
Content-Type: application/json

{
  "decision": "approved",
  "reason": "Manual review completed",
  "reviewedBy": "reviewer-id"
}
```

### Device Management

#### List Devices
```bash
GET /devices?status=online&region=US-East-1A
```

#### Provision New Device
```bash
POST /devices/provision
Content-Type: application/json

{
  "region": "US-East-1A",
  "deviceType": "iPhone",
  "capabilities": ["sms", "screenshot", "adb"]
}
```

#### Execute ADB Command
```bash
POST /devices/{deviceId}/adb
Content-Type: application/json

{
  "command": "adb shell dumpsys battery",
  "timeout": 30000
}
```

#### Capture Screenshot
```bash
GET /devices/{deviceId}/screenshot?format=png
```

#### Get SMS Messages
```bash
GET /devices/{deviceId}/sms?limit=50&unreadOnly=true
```

### Stripe Integration

#### Create Connected Account
```bash
POST /stripe/connected-accounts
Content-Type: application/json

{
  "email": "user@example.com",
  "businessType": "individual",
  "country": "US",
  "capabilities": ["card_payments", "transfers"]
}
```

#### Create Account Link
```bash
POST /stripe/account-links
Content-Type: application/json

{
  "accountId": "acct_xxx",
  "refreshUrl": "https://app.example.com/refresh",
  "returnUrl": "https://app.example.com/return",
  "type": "account_onboarding"
}
```

#### Create Transfer
```bash
POST /stripe/transfers
Content-Type: application/json

{
  "amount": 10000,
  "currency": "usd",
  "destination": "acct_xxx"
}
```

### Plaid Integration

#### Create Link Token
```bash
POST /plaid/link-token/create
Content-Type: application/json

{
  "user": {
    "client_user_id": "user-id"
  },
  "products": ["auth", "transactions"],
  "country_codes": ["US"],
  "language": "en"
}
```

#### Start Identity Verification
```bash
POST /plaid/identity-verification
Content-Type: application/json

{
  "templateId": "template_xxx",
  "user": {
    "legalName": "John Doe",
    "emailAddress": "john@example.com"
  }
}
```

### Blockchain

#### Log Decision to Blockchain
```bash
POST /blockchain/log-decision
Content-Type: application/json

{
  "applicationId": "app-uuid",
  "decision": "approved",
  "riskScore": 750,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Get Audit Trail
```bash
GET /blockchain/audit-trail?applicationId=app-uuid&limit=100
```

#### Generate Merkle Proof
```bash
POST /blockchain/merkle-proof
Content-Type: application/json

{
  "applicationId": "app-uuid",
  "blockNumber": 12345
}
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "ssn",
        "message": "Invalid SSN format"
      }
    ]
  }
}
```

## HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error

## Rate Limiting

API endpoints are rate-limited:

- **General API**: 1000 requests per 15 minutes per IP
- **Underwriting**: 10 applications per minute per user
- **Device Operations**: 20 operations per minute per user
- **Authentication**: 5 attempts per 15 minutes per IP

## Webhooks

### Stripe Webhooks
```bash
POST /webhooks/stripe
Stripe-Signature: <signature>
Content-Type: application/json

{
  "type": "account.updated",
  "data": {
    "object": {
      // Account data
    }
  }
}
```

### Plaid Webhooks
```bash
POST /webhooks/plaid
Plaid-Verification: <signature>
Content-Type: application/json

{
  "webhook_type": "ITEM",
  "webhook_code": "LOGIN_REQUIRED",
  "item_id": "item_xxx"
}
```

## SDKs and Libraries

### Node.js
```bash
npm install bun-payment-linker-sdk
```

```javascript
const BunPaymentLinker = require('bun-payment-linker-sdk');

const client = new BunPaymentLinker({
  apiKey: 'your-api-key',
  baseURL: 'https://api.bun-payment-linker.com/v1'
});

const application = await client.underwriting.submitApplication({
  name: 'John Doe',
  ssn: '123-45-6789',
  income: 75000
});
```

### Python
```bash
pip install bun-payment-linker-python
```

```python
from bun_payment_linker import BunPaymentLinker

client = BunPaymentLinker(
    api_key='your-api-key',
    base_url='https://api.bun-payment-linker.com/v1'
)

application = client.underwriting.submit_application(
    name='John Doe',
    ssn='123-45-6789',
    income=75000
)
```

## Testing

### Test Environment
- Base URL: `https://api-sandbox.bun-payment-linker.com/v1`
- Test credentials available in developer portal

### Postman Collection
Download our Postman collection for easy API testing:
[Download Postman Collection](https://github.com/bun-payment-linker/postman-collection/raw/main/bun-payment-linker-collection.json)

## Support

- **API Documentation**: https://docs.bun-payment-linker.com
- **Developer Portal**: https://developers.bun-payment-linker.com
- **Support Email**: api-support@bun-payment-linker.com
- **Status Page**: https://status.bun-payment-linker.com

## Changelog

### v1.0.0 (2024-01-01)
- Initial API release
- Core underwriting endpoints
- Device management
- Stripe and Plaid integration
- Blockchain audit trail

### v1.1.0 (2024-02-01)
- Enhanced risk assessment
- Real-time WebSocket updates
- Advanced fraud detection
- Performance optimizations
