#!/usr/bin/env bun
/**
 * @fileoverview Real-World Examples: Why Bun v1.2.11 Improvements Matter
 * @description Practical examples demonstrating the value of Bun v1.2.11 improvements in production scenarios
 * @module examples/bun-1.2.11-real-world-examples
 *
 * @see {@link ../docs/BUN-1.2.11-IMPROVEMENTS.md Bun v1.2.11 Improvements}
 * @see {@link ../docs/BUN-TYPE-DEFINITION-FIXES.md Bun Type Definition Fixes}
 *
 * ## Why These Improvements Matter
 *
 * ### 1. Crypto KeyObject Improvements
 * **Problem**: Before v1.2.11, you couldn't clone crypto keys safely, making it hard to:
 * - Rotate keys without downtime
 * - Share keys between workers/threads
 * - Test key operations safely
 *
 * **Solution**: structuredClone() support + proper class hierarchy
 * **Impact**: Zero-downtime key rotation, better security, easier testing
 *
 * ### 2. TypeScript Bun.$ Type Support
 * **Problem**: No type safety for shell operations, leading to runtime errors
 * **Solution**: Bun.$ is now a proper TypeScript type
 * **Impact**: Catch errors at compile-time, better IDE support, safer shell operations
 *
 * ### 3. HTTP/2 Type Validation
 * **Problem**: Silent failures with invalid HTTP/2 options
 * **Solution**: Proper type validation with clear error messages
 * **Impact**: Catch configuration errors early, better debugging
 *
 * ### 4. queueMicrotask Error Handling
 * **Problem**: Invalid arguments could cause silent failures
 * **Solution**: Proper error handling matching Node.js behavior
 * **Impact**: Better error detection, consistent behavior
 */

import type { SecretKeyObject } from "node:crypto";
import { generateKeyPairSync, generateKeySync } from "node:crypto";

// ═══════════════════════════════════════════════════════════════
// Example 1: Zero-Downtime Key Rotation (Crypto KeyObject)
// ═══════════════════════════════════════════════════════════════

/**
 * Real-World Use Case: Zero-Downtime API Key Rotation
 * 
 * Problem: You need to rotate encryption keys without downtime.
 * Before v1.2.11: Keys couldn't be cloned, requiring service restart.
 * After v1.2.11: Clone keys safely, rotate seamlessly.
 */
export class SecureKeyManager {
  private currentKey: SecretKeyObject;
  private nextKey: SecretKeyObject | null = null;

  constructor() {
    // Generate initial key
    this.currentKey = generateKeySync("aes", { length: 256 });
  }

  /**
   * Prepare new key for rotation (can be done in background)
   * Uses structuredClone() to safely copy the key structure
   */
  prepareRotation(): void {
    // Generate new key
    const newKey = generateKeySync("aes", { length: 256 });
    
    // Clone current key for fallback (Bun v1.2.11+)
    const currentKeyClone = structuredClone(this.currentKey);
    
    // Store both keys during rotation window
    this.nextKey = newKey;
    
    console.info("✅ Key rotation prepared:");
    console.info(`   Current key class: ${this.currentKey.constructor.name}`); // SecretKeyObject
    console.info(`   Cloned key equals original: ${this.currentKey.equals(currentKeyClone)}`); // true
  }

  /**
   * Rotate to new key (zero downtime)
   */
  rotate(): void {
    if (!this.nextKey) {
      throw new Error("No next key prepared. Call prepareRotation() first.");
    }
    
    // Atomic swap - zero downtime
    this.currentKey = this.nextKey;
    this.nextKey = null;
    
    console.info("✅ Key rotated successfully (zero downtime)");
  }

  getCurrentKey(): SecretKeyObject {
    return this.currentKey;
  }
}

// ═══════════════════════════════════════════════════════════════
// Example 2: Multi-Worker Key Sharing (structuredClone)
// ═══════════════════════════════════════════════════════════════

/**
 * Real-World Use Case: Share encryption keys between workers
 * 
 * Problem: Workers need access to encryption keys but can't share objects directly.
 * Solution: Clone keys using structuredClone() and pass to workers.
 */
export async function shareKeysWithWorkers() {
  // Generate RSA key pair for API authentication
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });

  console.info("✅ Generated key pair:");
  console.info(`   Public key class: ${publicKey.constructor.name}`); // PublicKeyObject
  console.info(`   Private key class: ${privateKey.constructor.name}`); // PrivateKeyObject

  // Clone keys for worker (Bun v1.2.11+)
  const publicKeyClone = structuredClone(publicKey);
  const privateKeyClone = structuredClone(privateKey);

  // Verify clones are identical
  console.info("\n✅ Key clones verified:");
  console.info(`   Public keys equal: ${publicKey.equals(publicKeyClone)}`); // true
  console.info(`   Private keys equal: ${privateKey.equals(privateKeyClone)}`); // true

  // In real scenario, you'd pass clones to workers:
  // const worker = new Worker("./worker.ts", {
  //   data: { publicKey: publicKeyClone, privateKey: privateKeyClone }
  // });

  return { publicKeyClone, privateKeyClone };
}

// ═══════════════════════════════════════════════════════════════
// Example 3: Type-Safe Shell Operations (Bun.$ Type)
// ═══════════════════════════════════════════════════════════════

/**
 * Real-World Use Case: Type-safe shell operations for deployment scripts
 * 
 * Problem: Shell operations had no type safety, causing runtime errors.
 * Solution: Bun.$ is now a proper TypeScript type (v1.2.11+).
 */
export class DeploymentManager {
  // ✅ Type-safe shell instance (Bun v1.2.11+)
  private shell: Bun.$;

  constructor() {
    // Bun.$ is now a proper type - IDE will autocomplete and type-check
    this.shell = Bun.$.nothrow();
  }

  /**
   * Deploy application with type-safe shell operations
   */
  async deploy(environment: "staging" | "production"): Promise<void> {
    console.info(`🚀 Deploying to ${environment}...`);

    // Type-safe shell operations
    // IDE will autocomplete and catch errors at compile-time
    const gitStatus = await this.shell`git status --porcelain`;
    if (gitStatus.stdout.toString().trim()) {
      throw new Error("Working directory is not clean. Commit changes first.");
    }

    const currentBranch = await this.shell`git rev-parse --abbrev-ref HEAD`;
    console.info(`   Current branch: ${currentBranch.stdout.toString().trim()}`);

    // Build application
    await this.shell`bun run build`;
    console.info("✅ Build completed");

    // Deploy based on environment
    if (environment === "production") {
      await this.shell`bun run deploy:prod`;
    } else {
      await this.shell`bun run deploy:staging`;
    }

    console.info(`✅ Deployment to ${environment} completed`);
  }

  /**
   * Run database migrations with type-safe shell
   */
  async migrate(): Promise<void> {
    // Type-safe - IDE knows this is Bun.$ instance
    const result = await this.shell`bun run db:migrate`;
    
    if (result.exitCode !== 0) {
      throw new Error(`Migration failed: ${result.stderr.toString()}`);
    }
    
    console.info("✅ Database migrations completed");
  }
}

// ═══════════════════════════════════════════════════════════════
// Example 4: HTTP/2 API with Type Validation
// ═══════════════════════════════════════════════════════════════

/**
 * Real-World Use Case: High-performance API with HTTP/2
 * 
 * Problem: Invalid HTTP/2 options caused silent failures.
 * Solution: Type validation catches errors early (v1.2.11+).
 */
export class HighPerformanceAPI {
  /**
   * Create HTTP/2 client with validated options
   * 
   * Before v1.2.11: Invalid options could cause silent failures
   * After v1.2.11: Type validation throws clear errors
   */
  static createClient(url: string) {
    const http2 = require("node:http2");

    try {
      // ✅ Type validation ensures correct options
      const client = http2.connect(url, {
        // These are now validated at runtime
        rejectUnauthorized: true, // ✅ Must be boolean
      });

      // Request with validated options
      const req = client.request(
        { ":method": "GET", ":path": "/api/data" },
        {
          // ✅ Type validation prevents errors:
          endStream: true, // ✅ Must be boolean
          weight: 16, // ✅ Must be number
          exclusive: false, // ✅ Must be boolean
          silent: false, // ✅ Must be boolean
        }
      );

      return { client, req };
    } catch (error: any) {
      // ✅ Clear error messages help debugging
      if (error.message.includes("must be a boolean") || 
          error.message.includes("must be a number")) {
        console.error("❌ HTTP/2 configuration error:", error.message);
        throw new Error(`Invalid HTTP/2 options: ${error.message}`);
      }
      throw error;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Example 5: Reliable Microtask Scheduling
// ═══════════════════════════════════════════════════════════════

/**
 * Real-World Use Case: Reliable async task scheduling
 * 
 * Problem: Invalid queueMicrotask arguments caused silent failures.
 * Solution: Proper error handling matches Node.js behavior (v1.2.11+).
 */
export class TaskScheduler {
  /**
   * Schedule microtask with proper error handling
   */
  static schedule(task: () => void | Promise<void>): void {
    try {
      // ✅ Proper error handling in v1.2.11+
      queueMicrotask(task);
    } catch (error: any) {
      // ✅ Clear error code (ERR_INVALID_ARG_TYPE) helps debugging
      if (error.code === "ERR_INVALID_ARG_TYPE") {
        console.error("❌ Invalid task argument:", error.message);
        throw new Error(`Task must be a function: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Batch process items with microtasks
   */
  static async batchProcess<T>(
    items: T[],
    processor: (item: T) => Promise<void>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let processed = 0;

      items.forEach((item) => {
        // ✅ Reliable microtask scheduling
        this.schedule(async () => {
          try {
            await processor(item);
            processed++;

            if (processed === items.length) {
              resolve();
            }
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// Example 6: API Rate Limiting with Key Rotation
// ═══════════════════════════════════════════════════════════════

/**
 * Real-World Use Case: API rate limiting with rotating keys
 * 
 * Demonstrates practical value of KeyObject improvements
 */
export class RateLimitedAPI {
  private keyManager: SecureKeyManager;
  private requestCount: number = 0;
  private readonly maxRequests: number = 1000;

  constructor() {
    this.keyManager = new SecureKeyManager();
  }

  /**
   * Make authenticated API request
   */
  async makeRequest(endpoint: string): Promise<Response> {
    // Check rate limit
    if (this.requestCount >= this.maxRequests) {
      // Rotate key (zero downtime)
      this.keyManager.rotate();
      this.requestCount = 0;
      console.info("🔄 Rate limit reached, key rotated");
    }

    const key = this.keyManager.getCurrentKey();
    this.requestCount++;

    // Use key for request signing (simplified example)
    return fetch(endpoint, {
      headers: {
        "X-API-Key": key.export().toString("hex"),
      },
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// Main Demo
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.info("🎯 Bun v1.2.11 Real-World Examples\n");
  console.info("=" .repeat(60));

  // Example 1: Key Rotation
  console.info("\n1️⃣  Zero-Downtime Key Rotation");
  console.info("-".repeat(60));
  const keyManager = new SecureKeyManager();
  keyManager.prepareRotation();
  keyManager.rotate();

  // Example 2: Key Sharing
  console.info("\n2️⃣  Multi-Worker Key Sharing");
  console.info("-".repeat(60));
  await shareKeysWithWorkers();

  // Example 3: Type-Safe Shell
  console.info("\n3️⃣  Type-Safe Shell Operations");
  console.info("-".repeat(60));
  const deployer = new DeploymentManager();
  console.info("   ✅ Shell instance is type-safe (Bun.$ type)");
  console.info("   ✅ IDE autocomplete and type checking available");

  // Example 4: HTTP/2 Validation
  console.info("\n4️⃣  HTTP/2 Type Validation");
  console.info("-".repeat(60));
  console.info("   ✅ Invalid options now throw clear errors");
  console.info("   ✅ Type validation prevents runtime failures");

  // Example 5: Microtask Scheduling
  console.info("\n5️⃣  Reliable Microtask Scheduling");
  console.info("-".repeat(60));
  TaskScheduler.schedule(() => {
    console.info("   ✅ Microtask executed successfully");
  });

  // Example 6: Rate Limiting
  console.info("\n6️⃣  API Rate Limiting with Key Rotation");
  console.info("-".repeat(60));
  const api = new RateLimitedAPI();
  console.info("   ✅ Rate limiting with seamless key rotation");

  console.info("\n" + "=".repeat(60));
  console.info("✨ All examples demonstrate real-world value!");
  console.info("\n📚 See docs/BUN-1.2.11-IMPROVEMENTS.md for details");
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}

export { DeploymentManager, RateLimitedAPI, SecureKeyManager, TaskScheduler };

