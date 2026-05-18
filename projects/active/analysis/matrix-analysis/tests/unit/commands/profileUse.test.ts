import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { CommandTestContext, ExitError } from "../helpers";
import { profileUse } from "../../../src/commands/profileUse";
import { EXIT_CODES } from "../../../.claude/lib/exit-codes.ts";

describe("profileUse", () => {
  const ctx = new CommandTestContext();

  beforeEach(() => ctx.setup());
  afterEach(() => ctx.teardown());

  it("prints export statements for valid profile", async () => {
    await ctx.profileDir.addProfile("dev", {
      env: { NODE_ENV: "development", PORT: "3000", APP_NAME: "myapp" },
    });

    await profileUse("dev", {
      validateRules: false,
      dryRun: false,
      force: true,
    });

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("export");
    expect(output).toContain("NODE_ENV=");
    expect(output).toContain("PORT=");
  });

  it("exits NOT_FOUND for missing profile", async () => {
    try {
      await profileUse("nonexistent", {
        validateRules: false,
        dryRun: false,
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(EXIT_CODES.NOT_FOUND);
    }
  });

  it("dry-run shows 'Would set' preview", async () => {
    await ctx.profileDir.addProfile("preview", {
      env: { NODE_ENV: "staging", PORT: "4000" },
    });

    await profileUse("preview", {
      validateRules: false,
      dryRun: true,
    });

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("Would set");
  });

  it("validation exits VALIDATION_ERROR on bad profile", async () => {
    await ctx.profileDir.addProfile("bad", {
      name: "",
      version: "",
      env: { NODE_ENV: "test" },
    });

    try {
      await profileUse("bad", {
        validateRules: true,
        dryRun: false,
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ExitError);
      expect((err as ExitError).code).toBe(EXIT_CODES.VALIDATION_ERROR);
    }
  });

  it("warns on unresolved refs during validation", async () => {
    await ctx.profileDir.addProfile("unresolved", {
      env: { SECRET: "${TOTALLY_UNDEFINED_VAR_XYZ}", NODE_ENV: "test" },
    });

    try {
      await profileUse("unresolved", {
        validateRules: true,
        dryRun: false,
      });
    } catch {
      // may or may not exit depending on force
    }

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("TOTALLY_UNDEFINED_VAR_XYZ");
  });

  it("--environment overrides NODE_ENV", async () => {
    await ctx.profileDir.addProfile("override", {
      env: { NODE_ENV: "development", APP: "test" },
    });

    await profileUse("override", {
      validateRules: false,
      dryRun: false,
      environment: "production",
      force: true,
    });

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("production");
  });

  it("adds MATRIX_PROFILE_NAME and MATRIX_PROFILE_VERSION meta vars", async () => {
    await ctx.profileDir.addProfile("meta", {
      version: "3.0.0",
      env: { NODE_ENV: "test" },
    });

    await profileUse("meta", {
      validateRules: false,
      dryRun: false,
      force: true,
    });

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("MATRIX_PROFILE_NAME=");
    expect(output).toContain("MATRIX_PROFILE_VERSION=");
  });

  it("resolves ${VAR} references in export", async () => {
    await ctx.profileDir.addProfile("refs", {
      env: { HOME_DIR: "${HOME}", NODE_ENV: "test" },
    });

    await profileUse("refs", {
      validateRules: false,
      dryRun: false,
      force: true,
    });

    const output = ctx.console.logs.join("\n");
    expect(output).toContain(Bun.env.HOME!);
    expect(output).not.toContain("${HOME}");
  });

  it("dry-run does not print export statements", async () => {
    await ctx.profileDir.addProfile("dry", {
      env: { NODE_ENV: "test", PORT: "5000" },
    });

    await profileUse("dry", {
      validateRules: false,
      dryRun: true,
    });

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("Would set");
    expect(output).not.toContain("export NODE_ENV=");
  });

  it("prints eval hint after dry-run", async () => {
    await ctx.profileDir.addProfile("hint", {
      env: { NODE_ENV: "test" },
    });

    await profileUse("hint", {
      validateRules: false,
      dryRun: true,
    });

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("eval");
  });

  it("validation passes for well-formed profile", async () => {
    await ctx.profileDir.addProfile("valid", {
      name: "valid",
      version: "1.0.0",
      env: { NODE_ENV: "test", PORT: "3000" },
    });

    await profileUse("valid", {
      validateRules: true,
      dryRun: false,
    });

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("PASSED");
  });

  it("force flag allows continuing with validation warnings", async () => {
    await ctx.profileDir.addProfile("force-warn", {
      env: { SECRET: "${UNDEFINED_FORCE_TEST_VAR}", NODE_ENV: "test" },
    });

    await profileUse("force-warn", {
      validateRules: true,
      dryRun: false,
      force: true,
    });

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("export");
  });
});
