import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { CookieManager } from "../src/api/cookie-manager";
import { createServer } from "../src/api/server";

// Test fixtures
const TEST_USER = "admin";
const TEST_PASS = "test123";

// Global state for tests
let server: ReturnType<typeof Bun.serve>;
let cookieManager: CookieManager;
let testFileIds: string[] = [];

describe("🚀 Bun v1.3.6+ APIs Integration", () => {
  beforeAll(async () => {
    // Start server before all tests
    server = createServer();
    
    // Set environment
    process.env.ADMIN_USER = TEST_USER;
    process.env.ADMIN_PASS = TEST_PASS;
    
    console.log(
      `🧪 Test server started at ${server.url}` 
    );
  });

  afterAll(async () => {
    // Cleanup after all tests
    server.stop();
    
    // Cleanup test files
    await Promise.all([
      Bun.$`rm -rf ./uploads/test-*`.quiet(),
      Bun.$`rm -rf ./archives/archive-*`.quiet(),
    ]);
    
    console.log("🧪 Test server stopped");
  });

  beforeEach(() => {
    // Fresh cookie manager for each test
    cookieManager = new CookieManager();
  });

  describe("🔐 Cookie Authentication Flow", () => {
    it("login → protected route → logout flow", async () => {
      // 1️⃣ Login
      const loginRes = await fetch(`${server.url}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: TEST_USER, password: TEST_PASS }),
      });

      expect(loginRes.ok).toBe(true);
      expect(loginRes.status).toBe(200);

      // Extract and parse cookies
      const setCookies = loginRes.headers.getSetCookie();
      expect(setCookies.length).toBeGreaterThan(0);

      const cookies = new CookieManager(setCookies);
      expect(cookies.hasSession()).toBe(true);
      expect(cookies.getSession()).toMatch(/^[0-9a-f-]{36}$/);

      // 2️⃣ Access protected route
      const protectedRes = await fetch(`${server.url}/api/files/analyze`, {
        method: "POST",
        headers: {
          "Cookie": cookies.toHeaderString(),
        },
        body: JSON.stringify({ fileIds: [] }),
      });

      expect(protectedRes.ok).toBe(true);

      // 3️⃣ Logout
      const logoutRes = await fetch(`${server.url}/api/auth/logout`, {
        method: "POST",
        headers: { "Cookie": cookies.toHeaderString() },
      });

      expect(logoutRes.ok).toBe(true);

      // Verify cookie cleared
      const clearedCookies = logoutRes.headers.getSetCookie();
      expect(clearedCookies.some(c => c.includes("sessionId=;"))).toBe(true);
    });

    it("rejects unauthenticated requests to protected routes", async () => {
      const res = await fetch(`${server.url}/api/files/analyze`, {
        method: "POST",
        body: JSON.stringify({ fileIds: [] }),
      });

      expect(res.status).toBe(401);
      const error = await res.json();
      expect(error.error).toContain("Unauthorized");
    });

    it("CookieMap methods work correctly", async () => {
      const jar = new CookieManager();
      
      // Test all Map-like methods
      jar.setSession("test-session-123");
      jar.setAnalytics(42);

      // size
      expect(jar.size).toBe(2);

      // entries
      const entries = Array.from(jar.entries());
      expect(entries).toContainEqual(["sessionId", "test-session-123"]);

      // keys
      const keys = Array.from(jar.keys());
      expect(keys).toContain("sessionId");

      // values
      const values = Array.from(jar.values());
      expect(values).toContain("42");

      // forEach
      let count = 0;
      jar.forEach(() => count++);
      expect(count).toBe(2);

      // toJSON
      expect(jar.toJSON()).toEqual({
        sessionId: "test-session-123",
        fileViews: "42",
      });

      // getSetCookieHeaders
      const headers = jar.getSetCookieHeaders();
      expect(headers.length).toBe(2);
      expect(headers[0]).toContain("sessionId=test-session-123");
    });
  });

  describe("🔗 URLPattern Routing", () => {
    it("matches dynamic routes correctly", async () => {
      // Create test file
      const testId = "url-pattern-test";
      await Bun.write(`./uploads/${testId}`, "test content");

      const res = await fetch(`${server.url}/api/files/${testId}/analyze`, {
        method: "POST",
        headers: {
          "Cookie": cookieManager.setSession("test-session").toHeaderString(),
        },
      });

      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.id).toBe(testId);
      expect(data.format).toBe("Unknown"); // For test content
    });

    it("handles URLPattern wildcards", async () => {
      const res = await fetch(`${server.url}/api/files/nonexistent/extract`);
      expect(res.status).toBe(404);
    });

    it("extracts params from URLPattern", async () => {
      const res = await fetch(`${server.url}/api/debug/colors/hsl`);
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.format).toBe("hsl");
      expect(data.input).toBeDefined();
    });
  });

  describe("📦 Bun.Archive API", () => {
    beforeEach(async () => {
      // Create test files
      testFileIds = ["archive-test-1", "archive-test-2"];
      await Promise.all([
        Bun.write(`./uploads/${testFileIds[0]}`, "Hello, World!"),
        Bun.write(`./uploads/${testFileIds[1]}`, "Test content"),
      ]);
    });

    it("creates TAR.GZ archive from files", async () => {
      const res = await fetch(`${server.url}/api/files/archive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": cookieManager.setSession("test-session").toHeaderString(),
        },
        body: JSON.stringify({ fileIds: testFileIds }),
      });

      expect(res.ok).toBe(true);
      const { archiveId, size } = await res.json();

      // Verify archive exists
      const archivePath = `./archives/${archiveId}.tar.gz`;
      const archiveFile = Bun.file(archivePath);
      expect(await archiveFile.exists()).toBe(true);
      expect(size).toBeGreaterThan(0);

      // Extract and verify
      const archive = new Bun.Archive(await archiveFile.bytes());
      const fileCount = await archive.extract("./test-extract");
      expect(fileCount).toBe(testFileIds.length * 2); // .bin + .json each

      // Cleanup
      await Bun.$`rm -rf ./test-extract`.quiet();
    });

    it("supports different compression levels", async () => {
      const files = { "test.txt": "x".repeat(1000) };
      
      const archiveL1 = new Bun.Archive(files, { compress: "gzip", level: 1 });
      const archiveL12 = new Bun.Archive(files, { compress: "gzip", level: 12 });
      
      const sizeL1 = (await archiveL1.bytes()).length;
      const sizeL12 = (await archiveL12.bytes()).length;

      expect(sizeL12).toBeLessThan(sizeL1); // Higher level = better compression
    });

    it("handles empty archives", async () => {
      const archive = new Bun.Archive({});
      expect((await archive.bytes()).length).toBeGreaterThan(0); // Header only
    });
  });

  describe("📄 Bun.JSONC.parse", () => {
    it("parses JSONC with comments and trailing commas", async () => {
      // Create test JSONC file
      await Bun.write("./config/test.jsonc", `
        {
          // Database configuration
          "host": "localhost",
          "port": 5432,
          "ssl": true, // trailing comma allowed
          /* Block comment */
          "options": {
            "timeout": 5000,
          },
        }
      `);

      const res = await fetch(`${server.url}/api/config/test.jsonc`);
      expect(res.ok).toBe(true);

      const config = await res.json();
      expect(config.host).toBe("localhost");
      expect(config.port).toBe(5432);
      expect(config.ssl).toBe(true);
      expect(config.options.timeout).toBe(5000);

      // Cleanup
      await Bun.$`rm ./config/test.jsonc`.quiet();
    });

    it("handles nested JSONC parsing", async () => {
      const nested = `
        {
          "level1": {
            // Comment at level 2
            "level2": {
              /* Block at level 3 */
              "value": 42,
            },
          },
        }
      `;

      const parsed = Bun.JSONC.parse(nested);
      expect(parsed.level1.level2.value).toBe(42);
    });
  });

  describe("📊 metafile Bundle Analysis", () => {
    it("generates metafile with build outputs", async () => {
      const result = await Bun.build({
        entrypoints: ["./src/test-module.ts"],
        files: {
          "./src/test-module.ts": `
            export const TEST = "value";
            export default { foo: "bar" };
          `,
        },
        metafile: true,
      });

      expect(result.metafile).toBeDefined();
      expect(result.metafile.inputs).toBeDefined();
      expect(result.metafile.outputs).toBeDefined();

      const outputs = Object.entries(result.metafile.outputs);
      expect(outputs.length).toBeGreaterThan(0);

      // Verify output metadata
      const [path, meta] = outputs[0];
      expect(typeof meta.bytes).toBe("number");
      expect(meta.bytes).toBeGreaterThan(0);
    });

    it("analyzes bundle sizes from metafile", async () => {
      // First build to generate metafile
      await Bun.build({
        entrypoints: ["./src/index.tsx"],
        outdir: "./public",
        metafile: true,
      });

      const metafile = await Bun.file("./public/metafile.json").json();
      
      const totalSize = Object.values(metafile.outputs).reduce(
        (sum: number, out: any) => sum + out.bytes,
        0
      );

      expect(totalSize).toBeGreaterThan(0);

      // Log size report
      Object.entries(metafile.outputs).forEach(([path, meta]: [string, any]) => {
        const sizeKB = meta.bytes / 1024;
        console.log(`  ${path}: ${sizeKB.toFixed(2)} KB`);
      });
    });
  });

  describe("🎨 Bun.color() Integration", () => {
    it("converts between all color formats", () => {
      const input = "hsl(210, 90%, 55%)";
      
      const hex = Bun.color(input, "hex");
      const rgb = Bun.color(input, "rgb");
      const rgba = Bun.color(input, "{rgba}");
      const ansi = Bun.color(input, "ansi");
      const hsl = Bun.color(input, "hsl");
      
      expect(hex).toBe("#3498db");
      expect(rgb).toBe("rgb(92, 173, 255)");
      expect(rgba).toEqual({ r: 92, g: 173, b: 255, a: 1 });
      expect(ansi).toContain("\x1b[");
      expect(hsl).toBe("hsl(210, 90%, 55%)");
    });

    it("colors logs in responses", async () => {
      const res = await fetch(`${server.url}/api/debug/colors/hex`);
      const data = await res.json();
      
      expect(data.result).toMatch(/^#[0-9A-F]{6}$/);
      expect(res.headers.get("X-Response-Color")).toBe(data.result);
    });
  });

  describe("🌐 bun.fetch Cookie Integration", () => {
    it("automatically handles Set-Cookie headers", async () => {
      // Custom fetch with cookie jar
      let jar = new CookieManager();
      
      // Login
      const loginRes = await fetch(`${server.url}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: TEST_USER, password: TEST_PASS }),
      });
      
      // Extract cookies from response
      const cookies = loginRes.headers.getSetCookie();
      jar = new CookieManager(cookies);
      
      // Subsequent request includes cookies
      const nextRes = await fetch(`${server.url}/api/files/analyze`, {
        method: "POST",
        headers: {
          "Cookie": jar.toHeaderString(),
        },
        body: JSON.stringify({ fileIds: [] }),
      });
      
      expect(nextRes.ok).toBe(true);
    });
  });

  describe("🔥 HMR State Persistence", () => {
    it("preserves cookies across HMR", () => {
      // Simulate HMR dispose/accept cycle
      const manager1 = new CookieManager();
      manager1.setSession("hmr-test-session");
      
      // Serialize
      const serialized = manager1.serialize();
      
      // Simulate module reload
      const manager2 = CookieManager.deserialize(serialized);
      
      expect(manager2.getSession()).toBe("hmr-test-session");
      expect(manager2.size).toBe(1);
    });

    it("handles HMR restoration gracefully", () => {
      const manager = new CookieManager();
      
      // Add various cookies
      manager.setSession("test-session");
      manager.setAnalytics(123);
      manager.setTheme("dark");
      
      // Simulate HMR dispose
      const state = manager.serialize();
      
      // Simulate HMR accept with restoration
      const restored = CookieManager.deserialize(state);
      
      expect(restored.hasSession()).toBe(true);
      expect(restored.getAnalytics()).toBe("123");
      expect(restored.getTheme()).toBe("dark");
    });
  });

  describe("⚡ Performance: Response.json() vs JSON.stringify()", () => {
    it("demonstrates performance improvement", async () => {
      const largeObject = {
        users: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          metadata: {
            created: Date.now(),
            tags: ["performance", "test"],
            profile: { settings: { theme: "dark" } }
          }
        })),
        buildInfo: {
          version: "1.3.6+",
          features: ["virtual-files", "react-fast-refresh"],
          timestamp: Date.now(),
        }
      };

      // Test old method
      const start1 = performance.now();
      const oldResponse = new Response(JSON.stringify(largeObject), {
        headers: { "Content-Type": "application/json" }
      });
      const oldTime = performance.now() - start1;

      // Test new method
      const start2 = performance.now();
      const newResponse = Response.json(largeObject);
      const newTime = performance.now() - start2;

      // Both should work
      expect(oldResponse.headers.get("content-type")).toContain("application/json");
      expect(newResponse.headers.get("content-type")).toContain("application/json");

      // Log performance comparison
      console.log(`JSON.stringify: ${oldTime.toFixed(2)}ms`);
      console.log(`Response.json: ${newTime.toFixed(2)}ms`);
      console.log(`Speedup: ${(oldTime / newTime).toFixed(2)}x`);
    });
  });

  describe("🎯 Complete Integration Workflow", () => {
    it("full application workflow", async () => {
      // 1. Login with cookies
      const loginRes = await fetch(`${server.url}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: TEST_USER, password: TEST_PASS }),
      });

      expect(loginRes.ok).toBe(true);
      const cookies = new CookieManager(loginRes.headers.getSetCookie());

      // 2. Upload and analyze files
      const testFile = "integration-test-file";
      await Bun.write(`./uploads/${testFile}`, "Integration test content");

      const analyzeRes = await fetch(`${server.url}/api/files/${testFile}/analyze`, {
        method: "POST",
        headers: { "Cookie": cookies.toHeaderString() },
      });

      expect(analyzeRes.ok).toBe(true);
      const analysis = await analyzeRes.json();
      expect(analysis.id).toBe(testFile);

      // 3. Create archive
      const archiveRes = await fetch(`${server.url}/api/files/archive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": cookies.toHeaderString(),
        },
        body: JSON.stringify({ fileIds: [testFile] }),
      });

      expect(archiveRes.ok).toBe(true);
      const { archiveId } = await archiveRes.json();
      expect(archiveId).toMatch(/^archive-\d+$/);

      // 4. Parse JSONC config
      const configRes = await fetch(`${server.url}/api/config/test.jsonc`);
      if (configRes.ok) {
        const config = await configRes.json();
        expect(config).toBeDefined();
      }

      // 5. Test color API
      const colorRes = await fetch(`${server.url}/api/debug/colors/hex`);
      expect(colorRes.ok).toBe(true);
      const colorData = await colorRes.json();
      expect(colorData.result).toMatch(/^#[0-9A-F]{6}$/);

      // 6. Logout
      const logoutRes = await fetch(`${server.url}/api/auth/logout`, {
        method: "POST",
        headers: { "Cookie": cookies.toHeaderString() },
      });

      expect(logoutRes.ok).toBe(true);

      console.log("✅ Complete integration workflow successful!");
    });
  });
});
