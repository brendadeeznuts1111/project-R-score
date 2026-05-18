// S3 Configuration for Dashboard Uploads
interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string;
}

// Load configuration from environment variables or use defaults
export const s3Config: S3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || "",
  secretAccessKey:
    process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || "",
  region: process.env.AWS_REGION || process.env.S3_REGION || "us-east-1",
  bucket: process.env.S3_BUCKET || "bun-dashboard-enhancements",
  endpoint: process.env.S3_ENDPOINT, // Optional: for custom S3 endpoints
};

// Validate configuration
export function validateS3Config(): boolean {
  return !!(
    s3Config.accessKeyId &&
    s3Config.secretAccessKey &&
    s3Config.bucket
  );
}

// File types to upload
export const uploadPaths = {
  dashboard: [
    "SystemsDashboard.tsx",
    "vite.config.ts",
    "index.html",
    "src/main.tsx",
    "package.json",
  ],
  docs: [
    "../README.md",
    "../BUN_INSPECT_*.md",
    "../session-1/headers-api-matrix.ts",
    "../session-1/bun-apis-matrix.ts",
  ],
  build: ["dist/**/*"],
};

export default s3Config;
