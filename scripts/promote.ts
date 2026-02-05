#!/usr/bin/env bun

/**
 * Promotes staging → main: runs tests, creates PR, merges, and cycles branches.
 * Usage: bun run promote [--no-test]
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

async function promote() {
  const t0 = performance.now();

  // 0. Pre-flight (parallel: dirty check + branch check + ahead check)
  step(1, "Pre-flight...");
  const [dirtyOut, branchOut, aheadOut] = await Promise.all([
    Bun.$`git status --porcelain`.text(),
    Bun.$`git rev-parse --abbrev-ref HEAD`.text(),
    Bun.$`git rev-list main..staging --count`.text(),
  ]);

  const dirty = dirtyOut.trim();
  if (dirty) {
    console.error("\x1b[31mError: working tree is dirty. Stash or commit first.\x1b[0m");
    console.error(dirty);
    process.exit(1);
  }

  const branch = branchOut.trim();
  if (branch !== "staging") {
    fail(`Must be on 'staging', currently on '${branch}'.`);
  }

  const ahead = aheadOut.trim();
  if (ahead === "0") {
    fail("staging has no commits ahead of main.");
  }
  console.log(`  ${ahead} commit(s) ahead of main`);

  // 2. Run tests
  if (skipTests) {
    step(2, "Skipping tests (--no-test)");
    warn("Shipping without tests. You own whatever breaks.");
  } else {
    step(2, "Running tests...");
    await Bun.$`bun test --bail`;
  }

  // 3. Push staging
  step(3, "Pushing staging to origin...");
  await Bun.$`git push origin staging`;

  // 4. Create PR — skip the existence check, just try to create
  step(4, "Creating PR...");
  const subjects = (
    await Bun.$`git log main..staging --format=%s --reverse`.text()
  )
    .trim()
    .split("\n")
    .filter((s) => !/^(Merge |WIP)/i.test(s));

  const title = subjects[0] ?? "Promote staging to main";
  const body = (
    await Bun.$`git log main..staging --oneline --reverse`.text()
  ).trim();

  let prNumber: string;
  const createResult = await Bun.$`gh pr create --base main --head staging --title ${title} --body ${body}`.nothrow();

  if (createResult.exitCode === 0) {
    const prUrl = createResult.stdout.toString().trim();
    console.log(`  ${prUrl}`);
    prNumber = prUrl.split("/").pop()!;
  } else {
    // PR already exists — grab its number
    const existing = (
      await Bun.$`gh pr list --head staging --base main --json number --jq .[0].number`.text()
    ).trim();
    if (!existing) {
      fail(
        `PR creation failed: ${createResult.stderr.toString().trim()}`,
        "Check gh auth and retry."
      );
    }
    prNumber = existing;
    console.log(`  Reusing existing PR #${prNumber}`);
  }

  if (!/^\d+$/.test(prNumber)) {
    fail("Could not extract PR number.");
  }

  // 5. Merge PR
  step(5, "Merging PR...");
  const mergeResult = await Bun.$`gh pr merge ${prNumber} --merge`.nothrow();
  if (mergeResult.exitCode !== 0) {
    const stderr = mergeResult.stderr.toString();
    if (!stderr.includes("already been merged")) {
      fail(
        `Merge failed: ${stderr.trim()}`,
        `Resolve manually, then: git checkout main && git pull && git branch -d staging && git checkout -b staging && git push -u origin staging`
      );
    }
  }

  // 6. Cycle branches (parallel where possible)
  step(6, "Cycling branches...");
  await Bun.$`git checkout main`;

  // Parallel: pull main + delete remote staging
  const [, remoteDel] = await Promise.all([
    Bun.$`git pull origin main`,
    Bun.$`git push origin --delete staging`.nothrow(),
  ]);
  if (remoteDel.exitCode !== 0) {
    warn(`Remote delete: ${remoteDel.stderr.toString().trim()}`);
  }

  // Local delete + recreate
  await Bun.$`git branch -d staging`.nothrow();
  await Bun.$`git checkout -b staging`;
  await Bun.$`git push -u origin staging`;

  const ms = (performance.now() - t0).toFixed(0);
  console.log(`\n\x1b[32mDone in ${ms}ms. On fresh staging, in sync with main.\x1b[0m`);
}

promote().catch((err) => {
  console.error(`\n\x1b[31mPromote failed:\x1b[0m`, err.message ?? err);
  process.exit(1);
});
