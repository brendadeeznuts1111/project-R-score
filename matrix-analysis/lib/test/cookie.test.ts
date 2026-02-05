import { describe, it, expect } from "bun:test";
import { create, toString, parse, get, getAll } from "../src/core/cookie.ts";

describe("cookie", () => {
  describe("BN-101: Cookie Creation", () => {
    it("should create a basic cookie", () => {
      const c = create("name", "value");
      expect(c.name).toBe("name");
      expect(c.value).toBe("value");
    });

    it("should create cookie with options", () => {
      const c = create("session", "abc", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 3600,
        path: "/",
      });
      expect(c.httpOnly).toBe(true);
      expect(c.secure).toBe(true);
    });

    it("should serialize cookie to string", () => {
      const str = toString("token", "xyz");
      expect(str).toContain("token=xyz");
    });

    it("should include options in serialized string", () => {
      const str = toString("token", "xyz", {
        httpOnly: true,
        secure: true,
      });
      expect(str).toContain("HttpOnly");
      expect(str).toContain("Secure");
    });
  });

  describe("BN-101b: CookieMap", () => {
    it("should create CookieMap from entries", () => {
      const map = parse([["a", "1"], ["b", "2"]]);
      expect(map.get("a")).toBeDefined();
      expect(map.get("b")).toBeDefined();
    });

    it("should get cookie value from entries", () => {
      const map = parse([["name", "val"]]);
      const cookie = map.get("name");
      expect(cookie?.value ?? cookie).toBe("val");
    });

    it("should return null for missing cookie", () => {
      const result = get("a=1", "missing");
      expect(result).toBeNull();
    });

    it("should get all cookies as record", () => {
      const all = getAll([["x", "1"], ["y", "2"]]);
      expect(all["x"]).toBe("1");
      expect(all["y"]).toBe("2");
    });
  });
});
