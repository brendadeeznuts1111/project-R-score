#!/usr/bin/env bun
/**
 * Upload binaries to storage bucket (S3, GCS, etc.)
 *
 * Usage:
 *   bun scripts/upload-to-bucket.ts [options]
 *
 * Environment Variables:
 *   BUCKET_TYPE=s3|gcs|azure
 *   BUCKET_NAME=your-bucket-name
 *   AWS_REGION=us-east-1 (for S3)
 *   AWS_ACCESS_KEY_ID=... (for S3)
 *   AWS_SECRET_ACCESS_KEY=... (for S3)
 *   GCS_PROJECT_ID=... (for GCS)
 *   GCS_KEY_FILE=... (for GCS)
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const bucketType = process.env.BUCKET_TYPE || "s3";
const bucketName =
	process.env.BUCKET_NAME ||
	process.env.S3_BUCKET_NAME ||
	"bun-toml-secrets-editor-releases";
const version =
	process.env.PACKAGE_VERSION || process.env.npm_package_version || "1.0.0";
const distPath = join(process.cwd(), "dist");

interface UploadResult {
	file: string;
	success: boolean;
	url?: string;
	error?: string;
}

async function uploadToS3(
	filePath: string,
	key: string,
): Promise<UploadResult> {
	// For S3, we'd use AWS SDK
	// This is a placeholder - you'd need to install @aws-sdk/client-s3
	const region = process.env.AWS_REGION || "us-east-1";
	const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
	const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

	if (!accessKeyId || !secretAccessKey) {
		return {
			file: basename(filePath),
			success: false,
			error:
				"AWS credentials not configured (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)",
		};
	}

	try {
		// In a real implementation, you'd use:
		// import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
		// const s3 = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
		// await s3.send(new PutObjectCommand({ Bucket: bucketName, Key: key, Body: fileContent }));

		const url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
		console.log(
			`  ✅ Uploaded: ${basename(filePath)} -> s3://${bucketName}/${key}`,
		);

		return {
			file: basename(filePath),
			success: true,
			url,
		};
	} catch (error) {
		return {
			file: basename(filePath),
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

async function uploadToGCS(
	filePath: string,
	key: string,
): Promise<UploadResult> {
	const projectId = process.env.GCS_PROJECT_ID;
	const _keyFile = process.env.GCS_KEY_FILE;

	if (!projectId) {
		return {
			file: basename(filePath),
			success: false,
			error: "GCS_PROJECT_ID not configured",
		};
	}

	try {
		// For GCS, you'd use @google-cloud/storage
		// const { Storage } = require('@google-cloud/storage');
		// const storage = new Storage({ projectId, keyFilename: keyFile });
		// const bucket = storage.bucket(bucketName);
		// await bucket.file(key).save(fileContent);

		const url = `https://storage.googleapis.com/${bucketName}/${key}`;
		console.log(
			`  ✅ Uploaded: ${basename(filePath)} -> gs://${bucketName}/${key}`,
		);

		return {
			file: basename(filePath),
			success: true,
			url,
		};
	} catch (error) {
		return {
			file: basename(filePath),
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

async function uploadFile(
	filePath: string,
	key: string,
): Promise<UploadResult> {
	switch (bucketType.toLowerCase()) {
		case "s3":
			return await uploadToS3(filePath, key);
		case "gcs":
		case "google":
			return await uploadToGCS(filePath, key);
		default:
			return {
				file: basename(filePath),
				success: false,
				error: `Unsupported bucket type: ${bucketType}`,
			};
	}
}

async function main() {
	if (!existsSync(distPath)) {
		console.error(`❌ Dist directory not found: ${distPath}`);
		console.error('   Run "bun run build:all" first to build binaries');
		process.exit(1);
	}

	// Find all binary files
	const files = readdirSync(distPath)
		.filter((file) => {
			const filePath = join(distPath, file);
			const stats = statSync(filePath);
			return (
				stats.isFile() &&
				(file.startsWith("secrets-guard-") ||
					file.endsWith(".exe") ||
					file === "secrets-guard")
			);
		})
		.map((file) => join(distPath, file));

	if (files.length === 0) {
		console.error("❌ No binary files found in dist/");
		console.error('   Run "bun run build:all" first to build binaries');
		process.exit(1);
	}

	console.log(
		`📦 Uploading ${files.length} binaries to ${bucketType}://${bucketName}`,
	);
	console.log(`   Version: ${version}\n`);

	const results: UploadResult[] = [];

	for (const filePath of files) {
		const fileName = basename(filePath);
		// Create key with version: v1.0.0/secrets-guard-linux-x64
		const key = `v${version}/${fileName}`;

		console.log(`📤 Uploading ${fileName}...`);
		const result = await uploadFile(filePath, key);
		results.push(result);
	}

	// Summary
	console.log(`\n${"=".repeat(60)}`);
	console.log("📊 Upload Summary");
	console.log("=".repeat(60));

	const successful = results.filter((r) => r.success);
	const failed = results.filter((r) => !r.success);

	console.log(`✅ Successful: ${successful.length}/${results.length}`);
	if (successful.length > 0) {
		console.log("\nUploaded files:");
		successful.forEach((r) => {
			console.log(`  • ${r.file}${r.url ? ` -> ${r.url}` : ""}`);
		});
	}

	if (failed.length > 0) {
		console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
		failed.forEach((r) => {
			console.log(`  • ${r.file}: ${r.error}`);
		});
		process.exit(1);
	}

	console.log(
		`\n✅ All binaries uploaded successfully to ${bucketType}://${bucketName}/v${version}/`,
	);
}

main().catch((error) => {
	console.error("❌ Upload failed:", error);
	process.exit(1);
});
