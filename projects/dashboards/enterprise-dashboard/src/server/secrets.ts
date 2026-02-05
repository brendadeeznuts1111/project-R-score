/**
 * Secure Credential Management using Bun.secrets
 *
 * Uses OS-native credential storage:
 * - macOS: Keychain Services
 * - Linux: libsecret (GNOME Keyring, KWallet)
 * - Windows: Credential Manager
 *
 * Falls back to environment variables for CI/production.
 */

const SERVICE_NAME = "com.enterprise-dashboard.cli";

// Credential types for type-safe access
export type CredentialKey =
  | "github-token"
  | "s3-access-key-id"
  | "s3-secret-access-key"
  | "proxy-password"
  | "proxy-auth"
  | "tls-passphrase"
  | "api-key";

// Map credential keys to env var fallbacks
const ENV_FALLBACKS: Record<CredentialKey, string> = {
  "github-token": "GITHUB_TOKEN",
  "s3-access-key-id": "S3_ACCESS_KEY_ID",
  "s3-secret-access-key": "S3_SECRET_ACCESS_KEY",
  "proxy-password": "PROXY_PASSWORD",
  "proxy-auth": "PROXY_AUTH",
  "tls-passphrase": "TLS_PASSPHRASE",
  "api-key": "API_KEY",
};

/**
 * Get a secret from secure storage or environment variable
 * Prefers Bun.secrets, falls back to env vars for CI/production
 */
export async function getSecret(key: CredentialKey): Promise<string | null> {
  // Try Bun.secrets first (local development)
  try {
    const value = await Bun.secrets.get({
      service: SERVICE_NAME,
      name: key,
    });
    if (value) return value;
  } catch {
    // Bun.secrets may fail in CI or if credential service unavailable
  }

  // Fall back to environment variable
  const envKey = ENV_FALLBACKS[key];
  return process.env[envKey] || null;
}

/**
 * Store a secret in secure storage
 */
export async function setSecret(key: CredentialKey, value: string): Promise<void> {
  await Bun.secrets.set({
    service: SERVICE_NAME,
    name: key,
    value,
  });
}

/**
 * Delete a secret from secure storage
 */
export async function deleteSecret(key: CredentialKey): Promise<boolean> {
  return await Bun.secrets.delete({
    service: SERVICE_NAME,
    name: key,
  });
}

/**
 * Check if a secret exists (in secure storage or env)
 */
export async function hasSecret(key: CredentialKey): Promise<boolean> {
  const value = await getSecret(key);
  return value !== null && value.length > 0;
}

/**
 * List all stored secrets (keys only, not values)
 * Returns which keys have values in secure storage vs env vars
 */
export async function listSecrets(): Promise<{
  key: CredentialKey;
  source: "keychain" | "env" | "none";
  masked: string;
}[]> {
  const results: {
    key: CredentialKey;
    source: "keychain" | "env" | "none";
    masked: string;
  }[] = [];

  for (const key of Object.keys(ENV_FALLBACKS) as CredentialKey[]) {
    let source: "keychain" | "env" | "none" = "none";
    let masked = "";

    // Check Bun.secrets first
    try {
      const secretValue = await Bun.secrets.get({
        service: SERVICE_NAME,
        name: key,
      });
      if (secretValue) {
        source = "keychain";
        masked = maskValue(secretValue);
      }
    } catch {
      // Ignore errors
    }

    // Check env var if not in keychain
    if (source === "none") {
      const envKey = ENV_FALLBACKS[key];
      const envValue = process.env[envKey];
      if (envValue) {
        source = "env";
        masked = maskValue(envValue);
      }
    }

    results.push({ key, source, masked });
  }

  return results;
}

/**
 * Mask a secret value for display (show first/last 2 chars)
 */
function maskValue(value: string): string {
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
}

// =============================================================================
// Convenience functions for specific credentials
// =============================================================================

/**
 * Get GitHub token for API access
 */
export async function getGitHubToken(): Promise<string | null> {
  return getSecret("github-token");
}

/**
 * Get S3/R2 credentials
 */
export async function getS3Credentials(): Promise<{
  accessKeyId: string | null;
  secretAccessKey: string | null;
}> {
  const [accessKeyId, secretAccessKey] = await Promise.all([
    getSecret("s3-access-key-id"),
    getSecret("s3-secret-access-key"),
  ]);
  return { accessKeyId, secretAccessKey };
}

/**
 * Get proxy credentials
 */
export async function getProxyCredentials(): Promise<{
  password: string | null;
  auth: string | null;
}> {
  const [password, auth] = await Promise.all([
    getSecret("proxy-password"),
    getSecret("proxy-auth"),
  ]);
  return { password, auth };
}

/**
 * Interactive prompt to set a secret (for CLI usage)
 */
export async function promptAndSetSecret(key: CredentialKey, promptMessage?: string): Promise<boolean> {
  const message = promptMessage || `Enter value for ${key}:`;

  // Use Bun's prompt (hides input for secrets)
  const value = prompt(message);

  if (!value) {
    console.log("No value provided, skipping.");
    return false;
  }

  await setSecret(key, value);
  console.log(`Secret '${key}' stored securely in system keychain.`);
  return true;
}

// =============================================================================
// CLI Helper - Parse secret commands
// =============================================================================

export type SecretCommand =
  | { action: "list" }
  | { action: "get"; key: CredentialKey }
  | { action: "set"; key: CredentialKey; value?: string }
  | { action: "delete"; key: CredentialKey }
  | { action: "import"; file: string }
  | { action: "export"; reveal: boolean }
  | { action: "help" };

export function parseSecretCommand(args: string[]): SecretCommand | null {
  if (args.length === 0) return { action: "help" };

  const [action, arg1, arg2] = args;

  switch (action) {
    case "list":
    case "ls":
      return { action: "list" };
    case "get":
      if (!arg1 || !isValidKey(arg1)) return null;
      return { action: "get", key: arg1 };
    case "set":
      if (!arg1 || !isValidKey(arg1)) return null;
      return { action: "set", key: arg1, value: arg2 };
    case "delete":
    case "rm":
      if (!arg1 || !isValidKey(arg1)) return null;
      return { action: "delete", key: arg1 };
    case "import":
      if (!arg1) return null;
      return { action: "import", file: arg1 };
    case "export":
      return { action: "export", reveal: arg1 === "--reveal" || arg1 === "-r" };
    case "help":
    case "--help":
    case "-h":
      return { action: "help" };
    default:
      return null;
  }
}

function isValidKey(key: string): key is CredentialKey {
  return key in ENV_FALLBACKS;
}

/**
 * Import secrets from a .env file
 * Only imports known credential keys, skips others
 */
export async function importFromEnv(envPath: string): Promise<{
  imported: CredentialKey[];
  skipped: string[];
}> {
  const content = await Bun.file(envPath).text();
  const lines = content.split("\n");

  const imported: CredentialKey[] = [];
  const skipped: string[] = [];

  // Reverse map: ENV_VAR_NAME -> credential-key
  const envToKey: Record<string, CredentialKey> = {};
  for (const [key, envVar] of Object.entries(ENV_FALLBACKS)) {
    envToKey[envVar] = key as CredentialKey;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;

    const [, envVar, rawValue] = match;
    // Remove quotes if present
    const value = rawValue.replace(/^["']|["']$/g, "");

    if (envToKey[envVar] && value) {
      await setSecret(envToKey[envVar], value);
      imported.push(envToKey[envVar]);
    } else if (value) {
      skipped.push(envVar);
    }
  }

  return { imported, skipped };
}

/**
 * Export secrets to .env format
 * @param reveal - if true, show actual values; otherwise mask them
 */
export async function exportToEnv(reveal: boolean = false): Promise<string> {
  const lines: string[] = [
    "# Enterprise Dashboard Secrets",
    `# Exported: ${new Date().toISOString()}`,
    `# Source: ${reveal ? "REVEALED VALUES" : "masked (use --reveal for actual values)"}`,
    "",
  ];

  for (const key of Object.keys(ENV_FALLBACKS) as CredentialKey[]) {
    const envVar = ENV_FALLBACKS[key];
    const value = await getSecret(key);

    if (value) {
      const displayValue = reveal ? value : maskValue(value);
      lines.push(`${envVar}=${reveal ? `"${value}"` : `# ${displayValue}`}`);
    } else {
      lines.push(`# ${envVar}=`);
    }
  }

  return lines.join("\n");
}

/**
 * Get all credential keys
 */
export function getAllCredentialKeys(): CredentialKey[] {
  return Object.keys(ENV_FALLBACKS) as CredentialKey[];
}

/**
 * Get env var name for a credential key
 */
export function getEnvVarName(key: CredentialKey): string {
  return ENV_FALLBACKS[key];
}

export function getSecretHelp(): string {
  return `
Secret Management Commands:
  secrets list              List all secrets and their sources
  secrets get <key>         Get a secret value (masked)
  secrets set <key> [value] Store a secret (prompts if no value)
  secrets delete <key>      Delete a secret from keychain
  secrets import <file>     Import secrets from .env file
  secrets export            Export secrets as .env (masked)
  secrets export --reveal   Export secrets with actual values

Available keys:
  github-token          GitHub personal access token
  s3-access-key-id      S3/R2 access key ID
  s3-secret-access-key  S3/R2 secret access key
  proxy-password        HTTP proxy password
  proxy-auth            Proxy authorization header
  tls-passphrase        TLS certificate passphrase
  api-key               Generic API key

Examples:
  secrets set github-token ghp_xxxxxxxxxxxx
  secrets set s3-secret-access-key  # prompts for value
  secrets list
  secrets import .env.local
  secrets export > .env.backup
  secrets export --reveal > .env.prod
  secrets delete proxy-password
`.trim();
}
