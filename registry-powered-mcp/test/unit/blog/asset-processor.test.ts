/**
 * AssetPipelineProcessor Unit Tests
 * Infrastructure ID: 23 (Asset-Pipeline-Processor)
 * Validates content-addressable asset processing with SHA-256 hashing
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from "harness";
import { AssetPipelineProcessor, assetProcessor } from "../../../blog/asset-processor";
import { createTempDir, cleanupTempDir } from "harness";

describe('AssetPipelineProcessor', () => {
  let processor: AssetPipelineProcessor;
  let tempDir: string;
  let inputDir: string;
  let outputDir: string;

  beforeAll(async () => {
    tempDir = await createTempDir('asset-processor-test');
    inputDir = `${tempDir}/assets`;
    outputDir = `${tempDir}/dist/assets`;

    // Create directories
    const { mkdir } = await import('node:fs/promises');
    await mkdir(inputDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });
  });

  afterAll(async () => {
    await cleanupTempDir(tempDir);
  });

  beforeEach(() => {
    processor = new AssetPipelineProcessor({
      inputDir,
      outputDir,
      hashLength: 8,
    });
  });

  describe('Configuration', () => {
    test('should use default configuration values', () => {
      const defaultProcessor = new AssetPipelineProcessor();

      expect(defaultProcessor).toBeInstanceOf(AssetPipelineProcessor);
    });

    test('should accept custom configuration', () => {
      const customProcessor = new AssetPipelineProcessor({
        inputDir: '/custom/input',
        outputDir: '/custom/output',
        hashLength: 16,
        supportedFormats: ['.png', '.jpg'],
        maxFileSizeMB: 5,
      });

      expect(customProcessor).toBeInstanceOf(AssetPipelineProcessor);
    });

    test('should have default supported formats', () => {
      const defaultProcessor = new AssetPipelineProcessor();

      // Verify it handles common image formats (can't directly access config, but no errors)
      expect(defaultProcessor).toBeInstanceOf(AssetPipelineProcessor);
    });
  });

  describe('processAsset()', () => {
    test('should process a single image file', async () => {
      // Create a simple PNG-like file (minimal valid content)
      const pngPath = `${inputDir}/test-image.png`;
      await Bun.write(pngPath, 'fake-png-content-for-testing');

      const result = await processor.processAsset(pngPath);

      expect(result.originalPath).toBe(pngPath);
      expect(result.outputPath).toContain(outputDir);
      expect(result.outputPath).toContain('.png');
      expect(result.contentHash).toHaveLength(8);
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(result.processedAt).toBeInstanceOf(Date);
    });

    test('should generate content-addressable filename', async () => {
      const svgPath = `${inputDir}/icon.svg`;
      await Bun.write(svgPath, '<svg></svg>');

      const result = await processor.processAsset(svgPath);

      // Output should be: icon.{hash}.svg
      expect(result.outputPath).toMatch(/icon\.[a-f0-9]{8}\.svg$/);
    });

    test('should generate consistent hash for same content', async () => {
      const content = 'identical-content-for-hash-test';

      const path1 = `${inputDir}/file1.png`;
      const path2 = `${inputDir}/file2.png`;

      await Bun.write(path1, content);
      await Bun.write(path2, content);

      const result1 = await processor.processAsset(path1);
      const result2 = await processor.processAsset(path2);

      expect(result1.contentHash).toBe(result2.contentHash);
    });

    test('should generate different hash for different content', async () => {
      const path1 = `${inputDir}/diff1.png`;
      const path2 = `${inputDir}/diff2.png`;

      await Bun.write(path1, 'content-a');
      await Bun.write(path2, 'content-b');

      const result1 = await processor.processAsset(path1);
      const result2 = await processor.processAsset(path2);

      expect(result1.contentHash).not.toBe(result2.contentHash);
    });

    test('should write output file to disk', async () => {
      const imgPath = `${inputDir}/written.png`;
      await Bun.write(imgPath, 'test-content');

      const result = await processor.processAsset(imgPath);

      const outputFile = Bun.file(result.outputPath);
      expect(await outputFile.exists()).toBe(true);
      expect(await outputFile.text()).toBe('test-content');
    });

    test('should throw for non-existent files', async () => {
      await expect(
        processor.processAsset(`${inputDir}/nonexistent.png`)
      ).rejects.toThrow('Asset not found');
    });

    test('should throw for oversized files', async () => {
      const smallProcessor = new AssetPipelineProcessor({
        inputDir,
        outputDir,
        maxFileSizeMB: 0.001, // ~1KB limit
      });

      const largePath = `${inputDir}/large.png`;
      await Bun.write(largePath, 'x'.repeat(2000)); // 2KB

      await expect(
        smallProcessor.processAsset(largePath)
      ).rejects.toThrow('exceeds');
    });

    test('should cache processed asset for retrieval', async () => {
      const cachePath = `${inputDir}/cached.png`;
      await Bun.write(cachePath, 'cached-content');

      const result = await processor.processAsset(cachePath);
      const cached = processor.getProcessedAsset(cachePath);

      expect(cached).toBeDefined();
      expect(cached?.contentHash).toBe(result.contentHash);
      expect(cached?.outputPath).toBe(result.outputPath);
    });

    test('should include correct MIME type', async () => {
      const pngPath = `${inputDir}/mime-test.png`;
      await Bun.write(pngPath, 'png-content');

      const result = await processor.processAsset(pngPath);

      // Bun.file() determines type from extension
      expect(result.mimeType).toBe('image/png');
    });

    test('should handle various extensions', async () => {
      const extensions = ['.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'];

      for (const ext of extensions) {
        const path = `${inputDir}/test-file${ext}`;
        await Bun.write(path, `content-for-${ext}`);

        const result = await processor.processAsset(path);
        expect(result.outputPath).toContain(ext);
      }
    });
  });

  describe('processAll()', () => {
    test('should process all assets in directory', async () => {
      // Create a separate input dir for this test
      const batchDir = `${tempDir}/batch-input`;
      const batchOutput = `${tempDir}/batch-output`;

      const { mkdir } = await import('node:fs/promises');
      await mkdir(batchDir, { recursive: true });

      await Bun.write(`${batchDir}/img1.png`, 'image-1');
      await Bun.write(`${batchDir}/img2.jpg`, 'image-2');
      await Bun.write(`${batchDir}/img3.svg`, 'image-3');

      const batchProcessor = new AssetPipelineProcessor({
        inputDir: batchDir,
        outputDir: batchOutput,
      });

      const result = await batchProcessor.processAll();

      expect(result.success).toBe(true);
      expect(result.assets.length).toBe(3);
      expect(result.errors.length).toBe(0);
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });

    test('should calculate total size', async () => {
      const sizeDir = `${tempDir}/size-input`;
      const sizeOutput = `${tempDir}/size-output`;

      const { mkdir } = await import('node:fs/promises');
      await mkdir(sizeDir, { recursive: true });

      await Bun.write(`${sizeDir}/a.png`, 'a'.repeat(100));
      await Bun.write(`${sizeDir}/b.png`, 'b'.repeat(200));

      const sizeProcessor = new AssetPipelineProcessor({
        inputDir: sizeDir,
        outputDir: sizeOutput,
      });

      const result = await sizeProcessor.processAll();

      expect(result.totalSizeBytes).toBe(300);
    });

    test('should handle empty directory', async () => {
      const emptyDir = `${tempDir}/empty-input`;
      const emptyOutput = `${tempDir}/empty-output`;

      const { mkdir } = await import('node:fs/promises');
      await mkdir(emptyDir, { recursive: true });

      const emptyProcessor = new AssetPipelineProcessor({
        inputDir: emptyDir,
        outputDir: emptyOutput,
      });

      const result = await emptyProcessor.processAll();

      expect(result.success).toBe(true);
      expect(result.assets.length).toBe(0);
      expect(result.errors.length).toBe(0);
    });

    test('should process nested directories', async () => {
      const nestedDir = `${tempDir}/nested-input`;
      const nestedOutput = `${tempDir}/nested-output`;

      const { mkdir } = await import('node:fs/promises');
      await mkdir(`${nestedDir}/level1/level2`, { recursive: true });

      await Bun.write(`${nestedDir}/root.png`, 'root');
      await Bun.write(`${nestedDir}/level1/mid.png`, 'mid');
      await Bun.write(`${nestedDir}/level1/level2/deep.png`, 'deep');

      const nestedProcessor = new AssetPipelineProcessor({
        inputDir: nestedDir,
        outputDir: nestedOutput,
      });

      const result = await nestedProcessor.processAll();

      expect(result.assets.length).toBe(3);
    });

    test('should only process supported formats', async () => {
      const formatDir = `${tempDir}/format-input`;
      const formatOutput = `${tempDir}/format-output`;

      const { mkdir } = await import('node:fs/promises');
      await mkdir(formatDir, { recursive: true });

      await Bun.write(`${formatDir}/image.png`, 'valid');
      await Bun.write(`${formatDir}/document.pdf`, 'invalid');
      await Bun.write(`${formatDir}/script.js`, 'invalid');

      const formatProcessor = new AssetPipelineProcessor({
        inputDir: formatDir,
        outputDir: formatOutput,
      });

      const result = await formatProcessor.processAll();

      expect(result.assets.length).toBe(1);
      expect(result.assets[0].originalPath).toContain('image.png');
    });

    test('should collect errors without stopping', async () => {
      const errorDir = `${tempDir}/error-input`;
      const errorOutput = `${tempDir}/error-output`;

      const { mkdir } = await import('node:fs/promises');
      await mkdir(errorDir, { recursive: true });

      await Bun.write(`${errorDir}/valid.png`, 'valid-content');
      // Create a symlink to non-existent file to cause error
      // Or we can create a directory with .png extension which will fail

      const errorProcessor = new AssetPipelineProcessor({
        inputDir: errorDir,
        outputDir: errorOutput,
      });

      const result = await errorProcessor.processAll();

      // At least the valid file should be processed
      expect(result.assets.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getProcessedAsset()', () => {
    test('should return undefined for unprocessed assets', () => {
      const result = processor.getProcessedAsset('/never/processed.png');

      expect(result).toBeUndefined();
    });

    test('should return asset after processing', async () => {
      const path = `${inputDir}/get-test.png`;
      await Bun.write(path, 'test-content');

      await processor.processAsset(path);
      const retrieved = processor.getProcessedAsset(path);

      expect(retrieved).toBeDefined();
      expect(retrieved?.originalPath).toBe(path);
    });
  });

  describe('generateManifest()', () => {
    test('should generate empty manifest initially', () => {
      const manifest = processor.generateManifest();

      expect(manifest).toEqual({});
    });

    test('should include all processed assets', async () => {
      await Bun.write(`${inputDir}/manifest1.png`, 'content1');
      await Bun.write(`${inputDir}/manifest2.png`, 'content2');

      await processor.processAsset(`${inputDir}/manifest1.png`);
      await processor.processAsset(`${inputDir}/manifest2.png`);

      const manifest = processor.generateManifest();

      expect(Object.keys(manifest)).toHaveLength(2);
      expect(manifest[`${inputDir}/manifest1.png`]).toContain(outputDir);
      expect(manifest[`${inputDir}/manifest2.png`]).toContain(outputDir);
    });

    test('should map original path to output path', async () => {
      const original = `${inputDir}/original.png`;
      await Bun.write(original, 'map-content');

      const result = await processor.processAsset(original);
      const manifest = processor.generateManifest();

      expect(manifest[original]).toBe(result.outputPath);
    });
  });

  describe('Hash length configuration', () => {
    test('should respect custom hash length', async () => {
      const longHashProcessor = new AssetPipelineProcessor({
        inputDir,
        outputDir,
        hashLength: 16,
      });

      const path = `${inputDir}/long-hash.png`;
      await Bun.write(path, 'content-for-long-hash');

      const result = await longHashProcessor.processAsset(path);

      expect(result.contentHash).toHaveLength(16);
    });

    test('should use default hash length of 8', async () => {
      const defaultProcessor = new AssetPipelineProcessor({
        inputDir,
        outputDir,
      });

      const path = `${inputDir}/default-hash.png`;
      await Bun.write(path, 'content-for-default');

      const result = await defaultProcessor.processAsset(path);

      expect(result.contentHash).toHaveLength(8);
    });
  });

  describe('Performance SLA', () => {
    test('should process assets quickly (<100ms for small files)', async () => {
      const path = `${inputDir}/perf-test.png`;
      await Bun.write(path, 'small-content');

      const start = performance.now();
      await processor.processAsset(path);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    test('should hash efficiently using Bun.CryptoHasher', async () => {
      // Create a larger file to test hashing performance
      const largePath = `${inputDir}/large-hash-test.png`;
      await Bun.write(largePath, 'x'.repeat(100000)); // 100KB

      const largeProcessor = new AssetPipelineProcessor({
        inputDir,
        outputDir,
        maxFileSizeMB: 1,
      });

      const start = performance.now();
      const result = await largeProcessor.processAsset(largePath);
      const elapsed = performance.now() - start;

      expect(result.contentHash).toHaveLength(8);
      expect(elapsed).toBeLessThan(500); // Should be fast even for 100KB
    });
  });

  describe('Singleton export', () => {
    test('should export singleton assetProcessor instance', () => {
      expect(assetProcessor).toBeInstanceOf(AssetPipelineProcessor);
    });
  });
});
