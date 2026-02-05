export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
  metadata?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp?: string;
  };
}

export interface ErrorResponse extends ApiResponse<null> {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WorkflowResponse {
  id: string;
  workflowId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  currentStep: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  data: any;
  progress: number;
  estimatedCompletion?: string | null;
  approvals: Approval[];
  metadata?: any;
}

export interface Approval {
  stepId: string;
  approver: string;
  status: 'approved' | 'rejected' | 'pending';
  comments?: string;
  decidedAt?: string;
}

export interface CreateWorkflowRequest {
  workflowType: string;
  data: any;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface BulkOperationResult {
  successful: number;
  failed: number;
  total: number;
}

export interface SuccessResponse extends ApiResponse<null> {
  success: true;
  data: null;
}

export interface BulkOperationResult {
  successful: number;
  failed: number;
  total: number;
  errors?: string[];
}

export interface WorkflowAnalytics {
  totalTime: number;
  averageApprovalTime: number;
  approvalRate: number;
  rejectionRate: number;
  escalationCount: number;
  timeline: Array<{
    step: string;
    timestamp: string;
    duration: number;
    actor: string;
  }>;
}

export interface WorkflowTimeline {
  events: Array<{
    id: string;
    type: 'created' | 'approved' | 'rejected' | 'escalated' | 'delegated' | 'completed';
    timestamp: string;
    actor: string;
    comments?: string;
    metadata?: any;
  }>;
}

// Placeholder interfaces for workflow management
export interface WorkflowInstance {
  id: string;
  workflowId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  currentStep: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  data: any;
  approvals: Map<string, any>;
  currentStepIndex?: number;
}

export interface WorkflowFilters {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  priority?: string;
  startDate?: Date;
  endDate?: Date;
  assignee?: string;
  bettingCategory?: string;
  riskLevel?: string;
  financialImpactMin?: number;
  financialImpactMax?: number;
  urgency?: string;
}

export interface WorkflowResult {
  items: WorkflowInstance[];
  total: number;
}
