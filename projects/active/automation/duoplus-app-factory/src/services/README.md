# ⚙️ Services

Core business logic services for Nebula-Flow™.

## Available Services

### Lightning Service
**File**: `lightningService.ts`

Handles all Lightning Network operations.

**Functions**:
- `generateInvoice()` - Create BOLT-11 invoices
- `getNodeBalance()` - Retrieve node balance
- `getChannels()` - List active channels
- `rebalanceChannels()` - Auto-rebalance channels
- `consolidateFunds()` - Consolidate to savings
- `getInvoiceStatus()` - Check invoice status

**Example**:
```typescript
import { lightningService } from './lightningService';

const invoice = await lightningService.generateInvoice({
  amount: 1000,
  description: 'Quest Payment'
});
```

### LND Mock Client
**File**: `lndMockClient.ts`

Mock LND client for testing and development.

**Functions**:
- `getBalance()` - Mock balance
- `createInvoice()` - Mock invoice creation
- `getInvoiceStatus()` - Mock status check
- `listChannels()` - Mock channel list

**Usage**:
```typescript
import { lndMockClient } from './lndMockClient';

const balance = lndMockClient.getBalance();
```

## Service Architecture

### Layered Design
```text
API Routes
    ↓
Services (Business Logic)
    ↓
Database Layer
    ↓
External APIs (LND, Cash App, etc.)
```

### Error Handling
All services include:
- Try-catch blocks
- Error logging
- Graceful fallbacks
- User-friendly messages

### Async Operations
Services use:
- Async/await patterns
- Promise-based APIs
- Proper error propagation
- Timeout handling

## Creating New Services

### Template
```typescript
// src/services/my-service.ts
export class MyService {
  async doSomething(params: any) {
    try {
      // Implementation
      return result;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }
}

export const myService = new MyService();
```

### Integration
```typescript
// src/routes/my-routes.ts
import { myService } from '../services/my-service';

app.post('/api/my-endpoint', async (req, res) => {
  const result = await myService.doSomething(req.body);
  res.json(result);
});
```

## Service Dependencies

### Internal Dependencies
- Database layer
- Utilities
- Configuration
- Logging

### External Dependencies
- LND REST API
- Cash App API
- OFAC Database
- Webhook providers

## Testing Services

### Unit Tests
```typescript
import { lightningService } from '../services/lightningService';

test('should generate invoice', async () => {
  const invoice = await lightningService.generateInvoice({
    amount: 1000
  });
  expect(invoice).toBeDefined();
});
```

### Integration Tests
```typescript
test('should handle full payment flow', async () => {
  const invoice = await lightningService.generateInvoice({...});
  const status = await lightningService.getInvoiceStatus(invoice.id);
  expect(status).toBe('pending');
});
```

## Performance

### Optimization Strategies
- Connection pooling
- Caching frequently accessed data
- Batch operations
- Async processing

### Monitoring
- Log service calls
- Track response times
- Monitor error rates
- Alert on failures

## Best Practices

1. **Single Responsibility** - One service, one purpose
2. **Error Handling** - Comprehensive error handling
3. **Logging** - Log important operations
4. **Testing** - High test coverage
5. **Documentation** - Clear API documentation
6. **Async/Await** - Use modern async patterns
7. **Type Safety** - Use TypeScript types

## Service Lifecycle

### Initialization
```typescript
const service = new MyService();
await service.initialize();
```

### Usage
```typescript
const result = await service.doSomething();
```

### Cleanup
```typescript
await service.cleanup();
```

---

**Version**: 3.5.0

