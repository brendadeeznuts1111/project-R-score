/**
 * [TEST][DNS-RESOLVER][UNIT]{BUN-NATIVE}
 * Tests for DNS resolution types and validation
 */

import { describe, it, expect } from "bun:test";
import {
  isValidIPv4,
  isValidIPv6,
  validateDNSResult,
  detectIPFamily,
  type DNSResolutionResult,
  type IPFamily,
} from "./dns-resolver";

describe("[NETWORKING][DNS] dns-resolver", () => {
  describe("[1.3.0.0] isValidIPv4()", () => {
    it("should accept valid IPv4 addresses", () => {
      expect(isValidIPv4("127.0.0.1")).toBe(true);
      expect(isValidIPv4("192.168.1.1")).toBe(true);
      expect(isValidIPv4("8.8.8.8")).toBe(true);
      expect(isValidIPv4("255.255.255.255")).toBe(true);
      expect(isValidIPv4("0.0.0.0")).toBe(true);
    });

    it("should reject invalid IPv4 addresses", () => {
      expect(isValidIPv4("256.1.1.1")).toBe(false);
      expect(isValidIPv4("1.1.1")).toBe(false);
      expect(isValidIPv4("1.1.1.1.1")).toBe(false);
      expect(isValidIPv4("abc.def.ghi.jkl")).toBe(false);
      expect(isValidIPv4("2001:db8::1")).toBe(false);
    });
  });

  describe("[1.3.1.0] isValidIPv6()", () => {
    it("should accept valid IPv6 addresses", () => {
      expect(isValidIPv6("::1")).toBe(true);
      expect(isValidIPv6("2001:db8::1")).toBe(true);
      expect(isValidIPv6("::")).toBe(true);
      expect(isValidIPv6("fe80::1")).toBe(true);
    });

    it("should reject invalid IPv6 addresses", () => {
      expect(isValidIPv6("127.0.0.1")).toBe(false);
      expect(isValidIPv6("gggg::1")).toBe(false);
      expect(isValidIPv6("2001:db8::1::2")).toBe(false);
    });
  });

  describe("[1.4.0.0] validateDNSResult()", () => {
    it("should accept valid IPv4 result", () => {
      const result: DNSResolutionResult = {
        address: "127.0.0.1",
        family: 4,
        ttl: 300,
      };
      expect(() => validateDNSResult(result)).not.toThrow();
    });

    it("should accept valid IPv6 result", () => {
      const result: DNSResolutionResult = {
        address: "::1",
        family: 6,
        ttl: 0,
      };
      expect(() => validateDNSResult(result)).not.toThrow();
    });

    it("should reject IPv4 address with family 6", () => {
      const result: DNSResolutionResult = {
        address: "127.0.0.1",
        family: 6,
        ttl: 300,
      };
      expect(() => validateDNSResult(result)).toThrow(
        /Invalid IPv6 address for family 6/
      );
    });

    it("should reject IPv6 address with family 4", () => {
      const result: DNSResolutionResult = {
        address: "::1",
        family: 4,
        ttl: 300,
      };
      expect(() => validateDNSResult(result)).toThrow(
        /Invalid IPv4 address for family 4/
      );
    });

    it("should reject negative TTL", () => {
      const result: DNSResolutionResult = {
        address: "127.0.0.1",
        family: 4,
        ttl: -1,
      };
      expect(() => validateDNSResult(result)).toThrow(/Invalid TTL/);
    });

    it("should reject invalid family", () => {
      const result = {
        address: "127.0.0.1",
        family: 5,
        ttl: 300,
      } as unknown as DNSResolutionResult;
      expect(() => validateDNSResult(result)).toThrow(/Invalid family/);
    });
  });

  describe("[1.5.0.0] detectIPFamily()", () => {
    it("should detect IPv4 addresses", () => {
      expect(detectIPFamily("127.0.0.1")).toBe(4);
      expect(detectIPFamily("192.168.1.1")).toBe(4);
      expect(detectIPFamily("8.8.8.8")).toBe(4);
    });

    it("should detect IPv6 addresses", () => {
      expect(detectIPFamily("::1")).toBe(6);
      expect(detectIPFamily("2001:db8::1")).toBe(6);
      expect(detectIPFamily("::")).toBe(6);
    });

    it("should throw for invalid addresses", () => {
      expect(() => detectIPFamily("invalid")).toThrow(
        /Unable to detect IP family/
      );
      expect(() => detectIPFamily("256.1.1.1")).toThrow(
        /Unable to detect IP family/
      );
    });
  });
});

