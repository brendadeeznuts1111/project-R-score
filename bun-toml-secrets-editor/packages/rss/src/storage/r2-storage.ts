#!/usr/bin/env bun
/**
 * Cloudflare R2 Storage Integration for RSS Feed Data
 *
 * Provides storage capabilities for RSS feeds, profiling results,
 * and analytics data using Cloudflare R2.
 */

export interface R2Config {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucketName: string;
	region?: string;
	publicUrl?: string;
}

export interface RSSFeedData {
	url: string;
	title?: string;
	description?: string;
	items: RSSItem[];
	fetchedAt: string;
	profileData?: {
		fetchTime: number;
		parseTime: number;
		totalTime: number;
	};
}

export interface RSSItem {
	title?: string;
	link?: string;
	description?: string;
	pubDate?: string;
	guid?: string;
}

export interface ProfilingReport {
	type:
		| "rss-integration"
		| "schema-validation"
		| "performance"
		| "rss-r2-integration";
	generatedAt: string;
	data: any;
	summary: {
		status: "success" | "error" | "warning";
		metrics: Record<string, number>;
	};
}

export class R2Storage {
	private config: R2Config;
	private baseUrl: string;

	constructor(config: R2Config) {
		this.config = config;
		this.baseUrl = `https://${config.accountId}.r2.cloudflarestorage.com`;
	}

	/**
	 * Store RSS feed data in R2
	 */
	async storeRSSFeed(feedData: RSSFeedData): Promise<string> {
		const key = this.generateFeedKey(feedData.url, feedData.fetchedAt);
		const url = `${this.baseUrl}/${this.config.bucketName}/${key}`;

		const now = new Date();
		const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");

		const headers = {
			"Content-Type": "application/json",
			"X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
			"X-Amz-Date": amzDate,
			Authorization: this.getAuthHeader(
				"PUT",
				`/${this.config.bucketName}/${key}`,
				{
					"content-type": "application/json",
					"x-amz-content-sha256": "UNSIGNED-PAYLOAD",
					"x-amz-date": amzDate,
				},
			),
		};

		try {
			const response = await fetch(url, {
				method: "PUT",
				headers,
				body: JSON.stringify(feedData, null, 2),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`R2 storage failed: ${response.status} ${response.statusText} - ${errorText}`,
				);
			}

			console.log(`✅ RSS feed stored: ${key}`);
			return key;
		} catch (error) {
			console.error(`❌ Failed to store RSS feed: ${error}`);
			throw error;
		}
	}

	/**
	 * Store profiling report in R2
	 */
	async storeProfilingReport(report: ProfilingReport): Promise<string> {
		const key = this.generateReportKey(report.type, report.generatedAt);
		const url = `${this.baseUrl}/${this.config.bucketName}/${key}`;

		const now = new Date();
		const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");

		const headers = {
			"Content-Type": "application/json",
			"X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
			"X-Amz-Date": amzDate,
			Authorization: this.getAuthHeader(
				"PUT",
				`/${this.config.bucketName}/${key}`,
				{
					"content-type": "application/json",
					"x-amz-content-sha256": "UNSIGNED-PAYLOAD",
					"x-amz-date": amzDate,
				},
			),
		};

		try {
			const response = await fetch(url, {
				method: "PUT",
				headers,
				body: JSON.stringify(report, null, 2),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`R2 storage failed: ${response.status} ${response.statusText} - ${errorText}`,
				);
			}

			console.log(`✅ Profiling report stored: ${key}`);
			return key;
		} catch (error) {
			console.error(`❌ Failed to store profiling report: ${error}`);
			throw error;
		}
	}

	/**
	 * Get RSS feed by URL and optional date
	 */
	async getRSSFeed(url: string, date?: string): Promise<RSSFeedData | null> {
		const key = date
			? this.generateFeedKey(url, date)
			: await this.findLatestFeedKey(url);
		if (!key) return null;

		const now = new Date();
		const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");

		const headers = {
			"X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
			"X-Amz-Date": amzDate,
			Authorization: this.getAuthHeader(
				"GET",
				`/${this.config.bucketName}/${key}`,
				{
					"x-amz-content-sha256": "UNSIGNED-PAYLOAD",
					"x-amz-date": amzDate,
				},
			),
		};

		const response = await fetch(
			`${this.baseUrl}/${this.config.bucketName}/${key}`,
			{
				headers,
			},
		);

		if (!response.ok) {
			if (response.status === 404) return null;
			throw new Error(`Failed to retrieve RSS feed: ${response.statusText}`);
		}

		return await response.json();
	}

	/**
	 * Get profiling report by type and timestamp
	 */
	async getProfilingReport(
		type: string,
		timestamp: string,
	): Promise<ProfilingReport | null> {
		const key = this.generateReportKey(type, timestamp);

		const now = new Date();
		const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");

		const headers = {
			"X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
			"X-Amz-Date": amzDate,
			Authorization: this.getAuthHeader(
				"GET",
				`/${this.config.bucketName}/${key}`,
				{
					"x-amz-content-sha256": "UNSIGNED-PAYLOAD",
					"x-amz-date": amzDate,
				},
			),
		};

		const response = await fetch(
			`${this.baseUrl}/${this.config.bucketName}/${key}`,
			{
				headers,
			},
		);

		if (!response.ok) {
			if (response.status === 404) return null;
			throw new Error(
				`Failed to retrieve profiling report: ${response.statusText}`,
			);
		}

		return await response.json();
	}

	/**
	 * List stored RSS feeds
	 */
	async listRSSFeeds(prefix?: string): Promise<string[]> {
		const listUrl = `${this.baseUrl}/${this.config.bucketName}?list-type=2${prefix ? `&prefix=${prefix}` : ""}`;

		try {
			const response = await fetch(listUrl);
			if (!response.ok) {
				throw new Error(
					`R2 list failed: ${response.status} ${response.statusText}`,
				);
			}

			const xml = await response.text();
			const keys = this.parseListResponse(xml);
			return keys.filter((key) => key.includes("feeds/"));
		} catch (error) {
			console.error(`❌ Failed to list RSS feeds: ${error}`);
			throw error;
		}
	}

	/**
	 * Generate public URL for stored content
	 */
	getPublicUrl(key: string): string {
		if (this.config.publicUrl) {
			return `${this.config.publicUrl}/${key}`;
		}
		return `${this.baseUrl}/${this.config.bucketName}/${key}`;
	}

	/**
	 * Generate unique key for RSS feed storage
	 */
	public generateFeedKey(feedUrl: string, fetchedAt: string): string {
		const urlHash = this.hashUrl(feedUrl);
		const date = new Date(fetchedAt).toISOString().split("T")[0];
		return `feeds/${urlHash}/${date}.json`;
	}

	/**
	 * Generate unique key for profiling report storage
	 */
	public generateReportKey(type: string, timestamp: string): string {
		const date = new Date(timestamp).toISOString().split("T")[0];
		const time = new Date(timestamp).toISOString().replace(/[:.]/g, "-");
		return `reports/${type}/${date}/${time}.json`;
	}

	/**
	 * Find latest feed key for a URL
	 */
	private async findLatestFeedKey(url: string): Promise<string | null> {
		const urlHash = this.hashUrl(url);
		const prefix = `feeds/${urlHash}/`;

		try {
			const keys = await this.listRSSFeeds(prefix);
			if (keys.length === 0) return null;

			// Sort by date descending and return latest
			return keys.sort().reverse()[0];
		} catch {
			return null;
		}
	}

	/**
	 * Generate AWS Signature V4 Authorization header
	 */
	public getAuthHeader(
		method: string,
		canonicalPath: string,
		headers: Record<string, string>,
	): string {
		if (!this.config.accessKeyId || !this.config.secretAccessKey) {
			throw new Error("R2 credentials not configured");
		}

		const now = new Date();
		const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
		const dateStamp = amzDate.substr(0, 8);

		const service = "s3";
		const region = this.config.region || "enam";

		// Create canonical request
		const canonicalHeaders =
			[
				`host:${this.config.accountId}.r2.cloudflarestorage.com`,
				"x-amz-content-sha256:UNSIGNED-PAYLOAD",
				"x-amz-date:" + amzDate,
			].join("\n") + "\n";

		const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

		const canonicalRequest = [
			method,
			canonicalPath,
			"",
			canonicalHeaders,
			signedHeaders,
			"UNSIGNED-PAYLOAD",
		].join("\n");

		// Create string to sign
		const algorithm = "AWS4-HMAC-SHA256";
		const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
		const stringToSign = [
			algorithm,
			amzDate,
			credentialScope,
			this.hash(canonicalRequest),
		].join("\n");

		// Calculate signature
		const signingKey = this.getSignatureKey(
			this.config.secretAccessKey,
			dateStamp,
			region,
			service,
		);
		const signature = this.hmac(signingKey, stringToSign).toString("hex");

		// Create authorization header
		return `${algorithm} Credential=${this.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
	}

	/**
	 * Get AWS Signature V4 signing key
	 */
	private getSignatureKey(
		key: string,
		dateStamp: string,
		regionName: string,
		serviceName: string,
	): Buffer {
		const kDate = this.hmac("AWS4" + key, dateStamp);
		const kRegion = this.hmac(kDate, regionName);
		const kService = this.hmac(kRegion, serviceName);
		const kSigning = this.hmac(kService, "aws4_request");
		return kSigning;
	}

	/**
	 * HMAC-SHA256 helper
	 */
	private hmac(key: string | Buffer, data: string): Buffer {
		const crypto = require("node:crypto");
		return crypto.createHmac("sha256", key).update(data).digest();
	}

	/**
	 * SHA256 hash helper
	 */
	private hash(data: string): string {
		const crypto = require("node:crypto");
		return crypto.createHash("sha256").update(data).digest("hex");
	}

	/**
	 * Hash URL for consistent key generation
	 */
	private hashUrl(url: string): string {
		// Simple hash function - in production, use crypto
		let hash = 0;
		for (let i = 0; i < url.length; i++) {
			const char = url.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash).toString(36);
	}

	/**
	 * Parse S3-compatible list response XML
	 */
	private parseListResponse(xml: string): string[] {
		const keys: string[] = [];
		const keyRegex = /<Key>([^<]+)<\/Key>/g;
		let match: RegExpExecArray | null;

		while (true) {
			match = keyRegex.exec(xml);
			if (match === null) break;
			keys.push(match[1]);
		}

		return keys;
	}
}

/**
 * Create R2 configuration for RSS Feed Master bucket
 */
export function createRSSR2Config(): R2Config {
	return {
		accountId: "7a470541a704caaf91e71efccc78fd36",
		bucketName: "rssfeedmaster",
		publicUrl: "https://pub-a471e86af24446498311933a2eca2454.r2.dev",
		// Use Bun.secrets for secure credential storage with async get
		accessKeyId: "", // Will be loaded asynchronously
		secretAccessKey: "", // Will be loaded asynchronously
		region: "enam",
	};
}

/**
 * Create R2 configuration with loaded secrets
 */
export async function createRSSR2ConfigWithSecrets(): Promise<R2Config> {
	const config = createRSSR2Config();

	try {
		// Try to get secrets from Bun.secrets
		const accessKeyId = await Bun.secrets.get({
			service: "com.cloudflare.r2.rssfeedmaster",
			name: "R2_ACCESS_KEY_ID",
		});
		const secretAccessKey = await Bun.secrets.get({
			service: "com.cloudflare.r2.rssfeedmaster",
			name: "R2_SECRET_ACCESS_KEY",
		});

		config.accessKeyId = accessKeyId || process.env.R2_ACCESS_KEY_ID || "";
		config.secretAccessKey =
			secretAccessKey || process.env.R2_SECRET_ACCESS_KEY || "";
	} catch (error) {
		// Fallback to environment variables
		config.accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
		config.secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
	}

	return config;
}

/**
 * Default R2 configuration for RSS Feed Master bucket (legacy)
 * @deprecated Use createRSSR2Config() instead
 */
export const RSS_R2_CONFIG: R2Config = createRSSR2Config();

/**
 * Create R2 storage instance for RSS feeds
 */
export function createRSSStorage(): R2Storage {
	return new R2Storage(createRSSR2Config());
}

/**
 * Create R2 storage instance with loaded secrets
 */
export async function createRSSStorageWithSecrets(): Promise<R2Storage> {
	const config = await createRSSR2ConfigWithSecrets();
	return new R2Storage(config);
}
