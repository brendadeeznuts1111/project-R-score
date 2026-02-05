# Fire22 Dashboard API Data Flows

## Overview

Complete documentation of API data flows, endpoints, and data transformation
processes in the Fire22 Dashboard system.

## Table of Contents

- [API Architecture Overview](#api-architecture-overview)
- [Data Flow Patterns](#data-flow-patterns)
- [Authentication Flow](#authentication-flow)
- [Manager API Flows](#manager-api-flows)
- [Agent API Flows](#agent-api-flows)
- [Customer API Flows](#customer-api-flows)
- [Webhook Data Flows](#webhook-data-flows)
- [Real-Time Data Flows](#real-time-data-flows)
- [Data Transformation](#data-transformation)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Security Considerations](#security-considerations)

---

## API Architecture Overview

### System Components

```
[Client Applications] → [API Gateway] → [Service Layer] → [Database Layer]
                              ↓
                       [Authentication]
                              ↓
                       [Rate Limiting]
                              ↓
                       [Logging & Monitoring]
```

### API Layers

1. **Presentation Layer**

   - REST API endpoints
   - WebSocket connections
   - GraphQL queries (future)

2. **Business Logic Layer**

   - Wager processing
   - Commission calculations
   - Risk management
   - User management

3. **Data Access Layer**
   - Database queries
   - External API calls
   - Cache management
   - File operations

---

## Data Flow Patterns

### Request-Response Pattern

```
Client → API Gateway → Service → Database → Service → API Gateway → Client
   ↓         ↓         ↓         ↓         ↓         ↓         ↓
Request   Auth      Process   Query     Transform  Format   Response
```

### Event-Driven Pattern

```
Event Source → Event Bus → Event Handlers → Database → Notifications
     ↓           ↓            ↓            ↓           ↓
  Wager      Publish      Process      Store      Update UI
  Placement   Event       Business     Data       Real-time
```

### WebSocket Pattern

```
Client ←→ WebSocket Server ←→ Event System ←→ Database
   ↓           ↓                ↓            ↓
Subscribe   Connection      Event Loop    Data Changes
to Events   Management     Processing    Monitoring
```

---

## Authentication Flow

### JWT Token Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as Auth Service
    participant D as Database

    C->>A: Login Request (username/password)
    A->>D: Validate Credentials
    D->>A: User Data + Permissions
    A->>A: Generate JWT Token
    A->>C: JWT Token + User Info

    Note over C,A: Subsequent Requests
    C->>A: API Request + JWT Token
    A->>A: Validate JWT Token
    A->>A: Check Permissions
    A->>C: API Response
```

### Token Validation Process

1. **Extract Token**

   - Parse Authorization header
   - Extract JWT token
   - Validate format

2. **Verify Token**

   - Check signature
   - Validate expiration
   - Verify issuer

3. **Check Permissions**
   - Extract user role
   - Validate endpoint access
   - Check resource permissions

---

## Manager API Flows

### Weekly Analytics Flow

```mermaid
sequenceDiagram
    participant M as Manager
    participant A as API
    participant D as Database
    participant C as Cache

    M->>A: GET /api/manager/getWeeklyFigureByAgent
    A->>A: Validate JWT Token
    A->>A: Check Manager Permissions
    A->>C: Check Cache for Weekly Data
    C->>A: Return Cached Data (if available)

    alt Cache Miss
        A->>D: Query Weekly Statistics
        D->>A: Raw Weekly Data
        A->>A: Aggregate by Agent
        A->>A: Calculate KPIs
        A->>C: Store in Cache
        A->>M: Return Processed Data
    else Cache Hit
        A->>M: Return Cached Data
    end
```

### Pending Operations Flow

```mermaid
sequenceDiagram
    participant M as Manager
    participant A as API
    participant D as Database

    M->>A: POST /api/manager/getPending
    A->>A: Validate JWT Token
    A->>A: Check Manager Permissions
    A->>D: Query Pending Wagers
    D->>A: Pending Wager Data
    A->>A: Process Pending Data
    A->>A: Calculate Risk Metrics
    A->>M: Return Pending Summary
```

### Agent KPI Flow

```mermaid
sequenceDiagram
    participant M as Manager
    participant A as API
    participant D as Database
    participant C as Cache

    M->>A: GET /api/manager/getAgentKPI
    A->>A: Validate JWT Token
    A->>A: Check Manager Permissions
    A->>C: Check Cache for KPI Data

    alt Cache Miss
        A->>D: Query Agent Performance
        D->>A: Raw Performance Data
        A->>A: Calculate KPIs
        A->>A: Apply Commission Rules
        A->>C: Store in Cache
        A->>M: Return KPI Data
    else Cache Hit
        A->>M: Return Cached KPI Data
    end
```

---

## Agent API Flows

### Customer Management Flow

```mermaid
sequenceDiagram
    participant AG as Agent
    participant A as API
    participant D as Database

    AG->>A: GET /api/agent/getCustomersByAgent
    A->>A: Validate JWT Token
    A->>A: Check Agent Permissions
    A->>A: Extract Agent ID from Token
    A->>D: Query Customers by Agent ID
    D->>A: Customer Data
    A->>A: Filter Sensitive Information
    A->>AG: Return Customer List
```

### Wager Management Flow

```mermaid
sequenceDiagram
    participant AG as Agent
    participant A as API
    participant D as Database
    participant R as Risk Engine

    AG->>A: POST /api/agent/createWager
    A->>A: Validate JWT Token
    A->>A: Check Agent Permissions
    A->>A: Validate Wager Data
    A->>R: Check Risk Limits
    R->>A: Risk Assessment

    alt Risk Acceptable
        A->>D: Create Wager Record
        D->>A: Wager Confirmation
        A->>AG: Return Success Response
    else Risk Too High
        A->>AG: Return Risk Warning
    end
```

---

## Customer API Flows

### Wager Placement Flow

```mermaid
sequenceDiagram
    participant C as Customer
    participant A as API
    participant D as Database
    participant B as Balance Service

    C->>A: POST /api/customer/placeWager
    A->>A: Validate JWT Token
    A->>A: Check Customer Permissions
    A->>A: Validate Wager Data
    A->>B: Check Account Balance
    B->>A: Balance Information

    alt Sufficient Balance
        A->>D: Deduct Balance
        A->>D: Create Wager Record
        D->>A: Transaction Confirmation
        A->>C: Return Success Response
    else Insufficient Balance
        A->>C: Return Insufficient Funds Error
    end
```

### Balance Management Flow

```mermaid
sequenceDiagram
    participant C as Customer
    participant A as API
    participant D as Database
    participant P as Payment Service

    C->>A: POST /api/customer/deposit
    A->>A: Validate JWT Token
    A->>A: Check Customer Permissions
    A->>A: Validate Deposit Amount
    A->>P: Process Payment
    P->>A: Payment Confirmation
    A->>D: Update Account Balance
    A->>D: Log Transaction
    A->>C: Return Success Response
```

---

## Webhook Data Flows

### Stripe Webhook Flow

```mermaid
sequenceDiagram
    participant S as Stripe
    participant A as API
    participant D as Database
    participant N as Notification Service

    S->>A: Webhook Event
    A->>A: Verify Webhook Signature
    A->>A: Parse Event Data

    alt Payment Success
        A->>D: Update Payment Status
        A->>D: Update Account Balance
        A->>N: Send Success Notification
        A->>S: Return 200 OK
    else Payment Failed
        A->>D: Update Payment Status
        A->>N: Send Failure Notification
        A->>S: Return 200 OK
    end
```

### Fire22 Webhook Flow

```mermaid
sequenceDiagram
    participant F as Fire22
    participant A as API
    participant D as Database
    participant W as WebSocket

    F->>A: Webhook Event
    A->>A: Verify Webhook Secret
    A->>A: Parse Event Data

    alt Wager Update
        A->>D: Update Wager Status
        A->>W: Broadcast Real-time Update
        A->>F: Return 200 OK
    else System Alert
        A->>D: Log System Alert
        A->>W: Broadcast Alert
        A->>F: Return 200 OK
    end
```

---

## Real-Time Data Flows

### WebSocket Data Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant W as WebSocket Server
    participant E as Event System
    participant D as Database

    C->>W: Connect WebSocket
    W->>C: Connection Confirmed
    C->>W: Subscribe to Events

    loop Real-time Updates
        D->>E: Data Change Event
        E->>W: Broadcast Event
        W->>C: Send Update
    end
```

### Real-Time Update Types

1. **KPI Updates**

   - Revenue changes
   - Active player count
   - Pending wager count
   - Liability updates

2. **Wager Updates**

   - New wager placement
   - Wager status changes
   - Settlement results
   - Cancellation notices

3. **System Updates**
   - Performance alerts
   - Error notifications
   - Maintenance notices
   - Security alerts

---

## Data Transformation

### Input Validation

```typescript
interface ValidationSchema {
  required: string[];
  types: Record<string, string>;
  constraints: Record<string, any>;
  sanitization: Record<string, string>;
}
```

### Data Processing Pipeline

```
Raw Input → Validation → Sanitization → Transformation → Storage → Response
    ↓           ↓           ↓            ↓           ↓         ↓
  HTTP      Schema      Clean Data   Business    Database   Formatted
  Request   Check      (XSS/Injection) Logic     Storage    Response
```

### Response Formatting

```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId: string;
}
```

---

## Error Handling

### Error Response Structure

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}
```

### Error Categories

1. **Client Errors (4xx)**

   - Validation errors
   - Authentication failures
   - Permission denied
   - Resource not found

2. **Server Errors (5xx)**
   - Internal server errors
   - Database connection issues
   - External service failures
   - System overload

### Error Handling Flow

```
Error Occurs → Log Error → Classify Error → Format Response → Send Response
     ↓           ↓          ↓              ↓              ↓
  Exception   Error      Error Type    Response      Client
  Thrown      Logging    Detection     Formatting    Response
```

---

## Rate Limiting

### Rate Limit Strategy

```typescript
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
}
```

### Rate Limit Implementation

1. **Token Bucket Algorithm**

   - Fixed bucket size
   - Refill rate per second
   - Burst handling

2. **Sliding Window**
   - Rolling time window
   - Request counting
   - Smooth rate limiting

### Rate Limit Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642680000
```

---

## Security Considerations

### API Security Measures

1. **Authentication**

   - JWT token validation
   - Token expiration
   - Refresh token rotation

2. **Authorization**

   - Role-based access control
   - Resource-level permissions
   - API endpoint protection

3. **Data Protection**
   - Input sanitization
   - SQL injection prevention
   - XSS protection
   - CSRF protection

### Security Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

---

## API Monitoring

### Key Metrics

1. **Performance Metrics**

   - Response time
   - Throughput
   - Error rates
   - Availability

2. **Business Metrics**
   - API usage patterns
   - User behavior
   - Feature adoption
   - Revenue impact

### Monitoring Tools

- **Real-time Monitoring**: Live API performance
- **Alert Systems**: Automated notifications
- **Logging**: Comprehensive request/response logs
- **Analytics**: Usage pattern analysis

---

## API Versioning

### Versioning Strategy

1. **URL Versioning**

   - `/api/v1/endpoint`
   - `/api/v2/endpoint`
   - Clear version separation

2. **Header Versioning**
   - `Accept: application/vnd.api+json;version=1`
   - Clean URLs
   - Flexible versioning

### Migration Strategy

- **Backward Compatibility**: Maintain old versions
- **Gradual Migration**: Phased rollout
- **Deprecation Notices**: Clear communication
- **Migration Tools**: Automated assistance

---

## Future API Enhancements

### Planned Features

1. **GraphQL Support**

   - Flexible queries
   - Reduced over-fetching
   - Schema introspection

2. **API Gateway**

   - Centralized routing
   - Load balancing
   - Circuit breakers

3. **Advanced Caching**
   - Redis integration
   - Cache invalidation
   - Smart caching strategies

### Technology Roadmap

- **Short-term**: Performance optimization
- **Medium-term**: New API features
- **Long-term**: Architecture evolution
- **Continuous**: Security improvements

---

_Last Updated: 2024-01-20_ _Version: 1.0_ _Maintainer: Fire22 Development Team_
