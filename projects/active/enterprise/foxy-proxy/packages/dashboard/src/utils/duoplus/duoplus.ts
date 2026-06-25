import axios from "axios";

import type { BunFileSystemEntry } from "../../types/bun";
import { isBunFileSystemEntry } from "../../types/bun";


export interface DuoPlusPhone {
  id: string;
  name: string;
  status: "online" | "offline" | "starting" | "stopping";
  proxy?: {
    ip: string;
    port: number;
    username: string;
    password: string;
  };
  region: string;
  lastUsed: string;
  createdAt: string;
  specs: {
    cpu: string;
    memory: string;
    storage: string;
  };
}

export interface DuoPlusAccount {
  id: string;
  email: string;
  balance: number;
  currency: string;
  totalPhones: number;
  activePhones: number;
  plan: string;
  expiresAt: string;
}

// Loop Task Configuration Types
export interface LoopTaskConfig {
  key: string;
  value: string | string[];
  type: "file" | "textarea" | "boolean" | "number" | "string" | "excel";
  required: boolean;
}

export interface LoopTaskImage {
  image_id: string;
  config?: Record<string, LoopTaskConfig>;
  start_at: string;
  end_at: string;
  execute_type: "1" | "2" | "3" | "4"; // 1: Interval, 2: Daily, 3: Weekly, 4: Monthly
  gap_time?: number; // Required if execute_type is 1
  execute_time?: string; // Required if execute_type is 2, 3, or 4
  execute_end_time?: string; // Required if execute_type is 2, 3, or 4 and mode is 2
  mode?: 1 | 2; // 1: Single execution, 2: Loop execution
  weeks?: number[]; // Required if execute_type is 3
  days?: number[]; // Required if execute_type is 4
}

export interface CreateLoopTaskRequest {
  template_id: string;
  template_type: 1 | 2; // 1: Official template, 2: Custom template
  name: string;
  remark?: string;
  images: LoopTaskImage[];
}

export interface CreateLoopTaskResponse {
  code: number;
  data: {
    id: string;
  };
  message: string;
}

export interface DuoPlusConfig {
  apiToken: string;
  baseUrl: string;
}

class DuoPlusAPI {
  private axiosInstance: import("axios").AxiosInstance;

  constructor(config: DuoPlusConfig) {
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        "Content-Type": "application/json"
      }
    });
  }

  // Account information
  async getAccountInfo(): Promise<DuoPlusAccount> {
    try {
      const response = await this.axiosInstance.get("/api/account");
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch account info: ${error}`);
    }
  }

  // Get all cloud phones
  async getPhones(): Promise<DuoPlusPhone[]> {
    try {
      const response = await this.axiosInstance.get("/api/phones");
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch phones: ${error}`);
    }
  }

  // Get phone by ID
  async getPhone(phoneId: string): Promise<DuoPlusPhone> {
    try {
      const response = await this.axiosInstance.get(`/api/phones/${phoneId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch phone: ${error}`);
    }
  }

  // Start a phone
  async startPhone(phoneId: string): Promise<void> {
    try {
      await this.axiosInstance.post(`/api/phones/${phoneId}/start`);
    } catch (error) {
      throw new Error(`Failed to start phone: ${error}`);
    }
  }

  // Stop a phone
  async stopPhone(phoneId: string): Promise<void> {
    try {
      await this.axiosInstance.post(`/api/phones/${phoneId}/stop`);
    } catch (error) {
      throw new Error(`Failed to stop phone: ${error}`);
    }
  }

  // Restart a phone
  async restartPhone(phoneId: string): Promise<void> {
    try {
      await this.axiosInstance.post(`/api/phones/${phoneId}/restart`);
    } catch (error) {
      throw new Error(`Failed to restart phone: ${error}`);
    }
  }

  // Configure proxy for phone
  async configureProxy(
    phoneId: string,
    proxyConfig: {
      ip: string;
      port: number;
      username: string;
      password: string;
    }
  ): Promise<void> {
    try {
      await this.axiosInstance.post(`/api/phones/${phoneId}/proxy`, proxyConfig);
    } catch (error) {
      throw new Error(`Failed to configure proxy: ${error}`);
    }
  }

  // Upload file to phone (optimized for large files with BunFileSystemEntry support)
  async uploadFile(
    phoneId: string,
    file: File | BunFileSystemEntry,
    path: string = "/sdcard/Download/"
  ): Promise<string> {
    try {
      // Handle BunFileSystemEntry for efficient large file uploads
      if (isBunFileSystemEntry(file)) {
        // Use BunFileSystemEntry's streaming for large files
        const stream = file.stream();
        const formData = new FormData();

        // Convert BunFileSystemEntry stream to FormData-compatible format
        const chunks: Uint8Array[] = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }

        // Convert Uint8Array[] to BlobPart[] by creating proper ArrayBuffer views
        const blobParts: BlobPart[] = chunks.map((chunk) => {
          // Ensure we have a proper ArrayBuffer for Blob constructor
          const arrayBuffer = chunk.buffer.slice(
            chunk.byteOffset,
            chunk.byteOffset + chunk.byteLength
          ) as ArrayBuffer;
          return arrayBuffer;
        });

        const blob = new Blob(blobParts, { type: file.type });
        formData.append("file", new File([blob], file.name, { type: file.type }));
        formData.append("path", path);

        const response = await this.axiosInstance.post(`/api/phones/${phoneId}/upload`, formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });
        return response.data.url;
      } else {
        // Standard File object handling
        const formData = new FormData();
        formData.append("file", file);
        formData.append("path", path);

        const response = await this.axiosInstance.post(`/api/phones/${phoneId}/upload`, formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });
        return response.data.url;
      }
    } catch (error) {
      throw new Error(`Failed to upload file: ${error}`);
    }
  }

  // Download file from phone (with BunFileSystemEntry optimization for server-side)
  async downloadFile(phoneId: string, filePath: string): Promise<Blob> {
    try {
      const response = await this.axiosInstance.get(`/api/phones/${phoneId}/download`, {
        params: { path: filePath },
        responseType: "blob"
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to download file: ${error}`);
    }
  }

  // Download file to local storage (BunFileSystemEntry optimized)
  async downloadFileToLocal(
    phoneId: string,
    filePath: string,
    localPath: string
  ): Promise<BunFileSystemEntry> {
    try {
      const blob = await this.downloadFile(phoneId, filePath);
      await Bun.write(localPath, blob);
      return Bun.file(localPath);
    } catch (error) {
      throw new Error(`Failed to download file to local storage: ${error}`);
    }
  }

  // Get file info from phone
  async getFileInfo(
    phoneId: string,
    filePath: string
  ): Promise<{
    name: string;
    size: number;
    modified: string;
    type: string;
  }> {
    try {
      const response = await this.axiosInstance.get(`/api/phones/${phoneId}/file-info`, {
        params: { path: filePath }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get file info: ${error}`);
    }
  }

  // Delete file from phone
  async deleteFile(phoneId: string, filePath: string): Promise<void> {
    try {
      await this.axiosInstance.delete(`/api/phones/${phoneId}/file`, {
        params: { path: filePath }
      });
    } catch (error) {
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  // Install APK on phone (optimized for large APK files)
  async installApk(phoneId: string, apkFile: File | BunFileSystemEntry): Promise<void> {
    try {
      const formData = new FormData();

      // Handle BunFileSystemEntry for efficient large APK uploads
      if (isBunFileSystemEntry(apkFile)) {
        // Use BunFileSystemEntry's streaming for large APK files
        const stream = apkFile.stream();
        const chunks: Uint8Array[] = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }

        // Convert Uint8Array[] to BlobPart[] by creating proper ArrayBuffer views
        const blobParts: BlobPart[] = chunks.map((chunk) => {
          // Ensure we have a proper ArrayBuffer for Blob constructor
          const arrayBuffer = chunk.buffer.slice(
            chunk.byteOffset,
            chunk.byteOffset + chunk.byteLength
          ) as ArrayBuffer;
          return arrayBuffer;
        });

        const blob = new Blob(blobParts, { type: "application/vnd.android.package-archive" });
        formData.append(
          "apk",
          new File([blob], apkFile.name, { type: "application/vnd.android.package-archive" })
        );
      } else {
        formData.append("apk", apkFile);
      }

      await this.axiosInstance.post(`/api/phones/${phoneId}/install`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
    } catch (error) {
      throw new Error(`Failed to install APK: ${error}`);
    }
  }

  // Get phone logs
  async getPhoneLogs(phoneId: string, limit: number = 100): Promise<string[]> {
    try {
      const response = await this.axiosInstance.get(`/api/phones/${phoneId}/logs`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch phone logs: ${error}`);
    }
  }

  // Get phone screenshot (with BunFileSystemEntry optimization for server-side storage)
  async getScreenshot(phoneId: string): Promise<string> {
    try {
      const response = await this.axiosInstance.get(`/api/phones/${phoneId}/screenshot`, {
        responseType: "arraybuffer"
      });

      const base64 = btoa(
        new Uint8Array(response.data).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      throw new Error(`Failed to get screenshot: ${error}`);
    }
  }

  // Get phone screenshot as BunFileSystemEntry (server-side optimization)
  async getScreenshotAsFile(phoneId: string, filename?: string): Promise<BunFileSystemEntry> {
    try {
      const response = await this.axiosInstance.get(`/api/phones/${phoneId}/screenshot`, {
        responseType: "arraybuffer"
      });

      const defaultFilename = `screenshot-${phoneId}-${Date.now()}.png`;
      const filepath = `/tmp/${filename || defaultFilename}`;

      await Bun.write(filepath, response.data);
      return Bun.file(filepath);
    } catch (error) {
      throw new Error(`Failed to get screenshot as file: ${error}`);
    }
  }

  // Create Loop Task for automation
  async createLoopTask(request: CreateLoopTaskRequest): Promise<CreateLoopTaskResponse> {
    try {
      const response = await this.axiosInstance.post("/api/v1/automation/addPlan", request);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create loop task: ${error}`);
    }
  }

  // Mock data for development
  async getMockData() {
    return {
      account: {
        id: "6370486b-c456-4efc-842e-9cd1461d05d8",
        email: "user@example.com",
        balance: 100.5,
        currency: "USD",
        totalPhones: 5,
        activePhones: 3,
        plan: "Professional",
        expiresAt: "2024-12-31"
      } as DuoPlusAccount,
      phones: [
        {
          id: "phone1",
          name: "TikTok Marketing Phone 1",
          status: "online" as const,
          proxy: {
            ip: "192.168.1.100",
            port: 8080,
            username: "user1",
            password: "pass1"
          },
          region: "United States",
          lastUsed: "2 hours ago",
          createdAt: "2024-01-15",
          specs: {
            cpu: "4 cores",
            memory: "4GB",
            storage: "64GB"
          }
        },
        {
          id: "phone2",
          name: "WhatsApp Business Phone",
          status: "offline" as const,
          proxy: {
            ip: "192.168.1.101",
            port: 8080,
            username: "user2",
            password: "pass2"
          },
          region: "Germany",
          lastUsed: "1 day ago",
          createdAt: "2024-01-10",
          specs: {
            cpu: "2 cores",
            memory: "2GB",
            storage: "32GB"
          }
        },
        {
          id: "phone3",
          name: "E-commerce Testing Phone",
          status: "starting" as const,
          proxy: {
            ip: "192.168.1.102",
            port: 8080,
            username: "user3",
            password: "pass3"
          },
          region: "United Kingdom",
          lastUsed: "3 hours ago",
          createdAt: "2024-01-20",
          specs: {
            cpu: "4 cores",
            memory: "4GB",
            storage: "64GB"
          }
        }
      ] as DuoPlusPhone[]
    };
  }
}

export default DuoPlusAPI;
