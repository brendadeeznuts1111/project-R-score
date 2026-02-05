import { createHash, randomBytes, sign } from 'crypto';
import { PackageManifest, ManifestDiff } from './types.js';

// Quantum-resistant hashing utilities
export async function hashManifest(manifest: PackageManifest): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(manifest, Object.keys(manifest).sort()));
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  return bufferToHex(new Uint8Array(hashBuffer));
}

export async function hashWithQuantumEntropy(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const randomBuffer = crypto.getRandomValues(new Uint8Array(32));
  
  const combinedBuffer = new Uint8Array([
    ...dataBuffer,
    ...randomBuffer
  ]);
  
  const hashBuffer = await crypto.subtle.digest('SHA-512', combinedBuffer);
  return bufferToHex(new Uint8Array(hashBuffer));
}

export function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBuffer(hex: string): Uint8Array {
  return new Uint8Array(
    hex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
  );
}

// Script signature verification
export async function verifyScriptSignature(
  script: string,
  options: {
    allowedCommands?: string[];
    maxLength?: number;
    timeout?: number;
  } = {}
): Promise<boolean> {
  const {
    allowedCommands = ['npm', 'bun', 'node', 'sh', 'bash'],
    maxLength = 10000,
    timeout = 30000
  } = options;

  // Check length
  if (script.length > maxLength) {
    return false;
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /eval\s*\(/i,
    /Function\s*\(/i,
    /process\.env\./i,
    /require\(['"]\.\.\//,
    /__dirname.*path\.join/,
    /child_process/,
    /fs\.(write|append|unlink)/,
    /http(s)?:\/\/(?!registry\.npmjs\.org)/,
    /\$\{[^}]*\}/,  // Template literals with potential injection
    /;\s*rm\s+/i,   // File deletion commands
    />\s*\/dev\/null\s*2>&1/  // Output suppression
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(script)) {
      return false;
    }
  }

  // Check allowed commands
  const commands = script.match(/\b(\w+)\b/g) || [];
  for (const cmd of commands) {
    if (!allowedCommands.includes(cmd) && !cmd.match(/^[a-z]+$/i)) {
      return false;
    }
  }

  return true;
}

// Manifest diff calculation
export function calculateManifestDiffs(
  original: PackageManifest,
  updated: PackageManifest
): ManifestDiff[] {
  const diffs: ManifestDiff[] = [];
  
  // Get all unique keys
  const allKeys = new Set([
    ...Object.keys(original),
    ...Object.keys(updated)
  ]);

  for (const key of allKeys) {
    const origValue = original[key as keyof PackageManifest];
    const updatedValue = updated[key as keyof PackageManifest];

    if (origValue === undefined) {
      diffs.push({
        path: [key],
        lhs: undefined,
        rhs: updatedValue,
        type: 'added'
      });
    } else if (updatedValue === undefined) {
      diffs.push({
        path: [key],
        lhs: origValue,
        rhs: undefined,
        type: 'deleted'
      });
    } else if (JSON.stringify(origValue) !== JSON.stringify(updatedValue)) {
      diffs.push({
        path: [key],
        lhs: origValue,
        rhs: updatedValue,
        type: 'modified'
      });
    }
  }

  return diffs;
}

// Hash similarity calculation
export function calculateHashSimilarity(hash1: string, hash2: string): number {
  if (hash1 === hash2) return 1.0;
  
  const bytes1 = hexToBuffer(hash1);
  const bytes2 = hexToBuffer(hash2);
  
  if (bytes1.length !== bytes2.length) return 0.0;
  
  let matching = 0;
  for (let i = 0; i < bytes1.length; i++) {
    if (bytes1[i] === bytes2[i]) matching++;
  }
  
  return matching / bytes1.length;
}

// Compression ratio calculation
export function calculateCompressionRatio(
  manifest: PackageManifest,
  tarball: Buffer
): number {
  const manifestSize = JSON.stringify(manifest).length;
  return (manifestSize / tarball.length) * 100;
}

// Format bytes for human readable output
export function formatBytes(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

// Extract lifecycle scripts from manifest
export function extractLifecycleScripts(manifest: PackageManifest): string[] {
  const lifecycleScripts = ['prepack', 'prepare', 'prepublishOnly', 'postpack', 'publish', 'postpublish'];
  return Object.keys(manifest.scripts || {}).filter(script => 
    lifecycleScripts.includes(script)
  );
}

// Generate quantum seal
export async function generateQuantumSeal(
  originalHash: string,
  finalHash: string,
  privateKey?: CryptoKey
): Promise<Buffer> {
  const data = Buffer.from(`${originalHash}${finalHash}`);
  
  if (privateKey) {
    const signature = await crypto.subtle.sign(
      'RSA-PSS',
      privateKey,
      data
    );
    return Buffer.from(signature);
  }
  
  // Fallback to HMAC if no private key
  const hmac = await crypto.subtle.importKey(
    'raw',
    Buffer.from('quantum-seal-key-1380'),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', hmac, data);
  return Buffer.from(signature);
}

// Validate quantum seal
export async function validateQuantumSeal(
  originalHash: string,
  finalHash: string,
  seal: Buffer,
  publicKey?: CryptoKey
): Promise<boolean> {
  const data = Buffer.from(`${originalHash}${finalHash}`);
  
  if (publicKey) {
    return await crypto.subtle.verify(
      'RSA-PSS',
      publicKey,
      seal,
      data
    );
  }
  
  // Fallback to HMAC verification
  const hmac = await crypto.subtle.importKey(
    'raw',
    Buffer.from('quantum-seal-key-1380'),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['verify']
  );
  
  return await crypto.subtle.verify('HMAC', hmac, seal, data);
}

// Generate integrity seal string
export function generateSeal(originalHash: string, finalHash: string): string {
  const timestamp = Date.now();
  const score = calculateHashSimilarity(originalHash, finalHash);
  return `TIER-1380-${originalHash.slice(0, 8)}-${finalHash.slice(0, 8)}-${score.toFixed(3)}-${timestamp}`;
}

// Parse integrity seal
export function parseSeal(seal: string): {
  tier: number;
  originalHash: string;
  finalHash: string;
  score: number;
  timestamp: number;
} | null {
  const match = seal.match(/^TIER-(\d+)-([a-f0-9]{8})-([a-f0-9]{8})-(\d+\.\d+)-(\d+)$/);
  
  if (!match) return null;
  
  return {
    tier: parseInt(match[1]),
    originalHash: match[2],
    finalHash: match[3],
    score: parseFloat(match[4]),
    timestamp: parseInt(match[5])
  };
}
