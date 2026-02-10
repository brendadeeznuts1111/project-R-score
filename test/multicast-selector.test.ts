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
});
