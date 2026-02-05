import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { CommandTestContext, ExitError } from "../helpers";
import { profileShow } from "../../../src/commands/profileShow";
import { EXIT_CODES } from "../../../.claude/lib/exit-codes.ts";

describe("profileShow", () => {
  const ctx = new CommandTestContext();

  beforeEach(() => ctx.setup());
  afterEach(() => ctx.teardown());

  it("displays name, version, and env vars", async () => {
    await ctx.profileDir.addProfile("dev", {
      version: "1.2.0",
      env: { NODE_ENV: "development", PORT: "3000" },
    });

    await profileShow("dev");

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("dev");
    expect(output).toContain("1.2.0");
  });

  it("shows optional author and description", async () => {
    await ctx.profileDir.addProfile("full", {
      author: "Jane Doe",
      description: "Full featured profile",
      env: { NODE_ENV: "test" },
    });

    await profileShow("full");

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("Jane Doe");
    expect(output).toContain("Full featured profile");
  });

  it("masks sensitive values", async () => {
    await ctx.profileDir.addProfile("secrets", {
      env: { API_KEY: "sk-live-12345", NODE_ENV: "production" },
    });

    await profileShow("secrets");

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("************");
    expect(output).not.toContain("sk-live-12345");
  });

  it("exits NOT_FOUND for missing profile", async () => {
    try {
      await profileShow("nonexistent");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(EXIT_CODES.NOT_FOUND);
    }
  });

  it("shows created timestamp when available", async () => {
    await ctx.profileDir.addProfile("dated", {
      created: "2025-06-15T12:00:00.000Z",
      env: { NODE_ENV: "test" },
    });

    await profileShow("dated");

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("2025-06-15");
  });

  it("sorts env vars alphabetically in table", async () => {
    await ctx.profileDir.addProfile("sorted", {
      env: { ZZZ_VAR: "last", AAA_VAR: "first", MMM_VAR: "middle" },
    });

    await profileShow("sorted");

    const output = ctx.console.logs.join("\n");
    const aaaIdx = output.indexOf("AAA_VAR");
    const mmmIdx = output.indexOf("MMM_VAR");
    const zzzIdx = output.indexOf("ZZZ_VAR");
    expect(aaaIdx).toBeLessThan(mmmIdx);
    expect(mmmIdx).toBeLessThan(zzzIdx);
  });
});
