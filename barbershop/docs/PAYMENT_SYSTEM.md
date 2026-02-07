# FactoryWager Payment System

Complete payment management with support for multiple types, providers, P2P transfers, tips, cancellations, and insufficient funds handling.

## Payment Types

| Type | Description | Use Case |
|------|-------------|----------|
| `service` | Regular service payment | Haircut, beard trim |
| `tip` | Client tip to barber | Gratuity for service |
| `p2p` | Peer-to-peer transfer | Barber-to-barber, client-to-client |
| `refund` | Refund to client | Service cancellation |
| `commission` | Commission payout | Barber commission |
| `deposit` | Booking deposit | Secure appointment |
| `subscription` | Recurring payment | Weekly/monthly plan |
| `product` | Product purchase | Shampoo, styling products |
| `penalty` | No-show/late fee | Missed appointment |
| `bonus` | Performance bonus | Extra incentive |

## Payment Providers

Supported payment methods:
- **stripe** - Credit/debit cards
- **square** - POS integration
- **cashapp** - P2P transfers
- **venmo** - Social payments
- **zelle** - Bank transfers
- **paypal** - Online payments
- **crypto** - Cryptocurrency
- **cash** - Physical cash
- **giftcard** - Store gift cards
- **store_credit** - Account credit

## Quick Start

```typescript
import { registry } from './lib/cloudflare';

// Create a service payment
const payment = await registry.createPaymentPipeline({
  status: 'pending',
  amount: 45,
  currency: 'USD',
  type: 'service',
  provider: 'cashapp',
  client: 'Alice Johnson',
  barber: 'John Smith',
  subtotal: 40,
  tax: 3.50,
  fee: 1.50,
  total: 45,
  retryCount: 0,
  maxRetries: 3,
});

// Add a tip
const tip = await registry.createTip(
  'client-123',
  'barber-456',
  10,
  'percentage',
  'Great service!',
  'cashapp'
);
```

## Payment Pipeline

### Pipeline Stages

1. **submission** - Payment initiated
2. **review** - Under review
3. **approval** - Awaiting approval
4. **processing** - Being processed
5. **completion** - Finished

### Visual Pipeline

```
┌─────────────────────────┐
│ ✓ submission           │
└─────────────────────────┘
           ↓
┌─────────────────────────┐
│ ● review               │  ← Active
└─────────────────────────┘
           ↓
┌─────────────────────────┐
│ ○ approval             │  ← Pending
└─────────────────────────┘
```

## P2P Transfers

Send money between users:

```typescript
// Client tipping barber directly
const transfer = await registry.createP2PTransfer({
  fromUserId: 'client-123',
  toUserId: 'barber-456',
  fromUserType: 'client',
  toUserType: 'barber',
  amount: 20,
  currency: 'USD',
  status: 'pending',
  type: 'tip',
  message: 'Thanks for the great cut!',
  provider: 'cashapp',
  fee: 0.50,
});
```

## Tips System

### Tip Types

- **percentage** - % of service cost (15%, 18%, 20%, 25%)
- **fixed** - Fixed amount ($5, $10, $20)
- **round_up** - Round up to nearest $5/$10
- **custom** - Client enters amount

### Calculate Tip Suggestions

```typescript
const suggestions = registry.calculateTipSuggestions(40, {
  percentages: [15, 18, 20, 25],
});
// [{ percentage: 15, amount: 6 },
//  { percentage: 18, amount: 7.20 },
//  { percentage: 20, amount: 8 },
//  { percentage: 25, amount: 10 }]
```

### Tip Configuration per Barber

```typescript
const tipConfig: TipConfig = {
  enabled: true,
  type: 'percentage',
  percentages: [15, 18, 20, 22, 25],
  allowCustom: true,
  promptAtCheckout: true,
  minAmount: 1,
  maxAmount: 100,
};
```

## Cancellation Handling

### Cancellation Reasons

- `client_request` - Client cancelled
- `barber_unavailable` - Barber can't make it
- `no_show` - Client didn't show up
- `emergency` - Emergency situation
- `system_error` - Technical issue
- `fraud_detected` - Suspicious activity
- `duplicate` - Accidental duplicate
- `insufficient_funds` - Payment failed
- `payment_expired` - Authorization expired
- `user_initiated` - General cancellation

### Cancel with Fee

```typescript
// Cancel with 25% fee (or 50% for no-shows)
await registry.cancelPayment(
  'pay-123456',
  'no_show',
  'barber-456',
  true // Apply fee
);
```

## Insufficient Funds

### Auto-Retry Configuration

```typescript
const config: InsufficientFundsConfig = {
  maxRetries: 3,
  retryDelayMinutes: 60,
  applyLateFee: true,
  lateFeeAmount: 5,
  notifyClient: true,
  alternativeProviders: ['venmo', 'zelle', 'cashapp'],
};

await registry.handleInsufficientFunds('pay-123456', config);
```

### Retry Flow

1. Payment fails (insufficient funds)
2. Status changes to `insufficient_funds`
3. Client notified with alternatives
4. Retry scheduled in 60 minutes
5. Late fee added if configured
6. Max 3 retries before failing

## Barber Payouts

### Create Payout

```typescript
const payout = await registry.createBarberPayout({
  barberId: 'barber-123',
  barberName: 'John Smith',
  periodStart: '2024-02-01',
  periodEnd: '2024-02-15',
  status: 'pending',
  serviceRevenue: 2500,
  tipRevenue: 350,
  bonusRevenue: 100,
  totalRevenue: 2950,
  commissionDeducted: 750,
  feesDeducted: 85,
  advancesDeducted: 200,
  cancellationFees: 25,
  totalDeductions: 1060,
  netPayout: 1890,
  payoutMethod: 'cashapp',
  payoutAccount: '$johnsmith',
  transactionIds: ['pay-1', 'pay-2', 'pay-3'],
});
```

### Request Advance

```typescript
const advance = await registry.requestBarberAdvance({
  barberId: 'barber-123',
  amount: 500,
  status: 'pending',
  reason: 'Emergency car repair',
});
```

## Payment Notifications

### Notification Types

- `payment_received` - Payment completed
- `payment_failed` - Payment failed
- `tip_received` - Tip received 💰
- `payout_sent` - Payout processed
- `advance_approved` - Advance approved
- `insufficient_funds` - Retry needed

### Create Notification

```typescript
await registry.createNotification({
  userId: 'barber-123',
  userType: 'barber',
  type: 'tip_received',
  title: 'Tip Received! 💰',
  message: '$10 tip from Alice: "Great service!"',
  amount: 10,
  transactionId: 'tip-789',
  read: false,
});
```

## Payment Status Flow

```
pending → processing → authorized → captured → completed
   ↓           ↓            ↓           ↓           ↓
failed    cancelled    expired     disputed    refunded
   ↓
insufficient_funds (with retry)
```

## CLI Examples

### Create Payment with Tip

```bash
# Service payment
bun run playground.ts pipeline-create 45 "Alice" "John"

# Add tip
bun run playground.ts tip-create client-123 barber-456 10 "Great cut!"
```

### Handle Cancellation

```bash
# Cancel with fee
bun run playground.ts cancel pay-123456 no_show barber-456 --fee

# Cancel without fee
bun run playground.ts cancel pay-123456 emergency barber-456
```

### Process P2P Transfer

```bash
# Send tip via P2P
bun run playground.ts p2p-create client-123 barber-456 20 tip "Thanks!"
```

## Integration with CashApp Pro Tips

The payment system integrates with existing CashApp pro tips:

```typescript
import { NewAccountManager, BarberProTips } from './barber-cashapp-protips';

// Detect new CashApp account
const newAccountInfo = await NewAccountManager.detectNewAccount(
  userId,
  paymentData
);

if (newAccountInfo.isNew) {
  // Get pro tips for barber
  const tips = BarberProTips.getTipsForNewAccount(
    barberId,
    customerData
  );
  
  // Adjust payment limits
  pipeline.maxRetries = 5; // More retries for new accounts
}
```

## Financial Breakdown

### Service Payment

| Item | Amount |
|------|--------|
| Subtotal | $40.00 |
| Tax (8%) | $3.20 |
| Tip | $8.00 |
| **Total** | **$51.20** |
| Platform Fee | $1.79 |
| Commission (30%) | $12.00 |
| **Barber Payout** | **$37.41** |

### Tip Only

| Item | Amount |
|------|--------|
| Tip | $10.00 |
| Platform Fee (2.5%) | $0.25 |
| Commission (0%) | $0.00 |
| **Barber Payout** | **$9.75** |

## Security Features

- **Checksum verification** on all entries
- **Version tracking** for audit trail
- **Cancellation tracking** with reason codes
- **Retry limits** prevent infinite loops
- **Fee transparency** shown to clients
- **Notification system** keeps users informed

## API Reference

### Registry Methods

| Method | Description |
|--------|-------------|
| `createPaymentPipeline()` | Create new payment |
| `createTip()` | Create tip payment |
| `createP2PTransfer()` | P2P transfer |
| `cancelPayment()` | Cancel with reason |
| `handleInsufficientFunds()` | Retry logic |
| `createBarberPayout()` | Barber payout |
| `requestBarberAdvance()` | Advance request |
| `calculateTipSuggestions()` | Tip calculator |
| `createNotification()` | Send notification |
