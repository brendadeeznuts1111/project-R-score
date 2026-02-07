# FactoryWager Registry & Playground

Centralized registry system with visual dashboards for managing:
- **Clients** - View services, bookings, payments
- **Admins** - Manage barbers, view analytics
- **Payment Pipelines** - Visual approval workflow
- **Barber Hierarchy** - Team structure and permissions

## Registry System

The registry stores configurations using R2 with versioning:

```typescript
import { registry } from './lib/cloudflare';

// Publish module
await registry.publish({
  name: 'payment-config',
  version: '1.0.0',
  type: 'config',
  content: { /* config data */ },
  metadata: {
    author: 'admin',
    tags: ['payment', 'production'],
  },
});

// Fetch module
const entry = await registry.fetch('payment-config', '1.0.0');

// Query with filters
const configs = await registry.query({
  type: 'config',
  tags: ['payment'],
});
```

## Playground Dashboards

### Client Dashboard

```bash
bun run playground:client
```

View for clients:
- Upcoming bookings
- Payment history
- Service status

### Admin Dashboard

```bash
bun run playground:admin
```

Administrative view:
- Revenue metrics
- Active barbers
- Pending approvals
- Quick actions

### Payment Pipeline

```bash
# View pipeline
bun run playground:pipeline

# Create new pipeline
bun run playground.ts pipeline-create 150 "Alice" "John"

# Advance pipeline stage
bun run playground.ts pipeline-advance pay-123456
```

Visual pipeline stages:
1. **Submission** ✓
2. **Review** ● (active)
3. **Approval** ○
4. **Processing** ○
5. **Completion** ○

### Barber Hierarchy

```bash
bun run playground:hierarchy
```

Tree view of team structure:
```
└── 👑 Robert Owner (owner)
  └── 💼 Mike Manager (manager)
    ├── ✂️ John Senior (senior)
    └── 🪒 Sam Junior (junior)
```

Role icons:
- 👑 Owner
- 💼 Manager
- ✂️ Senior Barber
- 🪒 Junior Barber
- 📚 Trainee

### Payment Approvals

```bash
# View approval board
bun run playground:approvals

# Create approval request
bun run playground.ts approval-create 500 "Equipment purchase"

# Process approval
bun run playground.ts approval-process apr-1 approved "Looks good"
bun run playground.ts approval-process apr-2 rejected "Too expensive"
```

Approval statuses:
- ⏳ Pending (awaiting review)
- ✓ Approved
- ✗ Rejected

## Payment Pipeline API

### Create Pipeline

```typescript
const pipeline = await registry.createPaymentPipeline({
  status: 'pending',
  amount: 150,
  currency: 'USD',
  client: 'Alice Johnson',
  barber: 'John Smith',
});
```

### Update Stage

```typescript
await registry.updatePipelineStage(pipeline.id, 'review', {
  status: 'completed',
  assignee: 'Manager',
  notes: 'Reviewed and approved',
});
```

### Render Pipeline

```typescript
// Visual ASCII representation
renderPipeline(pipeline);
```

Output:
```
┌─────────────────────────┐
│ ✓ submission           │
│   🕐 10:30:12 PM      │
└─────────────────────────┘
           ↓
┌─────────────────────────┐
│ ● review               │
│   👤 Manager          │
└─────────────────────────┘
           ↓
┌─────────────────────────┐
│ ○ approval             │
└─────────────────────────┘
```

## Barber Hierarchy API

### Create Barber

```typescript
const barber = await registry.createBarber({
  name: 'John Smith',
  role: 'senior',
  parentId: 'manager-id',
  commission: 0.25,
  permissions: ['cut', 'train'],
  metrics: {
    totalCuts: 800,
    rating: 4.9,
    revenue: 18000,
  },
});
```

### Get Team

```typescript
const team = await registry.getBarberHierarchy('manager-id');
```

### Render Hierarchy

```typescript
renderHierarchy(barbers);
```

## Payment Approvals API

### Create Approval

```typescript
const approval = await registry.createApproval({
  paymentId: 'pay-123',
  requestedBy: 'John Smith',
  amount: 500,
  reason: 'Equipment upgrade',
  status: 'pending',
  approvers: ['Manager', 'Owner'],
  comments: [],
});
```

### Process Approval

```typescript
await registry.processApproval(
  approval.id,
  'approved',
  'Robert Owner',
  'Approved for purchase'
);
```

## Visual Components

### Pipeline Stage Colors

| Status | Color | Symbol |
|--------|-------|--------|
| Completed | Green | ✓ |
| Active | Yellow | ● |
| Pending | Gray | ○ |
| Failed | Red | ✗ |

### Approval Board

```
⚠️ Pending (3):
  ⚠️ $150 - Product purchase
     Requested by: John Smith
     
✓ Approved (5):
  ✓ $500 - Equipment upgrade
     Approved by: Robert Owner

✗ Rejected (2):
  ✗ $1000 - Unnecessary expense
     Reason: Over budget
```

## Integration Examples

### Complete Payment Flow

```bash
# 1. Barber creates payment request
bun run playground.ts pipeline-create 150 "Alice" "John"

# 2. Manager reviews (advance to approval)
bun run playground.ts pipeline-advance pay-123456

# 3. Create approval request
bun run playground.ts approval-create 150 "Haircut payment"

# 4. Owner approves
bun run playground.ts approval-process apr-1 approved "Good to go"

# 5. Pipeline auto-advances to processing
bun run playground.ts pipeline-advance pay-123456

# 6. Complete payment
bun run playground.ts pipeline-advance pay-123456
```

### Programmatic Workflow

```typescript
import { registry } from './lib/cloudflare';

// 1. Create payment pipeline
const pipeline = await registry.createPaymentPipeline({
  status: 'pending',
  amount: 150,
  currency: 'USD',
  client: 'Alice',
  barber: 'John',
});

// 2. Move through stages
await registry.updatePipelineStage(pipeline.id, 'review', {
  status: 'completed',
});

await registry.updatePipelineStage(pipeline.id, 'approval', {
  status: 'completed',
});

// 3. Create and process approval
const approval = await registry.createApproval({
  paymentId: pipeline.id,
  requestedBy: 'John',
  amount: 150,
  reason: 'Haircut service',
  status: 'pending',
  approvers: ['Manager'],
  comments: [],
});

await registry.processApproval(
  approval.id,
  'approved',
  'Manager',
  'Service completed successfully'
);
```

## Dashboard Permissions

| Role | View | Edit | Approve | Admin |
|------|------|------|---------|-------|
| Client | Own data | Bookings | - | - |
| Junior | Own cuts | Own profile | - | - |
| Senior | Team cuts | Train juniors | - | - |
| Manager | All data | Schedules | $500+ | Reports |
| Owner | Everything | All | Unlimited | Full |

## Package.json Scripts

```json
{
  "playground": "bun run scripts/dashboard/playground-cli.ts",
  "playground:client": "bun run scripts/dashboard/playground-cli.ts client",
  "playground:admin": "bun run scripts/dashboard/playground-cli.ts admin",
  "playground:pipeline": "bun run scripts/dashboard/playground-cli.ts pipeline",
  "playground:hierarchy": "bun run scripts/dashboard/playground-cli.ts hierarchy",
  "playground:approvals": "bun run scripts/dashboard/playground-cli.ts approvals"
}
```

## Future Enhancements

- Real-time WebSocket updates
- Mobile-responsive dashboards
- Export reports to PDF/Excel
- Integration with calendar systems
- Automated approval workflows
