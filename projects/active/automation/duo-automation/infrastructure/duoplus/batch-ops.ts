// duoplus/batch-ops.ts
import { DUOPLUS_CONFIG, BatchOperation } from './config.js';
import { DuoPlusPhoneManager } from './phone-provisioning.js';
import axios from 'axios';

export class DuoPlusBatchManager {
  private apiKey: string;
  private rateLimiter: Map<string, number[]> = new Map();
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Rate limiting helper
   */
  private async checkRateLimit(endpoint: string, limit: number, windowMs: number = 60000): Promise<void> {
    const now = Date.now();
    const requests = this.rateLimiter.get(endpoint) || [];
    const recentRequests = requests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= limit) {
      const oldestRequest = Math.min(...recentRequests);
      const waitTime = windowMs - (now - oldestRequest);
      throw new Error(`Rate limit exceeded for ${endpoint}. Wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }
    
    recentRequests.push(now);
    this.rateLimiter.set(endpoint, recentRequests);
  }

  /**
   * Upload File to Cloud Drive
   * From Update Log: "Batch Push Cloud Drive Files"
   */
  async uploadToCloudDrive(file: Buffer, filename: string, metadata?: {
    description?: string;
    tags?: string[];
    category?: string;
  }): Promise<string> {
    try {
      const formData = new FormData();
      // Convert Buffer to Uint8Array for Blob compatibility
      const uint8Array = new Uint8Array(file);
      const blob = new Blob([uint8Array]);
      formData.append('file', blob, filename);
      
      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }

      const response = await axios.post(
        `${DUOPLUS_CONFIG.baseUrl}${DUOPLUS_CONFIG.endpoints.files}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 60000 // 60 seconds for file uploads
        }
      );

      return response.data.file_id;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Batch Push Files to Multiple Phones
   * From Update Log: "One device, one account, one content"
   */
  async batchPushFiles(config: {
    fileId: string;
    phoneIds: string[];
    distribution: 'uniform' | 'unique'; // unique = different file per phone
    destinationPath?: string;
    overwrite?: boolean;
  }): Promise<BatchOperation> {
    await this.checkRateLimit('batchOperations', DUOPLUS_CONFIG.rateLimits.batchOperations, 5000); // 5 second window
    
    try {
      const response = await axios.post(
        `${DUOPLUS_CONFIG.baseUrl}${DUOPLUS_CONFIG.endpoints.batch}`,
        {
          operation: 'push_files',
          file_id: config.fileId,
          phone_ids: config.phoneIds,
          distribution: config.distribution,
          destination_path: config.destinationPath || '/sdcard/Download/',
          overwrite: config.overwrite || false,
          // From Update Log: "Bulk Configuration Limit increased to 500"
          maxBatchSize: 500
        },
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        batchId: response.data.batch_id,
        status: response.data.status,
        total: config.phoneIds.length,
        succeeded: response.data.succeeded || 0,
        failed: response.data.failed || 0
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Bulk Configure Cloud Phones
   * From Update Log: "Bulk configuring up to 500 entries"
   */
  async bulkConfigurePhones(configs: Array<{
    phoneId: string;
    proxy?: any;
    autoRenew?: boolean;
    teamId?: string;
    developerTools?: {
      dumpVisible: boolean;
    };
  }>): Promise<BatchOperation> {
    try {
      const response = await axios.post(
        `${DUOPLUS_CONFIG.baseUrl}/bulk-configure`,
        {
          configurations: configs,
          validate_only: false,
          max_batch_size: 500
        },
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      return {
        batchId: response.data.batch_id,
        status: response.data.status,
        total: configs.length,
        succeeded: response.data.succeeded || 0,
        failed: response.data.failed || 0
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Bulk Install Apps on Phones
   */
  async bulkInstallApps(config: {
    phoneIds: string[];
    appPackages: Array<{
      packageName: string;
      version?: string;
      source: 'play-store' | 'apk-file' | 'custom';
      fileId?: string; // For custom APK files
    }>;
  }): Promise<BatchOperation> {
    try {
      const response = await axios.post(
        `${DUOPLUS_CONFIG.baseUrl}/bulk-install`,
        {
          phone_ids: config.phoneIds,
          app_packages: config.appPackages,
          install_options: {
            grant_permissions: true,
            allow_unknown_sources: true
          }
        },
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000 // 2 minutes for app installations
        }
      );

      return {
        batchId: response.data.batch_id,
        status: response.data.status,
        total: config.phoneIds.length * config.appPackages.length,
        succeeded: response.data.succeeded || 0,
        failed: response.data.failed || 0
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get Batch Operation Status
   */
  async getBatchStatus(batchId: string): Promise<{
    batchId: string;
    status: string;
    total: number;
    succeeded: number;
    failed: number;
    progress: number;
    startTime: Date;
    endTime?: Date;
    errors?: Array<{
      phoneId: string;
      error: string;
      timestamp: Date;
    }>;
  }> {
    try {
      const response = await axios.get(
        `${DUOPLUS_CONFIG.baseUrl}/batch/${batchId}/status`,
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      return {
        batchId,
        status: response.data.status,
        total: response.data.total,
        succeeded: response.data.succeeded,
        failed: response.data.failed,
        progress: response.data.progress || 0,
        startTime: new Date(response.data.start_time),
        endTime: response.data.end_time ? new Date(response.data.end_time) : undefined,
        errors: response.data.errors?.map((err: any) => ({
          phoneId: err.phone_id,
          error: err.error,
          timestamp: new Date(err.timestamp)
        }))
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cancel Batch Operation
   */
  async cancelBatchOperation(batchId: string): Promise<void> {
    try {
      await axios.post(
        `${DUOPLUS_CONFIG.baseUrl}/batch/${batchId}/cancel`,
        {},
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retry Failed Batch Operations
   */
  async retryBatchOperation(batchId: string, failedOnly: boolean = true): Promise<BatchOperation> {
    try {
      const response = await axios.post(
        `${DUOPLUS_CONFIG.baseUrl}/batch/${batchId}/retry`,
        { failed_only: failedOnly },
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        batchId: response.data.new_batch_id,
        status: response.data.status,
        total: response.data.total,
        succeeded: response.data.succeeded || 0,
        failed: response.data.failed || 0
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List Files in Cloud Drive
   */
  async listCloudDriveFiles(filters?: {
    category?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<Array<{
    fileId: string;
    filename: string;
    size: number;
    uploadedAt: Date;
    metadata?: any;
  }>> {
    try {
      const response = await axios.get(
        `${DUOPLUS_CONFIG.baseUrl}${DUOPLUS_CONFIG.endpoints.files}`,
        {
          params: filters,
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      return response.data.files.map((file: any) => ({
        fileId: file.file_id,
        filename: file.filename,
        size: file.size,
        uploadedAt: new Date(file.uploaded_at),
        metadata: file.metadata
      }));
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Download File from Cloud Drive
   */
  async downloadFromCloudDrive(fileId: string): Promise<Buffer> {
    try {
      const response = await axios.get(
        `${DUOPLUS_CONFIG.baseUrl}${DUOPLUS_CONFIG.endpoints.files}/${fileId}/download`,
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 60000,
          responseType: 'arraybuffer'
        }
      );

      return Buffer.from(response.data);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete File from Cloud Drive
   */
  async deleteCloudDriveFile(fileId: string): Promise<void> {
    try {
      await axios.delete(
        `${DUOPLUS_CONFIG.baseUrl}${DUOPLUS_CONFIG.endpoints.files}/${fileId}`,
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Bulk Renew Phones
   * From Update Log: "Auto-Renewal Switch"
   */
  async bulkRenewPhones(config: {
    phoneIds: string[];
    duration: number; // days
    autoRenew?: boolean;
  }): Promise<BatchOperation> {
    try {
      const response = await axios.post(
        `${DUOPLUS_CONFIG.baseUrl}/bulk-renew`,
        {
          phone_ids: config.phoneIds,
          duration_days: config.duration,
          auto_renew: config.autoRenew || false
        },
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        batchId: response.data.batch_id,
        status: response.data.status,
        total: config.phoneIds.length,
        succeeded: response.data.succeeded || 0,
        failed: response.data.failed || 0
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
