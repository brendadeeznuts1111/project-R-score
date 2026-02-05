/**
 * Document Encryption Utilities
 * Uses Web Crypto API (Bun native) for encryption at rest
 */

/**
 * Encrypt document data using AES-GCM
 */
export async function encryptDocument(
  data: Uint8Array,
  userId: string
): Promise<{ encrypted: Uint8Array; iv: Uint8Array; keyId: string }> {
  // Generate encryption key from user ID (deterministic for same user)
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(userId.padEnd(32, "0").slice(0, 32)),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const salt = new TextEncoder().encode("duoplus-kyc-salt");
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  // Generate IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    data
  );

  return {
    encrypted: new Uint8Array(encrypted),
    iv,
    keyId: userId,
  };
}

/**
 * Decrypt document data
 */
export async function decryptDocument(
  encrypted: Uint8Array,
  iv: Uint8Array,
  userId: string
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(userId.padEnd(32, "0").slice(0, 32)),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const salt = new TextEncoder().encode("duoplus-kyc-salt");
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encrypted
  );

  return new Uint8Array(decrypted);
}