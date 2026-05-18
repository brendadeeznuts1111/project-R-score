/**
 * 🏢 Fire22 Dashboard - Workspace-Specific Database Types
 * Specialized types for each workspace domain
 */

import type { BaseEntity, AuditableEntity } from './base';
import type {
  Customer,
  Agent,
  Wager,
  Transaction,
  SportEvent,
  BettingMarket,
  BettingLine,
} from './entities';
import type { SportType, BetType, DatabaseStatus, RiskLevel, CustomerTier } from '../../constants';

// === CORE DASHBOARD WORKSPACE ===
export namespace CoreDashboard {
  export interface DashboardConfig extends BaseEntity {
    user_id: string;
    layout: WidgetLayout[];
    theme: string;
    refresh_interval: number;
    auto_refresh: boolean;
    notifications_enabled: boolean;
  }

  export interface Widget extends BaseEntity {
    dashboard_id: string;
    type: 'chart' | 'table' | 'kpi' | 'alert' | 'text' | 'iframe';
    title: string;
    config: WidgetConfig;
    position: WidgetPosition;
    data_source: string;
    refresh_interval: number;
    visible: boolean;
    permissions: string[];
  }

  export interface WidgetConfig {
    query?: string;
    chart_type?: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
    colors?: string[];
    show_legend?: boolean;
    show_grid?: boolean;
    animation?: boolean;
    filters?: Record<string, any>;
    aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';
    time_range?: string;
  }

  export interface WidgetPosition {
    x: number;
    y: number;
    width: number;
    height: number;
    min_width?: number;
    min_height?: number;
    max_width?: number;
    max_height?: number;
  }

  export interface WidgetLayout {
    widget_id: string;
    position: WidgetPosition;
    visible: boolean;
    locked: boolean;
  }

  export interface KPI extends BaseEntity {
    name: string;
    value: number;
    previous_value?: number;
    target?: number;
    unit: string;
    format: 'number' | 'currency' | 'percentage';
    trend: 'up' | 'down' | 'stable';
    change: number;
    change_percentage: number;
    color: string;
    icon?: string;
    description?: string;
  }
}

// === SPORTS BETTING WORKSPACE ===
export namespace SportsBetting {
  export interface OddsMovement extends BaseEntity {
    line_id: string;
    old_odds: number;
    new_odds: number;
    movement_type: 'increase' | 'decrease';
    movement_amount: number;
    reason?: string;
    automated: boolean;
    triggered_by?: string;
  }

  export interface BettingLimit extends BaseEntity {
    entity_type: 'customer' | 'agent' | 'sport' | 'league' | 'event';
    entity_id: string;
    sport?: SportType;
    bet_type?: BetType;
    min_bet: number;
    max_bet: number;
    max_payout: number;
    daily_limit?: number;
    weekly_limit?: number;
    monthly_limit?: number;
    active: boolean;
    override_reason?: string;
  }

  export interface RiskExposure extends BaseEntity {
    event_id: string;
    sport: SportType;
    market_type: BetType;
    side: string;
    total_handle: number;
    total_liability: number;
    max_liability: number;
    risk_percentage: number;
    risk_level: RiskLevel;
    needs_attention: boolean;
    recommendations: string[];
  }

  export interface LiveOdds extends BaseEntity {
    event_id: string;
    market_id: string;
    line_id: string;
    odds: number;
    american_odds: number;
    decimal_odds: number;
    implied_probability: number;
    timestamp: string;
    source: string;
    confidence_score: number;
    volume_indicator: 'light' | 'moderate' | 'heavy';
  }

  export interface PropBet extends BaseEntity {
    event_id: string;
    player_name?: string;
    team_name?: string;
    description: string;
    category: string;
    subcategory?: string;
    over_under?: number;
    yes_no?: boolean;
    options: PropBetOption[];
    min_bet: number;
    max_bet: number;
    status: DatabaseStatus;
    settlement_criteria: string;
    data_source?: string;
  }

  export interface PropBetOption {
    id: string;
    description: string;
    odds: number;
    selection: string;
    status: DatabaseStatus;
  }
}

// === TELEGRAM INTEGRATION WORKSPACE ===
export namespace TelegramIntegration {
  export interface TelegramUser extends BaseEntity {
    telegram_id: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
    is_bot: boolean;
    fire22_customer_id?: string;
    fire22_agent_id?: string;
    notifications_enabled: boolean;
    subscription_level: 'basic' | 'premium' | 'vip';
    last_interaction: string;
  }

  export interface TelegramMessage extends BaseEntity {
    telegram_user_id: string;
    message_id: string;
    chat_id: string;
    message_type: 'text' | 'command' | 'callback' | 'inline_query';
    content: string;
    command?: string;
    parameters?: string[];
    direction: 'inbound' | 'outbound';
    processed: boolean;
    response_sent: boolean;
    error_message?: string;
  }

  export interface TelegramBot extends BaseEntity {
    bot_token: string;
    bot_username: string;
    bot_name: string;
    active: boolean;
    webhook_url?: string;
    supported_languages: string[];
    features: string[];
    rate_limit: number;
    max_concurrent_users: number;
    department?: 'customer_service' | 'vip' | 'technical' | 'financial';
  }

  export interface QueueItem extends BaseEntity {
    customer_id: string;
    agent_id?: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    category: 'support' | 'betting' | 'financial' | 'technical' | 'complaint';
    subject: string;
    description: string;
    status: 'waiting' | 'assigned' | 'in_progress' | 'resolved' | 'escalated';
    estimated_wait_time?: number;
    assigned_at?: string;
    resolved_at?: string;
    satisfaction_rating?: number;
    tags: string[];
    metadata?: Record<string, any>;
  }

  export interface P2PTransaction extends BaseEntity {
    sender_customer_id: string;
    receiver_customer_id: string;
    amount: number;
    currency: string;
    transaction_fee: number;
    exchange_rate?: number;
    original_amount?: number;
    original_currency?: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    completion_time?: string;
    failure_reason?: string;
    reference_number: string;
    notes?: string;
  }
}

// === API CLIENT WORKSPACE ===
export namespace APIClient {
  export interface APIKey extends BaseEntity {
    key_hash: string;
    name: string;
    description?: string;
    owner_id: string;
    owner_type: 'customer' | 'agent' | 'admin' | 'system';
    permissions: string[];
    rate_limit: number;
    daily_limit?: number;
    monthly_limit?: number;
    ip_whitelist?: string[];
    active: boolean;
    expires_at?: string;
    last_used?: string;
    usage_count: number;
  }

  export interface APIRequest extends BaseEntity {
    api_key_id?: string;
    endpoint: string;
    method: string;
    ip_address: string;
    user_agent: string;
    request_headers: Record<string, string>;
    request_body?: string;
    response_status: number;
    response_headers: Record<string, string>;
    response_body?: string;
    response_time: number;
    user_id?: string;
    error_message?: string;
    rate_limited: boolean;
  }

  export interface APIEndpoint extends BaseEntity {
    path: string;
    method: string;
    version: string;
    description: string;
    required_permissions: string[];
    rate_limit: number;
    deprecated: boolean;
    deprecation_date?: string;
    replacement_endpoint?: string;
    documentation_url?: string;
    response_schema?: Record<string, any>;
    request_schema?: Record<string, any>;
  }

  export interface Webhook extends BaseEntity {
    url: string;
    name: string;
    description?: string;
    events: string[];
    active: boolean;
    secret_key: string;
    retry_count: number;
    timeout: number;
    last_triggered?: string;
    last_success?: string;
    last_failure?: string;
    failure_count: number;
    headers?: Record<string, string>;
  }
}

// === SECURITY REGISTRY WORKSPACE ===
export namespace SecurityRegistry {
  export interface SecurityScan extends BaseEntity {
    target_type: 'package' | 'endpoint' | 'user' | 'transaction';
    target_id: string;
    scan_type: 'vulnerability' | 'malware' | 'compliance' | 'policy';
    scanner: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    started_at?: string;
    completed_at?: string;
    duration?: number;
    results: SecurityScanResult[];
    risk_score: number;
    risk_level: RiskLevel;
    remediation_required: boolean;
  }

  export interface SecurityScanResult {
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    rule_id: string;
    title: string;
    description: string;
    recommendation?: string;
    file_path?: string;
    line_number?: number;
    evidence?: string;
    false_positive: boolean;
    suppressed: boolean;
    suppressed_reason?: string;
  }

  export interface ThreatIntelligence extends BaseEntity {
    indicator_type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'user_agent';
    indicator_value: string;
    threat_type: 'malware' | 'phishing' | 'fraud' | 'bot' | 'spam' | 'suspicious';
    confidence_level: number;
    source: string;
    first_seen: string;
    last_seen: string;
    active: boolean;
    notes?: string;
    tags: string[];
  }

  export interface ComplianceRule extends BaseEntity {
    rule_id: string;
    name: string;
    description: string;
    regulation: 'GDPR' | 'PCI_DSS' | 'KYC' | 'AML' | 'SOX' | 'CUSTOM';
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    automated: boolean;
    conditions: Record<string, any>;
    actions: string[];
    active: boolean;
    last_evaluated?: string;
    evaluation_frequency: string;
  }

  export interface SecurityIncident extends BaseEntity {
    incident_id: string;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'security_breach' | 'fraud_attempt' | 'policy_violation' | 'system_compromise';
    status: 'open' | 'investigating' | 'resolved' | 'closed';
    assigned_to?: string;
    affected_systems: string[];
    affected_users: string[];
    detection_method: 'automated' | 'manual' | 'reported';
    first_detected: string;
    last_updated: string;
    resolution?: string;
    lessons_learned?: string;
  }
}

// === PATTERN SYSTEM WORKSPACE ===
export namespace PatternSystem {
  export interface Pattern extends BaseEntity {
    pattern_id: string;
    name: string;
    type:
      | 'LOADER'
      | 'STYLER'
      | 'TABULAR'
      | 'SECURE'
      | 'TIMING'
      | 'BUILDER'
      | 'VERSIONER'
      | 'SHELL'
      | 'BUNX'
      | 'INTERACTIVE'
      | 'STREAM'
      | 'FILESYSTEM'
      | 'UTILITIES';
    category: string;
    description: string;
    implementation: string;
    dependencies: string[];
    connected_patterns: string[];
    usage_count: number;
    performance_metrics: PatternMetrics;
    active: boolean;
    deprecated: boolean;
    version: string;
  }

  export interface PatternMetrics {
    execution_time_avg: number;
    execution_time_max: number;
    memory_usage_avg: number;
    memory_usage_max: number;
    success_rate: number;
    error_rate: number;
    last_used: string;
    usage_trend: 'increasing' | 'decreasing' | 'stable';
  }

  export interface PatternConnection extends BaseEntity {
    source_pattern_id: string;
    target_pattern_id: string;
    connection_type: 'uses' | 'extends' | 'implements' | 'depends_on';
    weight: number;
    active: boolean;
    auto_discovered: boolean;
    confidence_score: number;
  }

  export interface PatternExecution extends BaseEntity {
    pattern_id: string;
    execution_context: string;
    input_parameters: Record<string, any>;
    output_result?: Record<string, any>;
    execution_time: number;
    memory_used: number;
    success: boolean;
    error_message?: string;
    stack_trace?: string;
  }
}

// === BUILD SYSTEM WORKSPACE ===
export namespace BuildSystem {
  export interface BuildJob extends BaseEntity {
    job_id: string;
    trigger_type: 'manual' | 'scheduled' | 'webhook' | 'dependency';
    trigger_source?: string;
    branch: string;
    commit_hash: string;
    commit_message: string;
    author: string;
    status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
    started_at?: string;
    completed_at?: string;
    duration?: number;
    build_steps: BuildStep[];
    artifacts: BuildArtifact[];
    logs: string;
    environment: string;
  }

  export interface BuildStep {
    step_id: string;
    name: string;
    command: string;
    status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
    started_at?: string;
    completed_at?: string;
    duration?: number;
    output: string;
    exit_code?: number;
  }

  export interface BuildArtifact {
    artifact_id: string;
    name: string;
    type: 'binary' | 'package' | 'report' | 'log' | 'coverage';
    size: number;
    path: string;
    checksum: string;
    public: boolean;
    retention_days: number;
  }

  export interface Deployment extends BaseEntity {
    deployment_id: string;
    build_job_id: string;
    environment: 'development' | 'staging' | 'production';
    strategy: 'rolling' | 'blue_green' | 'canary' | 'recreate';
    status: 'pending' | 'deploying' | 'success' | 'failed' | 'rolled_back';
    started_at?: string;
    completed_at?: string;
    duration?: number;
    deployed_by: string;
    approval_required: boolean;
    approved_by?: string;
    approved_at?: string;
    rollback_deployment_id?: string;
  }
}

// Export all workspace types
export {
  CoreDashboard,
  SportsBetting,
  TelegramIntegration,
  APIClient,
  SecurityRegistry,
  PatternSystem,
  BuildSystem,
};
