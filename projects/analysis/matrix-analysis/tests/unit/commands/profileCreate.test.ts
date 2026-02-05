import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { CommandTestContext, ExitError } from "../helpers";
import { profileCreate } from "../../../src/commands/profileCreate";
import { EXIT_CODES } from "../../../.claude/lib/exit-codes.ts";

describe("profileCreate", () => {
  const ctx = new CommandTestContext();

  beforeEach(() => ctx.setup());
  afterEach(() => ctx.teardown());

  it("creates new JSON file with defaults", async () => {
    await profileCreate("new-profile", {});

    const file = Bun.file(join(ctx.dir, "new-profile.json"));
    expect(await file.exists()).toBe(true);

    const content = await file.json();
    expect(content.name).toBe("new-profile");
    expect(content.version).toBe("1.0.0");
    expect(content.env.NODE_ENV).toBe("development");

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("Created profile");
  });

  it("applies custom description", async () => {
    await profileCreate("desc-test", {
      description: "My custom profile",
    });

    const file = Bun.file(join(ctx.dir, "desc-test.json"));
    const content = await file.json();
    expect(content.description).toBe("My custom profile");
  });

  it("overrides NODE_ENV with --env option", async () => {
    await profileCreate("staging", { env: "staging" });

    const file = Bun.file(join(ctx.dir, "staging.json"));
    const content = await file.json();
    expect(content.env.NODE_ENV).toBe("staging");
  });

  it("copies from existing profile with --from", async () => {
    await ctx.profileDir.addProfile("source", {
      env: { NODE_ENV: "production", API_URL: "https://api.example.com", PORT: "8080" },
      description: "Source profile",
    });

    await profileCreate("copy", { from: "source" });

    const file = Bun.file(join(ctx.dir, "copy.json"));
    const content = await file.json();
    expect(content.name).toBe("copy");
    expect(content.env.API_URL).toBe("https://api.example.com");
    expect(content.env.PORT).toBe("8080");

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("Based on: source");
  });

  it("exits NOT_FOUND when --from source is missing", async () => {
    try {
      await profileCreate("fail", { from: "nonexistent" });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(EXIT_CODES.NOT_FOUND);
    }
  });

  it("exits CONFLICT_ERROR when profile exists without --force", async () => {
    await ctx.profileDir.addProfile("existing", {
      env: { NODE_ENV: "test" },
    });

    try {
      await profileCreate("existing", {});
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(EXIT_CODES.CONFLICT_ERROR);
    }
  });

  it("overwrites existing profile with --force", async () => {
    await ctx.profileDir.addProfile("overwrite-me", {
      env: { NODE_ENV: "old" },
    });

    await profileCreate("overwrite-me", {
      force: true,
      env: "production",
    });

    const file = Bun.file(join(ctx.dir, "overwrite-me.json"));
    const content = await file.json();
    expect(content.env.NODE_ENV).toBe("production");

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("Overwriting");
  });

  it("sets created timestamp", async () => {
    await profileCreate("timestamped", {});

    const file = Bun.file(join(ctx.dir, "timestamped.json"));
    const content = await file.json();
    expect(content.created).toBeDefined();
    expect(new Date(content.created).getFullYear()).toBeGreaterThanOrEqual(2025);
  });

  it("reports variable count after creation", async () => {
    await profileCreate("counted", {});

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("Variables:");
  });
});
