# Business Continuity System for P2P Proxy

A robust solution for handling business name changes, relocations, and account migrations gracefully without losing customers or revenue.

## 🎯 Key Features

- **Business Aliasing**: Never lose customers when changing business names
- **Payment Forwarding**: Automatic forwarding of payments from old to new business
- **Customer Notifications**: Keep customers informed about business changes
- **Migration Workflows**: Step-by-step business migration management
- **Admin Dashboard**: Full control over business identities and migrations

## 📁 Architecture

```
lib/p2p/
├── business-continuity.ts    # Core business identity management
├── customer-notifier.ts       # Customer notification system
└── migration-workflow.ts      # Migration execution and reporting

server/
└── p2p-proxy-server-with-continuity.ts  # Enhanced proxy with continuity
```

## 🚀 Quick Start

### 1. Start the Enhanced Proxy Server

```bash
bun run start:p2p-proxy:v3
```

### 2. Register a Business

```bash
curl -X POST http://localhost:3002/admin/business \
  -H "Authorization: Bearer admin-secret-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Golden Scissors Barbershop",
    "alias": "GoldenScissors",
    "startDate": "2024-01-01T00:00:00Z",
    "paymentHandles": {
      "cashapp": "$GoldenScissors",
      "venmo": "@GoldenScissors",
      "paypal": "paypal.me/GoldenScissors"
    },
    "contact": "contact@goldenscissors.com",
    "location": "123 Main St"
  }'
```

### 3. Use Business Alias in Payment Links

```bash
# Payment page with alias
http://localhost:3002/pay?alias=GoldenScissors&amount=25

# Without alias (uses default from env)
http://localhost:3002/pay?amount=25
```

## 🔄 Business Migration

### Migrate a Business

```bash
curl -X POST http://localhost:3002/admin/migrate \
  -H "Authorization: Bearer admin-secret-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "oldAlias": "GoldenScissors",
    "newBusinessData": {
      "name": "Golden Scissors Barbershop Downtown",
      "alias": "GoldenScissorsDT",
      "reason": "relocation",
      "forwardPayments": true,
      "forwardDays": 180
    }
  }'
```

### What Happens During Migration

1. **Old business marked inactive**: Old alias is preserved but marked as inactive
2. **New business created**: New alias is registered with same payment handles
3. **Forwarding setup**: Payments to old alias automatically forward to new alias
4. **Customer notifications**: Customers who paid before are notified
5. **Migration report**: Detailed report saved to `migrations/` directory

## 📊 Admin Endpoints

All admin endpoints require authentication via `Authorization: Bearer <ADMIN_SECRET>` header.

### List All Businesses

```bash
GET /admin/businesses
```

### Get Business Statistics

```bash
GET /admin/stats?alias=GoldenScissors
```

Returns:
- Total payments
- Total revenue
- Recent payments

### Create/Update Business

```bash
POST /admin/business
Content-Type: application/json

{
  "name": "Business Name",
  "alias": "BusinessAlias",
  "startDate": "2024-01-01T00:00:00Z",
  "paymentHandles": {
    "cashapp": "$Handle",
    "venmo": "@Handle",
    "paypal": "paypal.me/Handle"
  },
  "contact": "contact@example.com",
  "location": "123 Main St"
}
```

## 🔔 Customer Notifications

### Customer Portal

Customers can access their portal at:

```
GET /portal?id=<stealthId>
```

Shows:
- Unread notifications
- Recent notifications
- Businesses they've paid
- Notification preferences

### Notification Types

- `business_change`: Business name/location changed
- `payment_to_old_address`: Payment sent to old business address
- `payment_issue`: Payment method updated

## 🧪 Testing

Run the business continuity test suite:

```bash
bun run test:continuity
```

This tests:
1. Business creation
2. Business listing
3. Payment page with alias
4. Business migration
5. Payment forwarding
6. Statistics retrieval

## 🚨 Emergency Scenarios

### Lost Payment Account Access

```typescript
import { handlePaymentAccountLoss } from './lib/p2p/migration-workflow';

await handlePaymentAccountLoss(
  'GoldenScissors',
  'cashapp',
  '$NewHandle',
  'emergency@example.com'
);
```

This will:
1. Disable the affected provider immediately
2. Notify recent customers
3. Generate recovery instructions
4. Create emergency report

## 📋 Migration Workflow

### Complete Migration Process

```typescript
import { executeBusinessMigration } from './lib/p2p/migration-workflow';

const report = await executeBusinessMigration(
  'GoldenScissors',           // Old alias
  'Golden Scissors Downtown', // New name
  'GoldenScissorsDT',          // New alias
  {
    reason: 'relocation',
    forwardPayments: true,
    forwardDuration: 180,     // days
    notifyCustomers: true,
    updateQRs: true
  }
);
```

## 🔐 Security

- Admin endpoints require `ADMIN_SECRET` token
- Set `ADMIN_SECRET` in environment variables
- Customer portals use stealth IDs (no PII exposed)
- All business data stored in Redis with expiration

## 📈 Benefits

| Scenario | Without Continuity | With Continuity |
|---------|-------------------|-----------------|
| Business Rename | Lost QR codes & links | Automatic forwarding |
| Location Move | Customers pay to old location | QR codes update automatically |
| Account Loss | Payments bounce | Graceful degradation + alerts |
| Seasonal Closure | "Out of business" perception | "Temporarily closed" messages |

## 🎓 Best Practices

1. **Always use aliases**: Never hardcode business names in payment links
2. **Set forwarding duration**: 90-180 days is typical for relocations
3. **Notify customers**: Keep customers informed of changes
4. **Monitor forwarded payments**: Check stats regularly during transition
5. **Update physical QR codes**: Generate new QR codes after migration
6. **Test migrations**: Use test environment before production

## 📝 Environment Variables

```bash
# Required
REDIS_URL=redis://localhost:6379
P2P_PROXY_PORT=3002

# Optional (fallback if business not found)
PROXY_BRAND_NAME=HaircutPro
PROXY_CASHTAG=$HaircutPro
PROXY_VENMO=@HaircutPro
PROXY_PAYPAL=paypal.me/HaircutPro
PROXY_COLOR=#FF6B35

# Admin
ADMIN_SECRET=admin-secret-change-in-production
```

## 🔗 Related Files

- `server/p2p-proxy-server-with-continuity.ts` - Enhanced proxy server
- `dashboard/p2p-dashboard.ts` - Real-time payment dashboard
- `tests/business-continuity-test.ts` - Test suite

## 📚 API Reference

See inline documentation in:
- `lib/p2p/business-continuity.ts`
- `lib/p2p/customer-notifier.ts`
- `lib/p2p/migration-workflow.ts`
