/**
 * DuoPlus API Client
 * Handles all cloud phone management operations via DuoPlus API
 *
 * API Documentation: https://help.duoplus.net/docs/api-reference
 * Production Endpoint: https://openapi.duoplus.net
 */

export type Language = 'zh' | 'zh-TW' | 'en' | 'ru';

export type LinkStatus = 0 | 1 | 2 | 3 | 4 | 10 | 11 | 12;
// 0: Not configured, 1: Powered on, 2: Powered off, 3: Expired
// 4: Renewal overdue, 10: Powering on, 11: Configuring, 12: Configuration failed

export interface Device {
  id: string;
  image_id: string;
  name: string;
  group_id?: string;
  remark?: string;
  ip?: string;
  link_status: LinkStatus;
  proxy_id?: string;
  share_status: 0 | 1 | 2; // 0: No config, 1: Shared, 2: Not shared
  start_phone_type: 1 | 2 | 3; // 1: Prioritize Sub, 2: Sub, 3: Temporary
  adb_status: 0 | 1; // 0: Disabled, 1: Enabled
  renewal_status: 0 | 1; // 0: No, 1: Yes
  created_at: string;
  expired_at: string;
  // Computed properties for backwards compatibility
  status: 'running' | 'stopped' | 'provisioning' | 'error' | 'expired';
  ip_address?: string;
  last_activity: string;
}

export interface DeviceListParams {
  image_id?: string[];
  name?: string;
  group_id?: string;
  remark?: string;
  ips?: string[];
  link_status?: LinkStatus[];
  proxy_id?: string;
  share_status?: (0 | 1 | 2)[];
  start_phone_type?: (1 | 2 | 3)[];
  adb_status?: (0 | 1)[];
  renewal_status?: (0 | 1)[];
  sort_by?: 'name' | 'created_at' | 'expired_at';
  order?: 'asc' | 'desc';
  user_ids?: string[];
  tag_ids?: string[];
  region_id?: string[];
  page?: number;
  pagesize?: number;
}

export interface PaginatedResponse<T> {
  list: T[];
  page: number;
  pagesize: number;
  total: number;
  total_page: number;
}

export interface APIResponse<T> {
  code: number;
  data: T;
  message: string;
}

export interface APIError {
  code: number;
  message: string;
}

export class DuoPlusAPI {
  private baseURL = 'https://openapi.duoplus.net';
  private apiKey: string;
  private lang: Language;
  private requestTimeout = 30000; // 30 seconds

  constructor(apiKey: string, lang: Language = 'en') {
    if (!apiKey) {
      throw new Error('DUOPLUS_API_KEY is required');
    }
    this.apiKey = apiKey;
    this.lang = lang;
  }

  private async request<T>(
    endpoint: string,
    body: Record<string, any> = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(url, {
        method: 'POST', // All DuoPlus endpoints use POST
        signal: controller.signal,
        headers: {
          'DuoPlus-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          'Lang': this.lang,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json() as APIResponse<T>;

      if (result.code !== 200) {
        throw new Error(`API Error (${result.code}): ${result.message}`);
      }

      return result.data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Helper to convert API device to our normalized Device interface
  private normalizeDevice(raw: any): Device {
    const statusMap: Record<number, Device['status']> = {
      0: 'stopped',
      1: 'running',
      2: 'stopped',
      3: 'expired',
      4: 'expired',
      10: 'provisioning',
      11: 'provisioning',
      12: 'error',
    };

    return {
      ...raw,
      status: statusMap[raw.link_status] || 'stopped',
      ip_address: raw.ip,
      last_activity: raw.expired_at || raw.created_at,
    };
  }

  async listDevices(params: DeviceListParams = {}): Promise<Device[]> {
    const response = await this.request<PaginatedResponse<any>>(
      '/api/v1/cloudPhone/list',
      { pagesize: 100, ...params }
    );
    return response.list.map((d) => this.normalizeDevice(d));
  }

  async getDeviceDetails(imageId: string): Promise<Device> {
    const response = await this.request<any>('/api/v1/cloudPhone/details', {
      image_id: imageId,
    });
    return this.normalizeDevice(response);
  }

  async batchPowerOn(imageIds: string[]): Promise<void> {
    await this.request('/api/v1/cloudPhone/batchPowerOn', {
      image_ids: imageIds,
    });
  }

  async batchPowerOff(imageIds: string[]): Promise<void> {
    await this.request('/api/v1/cloudPhone/batchPowerOff', {
      image_ids: imageIds,
    });
  }

  async batchRestart(imageIds: string[]): Promise<void> {
    await this.request('/api/v1/cloudPhone/batchRestart', {
      image_ids: imageIds,
    });
  }

  async resetAndRegenerate(imageIds: string[]): Promise<void> {
    await this.request('/api/v1/cloudPhone/resetAndRegenerate', {
      image_ids: imageIds,
    });
  }

  async executeAdbCommand(imageId: string, command: string): Promise<string> {
    const response = await this.request<{ output: string }>(
      '/api/v1/cloudPhone/executeAdb',
      { image_id: imageId, command }
    );
    return response.output;
  }

  async batchSetRoot(imageIds: string[], enable: boolean): Promise<void> {
    await this.request('/api/v1/cloudPhone/batchSetRoot', {
      image_ids: imageIds,
      root_status: enable ? 1 : 0,
    });
  }

  async batchEnableAdb(imageIds: string[]): Promise<void> {
    await this.request('/api/v1/cloudPhone/batchEnableAdb', {
      image_ids: imageIds,
    });
  }

  async batchDisableAdb(imageIds: string[]): Promise<void> {
    await this.request('/api/v1/cloudPhone/batchDisableAdb', {
      image_ids: imageIds,
    });
  }

  // Proxy management
  async listProxies(params: { page?: number; pagesize?: number } = {}): Promise<any[]> {
    const response = await this.request<PaginatedResponse<any>>(
      '/api/v1/proxy/list',
      { pagesize: 100, ...params }
    );
    return response.list;
  }

  // Application management
  async listInstalledApps(imageId: string): Promise<any[]> {
    const response = await this.request<{ list: any[] }>(
      '/api/v1/app/installedList',
      { image_id: imageId }
    );
    return response.list;
  }

  async batchInstallApp(imageIds: string[], appId: string): Promise<void> {
    await this.request('/api/v1/app/batchInstall', {
      image_ids: imageIds,
      app_id: appId,
    });
  }

  async batchUninstallApp(imageIds: string[], packageName: string): Promise<void> {
    await this.request('/api/v1/app/batchUninstall', {
      image_ids: imageIds,
      package_name: packageName,
    });
  }

  // Group management
  async listGroups(params: { page?: number; pagesize?: number } = {}): Promise<any[]> {
    const response = await this.request<PaginatedResponse<any>>(
      '/api/v1/group/list',
      { pagesize: 100, ...params }
    );
    return response.list;
  }

  // Get cloud phone status
  async getStatus(imageIds: string[]): Promise<Record<string, LinkStatus>> {
    const response = await this.request<Record<string, LinkStatus>>(
      '/api/v1/cloudPhone/status',
      { image_ids: imageIds }
    );
    return response;
  }

  // Backwards-compatible aliases
  async startDevice(deviceId: string): Promise<void> {
    await this.batchPowerOn([deviceId]);
  }

  async stopDevice(deviceId: string): Promise<void> {
    await this.batchPowerOff([deviceId]);
  }

  async rebootDevice(deviceId: string): Promise<void> {
    await this.batchRestart([deviceId]);
  }

  // Logcat via ADB command
  async streamLogcat(
    deviceId: string,
    onLog: (log: string) => void,
    onError?: (error: Error) => void
  ): Promise<() => void> {
    let running = true;

    const poll = async () => {
      while (running) {
        try {
          // Get recent logcat entries
          const output = await this.executeAdbCommand(deviceId, 'logcat -d -t 50');
          if (output) {
            output.split('\n').forEach(line => {
              if (line.trim()) onLog(line);
            });
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          onError?.(err);
        }
        // Poll every 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    };

    onLog(`[Connecting to ${deviceId} via ADB...]`);
    poll();

    return () => {
      running = false;
      onLog(`[Disconnected from ${deviceId}]`);
    };
  }
}

