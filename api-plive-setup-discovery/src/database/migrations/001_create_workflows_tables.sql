-- Create workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY,
    workflow_id VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'cancelled')),
    current_step VARCHAR(100) NOT NULL DEFAULT 'initial',
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    data JSONB NOT NULL DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    total_steps INTEGER NOT NULL DEFAULT 1,
    current_step_index INTEGER NOT NULL DEFAULT 0,
    estimated_completion TIMESTAMP WITH TIME ZONE,

    -- Indexes for performance
    INDEX idx_workflows_status (status),
    INDEX idx_workflows_workflow_id (workflow_id),
    INDEX idx_workflows_created_by (created_by),
    INDEX idx_workflows_created_at (created_at),
    INDEX idx_workflows_priority (priority),

    -- Indexes for betting platform specific queries
    INDEX idx_workflows_betting_category ((data->'betting_platform_data'->>'content_type')),
    INDEX idx_workflows_jurisdiction ((data->'betting_platform_data'->>'jurisdiction')),
    INDEX idx_workflows_financial_impact ((data->'betting_platform_data'->>'financial_impact')),
    INDEX idx_workflows_risk_level ((data->'betting_platform_data'->>'risk_level')),

    -- GIN indexes for JSONB queries
    INDEX idx_workflows_data_gin (data jsonb_path_ops),
    INDEX idx_workflows_metadata_gin (metadata jsonb_path_ops)
);

-- Create workflow approvals table
CREATE TABLE IF NOT EXISTS workflow_approvals (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    step_id VARCHAR(100) NOT NULL,
    approver VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('approved', 'rejected', 'pending')),
    comments TEXT,
    decided_at TIMESTAMP WITH TIME ZONE,
    approval_type VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (approval_type IN ('standard', 'emergency', 'conditional')),
    conditions JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Indexes
    INDEX idx_workflow_approvals_workflow_id (workflow_id),
    INDEX idx_workflow_approvals_approver (approver),
    INDEX idx_workflow_approvals_status (status),
    INDEX idx_workflow_approvals_decided_at (decided_at)
);

-- Create workflow history table
CREATE TABLE IF NOT EXISTS workflow_history (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    details JSONB DEFAULT '{}',
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    old_step VARCHAR(100),
    new_step VARCHAR(100),

    -- Indexes
    INDEX idx_workflow_history_workflow_id (workflow_id),
    INDEX idx_workflow_history_action (action),
    INDEX idx_workflow_history_actor (actor),
    INDEX idx_workflow_history_timestamp (timestamp)
);

-- Create workflow analytics table
CREATE TABLE IF NOT EXISTS workflow_analytics (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',

    -- Indexes
    INDEX idx_workflow_analytics_workflow_id (workflow_id),
    INDEX idx_workflow_analytics_metric_name (metric_name),
    INDEX idx_workflow_analytics_recorded_at (recorded_at)
);

-- Create users table (basic user management)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Indexes
    INDEX idx_users_username (username),
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_is_active (is_active)
);

-- Create API keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT '[]',
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Indexes
    INDEX idx_api_keys_name (name),
    INDEX idx_api_keys_created_by (created_by),
    INDEX idx_api_keys_is_active (is_active),
    INDEX idx_api_keys_expires_at (expires_at)
);

-- Create rate limiting table (for persistent rate limiting)
CREATE TABLE IF NOT EXISTS rate_limit_records (
    id UUID PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL, -- user ID or IP address
    type VARCHAR(20) NOT NULL, -- 'user' or 'ip' or 'api_key'
    requests INTEGER NOT NULL DEFAULT 0,
    reset_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Indexes
    INDEX idx_rate_limit_identifier (identifier),
    INDEX idx_rate_limit_type (type),
    INDEX idx_rate_limit_reset_time (reset_time),

    UNIQUE(identifier, type)
);

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    api_key_id UUID REFERENCES api_keys(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    method VARCHAR(10),
    url TEXT,
    ip_address INET,
    user_agent TEXT,
    request_data JSONB,
    response_status INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Indexes
    INDEX idx_audit_logs_user_id (user_id),
    INDEX idx_audit_logs_api_key_id (api_key_id),
    INDEX idx_audit_logs_action (action),
    INDEX idx_audit_logs_resource (resource),
    INDEX idx_audit_logs_timestamp (timestamp)
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for workflow status validation
CREATE OR REPLACE FUNCTION validate_workflow_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Add status transition validation logic here if needed
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for status validation
CREATE TRIGGER validate_workflow_status
    BEFORE UPDATE OF status ON workflows
    FOR EACH ROW EXECUTE FUNCTION validate_workflow_status_transition();
