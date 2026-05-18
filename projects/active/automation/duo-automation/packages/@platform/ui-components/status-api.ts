/**
 * 🌐 Status System API Client
 * TypeScript client for the 18-endpoint status system with full CORS support
 */

export interface StatusSystemConfig {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  apiKey?: string;
}

export interface StatusEndpoint {
  id: string;
  category: 'status' | 'api' | 'subscription';
  endpoint: string;
  method: string;
  status: 'active' | 'inactive' | 'error';
  responseTime: number;
  uptime: number;
  lastChecked: string;
}

export interface Subscription {
  id: string;
  type: 'webhook' | 'email' | 'slack' | 'discord' | 'teams' | 'pagerduty' | 'native';
  target: string;
  events: string[];
  status: 'active' | 'paused' | 'inactive';
  createdAt: string;
  updatedAt: string;
  deliveryStats: {
    totalSent: number;
    successRate: number;
    lastDelivery: string;
    lastFailure: string;
  };
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'down';
  uptime: number;
  lastUpdate: string;
  endpoints: {
    total: number;
    active: number;
    inactive: number;
    error: number;
  };
  subscriptions: {
    total: number;
    active: number;
    paused: number;
    inactive: number;
  };
}

export interface SystemMetrics {
  totalRequests: number;
  errorRate: number;
  avgResponseTime: number;
  requestsPerSecond: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface CreateSubscriptionRequest {
  type: Subscription['type'];
  target: string;
  events: string[];
  config?: {
    retries?: number;
    timeout?: number;
    rateLimit?: number;
    batching?: {
      enabled: boolean;
      maxSize: number;
      maxWait: number;
    };
    customHeaders?: Record<string, string>;
    template?: string;
  };
  authentication?: {
    type: 'none' | 'apikey' | 'bearer' | 'hmac';
    secret?: string;
  };
}

export interface UpdateSubscriptionRequest {
  status?: Subscription['status'];
  target?: string;
  events?: string[];
  config?: CreateSubscriptionRequest['config'];
}

/**
 * Status System API Client
 */
export class StatusSystemAPI {
  private baseURL: string;
  private timeout: number;
  private retries: number;
  private apiKey?: string;

  constructor(config: StatusSystemConfig = {}) {
    this.baseURL = config.baseURL || 'https://empire-pro-status.utahj4754.workers.dev';
    this.timeout = config.timeout || 10000;
    this.retries = config.retries || 3;
    this.apiKey = config.apiKey;
  }

  /**
   * Make HTTP request with retry logic and CORS handling
   */
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const defaultOptions: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'StatusSystem-Client/3.7.0',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        ...options.headers,
      },
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit',
      ...options,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const response = await fetch(url, defaultOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          return (await response.text()) as unknown as T;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === this.retries) {
          break;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * 🏠 Get system overview
   */
  async getSystemOverview(): Promise<{
    service: string;
    version: string;
    endpointsSummary: any;
    subscriptionStats: any;
    systemHealth: SystemHealth;
  }> {
    return this.request('/');
  }

  /**
   * 📊 Get system health
   */
  async getSystemHealth(): Promise<SystemHealth> {
    return this.request('/api/v1/health');
  }

  /**
   * 🔗 Get all endpoints status
   */
  async getEndpoints(): Promise<StatusEndpoint[]> {
    const response = await this.request('/api/v1/system-matrix');
    return response.endpoints || [];
  }

  /**
   * 📈 Get system metrics
   */
  async getMetrics(): Promise<SystemMetrics> {
    const response = await this.request('/api/v1/metrics/prometheus');
    
    // Parse Prometheus metrics into structured format
    const metrics: SystemMetrics = {
      totalRequests: 0,
      errorRate: 0,
      avgResponseTime: 0,
      requestsPerSecond: 0,
      memoryUsage: 0,
      cpuUsage: 0,
    };

    // Parse metrics text (simplified)
    const lines = response.split('\n');
    for (const line of lines) {
      if (line.startsWith('http_requests_total ')) {
        metrics.totalRequests = parseInt(line.split(' ')[1]) || 0;
      } else if (line.startsWith('http_request_duration_seconds ')) {
        metrics.avgResponseTime = parseFloat(line.split(' ')[1]) * 1000 || 0;
      }
    }

    return metrics;
  }

  /**
   * 📧 Get all subscriptions
   */
  async getSubscriptions(): Promise<Subscription[]> {
    return this.request('/api/v1/subscriptions');
  }

  /**
   * 📧 Get subscription by ID
   */
  async getSubscription(id: string): Promise<Subscription> {
    return this.request(`/api/v1/subscriptions/${id}`);
  }

  /**
   * ➕ Create new subscription
   */
  async createSubscription(subscription: CreateSubscriptionRequest): Promise<Subscription> {
    return this.request('/api/v1/subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscription),
    });
  }

  /**
   * ✏️ Update subscription
   */
  async updateSubscription(id: string, updates: UpdateSubscriptionRequest): Promise<Subscription> {
    return this.request(`/api/v1/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * 🗑️ Delete subscription
   */
  async deleteSubscription(id: string): Promise<void> {
    await this.request(`/api/v1/subscriptions/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * 📊 Get subscription delivery history
   */
  async getDeliveryHistory(id: string, limit = 50): Promise<any[]> {
    const response = await this.request(`/api/v1/subscriptions/${id}/deliveries?limit=${limit}`);
    return response.deliveries || [];
  }

  /**
   * 🧪 Test subscription
   */
  async testSubscription(id: string): Promise<{
    success: boolean;
    message: string;
    timestamp: string;
  }> {
    return this.request(`/api/v1/subscriptions/${id}/test`, {
      method: 'POST',
    });
  }

  /**
   * 📡 Subscribe to Server-Sent Events
   */
  subscribeToEvents(
    onEvent: (event: MessageEvent) => void,
    onError?: (error: Event) => void
  ): EventSource {
    const eventSource = new EventSource(`${this.baseURL}/api/v1/events/stream`, {
      withCredentials: false,
    });

    eventSource.onmessage = onEvent;
    if (onError) {
      eventSource.onerror = onError;
    }

    return eventSource;
  }

  /**
   * 🔍 Search subscriptions
   */
  async searchSubscriptions(query: {
    type?: Subscription['type'];
    status?: Subscription['status'];
    event?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    subscriptions: Subscription[];
    total: number;
    hasMore: boolean;
  }> {
    const params = new URLSearchParams();
    
    if (query.type) params.append('type', query.type);
    if (query.status) params.append('status', query.status);
    if (query.event) params.append('event', query.event);
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.offset) params.append('offset', query.offset.toString());

    return this.request(`/api/v1/subscriptions/search?${params}`);
  }

  /**
   * 📊 Get subscription statistics
   */
  async getSubscriptionStats(): Promise<{
    total: number;
    active: number;
    paused: number;
    inactive: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    deliveryStats: {
      totalDelivered: number;
      averageSuccessRate: number;
      totalFailures: number;
    };
  }> {
    return this.request('/api/v1/subscriptions/stats');
  }

  /**
   * 🌐 Get webhook status
   */
  async getWebhookStatus(): Promise<{
    status: 'active' | 'inactive';
    lastDelivery: string;
    successRate: number;
    totalDelivered: number;
  }> {
    return this.request('/api/v1/webhooks/status');
  }

  /**
   * 🏷️ Get domain information
   */
  async getDomainInfo(): Promise<{
    domain: string;
    status: string;
    configured: boolean;
    endpoints: string[];
  }> {
    return this.request('/api/v1/domain');
  }

  /**
   * 🔄 Health check for API connectivity
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latency: number;
    version: string;
    uptime: number;
  }> {
    const start = Date.now();
    try {
      const response = await this.request('/health');
      const latency = Date.now() - start;
      
      return {
        healthy: true,
        latency,
        version: response.version || '3.7.0',
        uptime: response.uptime || 0,
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - start,
        version: 'unknown',
        uptime: 0,
      };
    }
  }
}

/**
 * Default API client instance
 */
export const statusAPI = new StatusSystemAPI();

/**
 * React hook for using the status API
 */
export function useStatusAPI(config?: StatusSystemConfig) {
  const api = new StatusSystemAPI(config);
  
  return {
    api,
    // System
    getSystemOverview: () => api.getSystemOverview(),
    getSystemHealth: () => api.getSystemHealth(),
    getEndpoints: () => api.getEndpoints(),
    getMetrics: () => api.getMetrics(),
    
    // Subscriptions
    getSubscriptions: () => api.getSubscriptions(),
    getSubscription: (id: string) => api.getSubscription(id),
    createSubscription: (sub: CreateSubscriptionRequest) => api.createSubscription(sub),
    updateSubscription: (id: string, updates: UpdateSubscriptionRequest) => api.updateSubscription(id, updates),
    deleteSubscription: (id: string) => api.deleteSubscription(id),
    
    // Utilities
    healthCheck: () => api.healthCheck(),
    subscribeToEvents: (onEvent: (event: MessageEvent) => void, onError?: (error: Event) => void) => 
      api.subscribeToEvents(onEvent, onError),
  };
}

/**
 * Export all types and utilities
 */
export type {
  StatusEndpoint,
  Subscription,
  SystemHealth,
  SystemMetrics,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  StatusSystemConfig,
};
