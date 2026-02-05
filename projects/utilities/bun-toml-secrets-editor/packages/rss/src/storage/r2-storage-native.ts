#!/usr/bin/env bun
// src/storage/r2-storage-native.ts - R2 Storage using Bun's native S3Client

import { S3Client } from "bun";

export interface R2Config {
	accountId: string;
	bucketName: string;
	accessKeyId: string;
	secretAccessKey: string;
	region?: string;
	publicUrl?: string;
}

export interface RSSFeedData {
	url: string;
	title: string;
	description: string;
	items: RSSFeedItem[];
	fetchedAt: string;
	profileData?: {
		fetchTime: number;
		parseTime: number;
		totalTime: number;
	};
}

export interface RSSFeedItem {
	title: string;
	link: string;
	description: string;
	pubDate: string;
}

export interface ProfilingReport {
	type:
		| "rss-integration"
		| "rss-r2-integration"
		| "schema-validation"
		| "performance"
		| "api-integration-test"
		| "native-s3-test";
	generatedAt: string;
	data: any;
	summary: {
		status: "success" | "error" | "warning";
		metrics: Record<string, any>;
	};
}

export class R2StorageNative {
	private s3: S3Client;
	private config: R2Config;

	constructor(config: R2Config) {
		this.config = config;
		this.s3 = new S3Client({
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
			bucket: config.bucketName,
			endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
			region: config.region || "enam",
		});
	}

	/**
	 * Store RSS feed data using Bun's S3Client
	 */
	async storeRSSFeed(feedData: RSSFeedData): Promise<string> {
		const key = this.generateFeedKey(feedData.url, feedData.fetchedAt);

		try {
			await this.s3.write(key, JSON.stringify(feedData, null, 2));
			console.log(`✅ RSS feed stored: ${key}`);
			return key;
		} catch (error) {
			console.error(`❌ Failed to store RSS feed: ${error}`);
			throw error;
		}
	}

	/**
	 * Store profiling report using Bun's S3Client
	 */
	async storeProfilingReport(report: ProfilingReport): Promise<string> {
		const key = this.generateReportKey(report.type, report.generatedAt);

		try {
			await this.s3.write(key, JSON.stringify(report, null, 2));
			console.log(`✅ Profiling report stored: ${key}`);
			return key;
		} catch (error) {
			console.error(`❌ Failed to store profiling report: ${error}`);
			throw error;
		}
	}

	/**
	 * Get RSS feed by URL and optional date using Bun's S3Client
	 */
	async getRSSFeed(url: string, date?: string): Promise<RSSFeedData | null> {
		const key = date
			? this.generateFeedKey(url, date)
			: await this.findLatestFeedKey(url);
		if (!key) return null;

		try {
			const exists = await this.s3.exists(key);
			if (!exists) return null;

			const file = this.s3.file(key);
			const data = await file.json();
			return data as RSSFeedData;
		} catch (error) {
			console.error(`❌ Failed to retrieve RSS feed: ${error}`);
			return null;
		}
	}

	/**
	 * Get profiling report by type and timestamp using Bun's S3Client
	 */
	async getProfilingReport(
		type: string,
		timestamp: string,
	): Promise<ProfilingReport | null> {
		const key = this.generateReportKey(type, timestamp);

		try {
			const exists = await this.s3.exists(key);
			if (!exists) return null;

			const file = this.s3.file(key);
			const data = await file.json();
			return data as ProfilingReport;
		} catch (error) {
			console.error(`❌ Failed to retrieve profiling report: ${error}`);
			return null;
		}
	}

	/**
	 * List stored RSS feeds using Bun's S3Client
	 */
	async listRSSFeeds(prefix?: string): Promise<string[]> {
		try {
			const listPrefix = prefix || "feeds/";
			const result = await this.s3.list({ prefix: listPrefix });
			return result.contents?.map((file: any) => file.key) || [];
		} catch (error) {
			console.error(`❌ Failed to list RSS feeds: ${error}`);
			return [];
		}
	}

	/**
	 * List profiling reports by type using Bun's S3Client
	 */
	async listProfilingReports(type: string): Promise<string[]> {
		try {
			const result = await this.s3.list({ prefix: `reports/${type}/` });
			return result.contents?.map((file: any) => file.key) || [];
		} catch (error) {
			console.error(`❌ Failed to list profiling reports: ${error}`);
			return [];
		}
	}

	/**
	 * Get public URL for stored content
	 */
	getPublicUrl(key: string): string {
		if (this.config.publicUrl) {
			return `${this.config.publicUrl}/${key}`;
		}
		return `https://${this.config.accountId}.r2.cloudflarestorage.com/${this.config.bucketName}/${key}`;
	}

	/**
	 * Delete stored content using Bun's S3Client
	 */
	async delete(key: string): Promise<boolean> {
		try {
			await this.s3.delete(key);
			console.log(`✅ Deleted: ${key}`);
			return true;
		} catch (error) {
			console.error(`❌ Failed to delete ${key}: ${error}`);
			return false;
		}
	}

	/**
	 * Check if file exists using Bun's S3Client
	 */
	async exists(key: string): Promise<boolean> {
		try {
			return await this.s3.exists(key);
		} catch (error) {
			console.error(`❌ Failed to check existence of ${key}: ${error}`);
			return false;
		}
	}

	/**
	 * Get file size using Bun's S3Client
	 */
	async size(key: string): Promise<number | null> {
		try {
			return await this.s3.size(key);
		} catch (error) {
			console.error(`❌ Failed to get size of ${key}: ${error}`);
			return null;
		}
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
		try {
			const urlHash = this.hashUrl(url);
			const result = await this.s3.list({ prefix: `feeds/${urlHash}/` });

			if (!result.contents || result.contents.length === 0) return null;

			// Sort by date descending and return latest
			const sortedFiles = result.contents.sort((a: any, b: any) =>
				b.key.localeCompare(a.key),
			);
			return sortedFiles[0].key;
		} catch {
			return null;
		}
	}

	/**
	 * Hash URL for consistent key generation
	 */
	private hashUrl(url: string): string {
		let hash = 0;
		for (let i = 0; i < url.length; i++) {
			const char = url.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash).toString(36);
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
		accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
		secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
		region: "enam",
	};
}

/**
 * Create R2 storage instance
 */
export function createRSSStorage(): R2StorageNative {
	const config = createRSSR2Config();
	return new R2StorageNative(config);
}

/**
 * Create R2 configuration using Bun.secrets
 */
export async function createRSSR2ConfigWithSecrets(): Promise<R2Config> {
	const config = createRSSR2Config();

	try {
		const accessKeyId = await Bun.secrets.get({
			service: "com.cloudflare.r2.rssfeedmaster",
			name: "R2_ACCESS_KEY_ID",
		});

		const secretAccessKey = await Bun.secrets.get({
			service: "com.cloudflare.r2.rssfeedmaster",
			name: "R2_SECRET_ACCESS_KEY",
		});

		if (accessKeyId) config.accessKeyId = accessKeyId;
		if (secretAccessKey) config.secretAccessKey = secretAccessKey;
	} catch (error) {
		console.warn(
			"⚠️ Could not load R2 credentials from Bun.secrets, using environment variables",
		);
	}

	return config;
}

/**
 * Create R2 storage instance with Bun.secrets
 */
export async function createRSSStorageWithSecrets(): Promise<R2StorageNative> {
	const config = await createRSSR2ConfigWithSecrets();
	return new R2StorageNative(config);
}

export default R2StorageNative;
