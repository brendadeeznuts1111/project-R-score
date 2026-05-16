import { describe, expect, test } from "bun:test";
import { MulticastAddressSelector } from "../lib/udp/multicast-selector";

describe("MulticastAddressSelector (IPv4)", () => {
  const selector = new MulticastAddressSelector();

  test("selects link-local range with ttl 1", () => {
    const out = selector.select({
      scope: "link-local",
      reliability: "best-effort",
      security: "none",
      scale: "small",
    });
    expect(out.ttl).toBe(1);
    expect(out.address).toMatch(/^224\.0\.0\.\d+$/);
  });

  test("selects site-local range with large ttl 63", () => {
    const out = selector.select({
      scope: "site-local",
      reliability: "reliable",
      security: "encrypt",
      scale: "large",
    });
    expect(out.ttl).toBe(63);
    expect(out.address).toMatch(/^239\.\d+\.\d+\.\d+$/);
  });

  test("selects global authenticated range with ttl 64", () => {
    const out = selector.select({
      scope: "global",
      reliability: "best-effort",
      security: "auth",
      scale: "medium",
    });
    expect(out.ttl).toBe(64);
    expect(out.address).toMatch(/^224\.\d+\.\d+\.\d+$/);
    expect(out.address.startsWith("224.0.0.")).toBe(false);
  });

  test("selects encrypted global in SSM block", () => {
    const out = selector.select({
      scope: "global",
      reliability: "reliable",
      security: "encrypt",
      scale: "large",
    });
    expect(out.ttl).toBe(127);
    expect(out.address).toMatch(/^232\.\d+\.\d+\.\d+$/);
  });

  test("supports explicit admin scope", () => {
    const out = selector.select({
      scope: "admin",
      reliability: "best-effort",
      security: "none",
      scale: "medium",
    });
    expect(out.ttl).toBe(31);
    expect(out.address).toMatch(/^239\.\d+\.\d+\.\d+$/);
  });

  test("selects interface-local with ttl 0", () => {
    const out = selector.select({
      scope: "interface-local",
      reliability: "best-effort",
      security: "none",
      scale: "small",
    });
    expect(out.ttl).toBe(0);
    expect(out.address).toMatch(/^224\.0\.0\.\d+$/);
  });

  test("selects organization scope with scaled TTL", () => {
    const base = { scope: "organization" as const, reliability: "best-effort" as const, security: "none" as const };
    const small = selector.select({ ...base, scale: "small" });
    const medium = selector.select({ ...base, scale: "medium" });
    const large = selector.select({ ...base, scale: "large" });
    expect(small.ttl).toBe(31);
    expect(medium.ttl).toBe(63);
    expect(large.ttl).toBe(127);
    expect(small.address).toMatch(/^239\./);
    expect(medium.address).toMatch(/^239\./);
    expect(large.address).toMatch(/^239\./);
  });

  test("produces deterministic output for identical requirements", () => {
    const req = { scope: "global" as const, reliability: "reliable" as const, security: "encrypt" as const, scale: "medium" as const };
    const a = selector.select(req);
    const b = selector.select(req);
    expect(a.address).toBe(b.address);
    expect(a.ttl).toBe(b.ttl);
  });

  test("all IPv4 octets are in valid 0-255 range", () => {
    const scopes = ["interface-local", "link-local", "site-local", "admin", "organization", "global"] as const;
    for (const scope of scopes) {
      const out = selector.select({ scope, reliability: "best-effort", security: "none", scale: "medium" });
      const octets = out.address.split(".").map(Number);
      expect(octets).toHaveLength(4);
      for (const o of octets) {
        expect(o).toBeGreaterThanOrEqual(0);
        expect(o).toBeLessThanOrEqual(255);
      }
    }
  });
});

describe("MulticastAddressSelector (IPv6)", () => {
  const selector = new MulticastAddressSelector();

  test("selects link-local IPv6", () => {
    const out = selector.select({
      scope: "link-local",
      reliability: "best-effort",
      security: "none",
      scale: "small",
      ipFamily: "ipv6",
    });
    expect(out.ttl).toBe(1);
    expect(out.address).toMatch(/^ff02::[0-9a-f]{4}$/);
  });

  test("selects global encrypted IPv6", () => {
    const out = selector.select({
      scope: "global",
      reliability: "reliable",
      security: "encrypt",
      scale: "large",
      ipFamily: "ipv6",
    });
    expect(out.ttl).toBe(127);
    expect(out.address).toMatch(/^ff3e::[0-9a-f]{4}$/);
  });

  test("selects interface-local IPv6 with ttl 0", () => {
    const out = selector.select({
      scope: "interface-local",
      reliability: "best-effort",
      security: "none",
      scale: "small",
      ipFamily: "ipv6",
    });
    expect(out.ttl).toBe(0);
    expect(out.address).toMatch(/^ff01::[0-9a-f]{4}$/);
  });

  test("selects site-local IPv6", () => {
    const out = selector.select({
      scope: "site-local",
      reliability: "best-effort",
      security: "none",
      scale: "small",
      ipFamily: "ipv6",
    });
    expect(out.address).toMatch(/^ff05::[0-9a-f]{4}$/);
  });

  test("selects organization IPv6", () => {
    const out = selector.select({
      scope: "organization",
      reliability: "best-effort",
      security: "none",
      scale: "small",
      ipFamily: "ipv6",
    });
    expect(out.address).toMatch(/^ff08::[0-9a-f]{4}$/);
  });

  test("selects admin IPv6", () => {
    const out = selector.select({
      scope: "admin",
      reliability: "best-effort",
      security: "none",
      scale: "small",
      ipFamily: "ipv6",
    });
    expect(out.address).toMatch(/^ff15::[0-9a-f]{4}$/);
  });

  test("site-local TTL scales with size", () => {
    const base = { scope: "site-local" as const, reliability: "best-effort" as const, security: "none" as const, ipFamily: "ipv6" as const };
    const small = selector.select({ ...base, scale: "small" });
    const medium = selector.select({ ...base, scale: "medium" });
    const large = selector.select({ ...base, scale: "large" });
    expect(small.ttl).toBe(15);
    expect(medium.ttl).toBe(31);
    expect(large.ttl).toBe(63);
  });
});
