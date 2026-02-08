# Barbershop Operations Guide

> Complete operational documentation for the Barbershop Demo system covering Admin (God View), Client (Customer), and Barber (Worker) operations.

---

## Table of Contents

1. [Overview](#overview)
2. [Admin Operations (God View)](#admin-operations-god-view)
3. [Client Operations](#client-operations)
4. [Barber Operations](#barber-operations)
5. [Quick Reference / Cheat Sheet](#quick-reference--cheat-sheet)
6. [Common Workflows](#common-workflows)

---

## Overview

The Barbershop Demo system provides a complete 3-view dashboard ecosystem for managing a barbershop business:

| View | Purpose | URL | Primary User |
|------|---------|-----|--------------|
| **Admin** | God View - Real-time telemetry & business intelligence | `/admin` | Shop Manager |
| **Client** | Customer booking portal | `/client` | Customers |
| **Barber** | Worker station for ticket management | `/barber` | Barbers |

### System Architecture

- **Runtime**: Bun (>=1.3.6)
- **Database**: SQLite (in-memory) + Redis for persistence
- **Real-time**: WebSocket streams for live updates
- **Storage**: Cloudflare R2 for telemetry mirroring (optional)

### Default Access URLs

```
http://localhost:3000/admin      # Admin God View
http://localhost:3000/client     # Customer portal
http://localhost:3000/barber     # Barber station
http://localhost:3000/docs       # Documentation index
```

---

## Admin Operations (God View)

The Admin Dashboard provides real-time visibility into all shop operations, financials, and system health.

### Entry Points

```
Dashboard:  http://localhost:3000/admin
WebSocket:  ws://localhost:3000/admin/ws?key=godmode123
```

> **Note**: The default WebSocket key is `godmode123`. Change this in production via `LIFECYCLE_KEY` environment variable.

### Dashboard Components

#### 1. Financials Panel (Real-Time)

Tracks live financial metrics from completed tickets:

| Metric | Description | Updates |
|--------|-------------|---------|
| Today's Revenue | Sum of all completed order totals | Real-time via WebSocket |
| Total Tips | Aggregated tips from all transactions | Real-time |
| Commissions Paid | Revenue × barber commission rates | Hourly calculation |
| Net Profit | Revenue minus commissions | Real-time |
| Tickets Completed | Count of completed tickets | Real-time |
| Tickets Pending | Queue length for unassigned tickets | Real-time |

#### 2. Active Connections Monitor

Displays current HTTP and WebSocket connections:
- Connection type (HTTP/WebSocket)
- IP address
- Entity identifier (barber code, session ID)
- User agent summary

#### 3. Barber Profiles Panel

Real-time status of all barbers:

| Status | Indicator | Meaning |
|--------|-----------|---------|
| `active` | 🟢 Green border | Available for assignment |
| `busy` | 🟠 Orange border | Currently serving a customer |
| `off_duty` | ⚫ Gray border | Not available |

Barber details shown:
- Name and code (e.g., "John Barber (JB)")
- Skills list
- Commission rate
- Last seen IP address

#### 4. Telemetry & Headers Log

Recent system events with:
- Event type (e.g., `bundle_checkout`, `barber_login`)
- Source IP address
- Event payload summary

#### 5. WebSocket Stream

Live feed of WebSocket events:
- Incoming telemetry messages
- Connection status changes
- System events

### Admin API Endpoints

```http
# Core Data
GET /admin/data           # Sessions, telemetry, financial snapshot
GET /admin/orders         # Order history with tip breakdown by barber

# WebSocket
GET /admin/ws?key={KEY}   # Real-time admin telemetry stream

# Documentation
GET /docs                 # Documentation index
GET /docs/manifest        # Current manifest (TOML)
GET /docs/manifest.json   # Parsed manifest (JSON)
GET /docs/readme          # Project README
GET /docs/client          # Client flow guide
GET /docs/admin           # Admin flow guide
```

### Admin Best Practices

1. **Keep Admin Open**: Maintain the admin dashboard open during business hours to monitor real-time activity
2. **Watch Financials**: Track revenue patterns during peak hours
3. **Monitor Barber Status**: Ensure barbers are marked active when clocking in
4. **Check Telemetry**: Review telemetry logs for errors or anomalies
5. **Refresh When Stale**: If data appears stale, refresh `/admin/data` to confirm backend state

### Admin Security

```bash
# Required environment variables for production
MANAGER_KEY=<secure-random-key>     # Required for /clear endpoint
LIFECYCLE_KEY=<secure-key>          # Required for lifecycle operations
```

---

## Client Operations

The Client Portal allows customers to browse services, select barbers, and complete bookings with integrated checkout.

### Entry Points

```
http://localhost:3000/client     # Primary client portal
http://localhost:3000/           # Alias redirect
```

### Primary Customer Journey

#### Step 1: Browse Services

Available services with pricing:

| Service | Price | Duration | Description |
|---------|-------|----------|-------------|
| ✂️ Haircut | $30 | 30 min | Standard haircut |
| 🧔 Beard Trim | $15 | 15 min | Beard shaping and trim |
| 🔥 Hot Towel Shave | $25 | 20 min | Traditional hot towel shave |
| ⚡ Fade/Design | $35 | 45 min | Complex fades and designs |

#### Step 2: Select Barber (Optional)

Customers can choose:
- **Any Available** (default) - System auto-assigns based on skills
- **Specific Barber** - Select from active barbers

Barber codes: `JB`, `MS`, `CK`, `OM`, `JA`

#### Step 3: Configure Tip

Two tip modes supported:

| Mode | Example | Calculation |
|------|---------|-------------|
| Percent | 15% | Subtotal × 0.15 |
| Flat | $10 | Fixed amount |

Default tip: 15%

#### Step 4: Add Retail (Optional)

- Add Shampoo (+$12)
- Products are non-tippable (handled by house cashier)

#### Step 5: Upload Reference Photo (Optional)

- Supports image uploads via `/action` endpoint
- Photos saved to `uploads/` directory
- Named with sanitized customer name + timestamp

#### Step 6: Review and Checkout

Bundle checkout includes:
- Itemized service/product list
- Subtotal
- Calculated tip
- Grand total

### Client API Endpoints

```http
# Service Information
GET /barbers              # List available barbers and skills
GET /tickets/pending      # Queue count for wait time estimates

# Actions
POST /checkout/bundle     # Complete bundled checkout
POST /ticket/create       # Create booking ticket
POST /action              # Multipart form upload (reference photos)
```

### Bundle Checkout Request Format

```http
POST /checkout/bundle
Content-Type: application/json

{
  "customerName": "Walk-in Customer",
  "items": [
    {
      "name": "Haircut",
      "price": 30,
      "quantity": 1,
      "kind": "service",
      "providerId": "barber_jb",
      "providerName": "John Barber",
      "providerRole": "barber",
      "tipEligible": true
    }
  ],
  "tip": {
    "mode": "percent",
    "value": 15
  },
  "totalAmount": 34.50,
  "walkIn": true,
  "paymentId": "pay_1234567890"
}
```

### Client Response Format

```json
{
  "success": true,
  "order": {
    "id": "order_1234567890_abc12",
    "subtotal": 30.00,
    "tip": 4.50,
    "tipMode": "percent",
    "total": 34.50,
    "tipByBarber": {
      "barber_jb": 4.50
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Client Best Practices

1. **Realistic Bundles**: Test with service bundles (haircut + beard trim) to validate assignment
2. **Tip Validation**: Verify tip calculations match expectations
3. **Admin Cross-Check**: Keep admin tab open to confirm telemetry updates during client actions
4. **Photo Uploads**: Test reference photo upload for larger files

---

## Barber Operations

The Barber Station provides workers with ticket management, earnings tracking, and real-time assignments.

### Entry Point

```
http://localhost:3000/barber     # Barber station login
```

### Barber Login

Barbers authenticate using 2-letter codes:

| Code | Name | Skills | Commission |
|------|------|--------|------------|
| JB | John Barber | Haircut, Beard Trim, Hot Towel Shave | 60% |
| MS | Mike Styles | Haircut, Fade, Design | 55% |
| CK | Chris Kutz | Beard Trim, Hot Towel Shave | 50% |
| OM | Omar Razor | Hot Towel Shave, Beard Trim | 58% |
| JA | Jamal Braids | Braids, Design, Fade | 57% |

#### Login Flow

1. Navigate to `/barber`
2. Enter 2-letter code (e.g., `JB`)
3. Dashboard loads with:
   - Barber profile
   - Current ticket (if assigned)
   - Today's earnings
   - Queue status

### Barber Dashboard Components

#### 1. Status Badge

| Status | Color | Meaning |
|--------|-------|---------|
| ACTIVE | Green | Available for new tickets |
| BUSY | Orange | Currently serving customer |

#### 2. Earnings Panel

Displays:
- Today's commission earnings
- Tickets completed count
- Commission rate percentage

#### 3. Queue Information

Shows number of customers waiting for service

#### 4. Current Ticket Card

When assigned, displays:
- Customer name
- Services requested
- Total amount
- Complete button

### Ticket Lifecycle

```
Created → Assigned → In Progress → Completed
   ↑                                    ↓
   └──────── Cancelled ←───────────────┘
```

#### Auto-Assignment Algorithm

Tickets are auto-assigned based on:
1. **Skill Matching** - Barber skills vs. service requirements
2. **Availability** - Only `active` barbers
3. **Current Load** - Barbers without current tickets
4. **Walk-in Bonus** - +10 score for walk-in customers

Minimum match score: 50/100

### Barber API Endpoints

```http
# Authentication
POST /barber/login        # Login with barber code
                          # Sets session cookie (8hr maxAge)

# Operations
POST /barber/complete     # Mark current ticket as complete
GET /barber/stats         # Get barber statistics
                           # ?barberId={id}

# Queue
GET /tickets/pending      # Queue count for wait status
```

### Barber Login Request

```http
POST /barber/login
Content-Type: application/json

{
  "code": "JB"
}
```

### Barber Login Response

```json
{
  "success": true,
  "barber": {
    "id": "barber_jb",
    "name": "John Barber",
    "skills": ["Haircut", "Beard Trim", "Hot Towel Shave"],
    "commissionRate": 0.6
  },
  "tickets": [
    {
      "id": "ticket_abc123",
      "customer": "Jane Doe",
      "services": ["Haircut", "Beard Trim"],
      "amount": 45.00
    }
  ],
  "csrfToken": "abc123..."
}
```

### Real-Time Updates

Barbers receive WebSocket notifications:
- New ticket assignments
- Queue updates
- System broadcasts

```javascript
// WebSocket connection
const ws = new WebSocket('ws://localhost:3000/ws/dashboard');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'new_ticket') {
    // Display new ticket notification
  }
};
```

### Barber Best Practices

1. **Clock In Promptly**: Login at start of shift to become available for assignment
2. **Complete Tickets**: Always mark tickets as complete to update earnings
3. **Check Queue**: Monitor queue status during slow periods
4. **Stay Active**: Keep dashboard open during shift for real-time assignments

---

## Quick Reference / Cheat Sheet

### FactoryWager v3.8 Commands

```bash
# Benchmark Suite
bun run factory-wager-cheatsheet-v38.ts suite

# Category Commands
bun run factory-wager-cheatsheet-v38.ts category r2
bun run factory-wager-cheatsheet-v38.ts category secrets
bun run factory-wager-cheatsheet-v38.ts category dashboard
bun run factory-wager-cheatsheet-v38.ts category profile

# Theme Display
bun run factory-wager-cheatsheet-v38.ts theme
```

### Theme Palette

| Semantic | Color | Hex | HSL |
|----------|-------|-----|-----|
| Primary | Blue | #007FFF | hsl(210 100% 50%) |
| Secondary | Teal | #17B8A6 | hsl(175 80% 45%) |
| Success | Green | #14B866 | hsl(145 80% 45%) |
| Warning | Orange | #FF8000 | hsl(30 100% 50%) |
| Error | Red | #E64C4C | hsl(0 85% 55%) |

### API Quick Reference

#### Dashboard Creation

```typescript
import { createAdminDashboard } from './src/dashboard';

const db = createAdminDashboard();
console.log(db.export('html'));
```

#### Profile Sampling

```typescript
import { quickSamplingProfile } from './src/profile';

await quickSamplingProfile('http://localhost:3001/ops/status');
```

#### Cached Cloudflare

```typescript
import { cachedCloudflare } from './lib/cloudflare';

const zones = await cachedCloudflare.listZones();
cachedCloudflare.printStats();
```

### cURL Test Commands

```bash
# Create ticket
curl -X POST http://localhost:3000/ticket/create \
  -H "Content-Type: application/json" \
  -d '{"customerName":"John Smith","services":[{"name":"Haircut","price":30,"duration":30}],"totalAmount":30,"walkIn":true,"paymentId":"pay_123"}'

# Barber login
curl -X POST http://localhost:3000/barber/login \
  -H "Content-Type: application/json" \
  -d '{"code":"JB"}'

# Complete ticket
curl -X POST http://localhost:3000/barber/complete \
  -H "Content-Type: application/json" \
  -d '{"ticketId":"ticket_123"}'

# Checkout bundle
curl -X POST http://localhost:3000/checkout/bundle \
  -H "Content-Type: application/json" \
  -d '{"items":[{"name":"Haircut","price":30,"kind":"service","providerId":"barber_jb","tipEligible":true}],"tip":{"mode":"percent","value":15}}'

# End of day report
curl -X POST http://localhost:3000/manager/end-of-day \
  -H "Authorization: Bearer manager123"

# Clear pending tickets
curl http://localhost:3000/manager/clear?key=manager123

# Check queue
curl http://localhost:3000/tickets/pending

# List barbers
curl http://localhost:3000/barbers

# Admin data snapshot
curl http://localhost:3000/admin/data

# Orders with tip breakdown
curl http://localhost:3000/admin/orders
```

### Environment Variables

```bash
# Server
SERVER_NAME="Barbershop Dev"
HOST=0.0.0.0
PORT=3000
NODE_ENV=development

# Security
LIFECYCLE_KEY=godmode123
MANAGER_KEY=manager123
JWT_SECRET=<your-secret>

# Payment (Production Required)
PAYPAL_SECRET=<paypal-secret>

# R2 Storage (Optional)
R2_ACCOUNT_ID=<account>
R2_BUCKET_NAME=<bucket>
R2_ACCESS_KEY_ID=<key>
R2_SECRET_ACCESS_KEY=<secret>
```

---

## Common Workflows

### Workflow 1: Complete Customer Journey

```
1. Customer visits /client
2. Selects services (Haircut $30 + Beard Trim $15)
3. Chooses barber (optional)
4. Sets 20% tip
5. Clicks "Checkout Bundle"
6. System creates order with tip allocation
7. Ticket auto-assigned to available barber
8. Barber receives real-time notification
9. Barber completes service
10. Financials update in real-time on /admin
```

### Workflow 2: Barber Shift

```
1. Barber navigates to /barber
2. Enters code (e.g., "JB")
3. Dashboard shows current status (ACTIVE)
4. Ticket auto-assigned based on skills
5. Barber views ticket details
6. Barber completes service
7. Clicks "Complete"
8. Earnings updated automatically
9. Barber becomes available for next assignment
```

### Workflow 3: End of Day

```
1. Manager navigates to admin dashboard
2. Reviews financial metrics
3. Confirms all tickets completed
4. Runs EOD report:
   curl -X POST http://localhost:3000/manager/end-of-day \
     -H "Authorization: Bearer manager123"
5. Report includes:
   - Total revenue
   - Tips collected
   - Barber commissions
   - Service breakdown
6. Clears any remaining pending tickets (if needed)
```

### Workflow 4: Troubleshooting

```bash
# Check system health
curl http://localhost:3000/health

# View runtime metrics
curl http://localhost:3000/ops/runtime

# Check R2 mirror status
curl http://localhost:3000/ops/r2-status

# Test outbound fetch
curl "http://localhost:3000/ops/fetch-check?url=https://example.com"

# View telemetry (HTML)
curl "http://localhost:3000/telemetry?format=html"

# Server lifecycle controls
curl "http://localhost:3000/ops/lifecycle?action=status&key=godmode123"
curl "http://localhost:3000/ops/lifecycle?action=ref&key=godmode123"
curl "http://localhost:3000/ops/lifecycle?action=unref&key=godmode123"
curl "http://localhost:3000/ops/lifecycle?action=stop&key=godmode123"
```

### Workflow 5: Development Testing

```bash
# Start all services
bun run start:server       # API server (port 3000)
bun run start:dashboard    # Dashboard server (port 3000)
bun run start:tickets      # Ticket system (port 3005)

# Run tests
bun run test              # All tests
bun run test:unit         # Unit tests only
bun run test:dashboard    # Dashboard tests

# Profile performance
bun run profile:sampling  # Generate sampling profile
bun run profile:upload    # Upload to R2

# Security audit
bun run security:audit
bun run security:citadel
```

---

## Additional Resources

| Resource | Location | Description |
|----------|----------|-------------|
| README | `README.md` | Project overview |
| AGENTS.md | `AGENTS.md` | AI agent guidelines |
| QUICK-REF | `QUICK-REF.md` | Command quick reference |
| Theme Guide | `THEME_PALETTE.md` | Theme system docs |
| Integration | `OPENCLAW_INTEGRATION.md` | OpenClaw gateway |

---

*Generated from ADMIN.md, CLIENT.md, and FACTORY_WAGER_CHEATSHEET.md*
*Last updated: 2026-02-07*
