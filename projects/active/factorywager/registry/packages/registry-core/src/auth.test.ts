#!/usr/bin/env bun
import { describe, it, expect } from "bun:test";

// Simple auth utilities
function hashPassword(password: string, salt: string): string {
  // In production, use bcrypt or Argon2
  return Bun.hash(password + salt).toString(16);
}

function verifyPassword(password: string, salt: string, hash: string): boolean {
  return hashPassword(password, salt) === hash;
}

function generateToken(user: string, secret: string): string {
  const payload = { user, exp: Date.now() + 3600000 }; // 1 hour
  const data = JSON.stringify(payload);
  const signature = Bun.hash(data + secret).toString(16);
  return `${Buffer.from(data).toString('base64')}.${signature}`;
}

function verifyToken(token: string, secret: string): { user: string; valid: boolean } {
  try {
    const [dataB64, signature] = token.split('.');
    const data = Buffer.from(dataB64, 'base64').toString();
    const payload = JSON.parse(data);
    
    const expectedSig = Bun.hash(data + secret).toString(16);
    if (signature !== expectedSig) return { user: '', valid: false };
    
    if (payload.exp < Date.now()) return { user: '', valid: false };
    
    return { user: payload.user, valid: true };
  } catch {
    return { user: '', valid: false };
  }
}

function checkScope(allowed: string[], requested: string[]): boolean {
  return requested.every(r => allowed.includes(r));
}

describe("Auth", () => {
  describe("password hashing", () => {
    it("should hash passwords consistently", () => {
      const salt = "random-salt";
      const hash1 = hashPassword("mypassword", salt);
      const hash2 = hashPassword("mypassword", salt);
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different passwords", () => {
      const salt = "random-salt";
      const hash1 = hashPassword("password1", salt);
      const hash2 = hashPassword("password2", salt);
      expect(hash1).not.toBe(hash2);
    });

    it("should verify correct passwords", () => {
      const salt = "random-salt";
      const hash = hashPassword("mypassword", salt);
      expect(verifyPassword("mypassword", salt, hash)).toBe(true);
      expect(verifyPassword("wrongpassword", salt, hash)).toBe(false);
    });
  });

  describe("token generation", () => {
    it("should generate valid tokens", () => {
      const token = generateToken("alice", "secret");
      expect(token).toContain('.');
      
      const result = verifyToken(token, "secret");
      expect(result.valid).toBe(true);
      expect(result.user).toBe("alice");
    });

    it("should reject invalid tokens", () => {
      const result = verifyToken("invalid.token", "secret");
      expect(result.valid).toBe(false);
    });

    it("should reject tokens with wrong secret", () => {
      const token = generateToken("alice", "secret1");
      const result = verifyToken(token, "secret2");
      expect(result.valid).toBe(false);
    });
  });

  describe("scope checking", () => {
    it("should allow valid scopes", () => {
      expect(checkScope(["read", "write"], ["read"])).toBe(true);
      expect(checkScope(["read", "write", "admin"], ["read", "write"])).toBe(true);
    });

    it("should reject invalid scopes", () => {
      expect(checkScope(["read"], ["write"])).toBe(false);
      expect(checkScope(["read"], ["read", "write"])).toBe(false);
    });
  });
});
