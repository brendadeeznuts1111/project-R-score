/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DuoPlusAPI, type DuoPlusPhone, type DuoPlusAccount } from "../../../utils/duoplus";
import axios from "axios";

// Mock axios
vi.mock("axios", () => ({
  default: {
    create: vi.fn()
  }
}));

const mockedAxios = axios as any;

describe("DuoPlusAPI", () => {
  let api: DuoPlusAPI;
  const mockConfig = {
    apiToken: "test-token-123",
    baseUrl: "https://test.duoplus.net"
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock axios.create to return a mock instance
    const mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
      put: vi.fn(),
      patch: vi.fn()
    };

    mockedAxios.create = vi.fn().mockReturnValue(mockAxiosInstance);
    api = new DuoPlusAPI(mockConfig);
  });

  describe("Constructor", () => {
    it("should initialize with correct config", () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: mockConfig.baseUrl,
        headers: {
          Authorization: `Bearer ${mockConfig.apiToken}`,
          "Content-Type": "application/json"
        }
      });
    });
  });

  describe("Account Management", () => {
    it("should get account info successfully", async () => {
      const mockAccount: DuoPlusAccount = {
        id: "account-123",
        email: "test@example.com",
        balance: 100.5,
        currency: "USD",
        totalPhones: 5,
        activePhones: 3,
        plan: "Professional",
        expiresAt: "2024-12-31"
      };

      const mockInstance = mockedAxios.create(mockedAxios.create as any);
      mockInstance.get = vi.fn().mockResolvedValue({ data: mockAccount });

      const result = await api.getAccountInfo();

      expect(result).toEqual(mockAccount);
      expect(mockInstance.get).toHaveBeenCalledWith("/api/account");
    });

    it("should handle account info errors", async () => {
      const mockInstance = mockedAxios.create(mockedAxios.create as any);
      mockInstance.get = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(api.getAccountInfo()).rejects.toThrow(
        "Failed to fetch account info: Error: Network error"
      );
    });
  });

  describe("Phone Management", () => {
    const mockPhones: DuoPlusPhone[] = [
      {
        id: "phone-1",
        name: "Test Phone 1",
        status: "online",
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
      }
    ];

    it("should get all phones successfully", async () => {
      const mockInstance = mockedAxios.create(mockedAxios.create as any);
      mockInstance.get = vi.fn().mockResolvedValue({ data: mockPhones });

      const result = await api.getPhones();

      expect(result).toEqual(mockPhones);
      expect(mockInstance.get).toHaveBeenCalledWith("/api/phones");
    });

    it("should get single phone by ID", async () => {
      const mockInstance = mockedAxios.create(mockedAxios.create as any);
      mockInstance.get = vi.fn().mockResolvedValue({ data: mockPhones[0] });

      const result = await api.getPhone("phone-1");

      expect(result).toEqual(mockPhones[0]);
      expect(mockInstance.get).toHaveBeenCalledWith("/api/phones/phone-1");
    });

    it("should start phone successfully", async () => {
      const mockInstance = mockedAxios.create(mockedAxios.create as any);
      mockInstance.post = vi.fn().mockResolvedValue({});

      await api.startPhone("phone-1");

      expect(mockInstance.post).toHaveBeenCalledWith("/api/phones/phone-1/start");
    });

    it("should stop phone successfully", async () => {
      const mockInstance = mockedAxios.create(mockedAxios.create as any);
      mockInstance.post = vi.fn().mockResolvedValue({});

      await api.stopPhone("phone-1");

      expect(mockInstance.post).toHaveBeenCalledWith("/api/phones/phone-1/stop");
    });

    it("should restart phone successfully", async () => {
      const mockInstance = mockedAxios.create(mockedAxios.create as any);
      mockInstance.post = vi.fn().mockResolvedValue({});

      await api.restartPhone("phone-1");

      expect(mockInstance.post).toHaveBeenCalledWith("/api/phones/phone-1/restart");
    });
  });

  describe("Proxy Configuration", () => {
    it("should configure proxy successfully", async () => {
      const proxyConfig = {
        ip: "192.168.1.200",
        port: 8080,
        username: "proxyuser",
        password: "proxypass"
      };

      const mockInstance = mockedAxios.create(mockedAxios.create as any);
      mockInstance.post = vi.fn().mockResolvedValue({});

      await api.configureProxy("phone-1", proxyConfig);

      expect(mockInstance.post).toHaveBeenCalledWith("/api/phones/phone-1/proxy", proxyConfig);
    });

    it("should handle proxy configuration errors", async () => {
      const proxyConfig = {
        ip: "192.168.1.200",
        port: 8080,
        username: "proxyuser",
        password: "proxypass"
      };

      const mockInstance = mockedAxios.create(mockedAxios.create as any);
      mockInstance.post = vi.fn().mockRejectedValue(new Error("Invalid proxy"));

      await expect(api.configureProxy("phone-1", proxyConfig)).rejects.toThrow(
        "Failed to configure proxy: Error: Invalid proxy"
      );
    });
  });

  describe("File Operations", () => {
    const mockFile = new File(["test content"], "test.txt", { type: "text/plain" });
    const phoneId = "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36";
    const filePath = "/sdcard/Download/ucPHS.txt";

    it("should upload file successfully", async () => {
      const mockResponse = { url: "https://example.com/file.txt" };
      const mockInstance = mockedAxios.create(mockedAxios.create as any);
      mockInstance.post = vi.fn().mockResolvedValue({ data: mockResponse });

      const result = await api.uploadFile(phoneId, mockFile, "/sdcard/Download/");

      expect(result).toBe(mockResponse.url);
      expect(mockInstance.post).toHaveBeenCalledWith(
        `/api/phones/${phoneId}/upload`,
        expect.any(FormData),
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );
    });

    it("should download file successfully", async () => {
      const mockBlob = new Blob(["test content"], { type: "text/plain" });
      const mockInstance = mockedAxios.create(mockedAxios.create as any);
      mockInstance.get = vi.fn().mockResolvedValue({ data: mockBlob });

      const result = await api.downloadFile(phoneId, filePath);

      expect(result).toBe(mockBlob);
      expect(mockInstance.get).toHaveBeenCalledWith(`/api/phones/${phoneId}/download`, {
        params: { path: filePath },
        responseType: "blob"
      });
    });

    it("should get file info successfully", async () => {
      const mockFileInfo = {
        name: "ucPHS.txt",
        size: 1024,
        modified: "2024-01-15T10:30:00Z",
        type: "text/plain"
      };

      const mockInstance = mockedAxios.create(mockedAxios.create as any);
      mockInstance.get = vi.fn().mockResolvedValue({ data: mockFileInfo });

      const result = await api.getFileInfo(phoneId, filePath);

      expect(result).toEqual(mockFileInfo);
      expect(mockInstance.get).toHaveBeenCalledWith(`/api/phones/${phoneId}/file-info`, {
        params: { path: filePath }
      });
    });

    it("should delete file successfully", async () => {
      const mockInstance = mockedAxios.create(mockedAxios.create as any);
      mockInstance.delete = vi.fn().mockResolvedValue({});

      await api.deleteFile(phoneId, filePath);

      expect(mockInstance.delete).toHaveBeenCalledWith(`/api/phones/${phoneId}/file`, {
        params: { path: filePath }
      });
    });

    it("should handle file operation errors", async () => {
      const mockInstance = mockedAxios.create(mockedAxios.create as any);
      mockInstance.get = vi.fn().mockRejectedValue(new Error("File not found"));

      await expect(api.downloadFile(phoneId, filePath)).rejects.toThrow(
        "Failed to download file: Error: File not found"
      );
    });
  });

  describe("APK Installation", () => {
    it("should install APK successfully", async () => {
      const mockApk = new File(["apk content"], "app.apk", {
        type: "application/vnd.android.package-archive"
      });
      const mockInstance = mockedAxios.create(mockedAxios.create as any);
      mockInstance.post = vi.fn().mockResolvedValue({});

      await api.installApk("phone-1", mockApk);

      expect(mockInstance.post).toHaveBeenCalledWith(
        `/api/phones/phone-1/install`,
        expect.any(FormData),
        {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );
    });
  });

  describe("Phone Monitoring", () => {
    it("should get phone logs successfully", async () => {
      const mockLogs = ["Log line 1", "Log line 2", "Log line 3"];
      const mockInstance = mockedAxios.create(mockedAxios.create as any);
      mockInstance.get = vi.fn().mockResolvedValue({ data: mockLogs });

      const result = await api.getPhoneLogs("phone-1", 100);

      expect(result).toEqual(mockLogs);
      expect(mockInstance.get).toHaveBeenCalledWith(`/api/phones/phone-1/logs`, {
        params: { limit: 100 }
      });
    });

    it("should get screenshot successfully", async () => {
      const mockImageData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header
      const mockInstance = mockedAxios.create(mockedAxios.create as any);
      mockInstance.get = vi.fn().mockResolvedValue({ data: mockImageData.buffer });

      const result = await api.getScreenshot("phone-1");

      expect(result).toMatch(/^data:image\/png;base64,/);
      expect(mockInstance.get).toHaveBeenCalledWith(`/api/phones/phone-1/screenshot`, {
        responseType: "arraybuffer"
      });
    });
  });

  describe("Mock Data", () => {
    it("should return valid mock data", async () => {
      const mockData = await api.getMockData();

      expect(mockData).toHaveProperty("account");
      expect(mockData).toHaveProperty("phones");
      expect(mockData.phones).toHaveLength(3);

      // Validate account structure
      expect(mockData.account).toMatchObject({
        id: expect.any(String),
        email: expect.any(String),
        balance: expect.any(Number),
        currency: expect.any(String),
        totalPhones: expect.any(Number),
        activePhones: expect.any(Number),
        plan: expect.any(String),
        expiresAt: expect.any(String)
      });

      // Validate phone structure
      mockData.phones.forEach((phone) => {
        expect(phone).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          status: expect.stringMatching(/online|offline|starting|stopping/),
          region: expect.any(String),
          lastUsed: expect.any(String),
          createdAt: expect.any(String),
          specs: {
            cpu: expect.any(String),
            memory: expect.any(String),
            storage: expect.any(String)
          }
        });

        if (phone.proxy) {
          expect(phone.proxy).toMatchObject({
            ip: expect.any(String),
            port: expect.any(Number),
            username: expect.any(String),
            password: expect.any(String)
          });
        }
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      const mockInstance = mockedAxios.create(mockedAxios.create as any);
      mockInstance.get = vi.fn().mockRejectedValue(new Error("Network timeout"));

      await expect(api.getPhones()).rejects.toThrow(
        "Failed to fetch phones: Error: Network timeout"
      );
    });

    it("should handle API errors gracefully", async () => {
      const mockInstance = mockedAxios.create(mockedAxios.create as any);
      mockInstance.post = vi.fn().mockRejectedValue(new Error("API Error: Invalid request"));

      await expect(api.startPhone("invalid-phone")).rejects.toThrow(
        "Failed to start phone: Error: API Error: Invalid request"
      );
    });
  });
});
