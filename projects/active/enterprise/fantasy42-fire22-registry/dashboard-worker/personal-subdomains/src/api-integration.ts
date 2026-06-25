/**
 * Crystal Clear Architecture API Integration
 * Connects Dashboard Worker to Backend Services
 */

export interface ApiConfig {
  baseURL: string;
  apiKey: string;
  timeout: number;
  retries: number;
}

export interface VIPClient {
  id: string;
  name: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  commissionRate: number;
  totalDeposits: number;
  lastActivity: string;
  riskScore: number;
}

export interface EmployeeData {
  id: string;
  name: string;
  title: string;
  department: string;
  email: string;
  avatar?: string;
  skills: string[];
  tier: number;
}

export interface Fantasy402SportsData {
  sportId: string;
  sportName: string;
  liveEvents: number;
  totalEvents: number;
  lastUpdated: string;
}

export class CrystalClearApiClient {
  private config: ApiConfig;

  constructor(config: Partial<ApiConfig>) {
    this.config = {
      baseURL: config.baseURL || 'https://api.crystal-clear-architecture.com',
      apiKey: config.apiKey || '',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
    };
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.config.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey}`,
      'X-API-Key': this.config.apiKey,
      ...options.headers,
    };

    const requestOptions: RequestInit = {
      ...options,
      headers,
    };

    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (attempt === this.config.retries - 1) {
          throw error;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  // VIP Management API
  async getVIPClients(): Promise<VIPClient[]> {
    try {
      return await this.makeRequest('/api/vip/clients');
    } catch (error) {
      console.error('Failed to fetch VIP clients:', error);
      throw new Error('VIP API unavailable - backend services not deployed');
    }
  }

  async getVIPAnalytics(): Promise<any> {
    try {
      return await this.makeRequest('/api/vip/analytics');
    } catch (error) {
      console.error('Failed to fetch VIP analytics:', error);
      return { totalClients: 0, totalDeposits: 0, averageCommission: 0 };
    }
  }

  async updateVIPCommission(clientId: string, rate: number): Promise<boolean> {
    try {
      await this.makeRequest(`/api/vip/clients/${clientId}/commission`, {
        method: 'PUT',
        body: JSON.stringify({ commissionRate: rate }),
      });
      return true;
    } catch (error) {
      console.error('Failed to update VIP commission:', error);
      return false;
    }
  }

  // Employee Management API
  async getEmployees(): Promise<EmployeeData[]> {
    try {
      return await this.makeRequest('/api/employees');
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      throw new Error('Employee API unavailable - backend services not deployed');
    }
  }

  async getEmployeeById(id: string): Promise<EmployeeData | null> {
    try {
      return await this.makeRequest(`/api/employees/${id}`);
    } catch (error) {
      console.error('Failed to fetch employee:', error);
      return null;
    }
  }

  async updateEmployee(id: string, updates: Partial<EmployeeData>): Promise<boolean> {
    try {
      await this.makeRequest(`/api/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return true;
    } catch (error) {
      console.error('Failed to update employee:', error);
      return false;
    }
  }

  // Fantasy402 Integration API
  async getSportsData(): Promise<Fantasy402SportsData[]> {
    try {
      return await this.makeRequest('/api/fantasy402/sports');
    } catch (error) {
      console.error('Failed to fetch sports data:', error);
      throw new Error('Fantasy402 API unavailable - backend services not deployed');
    }
  }

  async getLiveOdds(sportId: string): Promise<any> {
    try {
      return await this.makeRequest(`/api/fantasy402/sports/${sportId}/odds`);
    } catch (error) {
      console.error('Failed to fetch live odds:', error);
      return { events: [], lastUpdated: new Date().toISOString() };
    }
  }

  async placeBet(betData: any): Promise<any> {
    try {
      return await this.makeRequest('/api/fantasy402/bets', {
        method: 'POST',
        body: JSON.stringify(betData),
      });
    } catch (error) {
      console.error('Failed to place bet:', error);
      throw error;
    }
  }

  // System Health API
  async getHealthStatus(): Promise<any> {
    try {
      return await this.makeRequest('/api/health');
    } catch (error) {
      console.error('Failed to fetch health status:', error);
      return { status: 'error', message: 'Backend unavailable' };
    }
  }

  async getSystemMetrics(): Promise<any> {
    try {
      return await this.makeRequest('/api/metrics');
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
      return { uptime: 0, requests: 0, errors: 0 };
    }
  }

  // Authentication API
  async authenticate(credentials: { username: string; password: string }): Promise<any> {
    try {
      return await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      await this.makeRequest('/api/auth/validate', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Department Management API
  async getDepartments(): Promise<any[]> {
    try {
      return await this.makeRequest('/api/departments');
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      return [];
    }
  }

  async getDepartmentTools(departmentId: string): Promise<any[]> {
    try {
      return await this.makeRequest(`/api/departments/${departmentId}/tools`);
    } catch (error) {
      console.error('Failed to fetch department tools:', error);
      return [];
    }
  }

  // Analytics API
  async getDashboardAnalytics(timeframe: string = '24h'): Promise<any> {
    try {
      return await this.makeRequest(`/api/analytics/dashboard?timeframe=${timeframe}`);
    } catch (error) {
      console.error('Failed to fetch dashboard analytics:', error);
      return { totalUsers: 0, activeSessions: 0, revenue: 0 };
    }
  }

  async getPerformanceMetrics(): Promise<any> {
    try {
      return await this.makeRequest('/api/analytics/performance');
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
      return { avgResponseTime: 0, errorRate: 0, throughput: 0 };
    }
  }
}

// Global API client instance
let apiClient: CrystalClearApiClient | null = null;

export function getApiClient(env?: any): CrystalClearApiClient {
  if (!apiClient) {
    const config: Partial<ApiConfig> = {
      baseURL: env?.CRYSTAL_CLEAR_API_URL || 'https://api.crystal-clear-architecture.com',
      apiKey: env?.CRYSTAL_CLEAR_API_KEY || '',
      timeout: 30000,
      retries: 3,
    };
    apiClient = new CrystalClearApiClient(config);
  }
  return apiClient;
}

// Utility functions for dashboard integration
export async function fetchVIPData(env?: any): Promise<VIPClient[]> {
  const client = getApiClient(env);
  return await client.getVIPClients();
}

export async function fetchEmployeeData(env?: any): Promise<EmployeeData[]> {
  const client = getApiClient(env);
  return await client.getEmployees();
}

export async function fetchSportsData(env?: any): Promise<Fantasy402SportsData[]> {
  const client = getApiClient(env);
  return await client.getSportsData();
}

export async function getSystemHealth(env?: any): Promise<any> {
  const client = getApiClient(env);
  return await client.getHealthStatus();
}

// Cache management for API responses
const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export function getCachedData(key: string): any | null {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  apiCache.delete(key);
  return null;
}

export function setCachedData(key: string, data: any, ttl: number = 300000): void {
  apiCache.set(key, { data, timestamp: Date.now(), ttl });
}

export function clearCache(): void {
  apiCache.clear();
}
