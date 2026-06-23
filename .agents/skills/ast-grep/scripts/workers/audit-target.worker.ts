/**
 * Audit worker — runs one ast-grep scan per repo-map target.
 * Spawned by scripts/audit-pool.ts (Bun Worker pool).
 */

export type AuditScanJob = {
  binary: string;
  id: string;
  relPath: string;
  fullPath: string;
  sgBaseArgs: string[];
  globs: string[];
};

export type AuditScanResult = {
  id: string;
  path: string;
  skipped: boolean;
  scan_error: string | null;
  returncode: number;
  stdout: string;
  stderr: string;
  worker_ms: number;
};

declare const self: Worker;

self.onmessage = async (event: MessageEvent<AuditScanJob>) => {
  const { binary, id, relPath, fullPath, sgBaseArgs, globs } = event.data;
  const started = performance.now();

  if (!(await Bun.file(fullPath).exists())) {
    const result: AuditScanResult = {
      id,
      path: relPath,
      skipped: true,
      scan_error: null,
      returncode: 0,
      stdout: "",
      stderr: "",
      worker_ms: 0,
    };
    self.postMessage(result);
    return;
  }

  const args = [...sgBaseArgs];
  for (const g of globs) args.push("--globs", g);
  args.push(fullPath);

  try {
    const proc = Bun.spawn([binary, ...args], { stdout: "pipe", stderr: "pipe" });
    const returncode = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const result: AuditScanResult = {
      id,
      path: relPath,
      skipped: false,
      scan_error: returncode > 1 ? (stderr.trim() || `ast-grep exit ${returncode}`) : null,
      returncode,
      stdout,
      stderr,
      worker_ms: Math.round(performance.now() - started),
    };
    self.postMessage(result);
  } catch (e) {
    const result: AuditScanResult = {
      id,
      path: relPath,
      skipped: false,
      scan_error: String(e),
      returncode: 99,
      stdout: "",
      stderr: String(e),
      worker_ms: Math.round(performance.now() - started),
    };
    self.postMessage(result);
  }
};