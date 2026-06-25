/**
 * Tests for S3 Fetcher utilities
 */

import { describe, it, expect, mock, beforeEach } from "bun:test";
import { 
  fetchS3Object, 
  fetchS3Text, 
  fetchS3JSON, 
  checkS3ObjectExists,
  listS3Objects,
  S3Credentials 
} from "./s3-fetcher";

// Mock fetch to avoid actual S3 calls in tests
const mockFetch = mock(() => Promise.resolve({
  ok: true,
  status: 200,
  statusText: "OK",
  text: () => Promise.resolve('{"test": "data"}'),
  json: () => Promise.resolve({ test: "data" }),
  preconnect: () => Promise.resolve(),
}));

global.fetch = mockFetch as any;

describe("S3 Fetcher", () => {
  const testS3Url = "s3://test-bucket/test-object.json";
  const testCredentials: S3Credentials = {
    accessKeyId: "test-key",
    secretAccessKey: "test-secret",
    region: "us-east-1"
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("fetchS3Object", () => {
    it("should fetch S3 object with environment credentials", async () => {
      await fetchS3Object(testS3Url);
      
      expect(mockFetch).toHaveBeenCalledWith(testS3Url, {});
    });

    it("should fetch S3 object with explicit credentials", async () => {
      await fetchS3Object(testS3Url, {
        credentials: testCredentials,
        headers: { "Content-Type": "application/json" }
      });
      
      expect(mockFetch).toHaveBeenCalledWith(testS3Url, {
        s3: testCredentials,
        headers: { "Content-Type": "application/json" }
      });
    });

    it("should include method and body when provided", async () => {
      await fetchS3Object(testS3Url, {
        method: "PUT",
        body: '{"test": "data"}'
      });
      
      expect(mockFetch).toHaveBeenCalledWith(testS3Url, {
        method: "PUT",
        body: '{"test": "data"}'
      });
    });
  });

  describe("fetchS3Text", () => {
    it("should return text content", async () => {
      const mockResponse = {
        ok: true,
        text: () => Promise.resolve("test content")
      };
      mockFetch.mockReturnValueOnce(mockResponse as any);

      const result = await fetchS3Text(testS3Url);
      
      expect(result).toBe("test content");
    });

    it("should throw error when response is not ok", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found"
      };
      mockFetch.mockReturnValueOnce(mockResponse as any);

      expect(fetchS3Text(testS3Url)).rejects.toThrow("S3 fetch failed: 404 Not Found");
    });
  });

  describe("fetchS3JSON", () => {
    it("should parse JSON content", async () => {
      const mockResponse = {
        ok: true,
        text: () => Promise.resolve('{"key": "value"}')
      };
      mockFetch.mockReturnValueOnce(mockResponse as any);

      const result = await fetchS3JSON(testS3Url);
      
      expect(result).toEqual({ key: "value" });
    });

    it("should throw error for invalid JSON", async () => {
      const mockResponse = {
        ok: true,
        text: () => Promise.resolve("invalid json")
      };
      mockFetch.mockReturnValueOnce(mockResponse as any);

      expect(fetchS3JSON(testS3Url)).rejects.toThrow("Failed to parse S3 JSON response");
    });
  });

  describe("checkS3ObjectExists", () => {
    it("should return true for existing object", async () => {
      const mockResponse = { ok: true };
      mockFetch.mockReturnValueOnce(mockResponse as any);

      const result = await checkS3ObjectExists(testS3Url);
      
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(testS3Url, { method: "HEAD" });
    });

    it("should return false for non-existing object", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Not found"));

      const result = await checkS3ObjectExists(testS3Url);
      
      expect(result).toBe(false);
    });
  });

  describe("listS3Objects", () => {
    it("should parse XML response and return object keys", async () => {
      const mockXML = `
        <ListBucketResult>
          <Contents>
            <Key>file1.txt</Key>
          </Contents>
          <Contents>
            <Key>file2.txt</Key>
          </Contents>
        </ListBucketResult>
      `;
      
      const mockResponse = {
        ok: true,
        text: () => Promise.resolve(mockXML)
      };
      mockFetch.mockReturnValueOnce(mockResponse as any);

      const result = await listS3Objects("s3://test-bucket/");
      
      expect(result).toEqual(["file1.txt", "file2.txt"]);
    });

    it("should throw error when list request fails", async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        statusText: "Forbidden"
      };
      mockFetch.mockReturnValueOnce(mockResponse as any);

      expect(listS3Objects("s3://test-bucket/")).rejects.toThrow("S3 list failed: 403 Forbidden");
    });
  });
});
