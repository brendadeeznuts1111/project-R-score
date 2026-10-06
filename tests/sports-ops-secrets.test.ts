import { describe, expect, test } from "bun:test";
import { parseSessionEnv, SECRET_NAMES, SECRET_SERVICE } from "../projects/active/sports-terminal-os/demos/sports-ops/secrets.ts";

const relay = await Bun.file(
  new URL("../projects/active/sports-terminal-os/demos/sports-ops/relay.ts", import.meta.url),
).text();
const browse = await Bun.file(
  new URL("../projects/active/sports-terminal-os/demos/sports-ops/browse.ts", import.meta.url),
).text();

describe("sports ops secret names", () => {
  test("parses a bootstrap env file without keeping comments", () => {
    const parsed = parseSessionEnv("# comment\nF402_USER=billy\nF402_PASSWORD=a=b=c\n\nFOURC_EMAIL=a@b.c\n");
    expect(parsed).toEqual({
      F402_USER: "billy",
      F402_PASSWORD: "a=b=c",
      FOURC_EMAIL: "a@b.c",
    });
  });

  test("uses one service and four account names", () => {
    expect(SECRET_SERVICE).toBe("com.factorywager.sports-ops");
    expect(Object.values(SECRET_NAMES)).toEqual(["f402-user", "f402-password", "fourc-email", "fourc-password"]);
  });

  test("the relay reads Bun.secrets and drives Bun.WebView", () => {
    expect(relay.includes("loadDeskLogins")).toBe(true);
    expect(relay.includes("node:child_process")).toBe(false);
    expect(browse.includes("new Bun.WebView")).toBe(true);
    expect(browse.includes("dataStore")).toBe(true);
    expect(browse.includes("view.type(")).toBe(true);
  });
});
