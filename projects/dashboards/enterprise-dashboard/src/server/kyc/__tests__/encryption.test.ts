/**
 * Encryption Tests
 * Unit tests for document encryption utilities
 */

import { describe, test, expect } from "bun:test";
import { encryptDocument, decryptDocument } from "../encryption";

describe("Document Encryption", () => {
  test("encryptDocument encrypts data successfully", async () => {
    const testData = new TextEncoder().encode("test document content");
    const userId = "test-user-123";

    const encrypted = await encryptDocument(testData, userId);

    expect(encrypted).toHaveProperty("encrypted");
    expect(encrypted).toHaveProperty("iv");
    expect(encrypted).toHaveProperty("keyId");
    expect(encrypted.encrypted).toBeInstanceOf(Uint8Array);
    expect(encrypted.iv).toBeInstanceOf(Uint8Array);
    expect(encrypted.iv.length).toBe(12); // AES-GCM IV is 12 bytes
    expect(encrypted.keyId).toBe(userId);
    expect(encrypted.encrypted.length).toBeGreaterThan(0);
  });

  test("decryptDocument decrypts encrypted data correctly", async () => {
    const originalData = new TextEncoder().encode("sensitive document data");
    const userId = "test-user-456";

    const encrypted = await encryptDocument(originalData, userId);
    const decrypted = await decryptDocument(
      encrypted.encrypted,
      encrypted.iv,
      userId
    );

    expect(decrypted).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(decrypted)).toBe(
      new TextDecoder().decode(originalData)
    );
  });

  test("encryption produces different ciphertext for same data", async () => {
    const testData = new TextEncoder().encode("same content");
    const userId = "test-user";

    const encrypted1 = await encryptDocument(testData, userId);
    const encrypted2 = await encryptDocument(testData, userId);

    // IVs should be different (random)
    expect(encrypted1.iv).not.toEqual(encrypted2.iv);
    // Ciphertexts should be different due to different IVs
    expect(encrypted1.encrypted).not.toEqual(encrypted2.encrypted);
  });

  test("decryption fails with wrong IV", async () => {
    const testData = new TextEncoder().encode("test data");
    const userId = "test-user";

    const encrypted = await encryptDocument(testData, userId);
    const wrongIV = new Uint8Array(12).fill(0);

    try {
      await decryptDocument(encrypted.encrypted, wrongIV, userId);
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      // Decryption should fail with wrong IV
      expect(error).toBeDefined();
    }
  });

  test("decryption fails with wrong user ID", async () => {
    const testData = new TextEncoder().encode("test data");
    const userId1 = "user1";
    const userId2 = "user2";

    const encrypted = await encryptDocument(testData, userId1);

    try {
      await decryptDocument(encrypted.encrypted, encrypted.iv, userId2);
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      // Decryption should fail with wrong user ID (different key)
      expect(error).toBeDefined();
    }
  });

  test("encryption handles large documents", async () => {
    const largeData = new Uint8Array(1024 * 1024).fill(65); // 1MB of 'A'
    const userId = "test-user";

    const encrypted = await encryptDocument(largeData, userId);

    expect(encrypted.encrypted.length).toBeGreaterThan(0);
    expect(encrypted.encrypted.length).toBeGreaterThan(largeData.length); // Encrypted should be larger

    const decrypted = await decryptDocument(
      encrypted.encrypted,
      encrypted.iv,
      userId
    );

    expect(decrypted.length).toBe(largeData.length);
    expect(decrypted).toEqual(largeData);
  });
});
