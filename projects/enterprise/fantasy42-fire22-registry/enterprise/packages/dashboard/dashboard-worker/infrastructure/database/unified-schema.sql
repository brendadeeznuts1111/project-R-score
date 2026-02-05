-- ============================================================================
-- FIRE22 DASHBOARD - UNIFIED DATABASE SCHEMA
-- Coordinating Fire22 Platform + Telegram Integration + Internal Teams
-- ============================================================================

-- ===== CORE IDENTITY & AUTHENTICATION LAYER =====

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  uuid TEXT UNIQUE NOT NULL, -- Universal user identifier
  
  -- Identity
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  
  -- System Integration IDs
  fire22_customer_id TEXT, -- Links to Fire22 platform
  telegram_id TEXT,        -- Links to Telegram
  telegram_username TEXT,
  
  -- Authentication
  password_hash TEXT,
  role TEXT DEFAULT 'customer', -- customer, agent, staff, admin
  status TEXT DEFAULT 'active', -- active, suspended, banned
  
  -- Department Assignment (for internal team)
  department_id INTEGER REFERENCES departments(id),
  team_role TEXT, -- member, lead, manager, director
  
  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_login TEXT,
  telegram_linked_at TEXT,
  
  -- Soft delete
  deleted_at TEXT,
  deleted_by TEXT
);

-- ===== DEPARTMENT & TEAM STRUCTURE =====

CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL, -- finance, support, vip, technical, compliance, management
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Department Configuration
  telegram_channel_id TEXT,    -- Department Telegram channel
  support_email TEXT,          -- Department email
  escalation_rules TEXT,       -- JSON: escalation workflows
  working_hours TEXT,          -- JSON: department hours
  
  -- Hierarchy
  parent_department_id INTEGER REFERENCES departments(id),
  department_level INTEGER DEFAULT 1,
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS team_permissions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  department_id INTEGER REFERENCES departments(id),
  
  -- Permission System
  permission_level INTEGER DEFAULT 1, -- 1=basic, 2=advanced, 3=manager, 4=director
  permissions TEXT, -- JSON array: ['view_customers', 'process_withdrawals', 'manage_agents']
  
  -- Scope Limitations
  customer_access_scope TEXT, -- JSON: customer tier/agent restrictions
  financial_limits TEXT,      -- JSON: transaction limits
  
  -- Assignment
  assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
  assigned_by INTEGER REFERENCES users(id),
  expires_at TEXT, -- Optional permission expiry
  
  UNIQUE(user_id, department_id)
);

-- ===== ENHANCED FIRE22 INTEGRATION =====

CREATE TABLE IF NOT EXISTS fire22_customers (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id), -- Links to unified users table
  
  -- Fire22 Platform Data
  fire22_customer_id TEXT UNIQUE NOT NULL,
  agent_id TEXT NOT NULL,
  parent_agent TEXT,
  master_agent TEXT,
  
  -- Customer Details
  login TEXT UNIQUE NOT NULL,
  tier TEXT DEFAULT 'bronze', -- bronze, silver, gold, platinum, vip
  status TEXT DEFAULT 'active',
  
  -- Financial Information
  balance REAL DEFAULT 0,
  casino_balance REAL DEFAULT 0,
  sports_balance REAL DEFAULT 0,
  freeplay_balance REAL DEFAULT 0,
  credit_limit REAL DEFAULT 0,
  
  -- Activity Tracking
  total_deposits REAL DEFAULT 0,
  total_withdrawals REAL DEFAULT 0,
  lifetime_volume REAL DEFAULT 0,
  last_activity TEXT,
  
  -- Business Rules
  betting_limits TEXT, -- JSON: per sport/bet type limits
  risk_score INTEGER DEFAULT 0,
  vip_status BOOLEAN DEFAULT FALSE,
  kyc_status TEXT DEFAULT 'pending', -- pending, approved, rejected
  kyc_documents TEXT, -- JSON array of document references
  
  -- Metadata
  notes TEXT,
  preferences TEXT, -- JSON: customer preferences
  
  -- Sync tracking
  fire22_synced_at TEXT,
  sync_version INTEGER DEFAULT 1,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fire22_agents (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id), -- Links to unified users if agent has dashboard access
  
  -- Fire22 Agent Data
  agent_id TEXT UNIQUE NOT NULL,
  agent_login TEXT UNIQUE NOT NULL,
  agent_name TEXT NOT NULL,
  agent_type TEXT DEFAULT 'agent', -- master, agent, player, admin
  
  -- Hierarchy
  parent_agent TEXT,
  master_agent TEXT,
  level INTEGER DEFAULT 1, -- 1-8 level hierarchy
  
  -- Business Information
  commission_rate REAL DEFAULT 0,
  territory TEXT,
  specializations TEXT, -- JSON array
  
  -- Performance
  total_customers INTEGER DEFAULT 0,
  active_customers INTEGER DEFAULT 0,
  total_volume REAL DEFAULT 0,
  total_commission REAL DEFAULT 0,
  performance_score INTEGER DEFAULT 0,
  
  -- Access Control
  permissions TEXT, -- JSON array
  access_level INTEGER DEFAULT 1,
  allowed_sports TEXT, -- JSON array
  max_bet_limit REAL DEFAULT 0,
  
  -- Activity
  last_login TEXT,
  login_count INTEGER DEFAULT 0,
  
  -- Contact
  contact_email TEXT,
  contact_phone TEXT,
  contact_address TEXT,
  
  -- Status
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ===== ENHANCED TRANSACTION SYSTEM =====

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY,
  uuid TEXT UNIQUE NOT NULL,
  
  -- Core Transaction Data
  customer_id INTEGER REFERENCES fire22_customers(id),
  agent_id TEXT,
  amount REAL NOT NULL,
  transaction_type TEXT NOT NULL, -- deposit, withdrawal, bet, win, adjustment, bonus
  transaction_code TEXT UNIQUE NOT NULL,
  
  -- Processing Information
  status TEXT DEFAULT 'pending', -- pending, completed, failed, cancelled
  processed_at TEXT,
  processed_by INTEGER REFERENCES users(id),
  processor_notes TEXT,
  
  -- Balance Tracking
  balance_before REAL,
  balance_after REAL,
  freeplay_balance REAL DEFAULT 0,
  freeplay_pending_balance REAL DEFAULT 0,
  
  -- References
  reference_number TEXT,
  external_reference TEXT,
  parent_transaction_id INTEGER REFERENCES transactions(id),
  wager_id INTEGER,
  
  -- Descriptions
  short_description TEXT NOT NULL,
  long_description TEXT,
  
  -- Department Processing
  department_id INTEGER REFERENCES departments(id), -- Which department processed
  assigned_to INTEGER REFERENCES users(id),         -- Staff member assigned
  approval_required BOOLEAN DEFAULT FALSE,
  approved_by INTEGER REFERENCES users(id),
  approved_at TEXT,
  
  -- Fees & Metadata
  processing_fee REAL DEFAULT 0,
  service_fee REAL DEFAULT 0,
  third_party_fee REAL DEFAULT 0,
  metadata TEXT, -- JSON
  
  -- Audit
  entered_by TEXT,
  grade_number INTEGER,
  transaction_datetime TEXT DEFAULT CURRENT_TIMESTAMP,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ===== TELEGRAM INTEGRATION LAYER =====

CREATE TABLE IF NOT EXISTS telegram_users (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id), -- Links to unified users
  
  -- Telegram Identity
  telegram_id TEXT UNIQUE NOT NULL,
  telegram_username TEXT,
  first_name TEXT,
  last_name TEXT,
  language_code TEXT DEFAULT 'en',
  is_bot BOOLEAN DEFAULT FALSE,
  
  -- Service Configuration
  notifications_enabled BOOLEAN DEFAULT TRUE,
  subscription_level TEXT DEFAULT 'basic', -- basic, premium, vip
  preferred_language TEXT DEFAULT 'en',
  
  -- Department Assignment (for staff)
  authorized_departments TEXT, -- JSON array of department IDs staff can access
  
  -- Activity
  last_interaction TEXT,
  message_count INTEGER DEFAULT 0,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telegram_messages (
  id INTEGER PRIMARY KEY,
  telegram_user_id INTEGER REFERENCES telegram_users(id),
  
  -- Message Details
  message_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- text, command, callback, inline_query
  content TEXT NOT NULL,
  
  -- Command Processing
  command TEXT,
  parameters TEXT, -- JSON array
  
  -- Direction & Processing
  direction TEXT DEFAULT 'inbound', -- inbound, outbound
  processed BOOLEAN DEFAULT FALSE,
  response_sent BOOLEAN DEFAULT FALSE,
  
  -- Department Routing
  routed_to_department INTEGER REFERENCES departments(id),
  handled_by INTEGER REFERENCES users(id),
  
  -- Status
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY,
  ticket_number TEXT UNIQUE NOT NULL, -- TICK_2025001, etc.
  
  -- Ticket Origin
  user_id INTEGER REFERENCES users(id),
  telegram_user_id INTEGER REFERENCES telegram_users(id),
  created_via TEXT DEFAULT 'telegram', -- telegram, web, api, email
  
  -- Ticket Details
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent, critical
  service_level TEXT DEFAULT 'basic', -- basic, premium, vip, enterprise
  category TEXT, -- billing, technical, account, betting, other
  
  -- Department Assignment
  assigned_department INTEGER REFERENCES departments(id),
  assigned_to INTEGER REFERENCES users(id),
  assigned_at TEXT,
  
  -- Status Management
  status TEXT DEFAULT 'open', -- open, assigned, in_progress, resolved, closed, escalated
  resolution TEXT,
  resolved_at TEXT,
  resolved_by INTEGER REFERENCES users(id),
  
  -- SLA Tracking
  response_due_at TEXT,     -- When response is due
  resolution_due_at TEXT,   -- When resolution is due
  first_response_at TEXT,   -- When first response was sent
  sla_breached BOOLEAN DEFAULT FALSE,
  
  -- Customer Satisfaction
  satisfaction_rating INTEGER, -- 1-5 rating
  feedback TEXT,
  
  -- Escalation
  escalated_at TEXT,
  escalated_to INTEGER REFERENCES users(id),
  escalation_reason TEXT,
  
  -- Metadata
  tags TEXT, -- JSON array
  internal_notes TEXT,
  customer_visible_notes TEXT,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id INTEGER PRIMARY KEY,
  ticket_id INTEGER REFERENCES support_tickets(id),
  
  -- Message Details
  sender_id INTEGER REFERENCES users(id),
  sender_type TEXT NOT NULL, -- customer, staff, system
  message TEXT NOT NULL,
  
  -- Visibility & Type
  message_type TEXT DEFAULT 'reply', -- reply, note, status_change, escalation
  is_internal BOOLEAN DEFAULT FALSE, -- Internal staff notes vs customer visible
  
  -- Attachments
  attachments TEXT, -- JSON array of file references
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ===== WORKFLOW & AUTOMATION =====

CREATE TABLE IF NOT EXISTS department_workflows (
  id INTEGER PRIMARY KEY,
  department_id INTEGER REFERENCES departments(id),
  
  -- Workflow Configuration
  workflow_name TEXT NOT NULL,
  workflow_type TEXT NOT NULL, -- ticket_routing, escalation, notification
  
  -- Conditions & Actions
  trigger_conditions TEXT, -- JSON: when to activate
  actions TEXT,           -- JSON: what to do
  
  -- Telegram Integration
  telegram_notifications BOOLEAN DEFAULT FALSE,
  telegram_channel_id TEXT,
  notification_template TEXT,
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

-- ===== ANALYTICS & REPORTING =====

CREATE TABLE IF NOT EXISTS department_metrics (
  id INTEGER PRIMARY KEY,
  department_id INTEGER REFERENCES departments(id),
  metric_date DATE NOT NULL,
  
  -- Ticket Metrics
  tickets_created INTEGER DEFAULT 0,
  tickets_resolved INTEGER DEFAULT 0,
  tickets_escalated INTEGER DEFAULT 0,
  avg_response_time INTEGER DEFAULT 0, -- minutes
  avg_resolution_time INTEGER DEFAULT 0, -- minutes
  sla_compliance_rate REAL DEFAULT 0, -- percentage
  
  -- Customer Metrics
  customer_satisfaction_avg REAL DEFAULT 0,
  total_customers_served INTEGER DEFAULT 0,
  
  -- Financial Metrics (if applicable)
  transactions_processed INTEGER DEFAULT 0,
  transaction_volume REAL DEFAULT 0,
  
  -- Staff Metrics
  active_staff INTEGER DEFAULT 0,
  total_work_hours INTEGER DEFAULT 0,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(department_id, metric_date)
);

-- ===== SYSTEM INTEGRATION TABLES =====

CREATE TABLE IF NOT EXISTS sync_status (
  id INTEGER PRIMARY KEY,
  system_name TEXT NOT NULL, -- fire22, telegram, internal
  table_name TEXT NOT NULL,
  
  last_sync_at TEXT,
  sync_status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  records_synced INTEGER DEFAULT 0,
  sync_errors TEXT, -- JSON array of errors
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(system_name, table_name)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_fire22_customer_id ON users(fire22_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Department indexes
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(active);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_department_id);

-- Fire22 customer indexes
CREATE INDEX IF NOT EXISTS idx_fire22_customers_user_id ON fire22_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_fire22_customers_agent_id ON fire22_customers(agent_id);
CREATE INDEX IF NOT EXISTS idx_fire22_customers_status ON fire22_customers(status);
CREATE INDEX IF NOT EXISTS idx_fire22_customers_tier ON fire22_customers(tier);

-- Transaction indexes
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_department ON transactions(department_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_datetime);

-- Telegram indexes
CREATE INDEX IF NOT EXISTS idx_telegram_users_user_id ON telegram_users(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_user_id ON telegram_messages(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_department ON telegram_messages(routed_to_department);

-- Support ticket indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_department ON support_tickets(assigned_department);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Unified customer view combining all systems
CREATE VIEW IF NOT EXISTS unified_customer_view AS
SELECT 
  u.id as user_id,
  u.uuid,
  u.username,
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  u.status as user_status,
  
  -- Fire22 data
  fc.fire22_customer_id,
  fc.agent_id,
  fc.tier,
  fc.balance,
  fc.vip_status,
  fc.risk_score,
  
  -- Telegram data
  tu.telegram_id,
  tu.telegram_username,
  tu.notifications_enabled,
  tu.subscription_level,
  
  -- Department assignment (for staff)
  d.name as department_name,
  u.team_role,
  
  u.created_at,
  u.last_login
FROM users u
LEFT JOIN fire22_customers fc ON u.id = fc.user_id
LEFT JOIN telegram_users tu ON u.id = tu.user_id
LEFT JOIN departments d ON u.department_id = d.id;

-- Department performance view
CREATE VIEW IF NOT EXISTS department_performance_view AS
SELECT 
  d.id as department_id,
  d.name as department_name,
  d.display_name,
  
  -- Staff count
  COUNT(DISTINCT u.id) as staff_count,
  
  -- Open tickets
  COUNT(DISTINCT CASE WHEN st.status IN ('open', 'assigned', 'in_progress') THEN st.id END) as open_tickets,
  
  -- Today's metrics
  COUNT(DISTINCT CASE WHEN DATE(st.created_at) = DATE('now') THEN st.id END) as tickets_today,
  COUNT(DISTINCT CASE WHEN DATE(st.resolved_at) = DATE('now') THEN st.id END) as resolved_today,
  
  -- SLA compliance
  AVG(CASE WHEN st.sla_breached = 0 AND st.status = 'resolved' THEN 1.0 ELSE 0.0 END) * 100 as sla_compliance_rate
  
FROM departments d
LEFT JOIN users u ON d.id = u.department_id AND u.deleted_at IS NULL
LEFT JOIN support_tickets st ON d.id = st.assigned_department
WHERE d.active = TRUE
GROUP BY d.id, d.name, d.display_name;

-- ============================================================================
-- TRIGGERS FOR DATA CONSISTENCY
-- ============================================================================

-- Update user timestamp on any change
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update customer timestamp on any change
CREATE TRIGGER IF NOT EXISTS update_fire22_customers_timestamp 
AFTER UPDATE ON fire22_customers
BEGIN
  UPDATE fire22_customers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Auto-assign ticket number
CREATE TRIGGER IF NOT EXISTS auto_assign_ticket_number
AFTER INSERT ON support_tickets
WHEN NEW.ticket_number IS NULL
BEGIN
  UPDATE support_tickets 
  SET ticket_number = 'TICK_' || strftime('%Y', 'now') || '_' || printf('%06d', NEW.id)
  WHERE id = NEW.id;
END;