-- Financial Reporting Domain Schema
-- SQLite Implementation for Financial Reporting and Regulatory Compliance

-- ===========================================
-- CORE TABLES
-- ===========================================

-- Financial Transactions Table
-- Stores all financial transactions with accounting classification
CREATE TABLE financial_transactions (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL UNIQUE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('revenue', 'expense', 'asset', 'liability', 'equity', 'adjustment')),
    transaction_category TEXT NOT NULL,
    amount REAL NOT NULL,
    currency_code TEXT NOT NULL DEFAULT 'USD',
    accounting_period_id TEXT NOT NULL,
    description TEXT NOT NULL,
    source_system TEXT NOT NULL,
    source_transaction_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('pending', 'posted', 'voided', 'adjusted')),
    posted_by TEXT NOT NULL,
    posted_at DATETIME NOT NULL,
    voided_by TEXT,
    voided_at DATETIME,
    void_reason TEXT,
    metadata TEXT, -- JSON string
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (accounting_period_id) REFERENCES accounting_periods(id)
);

-- Accounting Periods Table
-- Defines fiscal periods for financial reporting
CREATE TABLE accounting_periods (
    id TEXT PRIMARY KEY,
    period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'annual', 'custom')),
    fiscal_year INTEGER NOT NULL,
    period_number INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT 0,
    closed_at DATETIME,
    closed_by TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(fiscal_year, period_type, period_number)
);

-- Financial Reports Table
-- Stores generated financial reports with version control and amendment workflow
CREATE TABLE financial_reports (
    id TEXT PRIMARY KEY,
    report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'custom')),
    accounting_period_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    parent_report_id TEXT, -- For amendments - links to original report
    amendment_reason TEXT, -- Reason for amendment
    amended_by TEXT, -- User who created amendment
    amended_at DATETIME, -- When amendment was created

    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'published', 'archived')),
    compliance_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (compliance_status IN ('compliant', 'pending_review', 'requires_attention', 'non_compliant')),
    approved_by TEXT,
    approved_at DATETIME,
    published_at DATETIME,
    published_by TEXT,

    -- Financial Data (stored as JSON)
    summary_data TEXT NOT NULL, -- JSON with totals
    collections_data TEXT, -- JSON with collection metrics
    settlements_data TEXT, -- JSON with settlement metrics
    balance_data TEXT, -- JSON with balance metrics
    revenue_data TEXT, -- JSON with revenue metrics
    compliance_data TEXT NOT NULL, -- JSON with compliance metrics

    -- Metadata
    generated_by TEXT NOT NULL,
    generated_at DATETIME NOT NULL,
    processing_time_ms INTEGER,
    data_sources TEXT, -- JSON array of source systems
    checksum TEXT, -- SHA256 of report data
    file_path TEXT, -- Path to generated report file

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (accounting_period_id) REFERENCES accounting_periods(id),
    FOREIGN KEY (parent_report_id) REFERENCES financial_reports(id),

    -- Ensure amendment workflow integrity
    CHECK (
        (parent_report_id IS NULL AND version = 1) OR
        (parent_report_id IS NOT NULL AND version > 1)
    )
);

-- Regulatory Filings Table
-- Tracks regulatory compliance filings and submissions
CREATE TABLE regulatory_filings (
    id TEXT PRIMARY KEY,
    filing_type TEXT NOT NULL,
    regulatory_body TEXT NOT NULL,
    accounting_period_id TEXT NOT NULL,
    due_date DATE NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical', 'emergency')),
    is_mandatory BOOLEAN NOT NULL DEFAULT 1,
    threshold_amount REAL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'accepted', 'rejected', 'under_review', 'amended', 'withdrawn')),
    submitted_at DATETIME,
    submitted_by TEXT,
    accepted_at DATETIME,
    rejected_at DATETIME,
    rejection_reason TEXT,
    amendment_reason TEXT,
    file_path TEXT,
    checksum TEXT,
    metadata TEXT, -- JSON string
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (accounting_period_id) REFERENCES accounting_periods(id)
);

-- ===========================================
-- AUDIT AND COMPLIANCE TABLES
-- ===========================================

-- Audit Trail Table (Tamper-evident log)
-- RESTRICTED ACCESS: Only audit service can insert, NO updates/deletes allowed
CREATE TABLE audit_trail (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT,
    session_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata TEXT, -- JSON string
    previous_state TEXT, -- JSON string
    new_state TEXT, -- JSON string
    compliance_flags TEXT, -- JSON array
    retention_period_end DATE NOT NULL,
    checksum TEXT NOT NULL, -- SHA256 of the record
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Ensure tamper-evident properties
    UNIQUE(id, checksum) -- Prevent duplicate entries with same checksum
);

-- Compliance Rules Table
-- Stores business rules for compliance validation
CREATE TABLE compliance_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('threshold', 'pattern', 'requirement', 'validation', 'audit')),
    category TEXT NOT NULL CHECK (category IN ('financial', 'regulatory', 'security', 'operational', 'legal')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    is_active BOOLEAN NOT NULL DEFAULT 1,
    effective_date DATE NOT NULL,
    expiry_date DATE,
    jurisdiction TEXT NOT NULL DEFAULT 'global',
    parameters TEXT NOT NULL, -- JSON string with rule parameters
    validation_logic TEXT NOT NULL,
    remediation_steps TEXT NOT NULL, -- JSON array
    metadata TEXT, -- JSON string
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Regulatory Export History Table
-- Tracks all regulatory report exports
CREATE TABLE regulatory_exports (
    id TEXT PRIMARY KEY,
    export_id TEXT NOT NULL UNIQUE,
    regulatory_body TEXT NOT NULL,
    report_type TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('csv', 'xml', 'json', 'pdf', 'xbrl')),
    record_count INTEGER NOT NULL,
    total_amount REAL NOT NULL,
    checksum TEXT NOT NULL,
    file_path TEXT NOT NULL,
    exported_at DATETIME NOT NULL,
    exported_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'pending_review')),
    validation_errors TEXT, -- JSON array
    metadata TEXT, -- JSON string
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- ODDS MOVEMENT TRACKING TABLES
-- ===========================================

-- Odds Movements Table
-- Tracks betting odds changes over time for financial analysis
CREATE TABLE odds_movements (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    market_id TEXT NOT NULL,
    selection_id TEXT NOT NULL,
    odds_type TEXT NOT NULL CHECK (odds_type IN ('decimal', 'american', 'fractional')),
    previous_odds REAL NOT NULL,
    current_odds REAL NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('increase', 'decrease', 'no_change')),
    movement_percentage REAL NOT NULL,
    timestamp DATETIME NOT NULL,
    source TEXT NOT NULL,
    metadata TEXT, -- JSON string for additional context
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Ensure valid odds progression
    CHECK (previous_odds > 0 AND current_odds > 0),
    CHECK (movement_percentage >= -100 AND movement_percentage <= 100)
);

-- Bet Timing Analysis Table
-- Stores analysis of bet timing relative to odds movements
CREATE TABLE bet_timing_analysis (
    id TEXT PRIMARY KEY,
    bet_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    market_id TEXT NOT NULL,
    selection_id TEXT NOT NULL,
    bet_amount REAL NOT NULL,
    bet_odds REAL NOT NULL,
    bet_timestamp DATETIME NOT NULL,
    timing_category TEXT NOT NULL CHECK (timing_category IN ('early', 'mid', 'late', 'peak')),
    odds_position TEXT NOT NULL CHECK (odds_position IN ('favorable', 'unfavorable', 'neutral')),
    potential_savings REAL NOT NULL DEFAULT 0,
    risk_assessment TEXT NOT NULL CHECK (risk_assessment IN ('low', 'medium', 'high')),
    odds_movements_count INTEGER NOT NULL DEFAULT 0,
    best_available_odds REAL,
    analysis_timestamp DATETIME NOT NULL,
    metadata TEXT, -- JSON string
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(bet_id) -- One analysis per bet
);

-- ===========================================
-- LEDGER INTEGRATION VIEWS
-- ===========================================

-- Daily Transaction Report View
-- Aggregates ledger_entries for daily transaction reporting
CREATE VIEW daily_transaction_report AS
SELECT
    le.entry_date,
    le.account_id,
    a.account_type,
    a.customer_id,
    le.amount,
    le.currency_code,
    le.description,
    le.reference_id,
    le.created_at,
    CASE
        WHEN ABS(le.amount) >= 10000 THEN 'high_value'
        WHEN le.account_type = 'customer' THEN 'customer_transaction'
        ELSE 'standard'
    END as transaction_category
FROM ledger_entries le
JOIN accounts a ON le.account_id = a.id
WHERE le.account_type IN ('customer', 'revenue', 'expense')
AND le.status = 'posted';

-- Monthly P&L View
-- Aggregates for Profit & Loss reporting
CREATE VIEW monthly_profit_loss AS
SELECT
    ap.fiscal_year,
    ap.period_number,
    ap.start_date,
    ap.end_date,
    SUM(CASE WHEN a.account_type = 'revenue' THEN le.amount ELSE 0 END) as gross_revenue,
    SUM(CASE WHEN a.account_type = 'expense' AND le.description LIKE '%bonus%' THEN ABS(le.amount) ELSE 0 END) as bonuses_promos,
    SUM(CASE WHEN a.account_type = 'revenue' THEN le.amount ELSE 0 END) -
    SUM(CASE WHEN a.account_type = 'expense' AND le.description NOT LIKE '%tax%' THEN ABS(le.amount) ELSE 0 END) as net_gaming_revenue,
    SUM(CASE WHEN a.account_type = 'expense' AND le.description LIKE '%tax%' THEN ABS(le.amount) ELSE 0 END) as taxes,
    SUM(CASE WHEN a.account_type = 'revenue' THEN le.amount ELSE 0 END) -
    SUM(CASE WHEN a.account_type = 'expense' THEN ABS(le.amount) ELSE 0 END) as net_profit
FROM ledger_entries le
JOIN accounts a ON le.account_id = a.id
JOIN accounting_periods ap ON le.entry_date BETWEEN ap.start_date AND ap.end_date
WHERE le.status = 'posted'
AND ap.period_type = 'monthly'
GROUP BY ap.id, ap.fiscal_year, ap.period_number, ap.start_date, ap.end_date;

-- Balance Reconciliation View
-- For data integrity checks
CREATE VIEW balance_reconciliation AS
SELECT
    'customer_balances' as source,
    SUM(b.current_balance) as total_amount,
    COUNT(*) as record_count,
    'asset' as balance_type
FROM balances b
WHERE b.is_active = 1
UNION ALL
SELECT
    'ledger_liability' as source,
    -SUM(le.amount) as total_amount,
    COUNT(*) as record_count,
    'liability' as balance_type
FROM ledger_entries le
JOIN accounts a ON le.account_id = a.id
WHERE a.account_type = 'customer'
AND le.status = 'posted';

-- ===========================================
-- ODDS MOVEMENT ANALYSIS VIEWS
-- ===========================================

-- Odds Movement Summary View
-- Aggregates odds movements by event and market
CREATE VIEW odds_movement_summary AS
SELECT
    event_id,
    market_id,
    selection_id,
    COUNT(*) as total_movements,
    AVG(movement_percentage) as avg_movement_percentage,
    MAX(ABS(movement_percentage)) as max_movement_percentage,
    SUM(CASE WHEN ABS(movement_percentage) >= 2.0 THEN 1 ELSE 0 END) as significant_movements,
    MIN(timestamp) as first_movement,
    MAX(timestamp) as last_movement,
    COUNT(DISTINCT DATE(timestamp)) as active_days
FROM odds_movements
GROUP BY event_id, market_id, selection_id;

-- Bet Timing Impact View
-- Correlates bet timing with odds movements
CREATE VIEW bet_timing_impact AS
SELECT
    bta.*,
    oms.total_movements,
    oms.avg_movement_percentage,
    oms.significant_movements,
    CASE
        WHEN bta.timing_category = 'peak' AND ABS(oms.avg_movement_percentage) > 5 THEN 'high_risk'
        WHEN bta.odds_position = 'unfavorable' AND oms.significant_movements > 3 THEN 'high_risk'
        WHEN bta.potential_savings > bta.bet_amount * 0.1 THEN 'opportunity_missed'
        ELSE 'normal'
    END as risk_category
FROM bet_timing_analysis bta
LEFT JOIN odds_movement_summary oms ON
    bta.event_id = oms.event_id AND
    bta.market_id = oms.market_id AND
    bta.selection_id = oms.selection_id;

-- Odds Movement Financial Impact View
-- Calculates revenue impact of odds movements
CREATE VIEW odds_movement_financial_impact AS
SELECT
    om.event_id,
    om.market_id,
    DATE(om.timestamp) as movement_date,
    COUNT(*) as movements_count,
    AVG(om.movement_percentage) as avg_movement,
    SUM(bta.potential_savings) as total_potential_savings,
    SUM(CASE WHEN bta.odds_position = 'favorable' THEN bta.potential_savings ELSE 0 END) as favorable_savings,
    SUM(CASE WHEN bta.odds_position = 'unfavorable' THEN bta.potential_savings ELSE 0 END) as unfavorable_cost,
    COUNT(CASE WHEN bta.risk_assessment = 'high' THEN 1 END) as high_risk_bets
FROM odds_movements om
LEFT JOIN bet_timing_analysis bta ON
    om.event_id = bta.event_id AND
    om.market_id = bta.market_id AND
    om.selection_id = bta.selection_id AND
    DATE(om.timestamp) = DATE(bta.bet_timestamp)
WHERE bta.bet_timestamp > om.timestamp
GROUP BY om.event_id, om.market_id, DATE(om.timestamp);

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

-- Financial Transactions Indexes
CREATE INDEX idx_financial_transactions_period ON financial_transactions(accounting_period_id);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX idx_financial_transactions_status ON financial_transactions(status);
CREATE INDEX idx_financial_transactions_posted_at ON financial_transactions(posted_at);
CREATE INDEX idx_financial_transactions_source ON financial_transactions(source_system, source_transaction_id);

-- Financial Reports Indexes
CREATE INDEX idx_financial_reports_period ON financial_reports(accounting_period_id);
CREATE INDEX idx_financial_reports_type ON financial_reports(report_type);
CREATE INDEX idx_financial_reports_status ON financial_reports(status);
CREATE INDEX idx_financial_reports_version ON financial_reports(id, version);

-- Regulatory Filings Indexes
CREATE INDEX idx_regulatory_filings_due_date ON regulatory_filings(due_date);
CREATE INDEX idx_regulatory_filings_status ON regulatory_filings(status);
CREATE INDEX idx_regulatory_filings_body ON regulatory_filings(regulatory_body);

-- Audit Trail Indexes
CREATE INDEX idx_audit_trail_timestamp ON audit_trail(timestamp);
CREATE INDEX idx_audit_trail_resource ON audit_trail(resource_type, resource_id);
CREATE INDEX idx_audit_trail_event_type ON audit_trail(event_type);
CREATE INDEX idx_audit_trail_severity ON audit_trail(severity);
CREATE INDEX idx_audit_trail_retention ON audit_trail(retention_period_end);

-- Regulatory Exports Indexes
CREATE INDEX idx_regulatory_exports_body ON regulatory_exports(regulatory_body);
CREATE INDEX idx_regulatory_exports_period ON regulatory_exports(period_start, period_end);

-- Odds Movement Indexes
CREATE INDEX idx_odds_movements_event_market ON odds_movements(event_id, market_id);
CREATE INDEX idx_odds_movements_timestamp ON odds_movements(timestamp);
CREATE INDEX idx_odds_movements_selection ON odds_movements(selection_id);
CREATE INDEX idx_odds_movements_movement_type ON odds_movements(movement_type);
CREATE INDEX idx_odds_movements_percentage ON odds_movements(movement_percentage);

-- Bet Timing Analysis Indexes
CREATE INDEX idx_bet_timing_analysis_bet ON bet_timing_analysis(bet_id);
CREATE INDEX idx_bet_timing_analysis_event ON bet_timing_analysis(event_id, market_id);
CREATE INDEX idx_bet_timing_analysis_timing ON bet_timing_analysis(timing_category);
CREATE INDEX idx_bet_timing_analysis_risk ON bet_timing_analysis(risk_assessment);
CREATE INDEX idx_bet_timing_analysis_timestamp ON bet_timing_analysis(bet_timestamp);

-- ===========================================
-- TRIGGERS FOR DATA INTEGRITY AND AUDIT COMPLIANCE
-- ===========================================

-- Update timestamp triggers
CREATE TRIGGER update_financial_transactions_timestamp
AFTER UPDATE ON financial_transactions
BEGIN
    UPDATE financial_transactions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_financial_reports_timestamp
AFTER UPDATE ON financial_reports
BEGIN
    UPDATE financial_reports SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_compliance_rules_timestamp
AFTER UPDATE ON compliance_rules
BEGIN
    UPDATE compliance_rules SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ===========================================
-- AUDIT TRAIL TAMPER-EVIDENT CONTROLS
-- ===========================================

-- CRITICAL: Prevent ANY updates to audit_trail (tamper-evident)
CREATE TRIGGER prevent_audit_trail_updates
BEFORE UPDATE ON audit_trail
BEGIN
    SELECT RAISE(FAIL, 'CRITICAL SECURITY VIOLATION: Audit trail records cannot be modified. Original record ID: ' || OLD.id || ', Timestamp: ' || OLD.timestamp);
END;

-- CRITICAL: Prevent ANY deletes from audit_trail (tamper-evident)
CREATE TRIGGER prevent_audit_trail_deletes
BEFORE DELETE ON audit_trail
BEGIN
    SELECT RAISE(FAIL, 'CRITICAL SECURITY VIOLATION: Audit trail records cannot be deleted. Original record ID: ' || OLD.id || ', Timestamp: ' || OLD.timestamp);
END;

-- Ensure audit trail checksum integrity
CREATE TRIGGER validate_audit_trail_checksum
BEFORE INSERT ON audit_trail
BEGIN
    -- This would validate the checksum in application code
    -- SQLite triggers cannot compute SHA256, so validation happens in service layer
    SELECT CASE
        WHEN NEW.checksum IS NULL OR NEW.checksum = '' THEN
            RAISE(FAIL, 'Audit trail checksum is required')
        END;
END;

-- ===========================================
-- REPORT AMENDMENT WORKFLOW TRIGGERS
-- ===========================================

-- Auto-increment version for report amendments
CREATE TRIGGER increment_report_version
BEFORE INSERT ON financial_reports
WHEN NEW.parent_report_id IS NOT NULL
BEGIN
    SELECT NEW.version = IFNULL(MAX(version), 0) + 1
    FROM financial_reports
    WHERE id = NEW.parent_report_id;
END;

-- Prevent amendments to archived reports
CREATE TRIGGER prevent_amendment_of_archived_reports
BEFORE INSERT ON financial_reports
WHEN NEW.parent_report_id IS NOT NULL
BEGIN
    SELECT CASE
        WHEN EXISTS (
            SELECT 1 FROM financial_reports
            WHERE id = NEW.parent_report_id
            AND status = 'archived'
        ) THEN
            RAISE(FAIL, 'Cannot amend archived reports')
        END;
END;

-- ===========================================
-- FINANCIAL INTEGRITY TRIGGERS
-- ===========================================

-- Ensure double-entry principle for financial transactions
CREATE TRIGGER validate_transaction_balance
BEFORE INSERT ON financial_transactions
BEGIN
    -- This would validate that transactions balance in application code
    -- For now, just ensure required fields are present
    SELECT CASE
        WHEN NEW.amount = 0 THEN
            RAISE(FAIL, 'Transaction amount cannot be zero')
        WHEN NEW.accounting_period_id IS NULL THEN
            RAISE(FAIL, 'Accounting period is required for financial transactions')
        END;
END;

-- Prevent transactions in closed accounting periods
CREATE TRIGGER prevent_transactions_in_closed_periods
BEFORE INSERT ON financial_transactions
WHEN EXISTS (
    SELECT 1 FROM accounting_periods
    WHERE id = NEW.accounting_period_id
    AND is_closed = 1
)
BEGIN
    SELECT RAISE(FAIL, 'Cannot create transactions in closed accounting periods');
END;

-- ===========================================
-- REGULATORY COMPLIANCE TRIGGERS
-- ===========================================

-- Auto-update filing status based on due dates
CREATE TRIGGER update_overdue_filings
AFTER INSERT ON regulatory_filings
WHEN NEW.due_date < DATE('now')
BEGIN
    UPDATE regulatory_filings
    SET status = 'overdue'
    WHERE id = NEW.id AND status = 'pending';
END;

-- Prevent duplicate filings for same period
CREATE TRIGGER prevent_duplicate_filings
BEFORE INSERT ON regulatory_filings
WHEN EXISTS (
    SELECT 1 FROM regulatory_filings
    WHERE filing_type = NEW.filing_type
    AND accounting_period_id = NEW.accounting_period_id
    AND regulatory_body = NEW.regulatory_body
    AND status NOT IN ('rejected', 'withdrawn')
)
BEGIN
    SELECT RAISE(FAIL, 'Duplicate filing exists for this period and regulatory body');
END;
