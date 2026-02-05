// R2 Configuration for Dashboard Uploads
interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
}

// Load configuration from environment variables or use defaults
export const r2Config: R2Config = {
  accountId:
    process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || "",
  accessKeyId:
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    process.env.R2_ACCESS_KEY_ID ||
    "",
  secretAccessKey:
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    process.env.R2_SECRET_ACCESS_KEY ||
    "",
  bucket: process.env.R2_BUCKET || "bun-dashboard-enhancements",
  endpoint: process.env.R2_ENDPOINT || "", // Will be constructed from accountId if not provided
};

// Construct R2 endpoint if not provided
if (!r2Config.endpoint && r2Config.accountId) {
  r2Config.endpoint = `https://${r2Config.accountId}.r2.cloudflarestorage.com`;
}

// Validate configuration
export function validateR2Config(): boolean {
  return !!(
    r2Config.accountId &&
    r2Config.accessKeyId &&
    r2Config.secretAccessKey &&
    r2Config.bucket
  );
}

// R2-specific headers and configuration
export const r2Options = {
  region: "auto", // R2 uses 'auto' region
};

export default r2Config;
