/**
 * 🧪 Type Tests for Registry Binary Manager
 * Run: bun test scripts/__tests__/registry-binary-manager.types.test.ts
 */

import { describe, expectTypeOf, test } from "bun:test";

// Import types from the manager (these would be exported in a real implementation)
type BinaryPlatform =
	| "linux-x64"
	| "linux-arm64"
	| "darwin-x64"
	| "darwin-arm64"
	| "windows-x64";
type BucketAction = "upload" | "version" | "presign" | "run" | "list";

interface BinaryMetadata {
	filename: string;
	key: string;
	sizeMB: number;
	platform: BinaryPlatform;
	success: boolean;
}

interface S3ClientConfig {
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
	endpoint?: string;
	region?: string;
}

// Mock build-time constants for type testing
declare const BUILD_VERSION: string;
declare const BUILD_TIME: string;
declare const GIT_COMMIT: string;

describe("Type Safety Tests", () => {
	test("Build-time constants are strings", () => {
		expectTypeOf<typeof BUILD_VERSION>().toBeString();
		expectTypeOf<typeof BUILD_TIME>().toBeString();
		expectTypeOf<typeof GIT_COMMIT>().toBeString();
	});

	test("BinaryPlatform is correct union type", () => {
		expectTypeOf<BinaryPlatform>().toEqualTypeOf<
			| "linux-x64"
			| "linux-arm64"
			| "darwin-x64"
			| "darwin-arm64"
			| "windows-x64"
		>();

		// Test individual platforms
		const linux: BinaryPlatform = "linux-x64";
		const darwin: BinaryPlatform = "darwin-arm64";
		const windows: BinaryPlatform = "windows-x64";

		expectTypeOf(linux).toBeString();
		expectTypeOf(darwin).toBeString();
		expectTypeOf(windows).toBeString();
	});

	test("BucketAction is correct union type", () => {
		expectTypeOf<BucketAction>().toEqualTypeOf<
			"upload" | "version" | "presign" | "run" | "list"
		>();

		const actions: BucketAction[] = ["upload", "version", "run"];
		expectTypeOf(actions).toBeArray();
	});

	test("BinaryMetadata interface structure", () => {
		const metadata: BinaryMetadata = {
			filename: "test-binary",
			key: "v1.0.0/test-binary",
			sizeMB: 10.5,
			platform: "linux-x64",
			success: true,
		};

		expectTypeOf(metadata.filename).toBeString();
		expectTypeOf(metadata.key).toBeString();
		expectTypeOf(metadata.sizeMB).toBeNumber();
		expectTypeOf(metadata.platform).toEqualTypeOf<BinaryPlatform>();
		expectTypeOf(metadata.success).toBeBoolean();
	});

	test("S3ClientConfig interface structure", () => {
		const config: S3ClientConfig = {
			accessKeyId: "test-key",
			secretAccessKey: "test-secret",
			bucket: "test-bucket",
			endpoint: "https://s3.example.com",
			region: "us-east-1",
		};

		expectTypeOf(config.accessKeyId).toBeString();
		expectTypeOf(config.secretAccessKey).toBeString();
		expectTypeOf(config.bucket).toBeString();
		expectTypeOf(config.endpoint).toBeString();
		expectTypeOf(config.region).toBeString();
	});

	test("S3ClientConfig with optional fields", () => {
		const minimalConfig: S3ClientConfig = {
			accessKeyId: "test-key",
			secretAccessKey: "test-secret",
			bucket: "test-bucket",
		};

		expectTypeOf(minimalConfig.endpoint).toEqualTypeOf<string | undefined>();
		expectTypeOf(minimalConfig.region).toEqualTypeOf<string | undefined>();
	});

	test("Platform detection returns BinaryPlatform", () => {
		async function detectPlatform(): Promise<BinaryPlatform> {
			return "linux-x64";
		}

		expectTypeOf(detectPlatform()).resolves.toEqualTypeOf<BinaryPlatform>();
	});

	test("Upload result types", () => {
		async function uploadBinary(): Promise<BinaryMetadata | null> {
			return {
				filename: "test",
				key: "v1.0.0/test",
				sizeMB: 10,
				platform: "linux-x64",
				success: true,
			};
		}

		expectTypeOf(
			uploadBinary(),
		).resolves.toEqualTypeOf<BinaryMetadata | null>();
	});

	test("Array of BinaryMetadata", () => {
		const uploads: BinaryMetadata[] = [
			{
				filename: "binary1",
				key: "v1.0.0/binary1",
				sizeMB: 5.2,
				platform: "linux-x64",
				success: true,
			},
			{
				filename: "binary2",
				key: "v1.0.0/binary2",
				sizeMB: 6.1,
				platform: "darwin-arm64",
				success: true,
			},
		];

		expectTypeOf(uploads).toBeArray();
		expectTypeOf(uploads[0]?.platform).toEqualTypeOf<
			BinaryPlatform | undefined
		>();
	});

	test("Union types work correctly", () => {
		const action: BucketAction = "upload";
		expectTypeOf(action).toEqualTypeOf<
			"upload" | "version" | "presign" | "run" | "list"
		>();

		// Type narrowing
		if (action === "upload" || action === "run") {
			expectTypeOf(action).toEqualTypeOf<"upload" | "run">();
		}
	});

	test("Generic promise types", () => {
		async function getMetadata(): Promise<BinaryMetadata[]> {
			return [];
		}

		expectTypeOf(getMetadata()).resolves.toBeArray();
	});
});

describe("Integration Type Tests", () => {
	test("Manager class types", () => {
		class MockManager {
			async uploadAll(): Promise<BinaryMetadata[]> {
				return [];
			}

			async detectPlatform(): Promise<BinaryPlatform> {
				return "linux-x64";
			}

			async getVersion(): Promise<string> {
				return "1.0.0";
			}
		}

		const manager = new MockManager();

		expectTypeOf(manager.uploadAll()).resolves.toBeArray();
		expectTypeOf(manager.detectPlatform()).resolves.toBeString();
		expectTypeOf(manager.getVersion()).resolves.toBeString();
	});

	test("Function parameter types", () => {
		function uploadBinary(
			_filePath: string,
			_version: string,
			_platform: BinaryPlatform,
		): Promise<BinaryMetadata | null> {
			return Promise.resolve(null);
		}

		expectTypeOf(uploadBinary).toEqualTypeOf<
			(
				filePath: string,
				version: string,
				platform: BinaryPlatform,
			) => Promise<BinaryMetadata | null>
		>();
	});
});
