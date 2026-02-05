// examples/bucket-integration.ts
// Bucket Storage Integration with Bun v1.3.7 features

import {
	BucketClient,
	EnhancedBucketClient,
	profile,
} from "../src/utils/bun137-features";

// Configuration Service with Bucket Integration
class ConfigService {
	private bucket: EnhancedBucketClient;

	constructor(bucketName: string) {
		this.bucket = new EnhancedBucketClient({
			bucket: bucketName,
			region: "us-east-1",
		});
	}

	@profile
	async saveConfig(config: any): Promise<void> {
		const configJson = JSON.stringify(config, null, 2);
		await this.bucket.syncToBucket(
			"app.config.json5",
			configJson,
			"application/json5",
		);
		console.log("✅ Configuration saved to bucket");
	}

	@profile
	async loadConfig(): Promise<any> {
		const result = await this.bucket.downloadWithCache("app.config.json5");
		return JSON.parse(result.content);
	}

	@profile
	async backupConfig(): Promise<string> {
		const config = await this.loadConfig();
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const backupKey = `backups/config-${timestamp}.json5`;

		await this.bucket.uploadWithProfile(
			backupKey,
			JSON.stringify(config, null, 2),
		);
		return backupKey;
	}

	listBackups(): Promise<Array<{ key: string; lastModified: string }>> {
		return this.bucket.listFiles("backups/");
	}

	clearCache(): void {
		this.bucket.clearCache();
	}
}

// Media Storage Service
class MediaService {
	private bucket: BucketClient;

	constructor(bucketName: string) {
		this.bucket = new BucketClient({
			bucket: bucketName,
			region: "us-west-2",
		});
	}

	@profile
	async uploadMedia(
		filename: string,
		content: Uint8Array,
		mimeType: string,
	): Promise<{ etag: string; url: string }> {
		const result = await this.bucket.uploadFile(
			`media/${filename}`,
			content,
			mimeType,
		);
		return {
			etag: result.etag,
			url: `https://${this.bucket.config.bucket}.s3.amazonaws.com/media/${filename}`,
		};
	}

	@profile
	async downloadMedia(
		filename: string,
		expectedETag?: string,
	): Promise<{ content: string; etag: string }> {
		return this.bucket.downloadFile(`media/${filename}`, expectedETag);
	}

	async listMedia(): Promise<
		Array<{ key: string; size: number; lastModified: string }>
	> {
		const files = await this.bucket.listFiles("media/");
		return files.map((file) => ({
			key: file.key.replace(/^.*\//, ""), // Remove bucket prefix
			size: file.size,
			lastModified: file.lastModified,
		}));
	}
}

// Usage examples
async function demonstrateBucketIntegration() {
	console.log("🗂️  Bucket Storage Integration Examples\n");

	// Configuration management
	console.log("1. Configuration Management:");
	const configService = new ConfigService("app-config-bucket");

	const appConfig = {
		name: "MyApp",
		version: "2.1.0",
		features: {
			darkMode: true,
			notifications: false,
			autoSave: true,
		},
		database: {
			host: "localhost",
			port: 5432,
			name: "myapp",
		},
	};

	await configService.saveConfig(appConfig);
	const loadedConfig = await configService.loadConfig();
	console.log(
		`   Loaded config: ${loadedConfig.name} v${loadedConfig.version}`,
	);

	// Backup configuration
	const backupKey = await configService.backupConfig();
	console.log(`   Backup created: ${backupKey}`);

	// List backups
	const backups = await configService.listBackups();
	console.log(`   Total backups: ${backups.length}`);

	// Media storage
	console.log("\n2. Media Storage:");
	const mediaService = new MediaService("app-media-bucket");

	// Upload sample media
	const sampleImage = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header
	const uploadResult = await mediaService.uploadMedia(
		"logo.png",
		sampleImage,
		"image/png",
	);
	console.log(`   Uploaded: ${uploadResult.url} (ETag: ${uploadResult.etag})`);

	// List media
	const mediaFiles = await mediaService.listMedia();
	console.log(`   Media files: ${mediaFiles.length}`);
	mediaFiles.forEach((file) => {
		console.log(`     - ${file.key} (${file.size} bytes)`);
	});

	// Demonstrate caching
	console.log("\n3. Caching Performance:");
	configService.clearCache();

	console.log("   First load (from bucket):");
	await configService.loadConfig();

	console.log("   Second load (from cache):");
	await configService.loadConfig();

	console.log("   Third load (from cache):");
	await configService.loadConfig();

	console.log("\n✅ Bucket integration examples completed!");
}

// Export for use in other files
export { ConfigService, MediaService, demonstrateBucketIntegration };

// Run if executed directly
if (import.meta.main) {
	demonstrateBucketIntegration();
}
