# 🏗️ Nebula-Flow™ Architecture

Complete system architecture and design patterns for the DuoPlus Lightning Network Integration.

## 🎯 System Overview

Nebula-Flow™ is a production-grade Lightning Network payment system with integrated device management, compliance, and financial optimization.

```
┌─────────────────────────────────────────────────────────┐
│                    Web Dashboard                         │
│  (Real-time metrics, device management, monitoring)     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              HTTP API Server (Bun)                       │
│  ├─ Payment Routes                                       │
│  ├─ Node Management                                      │
│  ├─ Compliance Endpoints                                 │
│  └─ Webhook Handlers                                     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│           Core Services Layer                            │
│  ├─ Lightning Service (LND Integration)                  │
│  ├─ Compliance Service (KYC/AML)                         │
│  ├─ Finance Service (Yield Optimization)                │
│  ├─ Atlas Service (Device Management)                   │
│  └─ Nebula Core (Comet, Stardust, Orbit)               │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│         Data & Infrastructure Layer                      │
│  ├─ SQLite Database                                      │
│  ├─ Connection Pool                                      │
│  ├─ Logging System                                       │
│  └─ Cache Layer                                          │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│        External Integrations                             │
│  ├─ LND Node (Lightning Network)                         │
│  ├─ Cash App API                                         │
│  ├─ OFAC Sanctions Database                              │
│  └─ Webhook Providers                                    │
└─────────────────────────────────────────────────────────┘
```

## 🔌 Core Components

### Lightning Service (`src/services/lightningService.ts`)
- BOLT-11 invoice generation
- LND REST API communication
- Channel management
- Balance tracking
- Deterministic preimages

### Compliance Service (`src/compliance/kycValidator.ts`)
- KYC limit enforcement
- FinCEN CTR ($10k daily)
- FinCEN Recordkeeping ($3k)
- Risk tier classification
- OFAC sanctions checking
- Velocity monitoring (20 tx/hour)

### Finance Service (`src/finance/`)
- Yield optimization routing
- Cash App Green integration (3.25% APY)
- Savings consolidation
- Interest calculations
- Microtransaction handling

### Atlas System (`src/atlas/`)
- Device inventory management
- Lifecycle tracking
- Automated provisioning
- Fleet operations
- State management

### Nebula-Flow Core (`src/nebula/`)
- **Comet-Collect™**: Data aggregation
- **Cover-Stardust™**: Protection layer
- **Orbit-Assign™**: Task distribution
- **Core**: Central orchestration

## 🔄 Data Flow

### Payment Processing Flow

```
1. Client Request
   ↓
2. KYC Validation
   ├─ Check daily limits
   ├─ Verify risk tier
   ├─ OFAC check
   └─ Velocity check
   ↓
3. Invoice Generation
   ├─ Create BOLT-11 invoice
   ├─ Generate QR code
   └─ Store preimage
   ↓
4. Payment Settlement
   ├─ Monitor invoice status
   ├─ Confirm payment
   └─ Log transaction
   ↓
5. Yield Routing
   ├─ Determine savings tier
   ├─ Route to Cash App/Lightning
   └─ Log yield
   ↓
6. Response to Client
```

### Real-Time Updates Flow

```
Server                          Client
  │                               │
  ├─ EventSource Connection ◄─────┤
  │                               │
  ├─ Profit Update (1s interval)  │
  ├─────────────────────────────► │
  │                               │
  ├─ Device Status Change         │
  ├─────────────────────────────► │
  │                               │
  └─ Metrics Update               │
    ─────────────────────────────► │
```

## 📊 Database Schema

### Core Tables
- `invoices` - BOLT-11 invoices
- `payments` - Payment records
- `devices` - Device inventory
- `users` - User profiles
- `compliance_logs` - Audit trail
- `yield_records` - Yield tracking

## 🔐 Security Architecture

### Authentication
- Macaroon-based LND auth
- API key validation
- JWT tokens (optional)

### Encryption
- TLS for all API endpoints
- Database encryption at rest
- Secrets in environment variables

### Compliance
- Audit logging (JSONL format)
- Manual review queue
- Compliance reporting

### Anomaly Detection (`src/compliance/anomalyDetector.ts`)
- **ML-based threat scoring** (0-1 risk scale)
- **10 behavioral features**:
  - Device security: root detection, jailbreak detection
  - Network: VPN activity, proxy hop count
  - Hardware: thermal spikes, biometric failures
  - Behavioral: location changes, unusual transaction patterns
  - Performance: rapid API calls, time anomalies
- **Risk levels**: low (<0.3), medium (0.3-0.6), high (0.6-0.85), critical (>0.85)
- **Automatic blocking** at 0.92+ score
- **Session tracking** with exponential moving average (EMA)
- **Batch prediction** for multiple sessions

### Session Management (`src/compliance/sessionManager.ts`)
- **Session lifecycle**: create, validate, terminate
- **Periodic anomaly checks** every 5 minutes
- **Automatic cleanup** of expired sessions (30-min timeout)
- **Challenge-based auth** for medium-risk sessions (0.6+ score)
- **Per-user session tracking** and device fingerprinting

## 🚀 Deployment Architecture

### Multi-Phase Deployment (12 phases)
1. **Phase 01-03**: Infrastructure setup
2. **Phase 04-06**: Application deployment
3. **Phase 07-09**: Integration testing
4. **Phase 10-12**: Production hardening

### Scaling Strategy
- Horizontal scaling via load balancer
- Database replication
- Cache layer for performance
- Connection pooling

## 🔧 Technology Stack

- **Runtime**: Bun (JavaScript/TypeScript)
- **Database**: SQLite
- **API**: HTTP/REST
- **Real-time**: EventSource (SSE)
- **Frontend**: HTML/CSS/JavaScript
- **Lightning**: LND REST API
- **Compliance**: Custom validators

## 📈 Performance Characteristics

- Invoice generation: < 1s
- Lightning success rate: 99.9%
- DOM updates: < 16ms
- Transaction fee: $0.001
- Channel closures: 0

## 🔄 Integration Points

### External APIs
- LND REST API (Lightning Network)
- Cash App API (Yield routing)
- OFAC Database (Sanctions checking)
- Webhook endpoints (Settlement notifications)

### Internal APIs
- Payment Routes
- Node Management
- Compliance Endpoints
- Metrics Endpoints

## 📝 Logging & Monitoring

### Log Files
- `logs/lightning-audit.jsonl` - Invoice audit trail
- `logs/compliance-review-queue.jsonl` - Manual reviews
- `logs/yield-generation.jsonl` - Yield tracking

### Metrics
- Real-time dashboard
- Performance monitoring
- Compliance reporting
- Financial reconciliation

---

**Architecture Version**: 3.5.0  
**Last Updated**: 2026-01-21

