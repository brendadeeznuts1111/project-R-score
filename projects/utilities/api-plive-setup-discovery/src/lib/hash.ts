// [TOOL][HASH][CONTENT][DEDUPLICATION][HASH-01][v1.0][ACTIVE]

import { createHash } from 'crypto';

export type HashAlgorithm = 'sha256' | 'md5';

export interface HashResult {
  hash: string;
  algorithm: HashAlgorithm;
  originalSize: number;
  canonicalSize: number;
}

// [FUNCTION][IMPLEMENTATION][HASH][CANONICALIZE-01][v1.0][ACTIVE]
// Canonicalize JSON for consistent hashing (sorted keys, consistent formatting)

export function canonicalizeJson(obj: any): string {
  return JSON.stringify(obj, Object.keys(obj).sort(), 0);
}

// [FUNCTION][IMPLEMENTATION][HASH][COMPUTE-01][v1.0][ACTIVE]
// Compute hash of content with optional canonicalization

export function computeHash(
  content: string,
  algorithm: HashAlgorithm = 'sha256',
  canonicalize: boolean = true
): HashResult {
  const originalSize = content.length;

  let contentToHash: string;
  let canonicalSize: number;

  if (canonicalize) {
    try {
      const parsed = JSON.parse(content);
      contentToHash = canonicalizeJson(parsed);
      canonicalSize = contentToHash.length;
    } catch (error) {
      // If not valid JSON, hash as-is
      contentToHash = content;
      canonicalSize = originalSize;
    }
  } else {
    contentToHash = content;
    canonicalSize = originalSize;
  }

  const hash = createHash(algorithm)
    .update(contentToHash, 'utf8')
    .digest('hex');

  return {
    hash,
    algorithm,
    originalSize,
    canonicalSize
  };
}

// [FUNCTION][IMPLEMENTATION][HASH][VERIFY-01][v1.0][ACTIVE]
// Verify content against expected hash

export function verifyHash(
  content: string,
  expectedHash: string,
  algorithm: HashAlgorithm = 'sha256',
  canonicalize: boolean = true
): boolean {
  const result = computeHash(content, algorithm, canonicalize);
  return result.hash === expectedHash;
}

// [FUNCTION][IMPLEMENTATION][HASH][PARSE-URL-01][v1.0][ACTIVE]
// Parse hash from URL query parameters (e.g., ?v=sha256:abc123)

export function parseUrlHash(url: string): { hash: string; algorithm: HashAlgorithm } | null {
  try {
    const urlObj = new URL(url);
    const versionParam = urlObj.searchParams.get('v');

    if (!versionParam) return null;

    // Support formats: sha256:abc123, md5:def456
    const [algorithm, hash] = versionParam.split(':') as [HashAlgorithm, string];

    if (!hash || !['sha256', 'md5'].includes(algorithm)) {
      return null;
    }

    return { hash, algorithm };
  } catch (error) {
    return null;
  }
}

// [FUNCTION][IMPLEMENTATION][HASH][FORMAT-01][v1.0][ACTIVE]
// Format hash for storage/display

export function formatHash(result: HashResult): string {
  return `${result.algorithm}_${result.hash}`;
}

// [FUNCTION][IMPLEMENTATION][HASH][SHORT-01][v1.0][ACTIVE]
// Get short hash for display (first 8 chars)

export function shortHash(hash: string): string {
  return hash.substring(0, 8);
}

// [FUNCTION][IMPLEMENTATION][HASH][VALIDATE-01][v1.0][ACTIVE]
// Validate hash format

export function validateHash(hash: string, algorithm: HashAlgorithm): boolean {
  const expectedLength = algorithm === 'sha256' ? 64 : 32;
  const regex = new RegExp(`^[a-f0-9]{${expectedLength}}$`, 'i');
  return regex.test(hash);
}
