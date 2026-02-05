# Settlement Domain

## Overview

The Settlement Domain handles payment settlement and reconciliation operations
in the Fire22 system. This domain is responsible for processing completed
payments into merchant settlements, calculating fees, managing settlement
lifecycles, and providing comprehensive settlement analytics.

## Architecture

### Domain-Driven Design Implementation

- **Entities**: Settlement (domain entity with business rules)
- **Value Objects**: SettlementFees (immutable fee calculations)
- **Services**: SettlementService (business logic orchestration)
- **Repository**: SettlementRepository (data persistence)
- **Controller**: SettlementsController (API entry point)

### Key Responsibilities

#### 1. Settlement Creation (`createAutomatedSettlement`)

- Create settlements for completed payments
- Calculate processing fees based on payment amount and currency
- Apply business rules and compliance checks
- Generate settlement references and batch assignments

#### 2. Batch Processing (`processSettlementBatch`)

- Process multiple settlements simultaneously
- Handle settlement lifecycle (pending → processing → completed/failed)
- Provide real-time processing status and error handling
- Generate comprehensive batch processing reports

#### 3. Settlement Completion (`completeSettlement`)

- Mark settlements as completed with bank references
- Update settlement metadata and processing notes
- Calculate final settlement amounts and fees
- Publish settlement completion events

#### 4. Analytics & Reporting (`getSettlementAnalytics`)

- Provide comprehensive settlement metrics
- Track success rates and processing times
- Calculate fee summaries and merchant performance
- Support date range and merchant-specific filtering

## Core Business Rules

### Settlement Limits

- **Minimum Settlement Amount**: $1.00
- **Maximum Settlement Amount**: $50,000 per settlement
- **Maximum Processing Days**: 30 days from creation
- **Weekend Processing**: Disabled by default

### Fee Structure

- **Processing Fee**: 2.9% of principal amount
- **Network Fee**: 0.1% of principal amount
- **Interchange Fee**: 1.5% of principal amount
- **Currency Adjustments**: EUR (-5%), GBP (+5%), CAD (+2%)

### Compliance Thresholds

- **High-Value Review**: $10,000+ settlements flagged for compliance
- **Regulatory Reporting**: Automatic compliance flag generation
- **Audit Trail**: Complete settlement history tracking

## Usage Examples

### Basic Settlement Creation

```typescript
import { SettlementsControllerFactory } from './settlement-controller';

const controller = SettlementsControllerFactory.create();

// Create automated settlement for completed payment
const response = await controller.createSettlement({
  paymentId: 'pay_123456',
  merchantId: 'merc_789',
  amount: 99.99,
  currency: 'USD',
  settlementType: 'automated',
});

if (response.success) {
  console.log('Settlement created:', response.data);
  console.log('Settlement ID:', response.data.id);
  console.log('Net Amount:', response.data.breakdown.netAmount);
} else {
  console.error('Settlement creation failed:', response.error);
}
```

### Batch Settlement Processing

```typescript
// Process multiple settlements in batch
const batchResponse = await controller.processSettlementBatch({
  settlementIds: ['stl_001', 'stl_002', 'stl_003'],
});

if (batchResponse.success) {
  console.log('Batch processed successfully');
  console.log(`Processed: ${batchResponse.data.processed}`);
  console.log(`Successful: ${batchResponse.data.successful}`);
  console.log(`Failed: ${batchResponse.data.failed}`);
  console.log(`Total Amount: $${batchResponse.data.totalAmount}`);
}
```

### Settlement Completion

```typescript
// Complete settlement with bank reference
const completeResponse = await controller.completeSettlement({
  settlementId: 'stl_123',
  bankReference: 'BANK_REF_20241219_001',
  processingNotes: [
    'Processed via automated settlement system',
    'Compliance review completed',
  ],
});

if (completeResponse.success) {
  console.log('Settlement completed');
  console.log('Bank Reference:', completeResponse.data.metadata.bankReference);
  console.log('Final Status:', completeResponse.data.status);
}
```

### Settlement Analytics

```typescript
// Get comprehensive settlement analytics
const analyticsResponse = await controller.getSettlementAnalytics({
  merchantId: 'merc_789',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
});

if (analyticsResponse.success) {
  const analytics = analyticsResponse.data;
  console.log('Settlement Analytics:');
  console.log(`Total Settlements: ${analytics.totalSettlements}`);
  console.log(`Success Rate: ${analytics.successRate}%`);
  console.log(
    `Average Processing Time: ${analytics.averageProcessingTime} hours`
  );
  console.log(`Total Fees: $${analytics.totalFees}`);
}
```

## API Reference

### SettlementsController Methods

#### `createSettlement(request: CreateSettlementRequest): Promise<SettlementsControllerResponse>`

Create a new settlement for a completed payment.

**Request:**

```typescript
interface CreateSettlementRequest {
  paymentId: string; // Payment to settle
  merchantId: string; // Merchant receiving settlement
  amount: number; // Settlement amount
  currency: string; // USD, EUR, GBP, CAD
  settlementType?: string; // 'automated' | 'manual'
  settlementDate?: string; // Optional future settlement date
}
```

#### `processSettlementBatch(request: BatchProcessRequest): Promise<SettlementsControllerResponse>`

Process multiple settlements simultaneously.

**Request:**

```typescript
interface BatchProcessRequest {
  settlementIds: string[]; // Array of settlement IDs (max 100)
}
```

**Response:**

```typescript
interface BatchProcessResponse {
  batchId: string; // Generated batch identifier
  processed: number; // Total settlements processed
  successful: number; // Successfully completed
  failed: number; // Failed settlements
  totalAmount: number; // Total settlement amount
}
```

#### `completeSettlement(request: ProcessSettlementRequest): Promise<SettlementsControllerResponse>`

Mark a settlement as completed with bank reference.

**Request:**

```typescript
interface ProcessSettlementRequest {
  settlementId: string; // Settlement to complete
  bankReference?: string; // Bank reference number
  processingNotes?: string[]; // Processing notes
}
```

#### `getSettlementAnalytics(request: SettlementAnalyticsRequest): Promise<SettlementsControllerResponse>`

Retrieve comprehensive settlement analytics.

**Request:**

```typescript
interface SettlementAnalyticsRequest {
  merchantId?: string; // Filter by merchant
  startDate?: string; // Date range start (ISO format)
  endDate?: string; // Date range end (ISO format)
}
```

**Response:**

```typescript
interface AnalyticsResponse {
  totalSettlements: number;
  totalAmount: number;
  successfulSettlements: number;
  failedSettlements: number;
  pendingSettlements: number;
  averageProcessingTime: number; // In hours
  totalFees: number;
  successRate: number; // Percentage
}
```

## Database Schema

### Settlements Table

```sql
CREATE TABLE settlements (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  settlement_type TEXT NOT NULL,
  settlement_date DATE NOT NULL,
  processing_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  failed_at DATETIME,

  -- Fee breakdown
  processing_fee REAL DEFAULT 0,
  network_fee REAL DEFAULT 0,
  interchange_fee REAL DEFAULT 0,
  total_fees REAL DEFAULT 0,

  -- Metadata
  batch_id TEXT,
  settlement_reference TEXT UNIQUE NOT NULL,
  bank_reference TEXT,
  processing_notes TEXT,        -- JSON array
  compliance_flags TEXT,        -- JSON array
  reconciliation_data TEXT,     -- JSON object

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX idx_settlements_payment ON settlements(payment_id);
CREATE INDEX idx_settlements_merchant ON settlements(merchant_id);
CREATE INDEX idx_settlements_status ON settlements(status);
CREATE INDEX idx_settlements_date ON settlements(settlement_date);
CREATE INDEX idx_settlements_batch ON settlements(batch_id);
```

## Settlement Lifecycle

### 1. Creation Phase

```
Payment Completed → Settlement Created → Business Rules Applied
                       ↓
                Fees Calculated → Compliance Checked
```

### 2. Processing Phase

```
Settlement Pending → Processing Started → Bank Processing
                        ↓
                 Success/Failure → Status Updated
```

### 3. Completion Phase

```
Processing Complete → Bank Reference Added → Final Status Set
                         ↓
                   Analytics Updated → Events Published
```

### Status Flow

```
PENDING → PROCESSING → COMPLETED
    ↓         ↓            ↓
 CANCELLED  FAILED       (Final)
```

## Integration Points

### Upstream Systems

- **Collections Domain**: Payment completion triggers settlement creation
- **Balance Domain**: Settlement completion updates merchant balances
- **Compliance System**: High-value settlements trigger compliance reviews

### Downstream Systems

- **Financial Reporting**: Settlement data feeds financial reports
- **Merchant Dashboard**: Real-time settlement status and analytics
- **Banking Systems**: Settlement files for bank processing
- **Notification System**: Settlement status updates to merchants

## Performance Characteristics

### Benchmarks (Expected)

- **Settlement Creation**: < 100ms average
- **Batch Processing**: < 500ms per settlement
- **Analytics Query**: < 200ms for standard reports
- **Database Operations**: < 50ms per settlement

### Scaling Considerations

- **Concurrent Processing**: Support 100+ simultaneous settlements
- **Batch Size Limits**: Maximum 100 settlements per batch
- **Database Indexing**: Optimized for merchant and date range queries
- **Caching Strategy**: Redis for frequently accessed settlement data

## Monitoring & Observability

### Health Checks

```typescript
const healthResponse = await controller.healthCheck();
console.log('Settlement Domain Health:', healthResponse.data);
```

### Key Metrics Monitored

- **Settlement Success Rate**: Target > 99.5%
- **Average Processing Time**: Target < 24 hours
- **Fee Calculation Accuracy**: Target 100%
- **Compliance Flag Rate**: Monitor for unusual patterns
- **Batch Processing Efficiency**: Target > 95% success rate

## Error Handling

### Settlement-Specific Errors

- **PaymentNotFound**: Referenced payment doesn't exist
- **MerchantNotFound**: Referenced merchant doesn't exist
- **InvalidAmount**: Settlement amount outside allowed limits
- **DuplicateSettlement**: Payment already has active settlement
- **BankProcessingFailed**: Bank rejected settlement

### Recovery Strategies

- **Automatic Retry**: Failed settlements retry up to 3 times
- **Manual Intervention**: Failed settlements flagged for manual review
- **Compensation Actions**: Failed settlements trigger reversal workflows
- **Audit Logging**: All errors logged with full context

## Testing Strategy

### Unit Tests

- **Entity Validation**: Business rule enforcement
- **Fee Calculations**: Accuracy and edge cases
- **Status Transitions**: Valid state changes
- **Error Handling**: Exception scenarios

### Integration Tests

- **End-to-End Settlement**: Payment → Settlement → Completion
- **Batch Processing**: Multi-settlement workflows
- **Cross-Domain Events**: Integration with Balance and Collections
- **External System Integration**: Bank processing simulation

### Performance Tests

- **Concurrent Processing**: 100+ simultaneous settlements
- **Large Batches**: 1000+ settlement batch processing
- **Analytics Queries**: Complex reporting under load
- **Database Operations**: High-frequency settlement operations

## Compliance & Security

### Financial Compliance

- **PCI DSS**: Settlement data handling follows PCI standards
- **AML**: Automated monitoring for suspicious settlement patterns
- **KYC**: Merchant verification integration
- **SOX**: Audit trail and financial controls

### Operational Security

- **Data Encryption**: Settlement data encrypted at rest and in transit
- **Access Controls**: Role-based access to settlement operations
- **Audit Logging**: Complete audit trail for all settlement activities
- **Data Retention**: Regulatory-compliant data retention policies

## Future Enhancements

### Phase 2 Features

- **Real-time Settlement**: Instant settlement for approved merchants
- **Dynamic Fee Calculation**: ML-based fee optimization
- **Multi-currency Enhancement**: Advanced FX settlement options
- **Predictive Analytics**: Settlement volume forecasting

### Phase 3 Features

- **Blockchain Settlement**: Cryptocurrency settlement integration
- **AI-Powered Compliance**: Automated compliance monitoring
- **Advanced Reporting**: Custom analytics dashboards
- **Mobile Settlement**: Mobile-optimized settlement workflows

---

## Quick Start Guide

### 1. Environment Setup

```bash
# Install dependencies
bun install

# Initialize database
bun run db:init
```

### 2. Basic Usage

```typescript
import { SettlementsControllerFactory } from './settlement-controller';

// Create controller
const controller = SettlementsControllerFactory.create();

// Create settlement
const settlement = await controller.createSettlement({
  paymentId: 'pay_123',
  merchantId: 'merc_456',
  amount: 99.99,
  currency: 'USD',
});
```

### 3. Batch Processing

```typescript
// Process multiple settlements
const result = await controller.processSettlementBatch({
  settlementIds: ['stl_001', 'stl_002', 'stl_003'],
});
```

### 4. Analytics

```typescript
// Get settlement insights
const analytics = await controller.getSettlementAnalytics({
  merchantId: 'merc_456',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
});
```

---

**Settlement Domain v1.0**  
_Payment settlement and reconciliation for the Fire22 Enterprise System_  
_Built with Domain-Driven Design and Bun-native performance_ ⚡

**Status**: 🟢 **Production Ready** - Core settlement processing operational  
**Next**: Phase 2 - Real-time settlement and advanced analytics
