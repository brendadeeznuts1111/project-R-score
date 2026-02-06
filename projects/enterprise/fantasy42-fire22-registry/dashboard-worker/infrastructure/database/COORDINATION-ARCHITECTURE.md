# 🎯 Fire22 Dashboard - System Coordination Architecture

## Overview: The Three-System Challenge

The Fire22 Dashboard must coordinate data and workflows between three distinct
but interconnected systems:

1. **Fire22 Platform** - Sports betting core (2,600+ customers, agents, wagers)
2. **Telegram Integration** - Multi-language bot, support, P2P matching
3. **Internal Teams** - Department-based staff, workflows, permissions

## 🔄 The Unified Coordination Model

### Core Identity System

```text
┌─────────────────────────────────────────────────────────────┐
│                    UNIFIED USERS TABLE                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │   Fire22    │ │  Telegram   │ │    Internal Team       │ │
│  │ Customer ID │ │ Telegram ID │ │   Department + Role    │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Key Innovation**: Single `users` table with multiple identity columns:

- `fire22_customer_id` - Links to Fire22 platform
- `telegram_id` - Links to Telegram bot
- `department_id` + `team_role` - Internal staff assignment

### Department Structure Integration

```sql
departments:
├── finance (transactions, withdrawals, deposits)
├── support (tickets, customer service, escalations)
├── vip (high-tier customers, special requests)
├── technical (system issues, integrations)
├── compliance (KYC, risk management)
└── management (oversight, reporting, analytics)
```

Each department has:

- **Telegram Channel Integration** - Department-specific channels
- **Workflow Automation** - Ticket routing rules
- **Permission Systems** - Role-based access control
- **SLA Management** - Response/resolution time tracking

## 🚀 **Data Flow Coordination Examples**

### 1. Customer Support Workflow

```text
Customer → Telegram Bot → Support Ticket → Department Assignment → Staff Member
    ↓            ↓              ↓                ↓                    ↓
Fire22 ID → Telegram ID → Ticket ID → support dept → @sarah_support
    ↓            ↓              ↓                ↓                    ↓
Balance     Language       Priority         SLA Rules         Notifications
Check       Detection      Assignment       (2hr response)    (Telegram DM)
```

**SQL Coordination**:

```sql
-- When customer sends message via Telegram
INSERT INTO support_tickets (
  user_id,              -- Links to unified users table
  telegram_user_id,     -- Links to telegram_users
  assigned_department,  -- Auto-assigned based on message content
  priority,            -- Based on customer tier (VIP = high)
  service_level        -- Based on Fire22 customer tier
);

-- Auto-assign to available department staff
UPDATE support_tickets SET
  assigned_to = (SELECT id FROM users
                WHERE department_id = ? AND status = 'available'
                LIMIT 1);
```

### 2. Financial Transaction Processing

```text
Fire22 Transaction → Department Routing → Staff Processing → Telegram Notification
       ↓                     ↓                  ↓                    ↓
$10,000 withdrawal →  Finance Dept →    @mike_finance →   Customer notified
    ↓                     ↓                  ↓                    ↓
Requires approval →   Manager escalation → @sarah_manager → Telegram update
```

**SQL Coordination**:

```sql
-- Transaction requires departmental processing
INSERT INTO transactions (
  customer_id,         -- Links to fire22_customers
  department_id,       -- finance (for withdrawals)
  assigned_to,         -- Staff member assigned
  approval_required    -- TRUE for amounts > $5,000
);

-- Notify via Telegram when status changes
INSERT INTO telegram_messages (
  telegram_user_id,    -- Customer's Telegram
  content,            -- "Your withdrawal is being processed"
  routed_to_department -- finance (for customer questions)
);
```

### 3. VIP Customer Management

```text
Fire22 VIP Customer → Special Handling → VIP Department → Premium Support
       ↓                    ↓                ↓                 ↓
High tier customer → Priority routing → @jennifer_vip → 30min SLA
       ↓                    ↓                ↓                 ↓
Personal relationship → Dedicated channel → Direct Telegram → White-glove service
```

## 🏗️ **Department Workflow Automation**

### Automatic Ticket Routing

```sql
-- Smart department assignment based on content/customer
CREATE TRIGGER auto_assign_department
AFTER INSERT ON support_tickets
BEGIN
  UPDATE support_tickets SET
    assigned_department = CASE
      WHEN NEW.category = 'financial' THEN (SELECT id FROM departments WHERE name = 'finance')
      WHEN NEW.service_level = 'vip' THEN (SELECT id FROM departments WHERE name = 'vip')
      WHEN NEW.message LIKE '%withdrawal%' THEN (SELECT id FROM departments WHERE name = 'finance')
      WHEN NEW.message LIKE '%bet%' OR NEW.message LIKE '%wager%' THEN (SELECT id FROM departments WHERE name = 'support')
      ELSE (SELECT id FROM departments WHERE name = 'support')
    END,
    response_due_at = datetime('now', '+' ||
      CASE
        WHEN NEW.service_level = 'vip' THEN '30 minutes'
        WHEN NEW.priority = 'urgent' THEN '1 hour'
        ELSE '2 hours'
      END)
  WHERE id = NEW.id;
END;
```

### SLA Management

```sql
-- Track SLA performance by department
SELECT
  d.name as department,
  COUNT(*) as total_tickets,
  COUNT(CASE WHEN st.sla_breached = 0 THEN 1 END) as sla_met,
  AVG(
    (JULIANDAY(st.first_response_at) - JULIANDAY(st.created_at)) * 1440
  ) as avg_response_minutes,
  (COUNT(CASE WHEN st.sla_breached = 0 THEN 1 END) * 100.0 / COUNT(*)) as sla_compliance_rate
FROM departments d
JOIN support_tickets st ON d.id = st.assigned_department
WHERE st.created_at >= datetime('now', '-7 days')
GROUP BY d.id, d.name;
```

## 🔗 **Cross-System Data Synchronization**

### Fire22 → Internal Systems

```sql
-- Sync Fire22 customer updates to internal systems
CREATE TRIGGER sync_fire22_customer_updates
AFTER UPDATE ON fire22_customers
WHEN NEW.tier != OLD.tier OR NEW.vip_status != OLD.vip_status
BEGIN
  -- Update user role if customer becomes VIP
  UPDATE users SET
    role = CASE WHEN NEW.vip_status = 1 THEN 'vip_customer' ELSE 'customer' END
  WHERE id = NEW.user_id;

  -- Update existing tickets service level
  UPDATE support_tickets SET
    service_level = CASE WHEN NEW.vip_status = 1 THEN 'vip' ELSE NEW.tier END
  WHERE user_id = NEW.user_id AND status IN ('open', 'assigned', 'in_progress');
END;
```

### Telegram → Internal Systems

```sql
-- Route Telegram messages to appropriate departments
CREATE TRIGGER route_telegram_messages
AFTER INSERT ON telegram_messages
WHEN NEW.direction = 'inbound' AND NEW.message_type = 'text'
BEGIN
  UPDATE telegram_messages SET
    routed_to_department = (
      SELECT d.id FROM departments d
      JOIN users u ON d.id = u.department_id
      WHERE d.name = CASE
        WHEN LOWER(NEW.content) LIKE '%withdrawal%' OR LOWER(NEW.content) LIKE '%deposit%' THEN 'finance'
        WHEN LOWER(NEW.content) LIKE '%vip%' OR u.role = 'vip_customer' THEN 'vip'
        WHEN LOWER(NEW.content) LIKE '%technical%' OR LOWER(NEW.content) LIKE '%bug%' THEN 'technical'
        ELSE 'support'
      END
      LIMIT 1
    )
  WHERE id = NEW.id;
END;
```

## 📊 **Unified Reporting & Analytics**

### Department Performance Dashboard

```sql
-- Real-time department metrics
CREATE VIEW department_dashboard AS
SELECT
  d.name,
  d.display_name,

  -- Staff metrics
  COUNT(DISTINCT u.id) as staff_count,
  COUNT(DISTINCT CASE WHEN u.last_login > datetime('now', '-24 hours') THEN u.id END) as active_staff_24h,

  -- Ticket metrics
  COUNT(DISTINCT st.id) as total_tickets,
  COUNT(DISTINCT CASE WHEN st.status IN ('open', 'assigned', 'in_progress') THEN st.id END) as open_tickets,
  COUNT(DISTINCT CASE WHEN DATE(st.created_at) = DATE('now') THEN st.id END) as tickets_today,

  -- Performance metrics
  AVG(CASE WHEN st.sla_breached = 0 AND st.status = 'resolved' THEN 1.0 ELSE 0.0 END) * 100 as sla_compliance,
  AVG((JULIANDAY(st.first_response_at) - JULIANDAY(st.created_at)) * 1440) as avg_response_minutes,

  -- Customer satisfaction
  AVG(st.satisfaction_rating) as avg_satisfaction,

  -- Financial metrics (for finance dept)
  CASE WHEN d.name = 'finance' THEN
    SUM(CASE WHEN t.transaction_type IN ('deposit', 'withdrawal') AND DATE(t.created_at) = DATE('now')
        THEN t.amount ELSE 0 END)
  END as daily_transaction_volume

FROM departments d
LEFT JOIN users u ON d.id = u.department_id AND u.deleted_at IS NULL
LEFT JOIN support_tickets st ON d.id = st.assigned_department
LEFT JOIN transactions t ON d.id = t.department_id
WHERE d.active = TRUE
GROUP BY d.id, d.name, d.display_name;
```

### Cross-System Customer Journey

```sql
-- Complete customer interaction history across all systems
CREATE VIEW customer_journey AS
SELECT
  u.uuid as customer_uuid,
  u.username,
  fc.fire22_customer_id,
  fc.tier,
  fc.vip_status,

  -- Telegram activity
  tu.telegram_username,
  tu.last_interaction as last_telegram_activity,
  tu.message_count as telegram_messages,

  -- Support history
  COUNT(DISTINCT st.id) as total_tickets,
  COUNT(DISTINCT CASE WHEN st.status = 'resolved' THEN st.id END) as resolved_tickets,
  AVG(st.satisfaction_rating) as avg_satisfaction,

  -- Financial activity
  COUNT(DISTINCT t.id) as total_transactions,
  SUM(CASE WHEN t.transaction_type = 'deposit' THEN t.amount ELSE 0 END) as total_deposits,
  SUM(CASE WHEN t.transaction_type = 'withdrawal' THEN t.amount ELSE 0 END) as total_withdrawals,

  -- Activity timeline
  u.created_at as first_seen,
  u.last_login,
  MAX(COALESCE(st.created_at, t.created_at, tu.last_interaction)) as last_activity

FROM users u
LEFT JOIN fire22_customers fc ON u.id = fc.user_id
LEFT JOIN telegram_users tu ON u.id = tu.user_id
LEFT JOIN support_tickets st ON u.id = st.user_id
LEFT JOIN transactions t ON fc.id = t.customer_id
GROUP BY u.id, u.uuid, u.username, fc.fire22_customer_id, fc.tier, fc.vip_status,
         tu.telegram_username, tu.last_interaction, tu.message_count,
         u.created_at, u.last_login;
```

## 🎯 **Implementation Benefits**

### 1. **Unified Customer Experience**

- Single customer record across all touchpoints
- Consistent service level regardless of contact method
- Complete interaction history for staff context

### 2. **Efficient Department Operations**

- Automated ticket routing and assignment
- SLA tracking and compliance monitoring
- Performance metrics and optimization insights

### 3. **Cross-System Intelligence**

- Fire22 VIP status → Priority Telegram support
- Customer risk score → Enhanced compliance monitoring
- Transaction patterns → Proactive customer outreach

### 4. **Scalable Team Management**

- Role-based access control across all systems
- Department-specific workflows and permissions
- Cross-training and workload distribution capabilities

This architecture creates a **unified, intelligent system** that coordinates
Fire22 platform data, Telegram interactions, and internal team operations into a
seamless customer experience while providing powerful operational insights and
automation capabilities.
