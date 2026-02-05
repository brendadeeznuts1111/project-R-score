/**
 * Agent Configuration Schema Definition
 * Explicit TypeScript interfaces for type safety across validator scripts
 */

export interface AgentDeploymentConfig {
  strategy: string;
  environment: string;
  rollback_enabled: boolean;
  health_checks: Array<{
    type: string;
    endpoint?: string;
    interval: number;
    timeout: number;
  }>;
  timeout: number;
  retries: number;
}

export interface AgentMonitoringConfig {
  level: string;
  metrics: string[];
  alerts: Array<{
    type: string;
    severity: string;
  }>;
}

export interface AgentSecurityConfig {
  level: string;
  scanning: string[];
  access: string[];
}

export interface AgentPerformanceConfig {
  targets: Array<{
    metric: string;
    target: number;
  }>;
}

export interface AgentConfiguration {
  id: string;
  name: string;
  type: string;
  version?: string;
  description?: string;
  owner?: string;
  gpg_required?: boolean;
  deployment?: AgentDeploymentConfig;
  monitoring?: AgentMonitoringConfig;
  security?: AgentSecurityConfig;
  performance?: AgentPerformanceConfig;
}

export interface AgentsYamlConfig {
  agents: {
    deployment_agents?: Record<string, AgentConfiguration>;
    security_agents?: Record<string, AgentConfiguration>;
    monitoring_agents?: Record<string, AgentConfiguration>;
    maintenance_agents?: Record<string, AgentConfiguration>;
    [key: string]: Record<string, AgentConfiguration> | undefined;
  };
}

export interface AgentMetadataValidation {
  agent_id: string;
  agent_name: string;
  agent_type: string;
  metadata_compliant: boolean;
  pr_title_suggestions: string[];
  validation_errors: string[];
  recommendations: string[];
}

export interface ValidationResult {
  valid: boolean;
  domain: string;
  type: string;
  scope: string;
  meta: string[];
  ref: string[];
  department: string;
  description: string;
  errors: string[];
  warnings: string[];
}

export interface PRTitleValidationResult {
  valid: boolean;
  suggestions: string[];
  validation?: ValidationResult;
}

export interface ComplianceReportOptions {
  outputPath?: string;
  format?: 'markdown' | 'json' | 'text';
  includeSuggestions?: boolean;
  includeStatistics?: boolean;
}

export interface IssueTrackerConfig {
  type: 'github' | 'jira' | 'linear' | 'mock';
  baseUrl?: string;
  token?: string;
  project?: string;
}

export interface AgentValidatorConfig {
  configPath?: string;
  issueTracker?: IssueTrackerConfig;
  output?: {
    format?: 'text' | 'json';
    color?: boolean;
  };
}
