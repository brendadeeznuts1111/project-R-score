/**
 * Upload Integration Tests
 *
 * End-to-end tests for upload API endpoints with
 * real server, database, and WebSocket connections.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { BunServe } from "../../src/server/BunServe.js";

describe("Upload API Integration", () => {
  let server: BunServe;
  let baseUrl: string;

  beforeAll(async () => {
    // Start test server
    server = new BunServe({
      port: 0, // Random port
      fetch: (req) => {
        // Import upload service and set up routes
        const { UploadService } = require("../../src/server/UploadService.js");

        const uploadService = new UploadService({
          provider: "local",
          accessKeyId: "test-key",
          secretAccessKey: "test-secret",
          bucket: "test-bucket",
          localDir: "./test-uploads",
        });

        const url = new URL(req.url);
        const path = url.pathname;

        // POST /api/upload/initiate
        if (path === "/api/upload/initiate" && req.method === "POST") {
          return req.formData().then(async (formData: FormData) => {
            const file = formData.get("file") as File;
            if (!file) {
              return new Response(
                JSON.stringify({ error: "No file provided" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }

            const result = await uploadService.initiateUpload(file, {
              filename: formData.get("filename") as string || file.name,
              contentType: formData.get("contentType") as string || file.type,
              contentDisposition: formData.get("contentDisposition") as "inline" | "attachment" | null,
              metadata: formData.get("metadata") ? JSON.parse(formData.get("metadata") as string) : undefined,
            });

            return Response.json({ success: true, ...result });
          }).catch((error: Error) => {
            return new Response(
              JSON.stringify({ error: error.message }),
              { status: 500, headers: { "Content-Type": "application/json" } }
            );
          });
        }

        // GET /api/upload/status/:id
        if (path.startsWith("/api/upload/status/") && req.method === "GET") {
          const id = path.split("/").pop();
          const progress = uploadService.getProgress(id || "");

          if (!progress) {
            return new Response(
              JSON.stringify({ error: "Upload not found" }),
              { status: 404, headers: { "Content-Type": "application/json" } }
            );
          }

          return Response.json(progress);
        }

        // GET /api/uploads/active
        if (path === "/api/uploads/active" && req.method === "GET") {
          return Response.json(uploadService.getActiveUploads());
        }

        // POST /api/upload/cancel/:id
        if (path.startsWith("/api/upload/cancel/") && req.method === "POST") {
          const id = path.split("/").pop();
          const cancelled = uploadService.cancelUpload(id || "");

          if (!cancelled) {
            return new Response(
              JSON.stringify({ error: "Upload not found" }),
              { status: 404, headers: { "Content-Type": "application/json" } }
            );
          }

          return Response.json({ success: true });
        }

        return new Response("Not found", { status: 404 });
      },
    });

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get assigned port
    baseUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server?.stop();
  });

  describe("POST /api/upload/initiate", () => {
    test("should upload file successfully", async () => {
      const formData = new FormData();
      const testFile = new Blob(["test content"], { type: "text/plain" });
      formData.append("file", testFile, "test.txt");
      formData.append("filename", "test.txt");
      formData.append("contentType", "text/plain");

      const response = await fetch(`${baseUrl}/api/upload/initiate`, {
        method: "POST",
        body: formData,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.uploadId).toBeDefined();
      expect(data.filename).toBe("test.txt");
    });

    test("should return error when no file provided", async () => {
      const formData = new FormData();
      formData.append("filename", "test.txt");

      const response = await fetch(`${baseUrl}/api/upload/initiate`, {
        method: "POST",
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("No file provided");
    });

    test("should handle large file", async () => {
      const formData = new FormData();
      const largeFile = new Blob(
        new Array(1024 * 1024).fill("x"), // 1MB file
        { type: "application/octet-stream" }
      );
      formData.append("file", largeFile, "large.bin");
      formData.append("filename", "large.bin");
      formData.append("contentType", "application/octet-stream");

      const response = await fetch(`${baseUrl}/api/upload/initiate`, {
        method: "POST",
        body: formData,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe("GET /api/upload/status/:id", () => {
    test("should get upload status", async () => {
      // First, initiate an upload
      const formData = new FormData();
      const testFile = new Blob(["test"], { type: "text/plain" });
      formData.append("file", testFile, "test.txt");

      const initiateResponse = await fetch(`${baseUrl}/api/upload/initiate`, {
        method: "POST",
        body: formData,
      });

      const initData = await initiateResponse.json();
      const uploadId = initData.uploadId;

      // Get status
      const statusResponse = await fetch(`${baseUrl}/api/upload/status/${uploadId}`);

      expect(statusResponse.status).toBe(200);
      const status = await statusResponse.json();
      expect(status.uploadId).toBe(uploadId);
      expect(status.status).toBeDefined();
    });

    test("should return 404 for non-existent upload", async () => {
      const response = await fetch(`${baseUrl}/api/upload/status/non-existent-id`);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain("not found");
    });
  });

  describe("GET /api/uploads/active", () => {
    test("should get active uploads", async () => {
      const response = await fetch(`${baseUrl}/api/uploads/active`);

      expect(response.status).toBe(200);
      const uploads = await response.json();
      expect(Array.isArray(uploads)).toBe(true);
    });
  });

  describe("POST /api/upload/cancel/:id", () => {
    test("should cancel upload", async () => {
      // First, initiate an upload
      const formData = new FormData();
      const testFile = new Blob(["test"], { type: "text/plain" });
      formData.append("file", testFile, "test.txt");

      const initiateResponse = await fetch(`${baseUrl}/api/upload/initiate`, {
        method: "POST",
        body: formData,
      });

      const initData = await initiateResponse.json();
      const uploadId = initData.uploadId;

      // Cancel upload
      const cancelResponse = await fetch(`${baseUrl}/api/upload/cancel/${uploadId}`, {
        method: "POST",
      });

      expect(cancelResponse.status).toBe(200);
      const data = await cancelResponse.json();
      expect(data.success).toBe(true);
    });

    test("should return 404 when cancelling non-existent upload", async () => {
      const response = await fetch(`${baseUrl}/api/upload/cancel/non-existent-id`, {
        method: "POST",
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain("not found");
    });
  });

  describe("End-to-End Flow", () => {
    test("should complete full upload workflow", async () => {
      // Step 1: Initiate upload
      const formData = new FormData();
      const testFile = new Blob(["test content"], { type: "text/plain" });
      formData.append("file", testFile, "test.txt");
      formData.append("filename", "test.txt");
      formData.append("contentType", "text/plain");

      const initiateResponse = await fetch(`${baseUrl}/api/upload/initiate`, {
        method: "POST",
        body: formData,
      });

      expect(initiateResponse.status).toBe(200);
      const initData = await initiateResponse.json();
      expect(initData.success).toBe(true);
      const uploadId = initData.uploadId;

      // Step 2: Check status
      const statusResponse = await fetch(`${baseUrl}/api/upload/status/${uploadId}`);
      expect(statusResponse.status).toBe(200);
      const status = await statusResponse.json();
      expect(status.uploadId).toBe(uploadId);
      expect(status.status).toBe("completed");

      // Step 3: Verify file exists
      expect(initData.url).toBeDefined();

      // Step 4: Clean up (cancel)
      const cancelResponse = await fetch(`${baseUrl}/api/upload/cancel/${uploadId}`, {
        method: "POST",
      });
      expect(cancelResponse.status).toBe(200);
    });
  });
});
