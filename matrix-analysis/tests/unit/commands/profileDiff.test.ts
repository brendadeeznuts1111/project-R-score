import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { CommandTestContext, ExitError } from "../helpers";
import { profileDiff } from "../../../src/commands/profileDiff";
import { EXIT_CODES } from "../../../.claude/lib/exit-codes.ts";

describe("profileDiff", () => {
  const ctx = new CommandTestContext();

  beforeEach(() => ctx.setup());
  afterEach(() => ctx.teardown());

  it("shows changed, added, and removed keys", async () => {
    await ctx.profileDir.addProfile("left", {
      env: { SHARED: "old", REMOVED: "gone", SAME: "unchanged" },
    });
    await ctx.profileDir.addProfile("right", {
      env: { SHARED: "new", ADDED: "fresh", SAME: "unchanged" },
    });

    await profileDiff("left", "right");

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("changed");
    expect(output).toContain("added");
    expect(output).toContain("removed");
  });

  it("shows 'Profiles are identical' when equal", async () => {
    await ctx.profileDir.addProfile("a", {
      env: { NODE_ENV: "test", PORT: "3000" },
    });
    await ctx.profileDir.addProfile("b", {
      env: { NODE_ENV: "test", PORT: "3000" },
    });

    await profileDiff("a", "b");

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("identical");
  });

  it("masks sensitive values in diff output", async () => {
    await ctx.profileDir.addProfile("old-secrets", {
      env: { API_KEY: "old-secret-key", NODE_ENV: "test" },
    });
    await ctx.profileDir.addProfile("new-secrets", {
      env: { API_KEY: "new-secret-key", NODE_ENV: "test" },
    });

    await profileDiff("old-secrets", "new-secrets");

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("************");
    expect(output).not.toContain("old-secret-key");
    expect(output).not.toContain("new-secret-key");
  });

  it("exits NOT_FOUND when left profile is missing", async () => {
    await ctx.profileDir.addProfile("right-only", {
      env: { NODE_ENV: "test" },
    });

    try {
      await profileDiff("missing-left", "right-only");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(EXIT_CODES.NOT_FOUND);
    }
  });

  it("exits NOT_FOUND when right profile is missing", async () => {
    await ctx.profileDir.addProfile("left-only", {
      env: { NODE_ENV: "test" },
    });

    try {
      await profileDiff("left-only", "missing-right");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(EXIT_CODES.NOT_FOUND);
    }
  });

  it("includes unchanged keys with showUnchanged option", async () => {
    await ctx.profileDir.addProfile("base", {
      env: { NODE_ENV: "test", CHANGED: "old" },
    });
    await ctx.profileDir.addProfile("modified", {
      env: { NODE_ENV: "test", CHANGED: "new" },
    });

    await profileDiff("base", "modified", { showUnchanged: true });

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("CHANGED");
  });

  it("displays comparison header with profile names", async () => {
    await ctx.profileDir.addProfile("dev", {
      env: { NODE_ENV: "development" },
    });
    await ctx.profileDir.addProfile("prod", {
      env: { NODE_ENV: "production" },
    });

    await profileDiff("dev", "prod");

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("dev");
    expect(output).toContain("prod");
  });

  it("shows summary counts for each change type", async () => {
    await ctx.profileDir.addProfile("summary-a", {
      env: { CHANGED1: "old", CHANGED2: "old", REMOVED: "x" },
    });
    await ctx.profileDir.addProfile("summary-b", {
      env: { CHANGED1: "new", CHANGED2: "new", ADDED: "y" },
    });

    await profileDiff("summary-a", "summary-b");

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("+1 added");
    expect(output).toContain("-1 removed");
    expect(output).toContain("~2 changed");
  });
});
