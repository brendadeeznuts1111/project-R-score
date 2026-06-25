import { describe, expect, test } from "bun:test";
import { join, resolve } from "node:path";

const SKILL_ROOT = resolve(import.meta.dir, "../..");
const REPO_ROOT = resolve(SKILL_ROOT, "../../..");
const MCP = join(SKILL_ROOT, "mcp/ast-grep-mcp.ts");

async function mcpCall(
  name: string,
  args: Record<string, unknown> = {},
): Promise<{ text: string; isError: boolean }> {
  const payload = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name, arguments: args },
  });
  const proc = Bun.spawn(["bun", MCP], {
    cwd: REPO_ROOT,
    stdin: new Blob([`${payload}\n`]),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, AST_GREP_REPO_ROOT: REPO_ROOT },
  });
  const stdout = await new Response(proc.stdout).text();
  await proc.exited;
  const line = stdout.trim().split("\n").find((l) => l.includes('"result"')) ?? stdout;
  const msg = JSON.parse(line) as {
    result?: { content?: Array<{ type: string; text?: string }>; isError?: boolean };
  };
  const text = msg.result?.content?.[0]?.text ?? "";
  return { text, isError: msg.result?.isError === true };
}

describe("ast-grep MCP network + skill-loop", () => {
  test("ast_grep_network pointers lists ground-truth references", async () => {
    const { text, isError } = await mcpCall("ast_grep_network", { pointers: true });
    expect(isError).toBe(false);
    expect(text).toContain("sports-terminal-snapshot");
    expect(text).toContain("network-cli.ts");
  });

  test("ast_grep_skill_loop plan explain shows bench-snapshot pipeline", async () => {
    const { text, isError } = await mcpCall("ast_grep_skill_loop", {
      action: "bench-snapshot",
      dryRun: true,
      explain: true,
      scanPath: "projects/active/sports-terminal-os/dist/frontend",
      groundTruth: true,
      iterations: 2,
    });
    expect(isError).toBe(false);
    expect(text).toContain("bench-snapshot");
    expect(text).toContain("per-iteration pipeline");
    expect(text).toContain("validateNetworkGroundTruth");
  });
});