const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  CLOUDFLARE_API_TOKEN,
} = process.env;

export const R2_CONFIG = {
  accountId: R2_ACCOUNT_ID || '',
  accessKeyId: R2_ACCESS_KEY_ID || '',
  secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  cloudflareApiToken: CLOUDFLARE_API_TOKEN || '',
} as const;

export function requireR2Config() {
  const missing: string[] = [];
  if (!R2_CONFIG.accountId) missing.push('R2_ACCOUNT_ID');
  if (!R2_CONFIG.accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!R2_CONFIG.secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  if (!R2_CONFIG.cloudflareApiToken) missing.push('CLOUDFLARE_API_TOKEN');
  if (missing.length > 0) {
    throw new Error(
      `Missing required R2 configuration: ${missing.join(', ')}. Set these in your .env file.`
    );
  }
  return R2_CONFIG;
}
