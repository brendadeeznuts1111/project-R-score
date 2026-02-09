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

export async function getBuildMetadata() {
  const macroDocs = {
    embedLatestGitCommitHash:
      "https://bun.com/docs/bundler/macros#embed-latest-git-commit-hash",
    makeFetchRequestsAtBundleTime:
      "https://bun.com/docs/bundler/macros#make-fetch-requests-at-bundle-time",
  };

  let bundleTimeFetch: {
    ok: boolean;
    status: number | null;
    url: string;
    error?: string;
  } = {
    ok: false,
    status: null,
    url: "https://bun.com/docs/bundler/macros",
  };

  try {
    const response = await fetch(bundleTimeFetch.url, {
      signal: AbortSignal.timeout(2000),
    });
    bundleTimeFetch = {
      ok: response.ok,
      status: response.status,
      url: bundleTimeFetch.url,
    };
  } catch (error) {
    bundleTimeFetch = {
      ok: false,
      status: null,
      url: bundleTimeFetch.url,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    gitCommitHash: getGitCommitHash(),
    macroDocs,
    bundleTimeFetch,
  };
}

