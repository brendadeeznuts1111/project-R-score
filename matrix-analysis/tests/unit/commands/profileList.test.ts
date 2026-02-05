import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { CommandTestContext } from "../helpers";
import { profileList } from "../../../src/commands/profileList";

describe("profileList", () => {
  const ctx = new CommandTestContext({ skipExit: true });

  beforeEach(() => ctx.setup());
  afterEach(() => ctx.teardown());

  it("lists profiles from directory", async () => {
    await ctx.profileDir.addProfile("dev", {
      env: { NODE_ENV: "development", PORT: "3000" },
    });
    await ctx.profileDir.addProfile("prod", {
      env: { NODE_ENV: "production", PORT: "8080" },
    });

    await profileList();

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("dev");
    expect(output).toContain("prod");
  });

  it("shows 'No profiles found' for empty directory", async () => {
    await profileList();

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("No profiles found");
  });

  it("displays version and NODE_ENV for each profile", async () => {
    await ctx.profileDir.addProfile("staging", {
      version: "2.0.0",
      env: { NODE_ENV: "staging", APP: "test" },
    });

    await profileList();

    const output = ctx.console.logs.join("\n");
    expect(output).toContain("staging");
    expect(output).toContain("2.0.0");
  });

  it("truncates descriptions longer than 50 chars", async () => {
    const longDesc = "A".repeat(80);
    await ctx.profileDir.addProfile("verbose", {
      description: longDesc,
      env: { NODE_ENV: "test" },
    });

    await profileList();

    const output = ctx.console.logs.join("\n");
    expect(output).not.toContain(longDesc);
  });

  it("handles profiles with missing optional fields", async () => {
    await ctx.profileDir.addProfile("minimal", {
      env: { NODE_ENV: "test" },
    });

    await profileList();
    expect(ctx.console.logs.length).toBeGreaterThan(0);
  });
});
