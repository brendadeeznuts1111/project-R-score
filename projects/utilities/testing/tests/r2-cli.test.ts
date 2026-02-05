import {describe, it, expect} from "bun:test";

function runArgs(args: string[]): {cmd: string | undefined; key: string | undefined; service: string | undefined} {
  const cmd = args[0];
  const key = args[1];
  const service = args.includes("--service") ? args[args.indexOf("--service") + 1] : undefined;
  return {cmd, key, service};
}

describe("r2-cli argument parsing", () => {
  it("parses command and key", () => {
    const parsed = runArgs(["get", "path/to/file.txt"]);
    expect(parsed.cmd).toBe("get");
    expect(parsed.key).toBe("path/to/file.txt");
  });

  it("parses service override", () => {
    const parsed = runArgs(["list", "--service", "com.factory-wager.r2"]);
    expect(parsed.service).toBe("com.factory-wager.r2");
  });

  it("accepts rss:list command", () => {
    const parsed = runArgs(["rss:list", "--prefix", "rss/"]);
    expect(parsed.cmd).toBe("rss:list");
  });
});
