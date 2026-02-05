// duoplus/config.ts
export const DUOPLUS_CONFIG = {
  baseUrl: 'https://api.duoplus.net/v1',
  endpoints: {
    cloudPhones: '/cloud-phones',
    cloudNumbers: '/cloud-numbers',
    rpaTasks: '/rpa-tasks',
    rpaWorkflows: '/rpa-workflow-management',
    files: '/cloud-drive/files',
    batch: '/batch-operations',
    teams: '/teams',
    sms: '/sms',
    bindings: '/bindings'
  },
  
  // From their update log: Optimized Android 10, 11, 12B for anti-detection
  supportedAndroidVersions: ['10', '11', '12B'],
  
  // RPA modes
  rpaModes: {
    accessibility: 'accessibility', // New: More precise UI element recognition
    legacy: 'legacy'
  },
  
  // Pricing tiers based on features
  tiers: {
    basic: ['cloud-phone', 'single-proxy'],
    professional: ['cloud-phone', 'cloud-number', 'batch-ops', 'rpa-templates'],
    enterprise: ['cloud-phone', 'cloud-number', 'batch-ops', 'rpa-api', 'team-collaboration']
  },
  
  // API rate limits from update log
  rateLimits: {
    createRpaTask: 100, // requests per minute
    listWorkflows: 1000, // requests per minute
    batchOperations: 1, // batch per 5 seconds
    phoneProvisioning: 10 // phones per minute
  }
};

export interface DuoPlusCloudPhone {
  id: string;
  deviceId: string;
  androidVersion: '10' | '11' | '12B';
  status: 'active' | 'pending' | 'expired';
  expiry: Date;
  proxy?: {
    type: 'residential' | 'datacenter' | 'mobile';
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
  developerTools: {
    dumpVisible: boolean; // Toggle via API
  };
  teamId?: string;
  region: string;
}

export interface DuoPlusCloudNumber {
  id: string;
  phoneNumber: string;
  country: string;
  type: 'VOIP' | 'Non-VOIP';
  status: 'active';
  boundTo: string | null; // Cloud phone ID
  isolation: {
    deviceFingerprint: string;
    ipIsolation: boolean;
  };
}

export interface SMSMessage {
  from: string;
  content: string;
  timestamp: Date;
  type: 'verification' | 'promotional' | 'standard';
}

export interface RpaTask {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  workflow: string;
  phoneId: string;
}

export interface RpaWorkflow {
  workflowId: string;
  taskId: string;
  phoneId: string;
  status: string;
  progress: number;
  logs: string[];
  createdAt: Date;
  completedAt?: Date;
}

export interface RpaTemplate {
  name: string;
  description: string;
  parameters: Record<string, string>;
  riskLevel: 'low' | 'medium' | 'high';
  antiDetection?: boolean;
}

export interface BatchOperation {
  batchId: string;
  status: string;
  total: number;
  succeeded: number;
  failed: number;
}

export interface TeamMember {
  id: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  joinedAt: Date;
}

export interface AgentConfig {
  androidVersion: '10' | '11' | '12B';
  region: string;
  proxy?: {
    type: 'residential' | 'datacenter' | 'mobile';
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
  phoneCountry: string;
  phoneType: 'VOIP' | 'Non-VOIP';
  warmupDays: number;
  platform: 'tiktok' | 'reddit' | 'instagram' | 'twitter';
  platformSpecificSettings?: Record<string, any>;
  autoRenew: boolean;
  teamId?: string;
  warmingParams?: Record<string, any>;
}
