import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import TensionTCPServerArchiver from "./tension-tcp-server";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";

describe("[64.0.0.0] TensionTCPServer Log Archiver", () => {
  let archiver: TensionTCPServerArchiver;
  let testDir: string;

  beforeEach(() => {
    archiver = new TensionTCPServerArchiver();
    testDir = join(import.meta.dir, ".test-logs");
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    archiver.clear();
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("[64.1.0.0] Archive Creation", () => {
    it("[64.1.1.0] should create archive from log files", async () => {
      // Create test log files
      writeFileSync(join(testDir, "app.log"), "Application logs\n".repeat(100));
      writeFileSync(join(testDir, "error.log"), "Error logs\n".repeat(50));

      const blob = await archiver.archiveLogs(testDir);

      expect(blob).toBeDefined();
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toBe("application/octet-stream");
    });

    it("[64.1.2.0] should handle empty directory", async () => {
      const blob = await archiver.archiveLogs(testDir);

      expect(blob).toBeDefined();
      expect(blob.size).toBeGreaterThanOrEqual(0);
    });

    it("[64.1.3.0] should compress with gzip", async () => {
      writeFileSync(join(testDir, "test.log"), "x".repeat(10000));

      const blob = await archiver.archiveLogs(testDir, {
        format: "gzip",
        level: 9,
      });
      const metadata = archiver.getMetadata();

      expect(metadata?.format).toBe("gzip");
      expect(metadata?.level).toBe(9);
      expect(metadata?.compressionRatio).toBeLessThan(100);
    });
  });

  describe("[64.2.0.0] Metadata Tracking", () => {
    it("[64.2.1.0] should track archive metadata", async () => {
      writeFileSync(join(testDir, "app.log"), "Test log content");

      await archiver.archiveLogs(testDir);
      const metadata = archiver.getMetadata();

      expect(metadata).toBeDefined();
      expect(metadata?.fileCount).toBe(1);
      expect(metadata?.originalSize).toBeGreaterThan(0);
      expect(metadata?.compressedSize).toBeGreaterThan(0);
      expect(metadata?.status).toBe("completed");
    });

    it("[64.2.2.0] should calculate compression ratio", async () => {
      writeFileSync(join(testDir, "large.log"), "x".repeat(50000));

      await archiver.archiveLogs(testDir);
      const metadata = archiver.getMetadata();

      expect(metadata?.compressionRatio).toBeGreaterThan(0);
      expect(metadata?.compressionRatio).toBeLessThan(100);
    });

    it("[64.2.3.0] should generate unique archive ID", async () => {
      writeFileSync(join(testDir, "test.log"), "content");

      await archiver.archiveLogs(testDir);
      const metadata1 = archiver.getMetadata();

      archiver.clear();

      await archiver.archiveLogs(testDir);
      const metadata2 = archiver.getMetadata();

      expect(metadata1?.archiveId).not.toBe(metadata2?.archiveId);
    });
  });

  describe("[64.3.0.0] Storage Integration", () => {
    it("[64.3.1.0] should prepare KV upload key", async () => {
      writeFileSync(join(testDir, "test.log"), "content");

      const blob = await archiver.archiveLogs(testDir);
      const metadata = archiver.getMetadata();

      expect(metadata?.archiveId).toBeDefined();
      expect(metadata?.timestamp).toBeGreaterThan(0);
    });

    it("[64.3.2.0] should prepare S3 upload key", async () => {
      writeFileSync(join(testDir, "test.log"), "content");

      const blob = await archiver.archiveLogs(testDir);
      const metadata = archiver.getMetadata();

      expect(metadata?.archiveId).toBeDefined();
      expect(metadata?.fileCount).toBeGreaterThan(0);
    });
  });

  describe("[64.4.0.0] Error Handling", () => {
    it("[64.4.1.0] should throw on KV upload without metadata", async () => {
      const mockKV = {};

      try {
        await archiver.uploadToKV(new Blob(), mockKV);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain("No archive metadata");
      }
    });

    it("[64.4.2.0] should throw on S3 upload without metadata", async () => {
      try {
        await archiver.uploadToS3(new Blob(), "bucket");
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain("No archive metadata");
      }
    });

    it("[64.4.3.0] should clear state properly", async () => {
      writeFileSync(join(testDir, "test.log"), "content");

      await archiver.archiveLogs(testDir);
      expect(archiver.getMetadata()).toBeDefined();

      archiver.clear();
      expect(archiver.getMetadata()).toBeNull();
    });
  });
});

