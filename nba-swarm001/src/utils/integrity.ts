/**
 * Cryptographic integrity utilities using Bun's native hashing
 * 
 * Provides file integrity checking, content fingerprinting, and audit trails
 * using Bun.CryptoHasher and Bun.hash for maximum performance and security
 */

import { CryptoHasher } from "bun";
import { readFileSync } from "fs";

/**
 * Supported hash algorithms
 */
export type HashAlgorithm = 
  | "blake3"      // Fast, secure - recommended for most use cases
  | "sha256"      // Widely compatible
  | "sha512"      // Higher security
  | "md5"         // Fast but insecure - use only for non-crypto purposes
  | "sha1";       // Deprecated but still used in some contexts

/**
 * File integrity result
 */
export interface FileIntegrity {
  /** File path */
  path: string;
  /** Hash algorithm used */
  algorithm: HashAlgorithm;
  /** Hexadecimal hash digest */
  hash: string;
  /** File size in bytes */
  size: number;
  /** Last modified timestamp */
  modified: number;
}

/**
 * Compute cryptographic hash of file content
 */
export async function hashFile(
  filePath: string,
  algorithm: HashAlgorithm = "blake3"
): Promise<FileIntegrity> {
  const file = Bun.file(filePath);
  const stats = await file.stat();
  
  const content = await file.text();
  const hash = computeHash(content, algorithm);
  
  return {
    path: filePath,
    algorithm,
    hash,
    size: stats.size,
    modified: stats.mtimeMs,
  };
}

/**
 * Compute hash synchronously (for small files)
 */
export function hashFileSync(
  filePath: string,
  algorithm: HashAlgorithm = "blake3"
): FileIntegrity {
  const content = readFileSync(filePath, "utf-8");
  const stats = Bun.statSync(filePath);
  
  const hash = computeHash(content, algorithm);
  
  return {
    path: filePath,
    algorithm,
    hash,
    size: stats.size,
    modified: stats.mtimeMs,
  };
}

/**
 * Compute hash from string content
 */
export function computeHash(
  content: string,
  algorithm: HashAlgorithm = "blake3"
): string {
  if (algorithm === "blake3") {
    return Bun.hash(content, "blake3").toString("hex");
  }
  
  const hasher = new CryptoHasher(algorithm);
  hasher.update(content, "utf8");
  return hasher.digest("hex");
}

/**
 * Compute rapid hash fingerprint (for quick comparisons)
 */
export function computeRapidHash(content: string): string {
  return Bun.hash.rapidhash(content).toString("hex");
}

/**
 * Verify file integrity against known hash
 */
export async function verifyFileIntegrity(
  filePath: string,
  expectedHash: string,
  algorithm: HashAlgorithm = "blake3"
): Promise<{ valid: boolean; actualHash: string }> {
  const integrity = await hashFile(filePath, algorithm);
  return {
    valid: integrity.hash === expectedHash,
    actualHash: integrity.hash,
  };
}

/**
 * Generate integrity report for multiple files
 */
export interface IntegrityReport {
  files: FileIntegrity[];
  reportHash: string;
  generatedAt: number;
}

export async function generateIntegrityReport(
  filePaths: string[],
  algorithm: HashAlgorithm = "blake3"
): Promise<IntegrityReport> {
  const files = await Promise.all(
    filePaths.map((path) => hashFile(path, algorithm))
  );
  
  files.sort((a, b) => a.path.localeCompare(b.path));
  
  const reportJson = JSON.stringify({
    files: files.map((f) => ({
      path: f.path,
      hash: f.hash,
      size: f.size,
      modified: f.modified,
    })),
    generatedAt: Date.now(),
  });
  
  const reportHash = computeHash(reportJson, algorithm);
  
  return {
    files,
    reportHash,
    generatedAt: Date.now(),
  };
}

/**
 * Create audit trail entry with cryptographic proof
 */
export interface AuditEntry {
  action: string;
  files: string[];
  entryHash: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export function createAuditEntry(
  action: string,
  files: string[],
  metadata?: Record<string, unknown>
): AuditEntry {
  const entry = {
    action,
    files: files.sort(),
    timestamp: Date.now(),
    metadata,
  };
  
  const entryJson = JSON.stringify(entry);
  const entryHash = computeHash(entryJson, "blake3");
  
  return {
    ...entry,
    entryHash,
  };
}

