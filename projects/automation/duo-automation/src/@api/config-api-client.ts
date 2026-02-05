#!/usr/bin/env bun

/**
 * Configuration API Client SDK
 * TypeScript client for Empire Pro Configuration API
 */

export interface ConfigResponse {
  [key: string]: string;
}

export interface ConfigValueResponse {
  key: string;
  value: string;
}

export interface ValidationResponse {
  valid: boolean;
}

export interface HealthResponse {
  healthy: boolean;
  totalRequired: number;
  foundCount: number;
  missing: number;
  service: string;
}

export interface ErrorResponse {
  error: string;
  message?: string;
}

export class ConfigAPIClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string = 'http://localhost:3001', apiKey?: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
    };
    
    if (apiKey) {
      this.headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: { ...this.headers, ...options?.headers },
    });

    if (!response.ok) {
      const error = await response.json() as ErrorResponse;
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json() as T;
  }

  /**
   * Get all configuration values
   */
  async getAllConfig(): Promise<ConfigResponse> {
    return this.request<ConfigResponse>('/api/config');
  }

  /**
   * Get specific configuration value
   */
  async getConfig(key: string): Promise<string> {
    const response = await this.request<ConfigValueResponse>(`/api/config/${key}`);
    return response.value;
  }

  /**
   * Set configuration value
   */
  async setConfig(key: string, value: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/api/config', {
      method: 'POST',
      body: JSON.stringify({ key, value }),
    });
  }

  /**
   * Validate all configuration
   */
  async validateConfig(): Promise<ValidationResponse> {
    return this.request<ValidationResponse>('/api/config/validate');
  }

  /**
   * Export configuration as environment variables
   */
  async exportConfig(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/config/export`, {
      headers: this.headers,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response.text();
  }

  /**
   * Check API health and configuration status
   */
  async healthCheck(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/api/config/health');
  }

  /**
   * Delete all configuration (dangerous operation)
   */
  async deleteAllConfig(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/api/config', {
      method: 'DELETE',
    });
  }

  /**
   * Get API documentation
   */
  async getApiDocs(): Promise<any> {
    return this.request<any>('/api');
  }

  /**
   * Watch for configuration changes (polling-based)
   */
  async watchConfig(callback: (config: ConfigResponse) => void, interval: number = 5000): Promise<() => void> {
    let lastConfig: ConfigResponse = {};
    
    const poll = async () => {
      try {
        const currentConfig = await this.getAllConfig();
        const configChanged = JSON.stringify(currentConfig) !== JSON.stringify(lastConfig);
        
        if (configChanged) {
          lastConfig = { ...currentConfig };
          callback(currentConfig);
        }
      } catch (error) {
        console.error('Config watch error:', error);
      }
    };

    // Initial poll
    await poll();
    
    // Set up interval
    const intervalId = setInterval(poll, interval);
    
    // Return cleanup function
    return () => clearInterval(intervalId);
  }

  /**
   * Batch operations - set multiple values at once
   */
  async setMultipleConfig(config: Record<string, string>): Promise<void> {
    const promises = Object.entries(config).map(([key, value]) => 
      this.setConfig(key, value)
    );
    
    await Promise.all(promises);
  }

  /**
   * Get configuration summary
   */
  async getConfigSummary(): Promise<{
    total: number;
    present: number;
    missing: number;
    health: 'healthy' | 'unhealthy' | 'partial';
  }> {
    const config = await this.getAllConfig();
    const health = await this.healthCheck();
    
    return {
      total: health.totalRequired,
      present: health.foundCount,
      missing: health.missing,
      health: health.healthy ? 'healthy' : health.foundCount > 0 ? 'partial' : 'unhealthy'
    };
  }
}

// Usage examples
export async function exampleUsage() {
  const client = new ConfigAPIClient();

  try {
    // Get API documentation
    const docs = await client.getApiDocs();
    console.log('API Documentation:', docs);

    // Check health
    const health = await client.healthCheck();
    console.log('Health Status:', health);

    // Get all configuration
    const config = await client.getAllConfig();
    console.log('All Config:', config);

    // Get specific value
    const dbUrl = await client.getConfig('DATABASE_URL');
    console.log('Database URL:', dbUrl);

    // Set configuration
    await client.setConfig('NEW_VALUE', 'test-value');
    console.log('Configuration set successfully');

    // Validate configuration
    const validation = await client.validateConfig();
    console.log('Validation:', validation);

    // Get configuration summary
    const summary = await client.getConfigSummary();
    console.log('Summary:', summary);

    // Export as environment variables
    const envExport = await client.exportConfig();
    console.log('Environment Export:', envExport);

  } catch (error) {
    console.error('API Error:', error);
  }
}
