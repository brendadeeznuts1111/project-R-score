import { test, expect } from "bun:test";

interface PackageData {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
}

function createPackageData(name: string, version: string): PackageData {
  return {
    name,
    version,
    description: `A fantastic package called ${name}`,
    author: "Fantasy42 Development Team",
    license: "MIT"
  };
}

test("package data snapshot", () => {
  const packageData = createPackageData("fantasy42-core", "1.0.0");
  expect(packageData).toMatchSnapshot();
});

test("package data with different version", () => {
  const packageData = createPackageData("fantasy42-core", "2.0.0");
  expect(packageData).toMatchSnapshot();
});

test("registry configuration snapshot", () => {
  const config = {
    registry: "https://registry.npmjs.org/",
    scopes: {
      "@fantasy42": "https://packages.fantasy42.net/"
    },
    security: {
      enabled: true,
      audit: true,
      vulnerabilities: "block"
    },
    performance: {
      cache: true,
      compression: true,
      parallel: 4
    }
  };

  expect(config).toMatchSnapshot();
});

test("error handling snapshot", () => {
  const error = new Error("Package not found");
  error.name = "PackageError";

  expect({
    name: error.name,
    message: error.message,
    stack: error.stack?.split('\n').slice(0, 3) // Only first 3 lines for snapshot
  }).toMatchSnapshot();
});
