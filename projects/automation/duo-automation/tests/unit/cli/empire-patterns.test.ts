import { expect, test, describe } from "bun:test";
import { Gate, Filter, Path, Upload, Pattern, Query, BlobFarm, Farm } from "../../utils/empire-patterns";

describe("Empire Pro Patterns (§Gate to §Farm)", () => {
  describe("§Gate: Setup & Validation", () => {
    test("Gate score mode (p/t)", () => {
      const gate = new Gate("96/100");
      expect(gate.test()).toBe(true);
      const exec = gate.exec();
      expect(exec.score).toBe(0.96);
      expect(exec.status).toBe("🟢 Optimal");
    });

    test("Gate suboptimal score", () => {
      const gate = new Gate("50/100");
      expect(gate.test()).toBe(false);
      expect(gate.exec().status).toBe("🔴 Suboptimal");
    });

    test("Gate count mode (5000)", () => {
      const gate = new Gate(5000);
      expect(gate.test(5001)).toBe(true);
      expect(gate.test(4999)).toBe(false);
      const exec = new Gate("5000").exec();
      expect(exec.count).toBe(5000);
      expect(exec.concurrency).toBe(100);
    });

    test("Gate simple numeric test", () => {
      const gate = new Gate("90");
      expect(gate.test("95")).toBe(true);
      expect(gate.test("85")).toBe(false);
    });
    
    test("Gate default true", () => {
       const gate = new Gate({ passed: 100, total: 100 });
       expect(gate.test()).toBe(true);
       expect(gate.exec().status).toBe("validated");
    });
  });

  describe("§Filter: Optimization", () => {
    test("ZSTD Performance (LEVEL_3)", () => {
      const filter = new Filter("LEVEL_3");
      expect(filter.test({})).toBe(true);
      const exec = filter.exec({});
      expect(exec.ratio).toBe(0.82);
    });

    test("Unicode width (🇺🇸)", () => {
      const filter = new Filter("🇺🇸");
      expect(filter.test({})).toBe(true);
      expect(filter.exec({}).width).toBe(2);
    });

    test("Predicate filtering", () => {
      const filter = new Filter("type=MOBILE");
      const data = [{ type: "MOBILE" }, { type: "FIXED" }];
      expect(filter.test(data[0])).toBe(true);
      expect(filter.test(data[1])).toBe(false);
      const exec = filter.exec(data);
      expect(exec.groups?.matched).toBe(1);
    });

    test("JSON string filtering", () => {
      const filter = new Filter("status=active");
      const input = JSON.stringify([{ status: "active" }]);
      expect(filter.test(JSON.parse(input)[0])).toBe(true);
      const exec = filter.exec(input);
      expect(exec.result).toHaveLength(1);
    });
  });

  describe("§Path: R2 Hierarchy", () => {
    test("Path key extraction", () => {
      const path = new Path("accounts");
      const key = "accounts/bucket1/user/data.json";
      expect(path.test(key)).toBe(true);
      expect(path.test("wrong")).toBe(false);
      const exec = path.exec(key);
      expect(exec?.bucket).toBe("bucket1");
      expect(exec?.namespace).toBe("accounts");
      expect(exec?.key).toBe("user/data.json");
    });

    test("Path null on no match", () => {
      const path = new Path("accounts");
      expect(path.exec("wrong")).toBeNull();
    });
  });

  describe("§Upload: Performance", () => {
    test("Upload budget test", () => {
      const upload = new Upload(1.0); // 1s target
      expect(upload.test(0.5)).toBe(true);
      expect(upload.test(1.5)).toBe(false);
      const exec = upload.exec(0.5);
      expect(exec.duration).toBe(0.5);
      expect(exec.saved).toBe(0.5);
    });
    
    test("Upload default exec", () => {
       const upload = new Upload("1.0");
       expect(upload.exec({}).duration).toBe(0.75);
    });
  });

  describe("§Pattern: URLPattern", () => {
    test("URLPattern group capture", () => {
      const pattern = new Pattern({ pathname: "/:id" });
      expect(pattern.test("/123")).toBe(true);
      const exec = pattern.exec("/123");
      expect(exec?.pathname?.groups?.id).toBe("123");
    });

    test("Pattern fallback", () => {
      const pattern = new Pattern("REGEX_FALLBACK");
      expect(pattern.test("anything")).toBe(true);
      const exec = pattern.exec();
      expect(exec?.fallback).toBe(true);
      expect(exec?.compiled).toBeInstanceOf(RegExp);
    });

    test("Pattern string init", () => {
       const pattern = new Pattern("/test");
       expect(pattern.test("/test")).toBe(true);
    });
  });

  describe("§Query: Search & Cache", () => {
    test("Query prefetch", () => {
      const query = new Query("prefetch");
      expect(query.test({})).toBe(true);
      expect(query.exec({}).ttfb).toBe("-15ms");
    });

    test("Query auto-detect (CSV)", () => {
      const query = new Query("auto-detect");
      expect(query.exec({}).fields).toBe(12);
    });

    test("Query glob keys", () => {
      const query = new Query("user_*");
      const exec = query.exec({});
      expect(exec.keys).toContain("user_123");
      expect(exec.latency).toBe("0.2ms");
    });
  });

  describe("§Stream: Blob Farm", () => {
    test("BlobFarm default", () => {
      const farm = new BlobFarm("default");
      expect(farm.test()).toBe(true);
      expect(farm.exec().speed).toBe("18GB/s");
    });

    test("BlobFarm PNG mode", () => {
      const farm = new BlobFarm("png");
      const exec = farm.exec();
      expect(exec.format).toBe("png");
      expect(exec.captureTime).toBe("5ms");
    });
  });

  describe("§Farm: Infrastructure", () => {
    test("Farm metrics", () => {
      const farm = new Farm("large");
      expect(farm.test()).toBe(true);
      const exec = farm.exec();
      expect(exec.throughput).toBe("112GB/min");
      expect(exec.successRate).toBe(0.9);
    });
  });
});
