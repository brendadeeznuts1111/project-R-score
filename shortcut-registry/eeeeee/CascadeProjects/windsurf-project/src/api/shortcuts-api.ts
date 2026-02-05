/**
 * WindSurf Shortcuts API Client
 * 
 * Centralized API client for shortcut actions and ShortcutRegistry endpoints.
 * Provides type-safe functions to call all API endpoints with error handling.
 */

const API_BASE_URL = typeof window !== 'undefined' ? '' : 'http://localhost:3227';

/**
 * API Response wrapper
 */
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  [key: string]: any;
}

/**
 * Dashboard refresh response
 */
export interface DashboardRefreshResponse {
  uptime: number;
  requestCount: number;
  activeConnections: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  timestamp: string;
}

/**
 * Risk analysis response
 */
export interface RiskAnalysisResponse {
  overallRisk: string;
  kycStats: any;
  timestamp: string;
}

/**
 * Financial process response
 */
export interface FinancialProcessResponse {
  success: boolean;
  decision?: any;
  error?: string;
}

/**
 * KYC validation response
 */
export interface KYCValidationResponse {
  success: boolean;
  user?: any;
  validated?: boolean;
  error?: string;
}

/**
 * Pool rebalancing response
 */
export interface PoolRebalancingResponse {
  success: boolean;
  report?: any;
  error?: string;
}

/**
 * Generic API call helper
 */
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<APIResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      ...data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

/**
 * Dashboard Actions
 */
export const dashboardAPI = {
  /**
   * Refresh dashboard data
   */
  async refresh(): Promise<APIResponse<DashboardRefreshResponse>> {
    return apiCall<DashboardRefreshResponse>('/api/actions/dashboard/refresh', {
      method: 'POST',
    });
  },

  /**
   * Export dashboard data
   */
  async export(format: 'json' | 'csv' = 'json'): Promise<APIResponse<any>> {
    return apiCall(`/api/actions/dashboard/export?format=${format}`, {
      method: 'POST',
    });
  },

  /**
   * Get dashboard data
   */
  async getData(): Promise<APIResponse<any>> {
    return apiCall('/api/dashboard/data', {
      method: 'GET',
    });
  },

  /**
   * Get dashboard metrics
   */
  async getMetrics(): Promise<APIResponse<any>> {
    return apiCall('/api/dashboard/metrics', {
      method: 'GET',
    });
  },

  /**
   * Get dashboard status
   */
  async getStatus(): Promise<APIResponse<any>> {
    return apiCall('/api/dashboard/status', {
      method: 'GET',
    });
  },
};

/**
 * Risk Analysis Actions
 */
export const riskAPI = {
  /**
   * Run risk analysis
   */
  async analyze(data?: any): Promise<APIResponse<RiskAnalysisResponse>> {
    return apiCall<RiskAnalysisResponse>('/api/actions/risk/analyze', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },
};

/**
 * Admin Actions
 */
export const adminAPI = {
  /**
   * Get admin configuration
   */
  async getConfig(): Promise<APIResponse<any>> {
    return apiCall('/api/actions/admin/config', {
      method: 'GET',
    });
  },
};

/**
 * Financial Actions
 */
export const financialAPI = {
  /**
   * Process financial transaction
   */
  async process(invoice: any): Promise<APIResponse<FinancialProcessResponse>> {
    return apiCall<FinancialProcessResponse>('/api/actions/financial/process', {
      method: 'POST',
      body: JSON.stringify(invoice),
    });
  },
};

/**
 * Compliance Actions
 */
export const complianceAPI = {
  /**
   * Validate KYC
   */
  async validateKYC(userId: string): Promise<APIResponse<KYCValidationResponse>> {
    return apiCall<KYCValidationResponse>('/api/actions/compliance/kyc/validate', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  /**
   * Detect fraud
   */
  async detectFraud(data: any): Promise<APIResponse<any>> {
    return apiCall('/api/actions/compliance/fraud/detect', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

/**
 * Pool Actions
 */
export const poolAPI = {
  /**
   * Rebalance pools
   */
  async rebalance(): Promise<APIResponse<PoolRebalancingResponse>> {
    return apiCall<PoolRebalancingResponse>('/api/actions/pools/rebalance', {
      method: 'POST',
    });
  },
};

/**
 * Monitoring Actions
 */
export const monitoringAPI = {
  /**
   * Start monitoring
   */
  async start(): Promise<APIResponse<any>> {
    return apiCall('/api/actions/monitoring/start', {
      method: 'POST',
    });
  },
};

/**
 * ShortcutRegistry API
 */
export const shortcutsAPI = {
  /**
   * Get all shortcuts
   */
  async getAll(): Promise<APIResponse<any[]>> {
    return apiCall<any[]>('/api/shortcuts', {
      method: 'GET',
    });
  },

  /**
   * Get shortcut by ID
   */
  async getById(id: string): Promise<APIResponse<any>> {
    return apiCall(`/api/shortcuts/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Register new shortcut
   */
  async register(shortcut: any): Promise<APIResponse<any>> {
    return apiCall('/api/shortcuts', {
      method: 'POST',
      body: JSON.stringify(shortcut),
    });
  },

  /**
   * Delete shortcut
   */
  async delete(id: string): Promise<APIResponse<any>> {
    return apiCall(`/api/shortcuts/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Profiles API
 */
export const profilesAPI = {
  /**
   * Get all profiles
   */
  async getAll(): Promise<APIResponse<any[]>> {
    return apiCall<any[]>('/api/profiles', {
      method: 'GET',
    });
  },

  /**
   * Get active profile
   */
  async getActive(): Promise<APIResponse<any>> {
    return apiCall('/api/profiles/active', {
      method: 'GET',
    });
  },

  /**
   * Create new profile
   */
  async create(name: string, description: string, basedOn?: string): Promise<APIResponse<any>> {
    return apiCall('/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ name, description, basedOn }),
    });
  },

  /**
   * Set active profile
   */
  async setActive(id: string): Promise<APIResponse<any>> {
    return apiCall(`/api/profiles/${id}/active`, {
      method: 'PUT',
    });
  },
};

/**
 * Conflicts API
 */
export const conflictsAPI = {
  /**
   * Detect conflicts
   */
  async detect(profileId?: string): Promise<APIResponse<any[]>> {
    const url = profileId 
      ? `/api/conflicts?profileId=${profileId}`
      : '/api/conflicts';
    return apiCall<any[]>(url, {
      method: 'GET',
    });
  },
};

/**
 * Statistics API
 */
export const statsAPI = {
  /**
   * Get usage statistics
   */
  async getUsage(days: number = 30): Promise<APIResponse<any>> {
    return apiCall(`/api/stats/usage?days=${days}`, {
      method: 'GET',
    });
  },
};

/**
 * Nexus API
 */
export const nexusAPI = {
  dashboard: {
    get: () => apiCall('/api/nexus/dashboard'),
    refresh: () => apiCall('/api/nexus/dashboard/refresh', { method: 'POST' }),
    export: (format: string = 'json') => apiCall(`/api/nexus/dashboard/export?format=${format}`, { method: 'POST' }),
    getDevice: (deviceId: string) => apiCall(`/api/nexus/dashboard/device/${deviceId}`),
    getMetrics: () => apiCall('/api/nexus/dashboard/metrics'),
  },
  metrics: {
    advanced: () => apiCall('/api/nexus/metrics/advanced'),
    packages: () => apiCall('/api/nexus/metrics/packages'),
    typescript: () => apiCall('/api/nexus/metrics/typescript'),
    security: () => apiCall('/api/nexus/metrics/security'),
    comprehensive: () => apiCall('/api/nexus/metrics/comprehensive'),
  },
  telemetry: {
    start: (deviceId: string, outputPath: string) => apiCall('/api/nexus/telemetry/start', {
      method: 'POST',
      body: JSON.stringify({ deviceId, outputPath })
    }),
    stop: (deviceId: string) => apiCall('/api/nexus/telemetry/stop', {
      method: 'POST',
      body: JSON.stringify({ deviceId })
    }),
    status: (deviceId: string) => apiCall(`/api/nexus/telemetry/status/${deviceId}`),
    metrics: (deviceId: string) => apiCall(`/api/nexus/telemetry/metrics/${deviceId}`),
  },
  vault: {
    getProfiles: () => apiCall('/api/nexus/vault/profiles'),
    getProfile: (deviceId: string) => apiCall(`/api/nexus/vault/profile/${deviceId}`),
    saveProfile: (profile: any) => apiCall('/api/nexus/vault/profile', {
      method: 'POST',
      body: JSON.stringify(profile)
    }),
    burnProfile: (deviceId: string) => apiCall(`/api/nexus/vault/profile/${deviceId}/burn`, {
      method: 'POST'
    }),
    search: (query: string) => apiCall(`/api/nexus/vault/search?q=${encodeURIComponent(query)}`),
    getStats: () => apiCall('/api/nexus/vault/stats'),
    verify: (deviceId: string) => apiCall(`/api/nexus/vault/verify/${deviceId}`, {
      method: 'POST'
    }),
  },
  profile: {
    create: (deviceId: string, simData: any, options?: any) => apiCall('/api/nexus/profile/create', {
      method: 'POST',
      body: JSON.stringify({ deviceId, simData, options })
    }),
    provision: (deviceId: string) => apiCall('/api/nexus/profile/provision', {
      method: 'POST',
      body: JSON.stringify({ deviceId })
    }),
    getOptions: () => apiCall('/api/nexus/profile/options'),
  },
};

/**
 * Main API export
 */
export default {
  dashboard: dashboardAPI,
  risk: riskAPI,
  admin: adminAPI,
  financial: financialAPI,
  compliance: complianceAPI,
  pool: poolAPI,
  monitoring: monitoringAPI,
  shortcuts: shortcutsAPI,
  profiles: profilesAPI,
  conflicts: conflictsAPI,
  stats: statsAPI,
  nexus: nexusAPI,
};
