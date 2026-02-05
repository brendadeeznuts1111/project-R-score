// Database types for workflows
export interface WorkflowRecord {
  id: string;
  workflow_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  current_step: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
  data: any;
  metadata?: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  total_steps: number;
  current_step_index: number;
  estimated_completion?: Date;
}

export interface WorkflowApprovalRecord {
  id: string;
  workflow_id: string;
  step_id: string;
  approver: string;
  status: 'approved' | 'rejected' | 'pending';
  comments?: string;
  decided_at?: Date;
  approval_type: 'standard' | 'emergency' | 'conditional';
  conditions?: string[];
  metadata?: any;
}

export interface WorkflowHistoryRecord {
  id: string;
  workflow_id: string;
  action: 'created' | 'started' | 'approved' | 'rejected' | 'cancelled' | 'escalated' | 'delegated' | 'completed';
  actor: string;
  timestamp: Date;
  details?: any;
  old_status?: string;
  new_status?: string;
  old_step?: string;
  new_step?: string;
}

export interface WorkflowAnalyticsRecord {
  id: string;
  workflow_id: string;
  metric_name: string;
  metric_value: number;
  recorded_at: Date;
  metadata?: any;
}

export interface WorkflowFilter {
  status?: string;
  workflow_id?: string;
  priority?: string;
  created_by?: string;
  start_date?: Date;
  end_date?: Date;
  assignee?: string;
  betting_category?: string;
  risk_level?: string;
  financial_impact_min?: number;
  financial_impact_max?: number;
  urgency?: string;
}

export interface WorkflowQueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: WorkflowFilter;
}

// Betting platform specific types
export interface BettingWorkflowData {
  betting_platform_data?: {
    content_type?: string;
    jurisdiction?: string;
    financial_impact?: number;
    line_id?: string;
    event_name?: string;
    old_odds?: string;
    new_odds?: string;
    market_type?: string;
    sport?: string;
    league?: string;
    risk_level?: 'low' | 'medium' | 'high';
    trading_team_notified?: boolean;
    content_id?: string;
  };
}

// Extended workflow record with betting data
export interface ExtendedWorkflowRecord extends WorkflowRecord, BettingWorkflowData {}
