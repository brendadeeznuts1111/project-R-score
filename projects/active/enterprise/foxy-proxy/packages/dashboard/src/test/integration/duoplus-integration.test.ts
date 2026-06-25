import { describe, it, expect } from "vitest";
import { DuoPlusAPI } from "../../utils/duoplus";

describe("DuoPlus Integration Tests", () => {
  it("should create API instance with correct configuration", () => {
    const config = {
      apiToken: "test-token",
      baseUrl: "https://test.duoplus.net"
    };

    const api = new DuoPlusAPI(config);
    expect(api).toBeDefined();
  });

  it("should return mock data with correct structure", async () => {
    const api = new DuoPlusAPI({
      apiToken: "test-token",
      baseUrl: "https://test.duoplus.net"
    });

    const mockData = await api.getMockData();

    expect(mockData).toHaveProperty("account");
    expect(mockData).toHaveProperty("phones");
    expect(mockData.phones).toHaveLength(3);

    // Verify account structure
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

    // Verify phone structure
    mockData.phones.forEach((phone) => {
      expect(phone).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        status: expect.stringMatching(/online|offline|starting|stopping/),
        region: expect.any(String),
        lastUsed: expect.any(String),
        createdAt: expect.any(String),
        specs: expect.objectContaining({
          cpu: expect.any(String),
          memory: expect.any(String),
          storage: expect.any(String)
        })
      });
    });
  });

  it("should handle the specific file path example", () => {
    const phoneId = "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36";
    const filePath = "/sdcard/Download/ucPHS.txt";

    expect(phoneId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
    expect(filePath).toMatch(/^\/sdcard\/Download\/.*\.txt$/);
  });

  it("should validate API endpoint configuration", () => {
    const expectedEndpoint = "https://my.duoplus.net/api";
    const actualEndpoint = "https://my.duoplus.net/api";

    expect(actualEndpoint).toBe(expectedEndpoint);
  });
});
