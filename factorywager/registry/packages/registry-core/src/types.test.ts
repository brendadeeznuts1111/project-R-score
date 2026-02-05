#!/usr/bin/env bun
import { describe, it, expect } from "bun:test";
import type { PackageVersion, PackageManifest, RegistryConfig } from "./types";

describe("PackageVersion", () => {
  it("should validate required fields", () => {
    const pkg: PackageVersion = {
      name: "@factorywager/core",
      version: "1.0.0",
      dist: {
        tarball: "https://registry.factory-wager.com/pkg/-/pkg-1.0.0.tgz",
        shasum: "abc123",
        integrity: "sha512-xyz789",
      },
      _id: "@factorywager/core@1.0.0",
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    };

    expect(pkg.name).toBe("@factorywager/core");
    expect(pkg.version).toBe("1.0.0");
    expect(pkg.dist.shasum).toBe("abc123");
  });

  it("should support optional fields", () => {
    const pkg: PackageVersion = {
      name: "test-pkg",
      version: "2.0.0",
      description: "Test package",
      main: "dist/index.js",
      types: "dist/index.d.ts",
      dependencies: {
        "lodash": "^4.0.0",
      },
      dist: {
        tarball: "https://registry.factory-wager.com/test-pkg/-/test-pkg-2.0.0.tgz",
        shasum: "def456",
        integrity: "sha512-abc123",
      },
      _id: "test-pkg@2.0.0",
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    };

    expect(pkg.description).toBe("Test package");
    expect(pkg.dependencies?.lodash).toBe("^4.0.0");
  });
});

describe("PackageManifest", () => {
  it("should contain all versions", () => {
    const manifest: PackageManifest = {
      name: "@factorywager/utils",
      "dist-tags": {
        latest: "1.2.0",
        beta: "1.3.0-beta.1",
      },
      versions: {
        "1.0.0": {
          name: "@factorywager/utils",
          version: "1.0.0",
          dist: {
            tarball: "",
            shasum: "",
            integrity: "",
          },
          _id: "",
          created: "",
          modified: "",
        },
        "1.2.0": {
          name: "@factorywager/utils",
          version: "1.2.0",
          dist: {
            tarball: "",
            shasum: "",
            integrity: "",
          },
          _id: "",
          created: "",
          modified: "",
        },
      },
      _id: "@factorywager/utils",
    };

    expect(Object.keys(manifest.versions)).toHaveLength(2);
    expect(manifest["dist-tags"].latest).toBe("1.2.0");
  });
});

describe("RegistryConfig", () => {
  it("should validate R2 storage config", () => {
    const config: RegistryConfig = {
      name: "factory-wager-registry",
      url: "https://npm.factory-wager.com",
      storage: {
        type: "r2",
        bucket: "registry-npm",
        region: "auto",
      },
      cdn: {
        enabled: true,
        url: "https://cdn.factory-wager.com",
        signedUrls: true,
        expirySeconds: 3600,
      },
      auth: {
        type: "jwt",
        jwtSecret: process.env.JWT_SECRET || "test-secret",
      },
      packages: [
        {
          pattern: "@factorywager/*",
          access: "authenticated",
          publish: ["admin", "maintainer"],
        },
        {
          pattern: "@project-*/*",
          access: "restricted",
        },
      ],
    };

    expect(config.storage.type).toBe("r2");
    expect(config.cdn?.enabled).toBe(true);
    expect(config.packages).toHaveLength(2);
  });
});
