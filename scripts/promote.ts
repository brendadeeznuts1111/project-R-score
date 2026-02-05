#!/usr/bin/env bun

/**
 * Promotes staging → main: runs tests, creates PR, merges, and cycles branches.
 * Usage: bun run promote [--no-test]
 *
 * Uses Bun.spawnSync for local git ops (no shell overhead) and
 * Bun.spawn for network ops that benefit from parallelism.
 */

const skipTests = Bun.argv.includes("--no-test");

const step = (n: number, msg: string) =>
  console.log(`\x1b[36m[${n}/6]\x1b[0m ${msg}`);
const warn = (msg: string) =>
  console.warn(`\x1b[33m  ⚠ ${msg}\x1b[0m`);
const fail = (msg: string, recovery?: string): never => {
  console.error(`\n\x1b[31m${msg}\x1b[0m`);
  if (recovery) console.error(`\x1b[33m  Recovery: ${recovery}\x1b[0m`);
  process.exit(1);
};

/** Sync local git/gh command — no shell, direct spawn. */
function run(...cmd: string[]): string {
  const { stdout, stderr, exitCode } = Bun.spawnSync({
    cmd,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (exitCode !== 0) {
    throw new Error(stderr.toString().trim() || `${cmd.join(" ")} exited ${exitCode}`);
  }
  return stdout.toString().trim();
}

/** Sync local command that may fail — returns { ok, stdout, stderr }. */
function tryRun(...cmd: string[]) {
  const { stdout, stderr, exitCode } = Bun.spawnSync({
    cmd,
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    ok: exitCode === 0,
    stdout: stdout.toString().trim(),
    stderr: stderr.toString().trim(),
  };
}

/** Async network command via Bun.spawn — for parallelism. */
function spawnAsync(...cmd: string[]) {
  const proc = Bun.spawn({
    cmd,
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    async result() {
      const exitCode = await proc.exited;
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      return { ok: exitCode === 0, stdout: stdout.trim(), stderr: stderr.trim() };
    },
  };
}

async function promote() {
  const t0 = performance.now();

  // 1. Pre-flight — all local, all sync, zero shell overhead
  step(1, "Pre-flight...");
  const dirty = run("git", "status", "--porcelain");
  if (dirty) {
    console.error("\x1b[31mError: working tree is dirty. Stash or commit first.\x1b[0m");
    console.error(dirty);
    process.exit(1);
  }

  const branch = run("git", "rev-parse", "--abbrev-ref", "HEAD");
  if (branch !== "staging") fail(`Must be on 'staging', currently on '${branch}'.`);

  const ahead = run("git", "rev-list", "main..staging", "--count");
  if (ahead === "0") fail("staging has no commits ahead of main.");
  console.log(`  ${ahead} commit(s) ahead of main`);

  // 2. Tests
  if (skipTests) {
    step(2, "Skipping tests (--no-test)");
    warn("Shipping without tests. You own whatever breaks.");
  } else {
    step(2, "Running tests...");
    const test = Bun.spawnSync({ cmd: ["bun", "test", "--bail"], stdout: "inherit", stderr: "inherit" });
    if (test.exitCode !== 0) fail("Tests failed.");
  }

  // 3. Push staging
  step(3, "Pushing staging to origin...");
  run("git", "push", "origin", "staging");

  // 4. Create PR
  step(4, "Creating PR...");
  const subjects = run("git", "log", "main..staging", "--format=%s", "--reverse")
    .split("\n")
    .filter((s) => !/^(Merge |WIP)/i.test(s));
  const title = subjects[0] ?? "Promote staging to main";
  const body = run("git", "log", "main..staging", "--oneline", "--reverse");

  let prNumber: string;
  const create = tryRun("gh", "pr", "create", "--base", "main", "--head", "staging", "--title", title, "--body", body);

  if (create.ok) {
    console.log(`  ${create.stdout}`);
    prNumber = create.stdout.split("/").pop()!;
  } else {
    const existing = tryRun("gh", "pr", "list", "--head", "staging", "--base", "main", "--json", "number", "--jq", ".[0].number");
    if (!existing.ok || !existing.stdout) {
      fail(`PR creation failed: ${create.stderr}`, "Check gh auth and retry.");
    }
    prNumber = existing.stdout;
    console.log(`  Reusing existing PR #${prNumber}`);
  }

  if (!/^\d+$/.test(prNumber)) fail("Could not extract PR number.");

  // 5. Merge PR
  step(5, "Merging PR...");
  const merge = tryRun("gh", "pr", "merge", prNumber, "--merge");
  if (!merge.ok && !merge.stderr.includes("already been merged")) {
    fail(
      `Merge failed: ${merge.stderr}`,
      `Resolve manually, then: git checkout main && git pull && git branch -d staging && git checkout -b staging && git push -u origin staging`
    );
  }

  // 6. Cycle branches — parallel network ops, sync local ops
  step(6, "Cycling branches...");
  run("git", "checkout", "main");

  // Fire both network ops in parallel
  const pullJob = spawnAsync("git", "pull", "origin", "main");
  const deleteJob = spawnAsync("git", "push", "origin", "--delete", "staging");

  // Wait for both parallel network ops, then finish local cleanup
  const [pullRes, delRes] = await Promise.all([pullJob.result(), deleteJob.result()]);
  if (!pullRes.ok) fail(`Pull failed: ${pullRes.stderr}`);
  if (!delRes.ok) warn(`Remote delete: ${delRes.stderr}`);

  tryRun("git", "branch", "-d", "staging");
  run("git", "checkout", "-b", "staging");
  run("git", "push", "-u", "origin", "staging");

  const ms = (performance.now() - t0).toFixed(0);
  console.log(`\n\x1b[32mDone in ${ms}ms. On fresh staging, in sync with main.\x1b[0m`);
}

promote().catch((err) => {
  console.error(`\n\x1b[31mPromote failed:\x1b[0m`, err.message ?? err);
  process.exit(1);
});
