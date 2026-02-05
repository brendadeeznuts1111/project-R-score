import { API_CONFIG, WS_CONFIG } from '../config';

export interface Metrics {
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  timestamp: number;
  pid: number;
  platform: string;
  arch: string;
  nodeVersion: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
  uptime: number;
}

export interface BuildTriggerResponse {
  status: string;
  config: string;
  flags: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface MergedFlagsResponse {
  categories: Array<{
    id: string;
    name: string;
    description: string;
    flags: string[];
  }>;
  flags: Record<string, {
    id: string;
    name: string;
    description: string;
    category: string;
    critical?: boolean;
    badge?: {
      enabled: string;
      disabled: string;
    };
    impact?: {
      bundleSize: string;
      performance: string;
      security: string;
    };
    default?: boolean;
  }>;
  architectFlags: string[];
}

class DashboardAPI {
  private ws: WebSocket | null = null;
  private metricsListeners: Array<(metrics: Metrics) => void> = [];

  // Get merged feature flags
  async getMergedFlags(): Promise<MergedFlagsResponse> {
    const res = await fetch(`${API_CONFIG.FLAGS_MERGED}`);
    if (!res.ok) throw new Error('Failed to fetch flags');
    return res.json();
  }

  // Get build configurations
  async getBuildConfigs() {
    const res = await fetch(`${API_CONFIG.BUILD_CONFIGS}`);
    if (!res.ok) throw new Error('Failed to fetch configs');
    return res.json();
  }

  // Trigger build
  async triggerBuild(configName: string, flags: string[]): Promise<BuildTriggerResponse> {
    const res = await fetch(`${API_CONFIG.BUILD_TRIGGER}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configName, flags })
    });
    if (!res.ok) throw new Error('Failed to trigger build');
    return res.json();
  }

  // Get metrics
  async getMetrics(): Promise<Metrics> {
    const res = await fetch(`${API_CONFIG.METRICS}`);
    if (!res.ok) throw new Error('Failed to fetch metrics');
    return res.json();
  }

  // Health check
  async healthCheck(): Promise<HealthResponse> {
    const res = await fetch(`${API_CONFIG.HEALTH}`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  }

  // Get system info
  async getInfo() {
    const res = await fetch(`${API_CONFIG.INFO}`);
    if (!res.ok) throw new Error('Failed to fetch info');
    return res.json();
  }

  // WebSocket connection for real-time metrics
  connectWebSocket(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(API_CONFIG.WS_BASE);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'metrics') {
          this.metricsListeners.forEach(listener => listener(data.data));
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Auto-reconnect after configured interval
      setTimeout(() => this.connectWebSocket(), WS_CONFIG.RECONNECT_INTERVAL);
    };
  }

  // Subscribe to metrics updates
  onMetrics(callback: (metrics: Metrics) => void): () => void {
    this.metricsListeners.push(callback);
    return () => {
      this.metricsListeners = this.metricsListeners.filter(l => l !== callback);
    };
  }

  // Disconnect WebSocket
  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}

export const api = new DashboardAPI();
