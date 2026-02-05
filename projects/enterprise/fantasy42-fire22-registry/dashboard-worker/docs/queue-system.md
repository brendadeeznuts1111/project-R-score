# Queue System Documentation

## Overview

The Queue System is a peer-to-peer matching engine that automatically pairs
withdrawal requests with available deposits, creating an efficient financial
ecosystem that reduces processing times and improves customer experience.

## System Architecture

### Core Components

1. **Queue Manager**: Manages items in the queue and handles matching logic
2. **Matching Engine**: Automatically pairs withdrawals with deposits based on
   criteria
3. **Processing Pipeline**: Handles the execution of matched transactions
4. **Database Layer**: Persistent storage for queue items, matches, and history

### Database Schema

```sql
-- Queue items table
CREATE TABLE queue_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('withdrawal', 'deposit')),
  customer_id TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_type TEXT NOT NULL,
  payment_details TEXT,
  priority INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  matched_with TEXT,
  notes TEXT
);

-- Queue matches table
CREATE TABLE queue_matches (
  id TEXT PRIMARY KEY,
  withdrawal_id TEXT NOT NULL,
  deposit_id TEXT NOT NULL,
  amount REAL NOT NULL,
  match_score INTEGER NOT NULL,
  processing_time INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  notes TEXT
);
```

## API Endpoints

### 1. Initialize Queue System

- **Endpoint**: `POST /api/queue/init`
- **Auth**: Required (manager)
- **Action**: Creates necessary database tables
- **Use Case**: First-time setup or system reset

### 2. Add Withdrawal to Queue

- **Endpoint**: `POST /api/queue/withdrawal`
- **Auth**: Required
- **Body**:
  `{ customerId, amount, paymentType, paymentDetails, priority, notes }`
- **Action**: Adds withdrawal request to queue for matching

### 3. Add Deposit to Queue

- **Endpoint**: `POST /api/queue/deposit`
- **Auth**: Required
- **Body**:
  `{ customerId, amount, paymentType, paymentDetails, priority, notes }`
- **Action**: Adds deposit to queue for matching with withdrawals

### 4. Get Queue Statistics

- **Endpoint**: `GET /api/queue/stats`
- **Auth**: Required
- **Action**: Returns queue performance metrics and counts

### 5. Get Queue Items

- **Endpoint**: `GET /api/queue/items`
- **Auth**: Required
- **Query**: `?status=pending&type=withdrawal`
- **Action**: Returns filtered queue items

### 6. Get Matching Opportunities

- **Endpoint**: `GET /api/queue/opportunities`
- **Auth**: Required (manager)
- **Action**: Shows potential matches with scoring

### 7. Process Matched Items

- **Endpoint**: `POST /api/queue/process`
- **Auth**: Required (manager)
- **Action**: Executes processing for matched items

### 8. Complete Match

- **Endpoint**: `POST /api/queue/complete`
- **Auth**: Required (manager)
- **Body**: `{ matchId, notes }`
- **Action**: Marks a match as completed

## Matching Algorithm

### Scoring System

The system uses a sophisticated scoring algorithm to determine the best matches:

```typescript
let score = 100;

// Payment type match (highest priority)
if (withdrawal.paymentType === deposit.paymentType) {
  score += 20;
}

// Amount compatibility
if (withdrawal.amount <= deposit.amount) {
  score += 25;
}

// Amount difference scoring
const amountDiff = Math.abs(withdrawal.amount - deposit.amount);
if (amountDiff < 10)
  score += 30; // Perfect match
else if (amountDiff < 50)
  score += 20; // Good match
else if (amountDiff < 100) score += 10; // Acceptable match

// Wait time priority (older items get slight boost)
const waitTime = Date.now() - item.createdAt.getTime();
score += Math.min(20, waitTime / 60000); // 1 point per minute, max 20
```

### Priority Rules

1. **Payment Type Match**: Same payment method gets highest priority
2. **Amount Compatibility**: Withdrawal amount must be ≤ deposit amount
3. **Wait Time**: FIFO principle with slight boost for older items
4. **Customer Verification**: Higher priority for verified customers

## Workflow

### 1. Item Addition

```
Customer Request → Validation → Add to Queue → Attempt Match
```

### 2. Matching Process

```
Queue Items → Scoring Algorithm → Best Match → Create Match Record
```

### 3. Processing Pipeline

```
Matched Items → Status Update → Transaction Processing → Completion
```

### 4. Completion Flow

```
Processing → Database Updates → Transaction Records → Cleanup
```

## Business Rules

### Withdrawal Requirements

- Customer must have sufficient balance
- Amount must be positive
- Payment type must be valid
- Customer must be verified

### Deposit Requirements

- Amount must be positive
- Payment type must be valid
- Customer must be verified

### Matching Constraints

- Payment types must match exactly
- Withdrawal amount ≤ deposit amount
- Both items must be in 'pending' status
- Customer IDs must be different

## Payment Type Support

### Supported Methods

- **Venmo**: `@username` in paymentDetails
- **PayPal**: `email@address.com` in paymentDetails
- **CashApp**: `$cashtag` in paymentDetails
- **Cash**: Physical pickup (no details required)
- **Transfer**: Bank transfer with account details
- **Bank Transfer**: Traditional method (default)

### Payment Type Matching

- Perfect matches get +20 points
- Different types cannot be matched
- Ensures payment method compatibility

## Queue Management

### Status Transitions

```
pending → matched → processing → completed
   ↓         ↓         ↓          ↓
  New    Found      Executing   Finished
  Item   Match      Match       Match
```

### Queue Statistics

- Total items in queue
- Pending withdrawals count
- Pending deposits count
- Matched pairs count
- Average wait time
- Processing rate
- Success rate

### Performance Metrics

- **Response Time**: <100ms for queue operations
- **Matching Speed**: Real-time matching on item addition
- **Processing Rate**: Configurable batch processing
- **Success Rate**: >95% successful matches

## Security Features

### Authentication

- All endpoints require valid authentication
- Role-based access control for management functions
- Manager-level access for system operations

### Validation

- Input validation for all parameters
- Amount validation and balance checks
- Payment type validation
- Customer verification checks

### Audit Trail

- Complete history of all queue operations
- Match creation and completion tracking
- Transaction logging for all operations
- User action tracking

## Error Handling

### Common Error Scenarios

1. **Insufficient Balance**: Customer balance < withdrawal amount
2. **Invalid Payment Type**: Unsupported payment method
3. **Customer Not Found**: Invalid customer ID
4. **Match Not Found**: Attempting to complete non-existent match
5. **Database Errors**: Connection or constraint violations

### Error Responses

```json
{
  "success": false,
  "error": "Descriptive error message",
  "details": "Additional error information"
}
```

## Monitoring & Analytics

### Key Metrics

- Queue length and wait times
- Matching success rates
- Processing performance
- Customer satisfaction metrics
- Payment type distribution

### Dashboard Integration

- Real-time queue status
- Matching opportunities display
- Performance analytics
- Customer queue positions

## Testing

### Test Commands

```bash
# Test queue system
bun run test:queue

# Test withdrawal system (includes queue integration)
bun run test:withdrawals
```

### Test Coverage

- ✅ Queue initialization
- ✅ Item addition (withdrawal/deposit)
- ✅ Matching algorithm
- ✅ Payment type validation
- ✅ Amount compatibility
- ✅ Status transitions
- ✅ Match completion
- ✅ Error handling
- ✅ Performance metrics

## Usage Examples

### Add Withdrawal to Queue

```bash
curl -X POST "http://localhost:8787/api/queue/withdrawal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": "CUSTOMER_123",
    "amount": 150.00,
    "paymentType": "venmo",
    "paymentDetails": "@johndoe",
    "priority": 1,
    "notes": "Need money for weekend"
  }'
```

### Add Deposit to Queue

```bash
curl -X POST "http://localhost:8787/api/queue/deposit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": "CUSTOMER_456",
    "amount": 200.00,
    "paymentType": "venmo",
    "paymentDetails": "@janesmith",
    "priority": 1,
    "notes": "Deposit from bank transfer"
  }'
```

### Get Matching Opportunities

```bash
curl -X GET "http://localhost:8787/api/queue/opportunities" \
  -H "Authorization: Bearer MANAGER_TOKEN"
```

### Process Queue

```bash
curl -X POST "http://localhost:8787/api/queue/process" \
  -H "Authorization: Bearer MANAGER_TOKEN"
```

## Best Practices

### For Developers

1. **Always validate input** before adding to queue
2. **Handle errors gracefully** with proper logging
3. **Monitor queue performance** regularly
4. **Test matching algorithms** with various scenarios

### For Managers

1. **Review matching opportunities** regularly
2. **Monitor queue statistics** for bottlenecks
3. **Process matches promptly** to maintain efficiency
4. **Review failed matches** for system improvements

### For Customers

1. **Provide accurate payment details** for faster matching
2. **Use supported payment types** for better compatibility
3. **Check queue position** for estimated wait times
4. **Contact support** for urgent requests

## Troubleshooting

### Common Issues

#### Queue Not Processing

- Check if items are in 'pending' status
- Verify payment type compatibility
- Review matching algorithm logs
- Check database connectivity

#### Slow Matching

- Review queue size and wait times
- Check payment type distribution
- Analyze matching algorithm performance
- Consider adjusting scoring weights

#### Failed Matches

- Review error logs for specific failures
- Check customer verification status
- Verify payment method compatibility
- Review amount constraints

### Debug Commands

```bash
# Check queue status
curl -X GET "http://localhost:8787/api/queue/stats"

# View queue items
curl -X GET "http://localhost:8787/api/queue/items"

# See matching opportunities
curl -X GET "http://localhost:8787/api/queue/opportunities"
```

## Future Enhancements

### Planned Features

- **AI-powered matching**: Machine learning for better matches
- **Batch processing**: Process multiple matches simultaneously
- **Priority queuing**: VIP customer priority system
- **Real-time notifications**: WebSocket updates for queue changes
- **Advanced analytics**: Predictive queue modeling

### Scalability Considerations

- **Horizontal scaling**: Multiple queue instances
- **Load balancing**: Distribute queue load
- **Caching strategies**: Redis for high-performance matching
- **Database optimization**: Partitioning and indexing
- **Microservice architecture**: Separate queue service

---

_Last Updated: December 2024_ _Version: 1.0_
