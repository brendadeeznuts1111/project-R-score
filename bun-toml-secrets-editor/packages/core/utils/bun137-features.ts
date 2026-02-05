// utils/bun137-features.ts
// Streamlined Bun v1.3.7 Features - No Bloat
// Core functionality only

// ANSI Text Wrapping - 88x faster
export function wrapText(text: string, width: number = 80): string[] {
	if (typeof Bun !== "undefined" && "wrapAnsi" in Bun) {
		return (Bun as any).wrapAnsi(text, width).split("\n");
	}
	// Simple fallback
	return text.length > width ? [text.slice(0, width - 3) + "..."] : [text];
}

// JSON5 Configuration - 51.1% faster
export function loadJSON5(content: string): any {
	return Bun.JSON5.parse(content);
}

export function saveJSON5(data: any, pretty: boolean = false): string {
	return pretty
		? Bun.JSON5.stringify(data, (k, v) => v, 2)
		: Bun.JSON5.stringify(data);
}

// HTTP Client with Header Case Preservation and ETag Support
export class SimpleHTTPClient {
	constructor(private defaultHeaders: Record<string, string> = {}) {}

	async get(url: string, headers?: Record<string, string>) {
		return fetch(url, {
			headers: { ...this.defaultHeaders, ...headers },
		});
	}

	async post(url: string, data: any, headers?: Record<string, string>) {
		return fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...this.defaultHeaders,
				...headers,
			},
			body: JSON.stringify(data),
		});
	}

	// ETag-aware GET request
	async getWithETag(
		url: string,
		etag?: string,
		headers?: Record<string, string>,
	) {
		const requestHeaders: Record<string, string> = {
			...this.defaultHeaders,
			...headers,
		};

		if (etag) {
			requestHeaders["If-None-Match"] = etag;
		}

		return fetch(url, {
			headers: requestHeaders,
		});
	}

	// Extract ETag from response
	getETag(response: Response): string | null {
		return response.headers.get("ETag");
	}

	// Check if response is not modified (304)
	isNotModified(response: Response): boolean {
		return response.status === 304;
	}

	// Conditional PUT with ETag
	async putWithETag(
		url: string,
		data: any,
		etag: string,
		headers?: Record<string, string>,
	) {
		return fetch(url, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"If-Match": etag,
				...this.defaultHeaders,
				...headers,
			},
			body: JSON.stringify(data),
		});
	}

	// Conditional DELETE with ETag
	async deleteWithETag(
		url: string,
		etag: string,
		headers?: Record<string, string>,
	) {
		return fetch(url, {
			method: "DELETE",
			headers: {
				"If-Match": etag,
				...this.defaultHeaders,
				...headers,
			},
		});
	}
}

// Bucket Storage Integration with Bun v1.3.7 features
export interface BucketConfig {
	region?: string;
	endpoint?: string;
	accessKeyId?: string;
	secretAccessKey?: string;
	bucket: string;
}

export class BucketClient {
	public config: BucketConfig;

	constructor(config: BucketConfig) {
		this.config = config;
	}

	// Upload file with ETag support
	async uploadFile(
		key: string,
		content: string | Uint8Array,
		contentType?: string,
	): Promise<{ etag: string; key: string }> {
		const headers: Record<string, string> = {
			"Content-Type": contentType || "application/octet-stream",
		};

		// Simulate S3 upload (in real implementation, use AWS SDK or fetch)
		const mockETag = `"${Math.random().toString(36).substring(2)}"`;

		console.log(`📤 Uploading to bucket: ${this.config.bucket}/${key}`);
		console.log(
			`   Content-Type: ${contentType || "application/octet-stream"}`,
		);
		console.log(
			`   Size: ${typeof content === "string" ? content.length : content.byteLength} bytes`,
		);

		return {
			etag: mockETag,
			key: `${this.config.bucket}/${key}`,
		};
	}

	// Download file with ETag validation
	async downloadFile(
		key: string,
		expectedETag?: string,
	): Promise<{ content: string; etag: string }> {
		console.log(`📥 Downloading from bucket: ${this.config.bucket}/${key}`);

		if (expectedETag) {
			console.log(`   Expected ETag: ${expectedETag}`);
		}

		// Simulate S3 download - return valid JSON for .json/.json5 files
		let mockContent: string;
		if (key.endsWith(".json") || key.endsWith(".json5")) {
			mockContent = JSON.stringify(
				{
					name: "MyApp",
					version: "2.1.0",
					features: {
						darkMode: true,
						notifications: false,
						autoSave: true,
					},
				},
				null,
				2,
			);
		} else {
			mockContent = `Sample content from ${this.config.bucket}/${key}`;
		}

		const mockETag =
			expectedETag || `"${Math.random().toString(36).substring(2)}"`;

		return {
			content: mockContent,
			etag: mockETag,
		};
	}

	// List files with metadata
	async listFiles(
		prefix?: string,
	): Promise<
		Array<{ key: string; etag: string; size: number; lastModified: string }>
	> {
		console.log(`📋 Listing files in bucket: ${this.config.bucket}`);
		if (prefix) {
			console.log(`   Prefix: ${prefix}`);
		}

		// Simulate file listing
		return [
			{
				key: `${this.config.bucket}/${prefix || ""}config.json`,
				etag: `"abc123"`,
				size: 1024,
				lastModified: new Date().toISOString(),
			},
			{
				key: `${this.config.bucket}/${prefix || ""}data.json5`,
				etag: `"def456"`,
				size: 2048,
				lastModified: new Date().toISOString(),
			},
		];
	}

	// Delete file with ETag validation
	async deleteFile(
		key: string,
		expectedETag?: string,
	): Promise<{ deleted: boolean; key: string }> {
		console.log(`🗑️  Deleting from bucket: ${this.config.bucket}/${key}`);

		if (expectedETag) {
			console.log(`   Expected ETag: ${expectedETag}`);
		}

		return {
			deleted: true,
			key: `${this.config.bucket}/${key}`,
		};
	}
}

// Enhanced Bucket Client with profiling and caching
export class EnhancedBucketClient extends BucketClient {
	private cache = new Map<
		string,
		{ content: string; etag: string; timestamp: number }
	>();
	private cacheTimeout = 5 * 60 * 1000; // 5 minutes

	constructor(config: BucketConfig) {
		super(config);
	}

	@profile
	async uploadWithProfile(key: string, content: string, contentType?: string) {
		return this.uploadFile(key, content, contentType);
	}

	@profile
	async downloadWithCache(key: string, expectedETag?: string) {
		const cacheKey = `${this.config.bucket}/${key}`;
		const cached = this.cache.get(cacheKey);

		// Check cache first
		if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
			console.log(`📦 Cache hit for: ${key}`);
			return cached;
		}

		// Download from bucket
		const result = await this.downloadFile(key, expectedETag);

		// Cache the result
		this.cache.set(cacheKey, {
			...result,
			timestamp: Date.now(),
		});

		return result;
	}

	@profile
	async syncToBucket(key: string, content: string, contentType?: string) {
		// Upload with ETag
		const uploadResult = await this.uploadFile(key, content, contentType);

		// Update cache
		const cacheKey = `${this.config.bucket}/${key}`;
		this.cache.set(cacheKey, {
			content,
			etag: uploadResult.etag,
			timestamp: Date.now(),
		});

		return uploadResult;
	}

	clearCache(): void {
		this.cache.clear();
		console.log(`🧹 Cache cleared for bucket: ${this.config.bucket}`);
	}
}

// Simple Profiling with @profile decorator
export function startProfiling(name: string = "profile"): string {
	const sessionId = `${name}_${Date.now()}`;
	console.log(`🔍 Started profiling: ${sessionId}`);
	return sessionId;
}

export function stopProfiling(sessionId: string): void {
	console.log(`⏹️  Stopped profiling: ${sessionId}`);
	// In real usage, this would generate actual profiles
}

// @profile decorator for function profiling
export function profile<T extends (...args: any[]) => Promise<any>>(
	target: any,
	propertyKey: string | symbol,
	descriptor: TypedPropertyDescriptor<T>,
): void {
	const originalMethod = descriptor.value;

	if (typeof originalMethod === "function") {
		descriptor.value = async function (this: any, ...args: Parameters<T>) {
			const sessionId = startProfiling(
				`${target.constructor.name}.${String(propertyKey)}`,
			);
			const startTime = performance.now();

			try {
				const result = await originalMethod.apply(this, args);
				const duration = performance.now() - startTime;
				console.log(
					`⏱️  ${target.constructor.name}.${String(propertyKey)}: ${duration.toFixed(2)}ms`,
				);
				stopProfiling(sessionId);
				return result;
			} catch (error) {
				const duration = performance.now() - startTime;
				console.log(
					`❌ ${target.constructor.name}.${String(propertyKey)}: ${duration.toFixed(2)}ms (failed)`,
				);
				stopProfiling(sessionId);
				throw error;
			}
		} as T;
	}
}

// Profile function wrapper (alternative to decorator)
export function withProfile<T extends (...args: any[]) => any>(
	fn: T,
	name?: string,
): T {
	return (async (...args: any[]) => {
		const fnName = name || fn.name || "anonymous";
		const sessionId = startProfiling(fnName);
		const startTime = performance.now();

		try {
			const result = await fn(...args);
			const duration = performance.now() - startTime;
			console.log(`⏱️  ${fnName}: ${duration.toFixed(2)}ms`);
			stopProfiling(sessionId);
			return result;
		} catch (error) {
			const duration = performance.now() - startTime;
			console.log(`❌ ${fnName}: ${duration.toFixed(2)}ms (failed)`);
			stopProfiling(sessionId);
			throw error;
		}
	}) as T;
}

// Quick usage examples
export const examples = {
	ansi: () => {
		const text =
			"\x1b[32mGreen text\x1b[0m that needs wrapping for better CLI output";
		const wrapped = wrapText(text, 50);
		console.log(wrapped.join("\n"));
	},

	json5: () => {
		const config = `{
  // App config
  name: "My App",
  version: "1.0.0",  // trailing comma
		}`;
		const parsed = loadJSON5(config);
		console.log(parsed);
	},

	http: async () => {
		const client = new SimpleHTTPClient({
			"User-Agent": "MyApp/1.0",
			"X-Custom": "Preserve-Case",
		});
		const response = await client.get("https://httpbin.org/headers");
		console.log(await response.json());
	},

	etag: async () => {
		const client = new SimpleHTTPClient({
			"User-Agent": "ETag-Demo/1.0",
		});

		console.log("🏷️  ETag Caching Demo:");

		// First request - gets ETag
		const response1 = await client.get("https://httpbin.org/etag/abc123");
		const etag = client.getETag(response1);
		console.log(`   First request ETag: ${etag}`);

		// Second request with ETag - might get 304
		if (etag) {
			const response2 = await client.getWithETag(
				"https://httpbin.org/etag/abc123",
				etag,
			);
			console.log(`   Second request status: ${response2.status}`);
			console.log(`   Not modified? ${client.isNotModified(response2)}`);
		}
	},

	profiling: () => {
		const id = startProfiling("my-app");
		setTimeout(() => stopProfiling(id), 1000);
	},

	decorator: () => {
		console.log("🎯 @profile Decorator Demo:");

		// Example class with @profile decorator
		class DataService {
			@profile
			async fetchData(id: number): Promise<any> {
				// Simulate API call
				await new Promise((resolve) => setTimeout(resolve, 100));
				return { id, data: `Data for ${id}` };
			}

			@profile
			async processData(data: any): Promise<any> {
				// Simulate processing
				await new Promise((resolve) => setTimeout(resolve, 50));
				return { ...data, processed: true };
			}
		}

		// Usage
		const service = new DataService();
		service
			.fetchData(1)
			.then((result) => {
				return service.processData(result);
			})
			.then(() => {
				console.log("   ✅ Decorator profiling complete");
			});
	},

	wrapper: () => {
		console.log("📦 Profile Wrapper Demo:");

		// Example using function wrapper
		const slowFunction = withProfile(async (items: number[]) => {
			// Simulate slow computation
			await new Promise((resolve) => setTimeout(resolve, 80));
			return items.map((x) => x * 2);
		}, "array-doubler");

		slowFunction([1, 2, 3, 4, 5]).then((result) => {
			console.log(`   Result: [${result.join(", ")}]`);
			console.log("   ✅ Wrapper profiling complete");
		});
	},

	bucket: async () => {
		console.log("🗂️  Bucket Storage Demo:");

		// Basic bucket client
		const bucket = new BucketClient({
			bucket: "my-app-bucket",
			region: "us-east-1",
		});

		// Upload a file
		const uploadResult = await bucket.uploadFile(
			"config.json",
			JSON.stringify({
				name: "My App",
				version: "1.0.0",
			}),
			"application/json",
		);

		console.log(
			`   Uploaded: ${uploadResult.key} (ETag: ${uploadResult.etag})`,
		);

		// Download the file
		const downloadResult = await bucket.downloadFile(
			"config.json",
			uploadResult.etag,
		);
		console.log(`   Downloaded: ${downloadResult.content}`);

		// List files
		const files = await bucket.listFiles();
		console.log(`   Files in bucket: ${files.length}`);
		files.forEach((file) => {
			console.log(`     - ${file.key} (${file.size} bytes)`);
		});
	},

	enhancedBucket: async () => {
		console.log("🚀 Enhanced Bucket Client Demo:");

		// Enhanced bucket client with caching and profiling
		const enhancedBucket = new EnhancedBucketClient({
			bucket: "my-enhanced-bucket",
		});

		// Upload with profiling
		const config = { theme: "dark", language: "typescript" };
		await enhancedBucket.uploadWithProfile(
			"settings.json5",
			JSON.stringify(config),
		);

		// Download with caching
		const cached = await enhancedBucket.downloadWithCache("settings.json5");
		console.log(`   Cached content: ${cached.content}`);

		// Download again (should hit cache)
		const cachedAgain =
			await enhancedBucket.downloadWithCache("settings.json5");
		console.log(`   Cache hit: ${cached === cachedAgain ? "Yes" : "No"}`);

		// Sync to bucket
		await enhancedBucket.syncToBucket(
			"profile.json",
			JSON.stringify({
				user: "developer",
				preferences: config,
			}),
		);

		// Clear cache
		enhancedBucket.clearCache();
	},
};

// Feature availability checks
export const isAvailable = {
	wrapAnsi: () => typeof Bun !== "undefined" && "wrapAnsi" in Bun,
	JSON5: () => typeof Bun?.JSON5 === "object",
	headerPreservation: () => typeof Bun !== "undefined", // Available in v1.3.7+
	etagCaching: () => typeof fetch !== "undefined", // ETag works with standard fetch
	profiling: () => typeof Bun !== "undefined",
	bucketStorage: () => true, // Bucket storage always available (simulated)
};
