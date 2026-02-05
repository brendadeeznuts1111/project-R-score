import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { spawn } from "bun";

describe("SPA Lab Demo", () => {
  let devProcess: any;
  let binaryProcess: any;

  beforeAll(async () => {
    // Build the binary for testing
    await spawn({
      cmd: ["bun", "build", "--compile", "./my-portal/packages/templates/bun-transformer/spa-lab-app.ts", "--outfile", "./test-binary"],
      stdout: "inherit",
      stderr: "inherit"
    }).exited;
  });

  test("should build binary successfully", async () => {
    const binaryExists = await Bun.file("./test-binary").exists();
    expect(binaryExists).toBe(true);

    const stats = await Bun.file("./test-binary").stat();
    expect(stats.size).toBeGreaterThan(1000000); // At least 1MB
  });

  test("should start development server", async () => {
    devProcess = spawn({
      cmd: ["bun", "--hot", "./my-portal/packages/templates/bun-transformer/spa-lab-app.ts"],
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, PORT: "3999" }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test health endpoint
    const response = await fetch("http://localhost:3999/api/health");
    expect(response.status).toBe(200);

    const health = await response.json();
    expect(health.status).toBe("healthy");
  });

  test("should serve SPA frontend", async () => {
    const response = await fetch("http://localhost:3999/");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
  });

  test("should handle API requests", async () => {
    // Test GET users
    const getResponse = await fetch("http://localhost:3999/api/users");
    expect(getResponse.status).toBe(200);

    const users = await getResponse.json();
    expect(users).toHaveProperty("users");
    expect(Array.isArray(users.users)).toBe(true);

    // Test POST user
    const postResponse = await fetch("http://localhost:3999/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test User", email: "test@mission-control.dev" })
    });

    expect(postResponse.status).toBe(201);
    const newUser = await postResponse.json();
    expect(newUser.name).toBe("Test User");
  });

  test("should run compiled binary", async () => {
    binaryProcess = spawn({
      cmd: ["./test-binary"],
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, PORT: "3998", NODE_ENV: "production" }
    });

    // Wait for binary to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    const response = await fetch("http://localhost:3998/api/health");
    expect(response.status).toBe(200);
  });

  afterAll(async () => {
    if (devProcess) {
      devProcess.kill();
    }
    if (binaryProcess) {
      binaryProcess.kill();
    }

    // Cleanup test binary
    await spawn({ cmd: ["rm", "-f", "./test-binary"] }).exited;
  });
});
