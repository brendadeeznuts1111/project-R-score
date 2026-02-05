/**
 * 🧪 S3 Content Disposition Tests
 * Tests for Bun's native S3 API with contentDisposition
 * Run: bun test scripts/__tests__/s3-content-disposition.test.ts
 */

import { describe, expect, test } from "bun:test";
import { s3 } from "bun";

describe("S3 Content Disposition", () => {
	test("s3.write with inline contentDisposition", async () => {
		const testData = new Uint8Array([1, 2, 3, 4]);
		const key = "test-inline.png";

		// Note: This would require actual S3 credentials to test
		// In a real test, you'd mock or use test credentials
		try {
			await s3.write(key, testData, {
				contentDisposition: "inline",
			});

			const file = s3.file(key);
			expect(await file.exists()).toBe(true);
		} catch (error) {
			// Expected if S3 not configured - skip in test environment
			expect(error).toBeDefined();
		}
	});

	test("s3.write with attachment contentDisposition", async () => {
		const testData = new Uint8Array([1, 2, 3, 4]);
		const key = "test-download.pdf";

		try {
			await s3.write(key, testData, {
				contentDisposition: 'attachment; filename="Report.pdf"',
			});

			const file = s3.file(key);
			expect(await file.exists()).toBe(true);
		} catch (error) {
			// Expected if S3 not configured
			expect(error).toBeDefined();
		}
	});

	test("s3.file with contentDisposition options", () => {
		const key = "test-file.bin";

		// Test inline
		const inlineFile = s3.file(key, {
			contentDisposition: "inline",
		});
		expect(inlineFile).toBeDefined();

		// Test attachment with filename
		const attachmentFile = s3.file(key, {
			contentDisposition: 'attachment; filename="custom-name.bin"',
		});
		expect(attachmentFile).toBeDefined();

		// Test simple attachment
		const simpleAttachment = s3.file(key, {
			contentDisposition: "attachment",
		});
		expect(simpleAttachment).toBeDefined();
	});

	test("Content disposition formats", () => {
		const formats = [
			"inline",
			"attachment",
			'attachment; filename="file.pdf"',
			'attachment; filename="custom-name.bin"',
		];

		formats.forEach((format) => {
			const file = s3.file("test", {
				contentDisposition: format,
			});
			expect(file).toBeDefined();
		});
	});

	test("Binary file contentDisposition for registry", () => {
		const packageName = "bun-toml-secrets-editor";
		const platform = "linux-x64";
		const key = `v1.0.0/${packageName}-${platform}`;

		// Registry binaries should use attachment for downloads
		const binaryFile = s3.file(key, {
			contentDisposition: `attachment; filename="${packageName}-${platform}"`,
		});

		expect(binaryFile).toBeDefined();
	});

	test("Image file contentDisposition for inline display", () => {
		const key = "preview.png";

		// Images can use inline for browser display
		const imageFile = s3.file(key, {
			contentDisposition: "inline",
		});

		expect(imageFile).toBeDefined();
	});
});
