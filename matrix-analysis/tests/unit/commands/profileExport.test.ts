import { describe, it, expect, beforeEach, afterEach, onTestFinished } from "bun:test";
import { join } from "node:path";
import { CommandTestContext, ExitError } from "../helpers";
import { profileExport } from "../../../src/commands/profileExport";
import { EXIT_CODES } from "../../../.claude/lib/exit-codes.ts";

describe("profileExport", () => {
  const ctx = new CommandTestContext();

  beforeEach(() => ctx.setup());
  afterEach(() => ctx.teardown());

  it("writes .env format to stdout", async () => {
    onTestFinished(() => {
      // Verify cleanup state after afterEach has run
      expect(ctx.console.stdout.length).toBeGreaterThan(0);
    });

    await ctx.profileDir.addProfile("dev", {
      version: "1.0.0",
      env: { NODE_ENV: "development", PORT: "3000" },
    });

    await profileExport("dev", {});

    const output = ctx.console.stdout.join("");
    expect(output).toContain("NODE_ENV=development");
    expect(output).toContain("PORT=3000");
  });

  it("includes header comments", async () => {
    await ctx.profileDir.addProfile("dev", {
      version: "2.0.0",
      env: { NODE_ENV: "development" },
    });

    await profileExport("dev", {});

    const output = ctx.console.stdout.join("");
    expect(output).toContain("# Generated from profile: dev");
    expect(output).toContain("# Version: 2.0.0");
  });

  it.serial("async cleanup at the very end", async () => {
    let cleanupCalled = false;
    onTestFinished(async () => {
      // This runs after afterEach teardown
      await new Promise((r) => setTimeout(r, 5));
      cleanupCalled = true;
    });

    await ctx.profileDir.addProfile("cleanup-test", {
      version: "3.0.0",
      env: { NODE_ENV: "test" },
    });

    await profileExport("cleanup-test", {});

    const output = ctx.console.stdout.join("");
    expect(output).toContain("# Generated from profile: cleanup-test");
    expect(output).toContain("# Version: 3.0.0");
  });

  it("auto-quotes values with spaces", async () => {
    await ctx.profileDir.addProfile("spaces", {
      env: { GREETING: "hello world", PLAIN: "nospace" },
    });

    await profileExport("spaces", {});

    const output = ctx.console.stdout.join("");
    expect(output).toContain('GREETING="hello world"');
    expect(output).toContain("PLAIN=nospace");
  });

  it("forces quoting with --quote flag", async () => {
    await ctx.profileDir.addProfile("quoted", {
      env: { SIMPLE: "value" },
    });

    await profileExport("quoted", { quote: true });

    const output = ctx.console.stdout.join("");
    expect(output).toContain('SIMPLE="value"');
  });

  it("resolves ${VAR} references with --resolve", async () => {
    await ctx.profileDir.addProfile("refs", {
      env: { HOME_DIR: "${HOME}", PLAIN: "value" },
    });

    await profileExport("refs", { resolve: true });

    const output = ctx.console.stdout.join("");
    expect(output).toContain(Bun.env.HOME!);
    expect(output).not.toContain("${HOME}");
  });

  it("writes to file with --output", async () => {
    await ctx.profileDir.addProfile("fileout", {
      env: { NODE_ENV: "production", PORT: "8080" },
    });

    const outPath = join(ctx.dir, "output.env");
    await profileExport("fileout", { output: outPath });

    const written = await Bun.file(outPath).text();
    expect(written).toContain("NODE_ENV=production");
    expect(written).toContain("PORT=8080");

    const errOutput = ctx.console.errors.join("\n");
    expect(errOutput).toContain("Exported");
  });

  it("exits NOT_FOUND for missing profile", async () => {
    try {
      await profileExport("nonexistent", {});
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(EXIT_CODES.NOT_FOUND);
    }
  });

  it("sorts keys alphabetically", async () => {
    await ctx.profileDir.addProfile("sorted", {
      env: { ZZZ: "last", AAA: "first", MMM: "middle" },
    });

    await profileExport("sorted", {});

    const output = ctx.console.stdout.join("");
    const aaaIdx = output.indexOf("AAA=");
    const mmmIdx = output.indexOf("MMM=");
    const zzzIdx = output.indexOf("ZZZ=");
    expect(aaaIdx).toBeLessThan(mmmIdx);
    expect(mmmIdx).toBeLessThan(zzzIdx);
  });
});
