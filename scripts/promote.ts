#!/usr/bin/env bun

/**
 * Promotes staging → main: runs tests, creates PR, merges, and cycles branches.
 * Usage: bun run promote [--no-test]
 */

const skipTests = Bun.argv.includes("--no-test");

const step = (n: number, msg: string) =>
  console.log(`\x1b[36m[${n}/8]\x1b[0m ${msg}`);
const warn = (msg: string) =>
  console.warn(`\x1b[33m  ⚠ ${msg}\x1b[0m`);
const fail = (msg: string, recovery?: string): never => {
  console.error(`\n\x1b[31m${msg}\x1b[0m`);
  if (recovery) console.error(`\x1b[33m  Recovery: ${recovery}\x1b[0m`);
  process.exit(1);
};

async function promote() {
  // 0. Pre-flight: dirty tree + gh auth
  const dirty = (await Bun.$`git status --porcelain`.text()).trim();
  if (dirty) {
    console.error("\x1b[31mError: working tree is dirty. Stash or commit first.\x1b[0m");
    console.error(dirty);
    process.exit(1);
  }

  const authCheck = await Bun.$`gh auth status`.nothrow();
  if (authCheck.exitCode !== 0) {
    fail("gh is not authenticated.", "Run `gh auth login` first.");
  }

  // 1. Verify we're on staging with commits ahead
  step(1, "Verifying branch...");
  const branch = (await Bun.$`git rev-parse --abbrev-ref HEAD`.text()).trim();
  if (branch !== "staging") {
    fail(`Must be on 'staging', currently on '${branch}'.`);
  }

  const ahead = (await Bun.$`git rev-list main..staging --count`.text()).trim();
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

  // 4. Create PR (idempotent — reuse existing if present)
  step(4, "Creating PR...");
  let prNumber: string;

  const existing = (
    await Bun.$`gh pr list --head staging --base main --json number --jq .[0].number`.text()
  ).trim();

  if (existing) {
    prNumber = existing;
    console.log(`  Reusing existing PR #${prNumber}`);
  } else {
    // Filter out merge commits and WIP for the title
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

    const prUrl = (
      await Bun.$`gh pr create --base main --head staging --title ${title} --body ${body}`.text()
    ).trim();
    console.log(`  ${prUrl}`);

    prNumber = prUrl.split("/").pop()!;
    if (!prNumber || !/^\d+$/.test(prNumber)) {
      fail(
        "Could not extract PR number from gh output.",
        `Check ${prUrl} and merge manually.`
      );
    }
  }

  // 5. Merge PR (handles already-merged gracefully)
  step(5, "Merging PR...");
  const mergeResult = await Bun.$`gh pr merge ${prNumber} --merge`.nothrow();
  if (mergeResult.exitCode !== 0) {
    const stderr = mergeResult.stderr.toString();
    if (stderr.includes("already been merged")) {
      console.log("  PR already merged, continuing.");
    } else {
      fail(
        `Merge failed: ${stderr.trim()}`,
        `Resolve manually, then: git checkout main && git pull && git branch -d staging && git checkout -b staging && git push -u origin staging`
      );
    }
  }

  // 6. Checkout main and pull
  step(6, "Checking out main...");
  await Bun.$`git checkout main`;
  await Bun.$`git pull origin main`;

  // 7. Delete staging (log failures instead of swallowing)
  step(7, "Deleting old staging branch...");
  const localDel = await Bun.$`git branch -d staging`.nothrow();
  if (localDel.exitCode !== 0) {
    warn(`Local branch delete failed: ${localDel.stderr.toString().trim()}`);
  }
  const remoteDel = await Bun.$`git push origin --delete staging`.nothrow();
  if (remoteDel.exitCode !== 0) {
    warn(`Remote branch delete failed: ${remoteDel.stderr.toString().trim()}`);
  }

  // 8. Recreate staging from main
  step(8, "Creating fresh staging from main...");
  await Bun.$`git checkout -b staging`;
  await Bun.$`git push -u origin staging`;

  console.log("\n\x1b[32mDone! On fresh staging, in sync with main.\x1b[0m");
}

promote().catch((err) => {
  console.error(`\n\x1b[31mPromote failed:\x1b[0m`, err.message ?? err);
  process.exit(1);
});
