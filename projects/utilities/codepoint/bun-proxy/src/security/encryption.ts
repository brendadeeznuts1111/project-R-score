// @bun/proxy/security/encryption.ts - Encryption utilities (Code Point: 0x330-0x33F)

import { createCipheriv, createDecipheriv, randomBytes, scrypt, hkdf } from 'crypto';

// Encryption configuration
export interface EncryptionConfig {
  algorithm?: string;
  keyLength?: number;
  ivLength?: number;
  saltRounds?: number;
  hkdf?: {
    hash?: string;
    salt?: string;
    info?: string;
  };
}

// Encryption result
export interface EncryptionResult {
  encrypted: Buffer;
  iv: Buffer;
  salt?: Buffer;
  tag?: Buffer; // For GCM mode
}

// Decryption result
export interface DecryptionResult {
  decrypted: Buffer;
  verified: boolean;
}

// Key derivation utilities
export class KeyDerivation {
  // HKDF (HMAC-based Extract-and-Expand Key Derivation Function)
  static async deriveKeyHKDF(
    masterKey: string | Buffer,
    salt: string | Buffer,
    info: string | Buffer,
    length: number,
    hash: string = 'sha256'
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      hkdf(hash, masterKey, salt, info, length, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }

  // Synchronous HKDF
  static deriveKeyHKDFSync(
    masterKey: string | Buffer,
    salt: string | Buffer,
    info: string | Buffer,
    length: number,
    hash: string = 'sha256'
  ): Buffer {
    return require('crypto').hkdfSync(hash, masterKey, salt, info, length);
  }

  // PBKDF2 key derivation
  static async deriveKeyPBKDF2(
    password: string,
    salt: Buffer,
    iterations: number = 10000,
    keyLength: number = 32,
    digest: string = 'sha256'
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      require('crypto').pbkdf2(password, salt, iterations, keyLength, digest, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }

  // Scrypt key derivation (using Bun's optimized implementation)
  static async deriveKeyScrypt(
    password: string | Buffer,
    salt: Buffer,
    keyLength: number = 32,
    options: { N?: number; r?: number; p?: number } = {}
  ): Promise<Buffer> {
    const { N = 16384, r = 8, p = 1 } = options;

    return new Promise((resolve, reject) => {
      scrypt(password, salt, keyLength, { N, r, p }, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }
}

// Symmetric encryption utilities
export class SymmetricEncryption {
  private static readonly DEFAULT_ALGORITHM = 'aes-256-gcm';
  private static readonly DEFAULT_KEY_LENGTH = 32;
  private static readonly DEFAULT_IV_LENGTH = 16;

  // Generate a random key
  static generateKey(length: number = this.DEFAULT_KEY_LENGTH): Buffer {
    return randomBytes(length);
  }

  // Generate a random IV
  static generateIV(length: number = this.DEFAULT_IV_LENGTH): Buffer {
    return randomBytes(length);
  }

  // Generate a random salt
  static generateSalt(length: number = 32): Buffer {
    return randomBytes(length);
  }

  // Encrypt data
  static async encrypt(
    data: string | Buffer,
    key: Buffer,
    config: EncryptionConfig = {}
  ): Promise<EncryptionResult> {
    const algorithm = config.algorithm || this.DEFAULT_ALGORITHM;
    const iv = this.generateIV(config.ivLength);
    const salt = config.hkdf ? this.generateSalt() : undefined;

    let encryptionKey = key;

    // Use HKDF for key derivation if configured
    if (config.hkdf && salt) {
      const hkdfConfig = config.hkdf;
      encryptionKey = await KeyDerivation.deriveKeyHKDF(
        key,
        hkdfConfig.salt || salt,
        hkdfConfig.info || 'encryption',
        config.keyLength || this.DEFAULT_KEY_LENGTH,
        hkdfConfig.hash || 'sha256'
      );
    }

    const cipher = createCipheriv(algorithm, encryptionKey, iv);
    const input = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');

    let encrypted = Buffer.concat([
      cipher.update(input),
      cipher.final()
    ]);

    let tag: Buffer | undefined;

    // For GCM mode, get the authentication tag
    if (algorithm.includes('gcm')) {
      tag = (cipher as any).getAuthTag();
    }

    return {
      encrypted,
      iv,
      salt,
      tag
    };
  }

  // Decrypt data
  static async decrypt(
    encryptedData: Buffer,
    key: Buffer,
    iv: Buffer,
    config: EncryptionConfig = {},
    tag?: Buffer,
    salt?: Buffer
  ): Promise<DecryptionResult> {
    const algorithm = config.algorithm || this.DEFAULT_ALGORITHM;

    let decryptionKey = key;

    // Use HKDF for key derivation if configured and salt provided
    if (config.hkdf && salt) {
      const hkdfConfig = config.hkdf;
      decryptionKey = await KeyDerivation.deriveKeyHKDF(
        key,
        hkdfConfig.salt || salt,
        hkdfConfig.info || 'encryption',
        config.keyLength || this.DEFAULT_KEY_LENGTH,
        hkdfConfig.hash || 'sha256'
      );
    }

    const decipher = createDecipheriv(algorithm, decryptionKey, iv);

    // For GCM mode, set the authentication tag
    if (algorithm.includes('gcm') && tag) {
      (decipher as any).setAuthTag(tag);
    }

    try {
      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
      ]);

      return {
        decrypted,
        verified: true
      };
    } catch (error) {
      return {
        decrypted: Buffer.alloc(0),
        verified: false
      };
    }
  }

  // Encrypt/decrypt streams (for large files)
  static createEncryptStream(
    key: Buffer,
    config: EncryptionConfig = {}
  ): TransformStream<Uint8Array, Uint8Array> {
    const algorithm = config.algorithm || this.DEFAULT_ALGORITHM;
    const iv = this.generateIV(config.ivLength);

    let cipher: any;
    let initialized = false;

    return new TransformStream({
      start(controller) {
        // Send IV first
        controller.enqueue(iv);
      },

      transform(chunk, controller) {
        if (!initialized) {
          cipher = createCipheriv(algorithm, key, iv);
          initialized = true;
        }

        const encrypted = cipher.update(chunk);
        controller.enqueue(encrypted);
      },

      flush(controller) {
        if (cipher) {
          const final = cipher.final();

          // For GCM mode, append auth tag
          if (algorithm.includes('gcm')) {
            const tag = cipher.getAuthTag();
            controller.enqueue(final);
            controller.enqueue(tag);
          } else {
            controller.enqueue(final);
          }
        }
      }
    });
  }

  static createDecryptStream(
    key: Buffer,
    config: EncryptionConfig = {}
  ): TransformStream<Uint8Array, Uint8Array> {
    const algorithm = config.algorithm || this.DEFAULT_ALGORITHM;

    let decipher: any;
    let iv: Buffer;
    let initialized = false;
    let buffer = Buffer.alloc(0);

    return new TransformStream({
      transform(chunk, controller) {
        buffer = Buffer.concat([buffer, chunk]);

        if (!initialized && buffer.length >= 16) { // IV is 16 bytes
          iv = buffer.subarray(0, 16);
          buffer = buffer.subarray(16);
          decipher = createDecipheriv(algorithm, key, iv);
          initialized = true;
        }

        if (initialized && buffer.length > 0) {
          try {
            const decrypted = decipher.update(buffer);
            if (decrypted.length > 0) {
              controller.enqueue(decrypted);
            }
            buffer = Buffer.alloc(0);
          } catch (error) {
            // For GCM mode, we need the auth tag at the end
            if (algorithm.includes('gcm') && buffer.length >= 16) {
              const tag = buffer.subarray(-16);
              const data = buffer.subarray(0, -16);

              (decipher as any).setAuthTag(tag);
              const decrypted = Buffer.concat([
                decipher.update(data),
                decipher.final()
              ]);

              controller.enqueue(decrypted);
              buffer = Buffer.alloc(0);
            }
          }
        }
      },

      flush(controller) {
        if (decipher && buffer.length > 0) {
          try {
            const decrypted = decipher.final();
            if (decrypted.length > 0) {
              controller.enqueue(decrypted);
            }
          } catch (error) {
            controller.error(error);
          }
        }
      }
    });
  }
}

// Hash utilities
export class HashUtils {
  // Generate hash of data
  static async hash(data: string | Buffer, algorithm: string = 'sha256'): Promise<string> {
    const crypto = require('crypto');
    const hash = crypto.createHash(algorithm);
    hash.update(Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8'));
    return hash.digest('hex');
  }

  // Generate HMAC
  static async hmac(
    data: string | Buffer,
    key: string | Buffer,
    algorithm: string = 'sha256'
  ): Promise<string> {
    const crypto = require('crypto');
    const hmac = crypto.createHmac(algorithm, key);
    hmac.update(Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8'));
    return hmac.digest('hex');
  }

  // Verify HMAC
  static async verifyHMAC(
    data: string | Buffer,
    key: string | Buffer,
    expectedHMAC: string,
    algorithm: string = 'sha256'
  ): Promise<boolean> {
    const calculated = await this.hmac(data, key, algorithm);
    return calculated === expectedHMAC;
  }
}

// Prime number utilities (using Bun's optimized implementation)
export class PrimeUtils {
  // Generate a prime number
  static async generatePrime(bitLength: number, safe: boolean = false): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      require('crypto').generatePrime(bitLength, { safe }, (err: Error, prime: Buffer) => {
        if (err) reject(err);
        else resolve(prime);
      });
    });
  }

  // Generate a prime number synchronously
  static generatePrimeSync(bitLength: number, safe: boolean = false): Buffer {
    return require('crypto').generatePrimeSync(bitLength, { safe });
  }

  // Check if a number is prime
  static async checkPrime(candidate: Buffer | number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      require('crypto').checkPrime(candidate, (err: Error, result: boolean) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  // Check if a number is prime synchronously
  static checkPrimeSync(candidate: Buffer | number): boolean {
    return require('crypto').checkPrimeSync(candidate);
  }
}

// Export utilities
export {
  KeyDerivation,
  SymmetricEncryption,
  HashUtils,
  PrimeUtils
};

// Default export
export default {
  KeyDerivation,
  SymmetricEncryption,
  HashUtils,
  PrimeUtils
};