export function getGitCommitHash(): string {
  const envHash = (process.env.GIT_COMMIT_HASH || "").trim();
  if (envHash) return envHash;

  const rev = Bun.spawnSync(["git", "rev-parse", "HEAD"], {
    cwd: process.cwd(),
    stdout: "pipe",
    stderr: "ignore",
  });
  const hash = rev.stdout.toString().trim();
  return hash || "unset";
}

