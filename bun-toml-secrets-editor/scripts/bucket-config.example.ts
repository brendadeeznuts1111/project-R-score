/**
 * Example bucket configuration
 * Copy this to bucket-config.ts and fill in your credentials
 */

export const bucketConfig = {
	// Storage provider: 's3', 'gcs', or 'azure'
	type: process.env.BUCKET_TYPE || "s3",

	// Bucket name
	bucketName: process.env.BUCKET_NAME || "bun-toml-secrets-editor-releases",

	// S3 Configuration
	s3: {
		region: process.env.AWS_REGION || "us-east-1",
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
		// Optional: Custom endpoint for S3-compatible services
		endpoint: process.env.AWS_ENDPOINT,
	},

	// Google Cloud Storage Configuration
	gcs: {
		projectId: process.env.GCS_PROJECT_ID,
		keyFile: process.env.GCS_KEY_FILE, // Path to service account key file
	},

	// Azure Blob Storage Configuration
	azure: {
		accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
		accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY,
		containerName: process.env.AZURE_CONTAINER_NAME || "releases",
	},

	// Upload settings
	upload: {
		// Prefix for all uploads (e.g., 'releases/', 'binaries/')
		prefix: process.env.BUCKET_PREFIX || "releases/",

		// Make files publicly accessible
		public: process.env.BUCKET_PUBLIC === "true",

		// Content type for binaries
		contentType: "application/octet-stream",

		// Cache control
		cacheControl: "public, max-age=31536000, immutable",
	},
};
