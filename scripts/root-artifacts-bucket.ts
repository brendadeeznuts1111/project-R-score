#!/usr/bin/env bun

import { S3Client } from "bun";
import { mkdir, readdir, rename, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

type Options = {
  apply: boolean;
  upload: boolean;
  archive: boolean;
  archiveLevel: number;
  bucket: string;
  endpoint: string;
  prefix: string;
  accessKeyId: string;
  secretAccessKey: string;
};

type MoveRecord = {
  kind: "file" | "dir";
  from: string;
  to: string;
};

const DIST_DIR_CANDIDATES = [
  "dist",
  "dist-meta",
  "temp-dist",
  "virtual-dist",
  "meta-analysis-output",
];

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function toDateFolder() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv: string[]): Options {
  const accountId = Bun.env.CLOUDFLARE_ACCOUNT_ID || Bun.env.R2_ACCOUNT_ID || "";
  const endpoint = Bun.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
  const out: Options = {
    apply: false,
    upload: false,
    archive: true,
    archiveLevel: 9,
    bucket: (Bun.env.R2_BUCKET || Bun.env.R2_BUCKET_NAME || "factorywager-uploads").trim(),
    endpoint: endpoint.trim(),
    prefix: `root-artifacts/${toDateFolder()}`,
    accessKeyId: (Bun.env.R2_ACCESS_KEY_ID || "").trim(),
    secretAccessKey: (Bun.env.R2_SECRET_ACCESS_KEY || "").trim(),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") {
      out.apply = true;
      continue;
    }
    if (arg === "--upload") {
      out.upload = true;
      continue;
    }
    if (arg === "--no-archive") {
      out.archive = false;
      continue;
    }
    if (arg === "--archive-level") {
      const level = Number.parseInt(argv[i + 1] || "", 10);
      if (Number.isFinite(level) && level >= 1 && level <= 12) out.archiveLevel = level;
      i += 1;
      continue;
    }
    if (arg === "--bucket") {
      out.bucket = (argv[i + 1] || "").trim();
      i += 1;
      continue;
    }
    if (arg === "--endpoint") {
      out.endpoint = (argv[i + 1] || "").trim();
      i += 1;
      continue;
    }
    if (arg === "--prefix") {
      out.prefix = (argv[i + 1] || "").trim().replace(/^\/+|\/+$/g, "");
      i += 1;
      continue;
    }
  }

  return out;
}

async function ensureDir(path: string) {
  await mkdir(path, { recursive: true });
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function uniquePath(targetPath: string): Promise<string> {
  if (!(await pathExists(targetPath))) return targetPath;
  const stamp = Date.now();
  return `${targetPath}.${stamp}`;
}

async function listRootMetafiles(rootDir: string) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /^metafile-.*\.(json|md|csv)$/i.test(entry.name))
    .map((entry) => join(rootDir, entry.name));
}

async function listRootDistDirs(rootDir: string) {
  const out: string[] = [];
  for (const dirName of DIST_DIR_CANDIDATES) {
    const candidate = join(rootDir, dirName);
    if (await pathExists(candidate)) {
      const st = await stat(candidate);
      if (st.isDirectory()) out.push(candidate);
    }
  }
  return out;
}

async function listFilesRecursive(rootDir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  }
  if (await pathExists(rootDir)) await walk(rootDir);
  return out;
}

async function uploadFilesToR2(options: Options, artifactRoot: string, files: string[]) {
  if (!options.accessKeyId || !options.secretAccessKey || !options.endpoint || !options.bucket) {
    throw new Error("missing_r2_config: set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and endpoint/bucket");
  }

  const client = new S3Client({
    endpoint: options.endpoint,
    bucket: options.bucket,
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
  });

  let uploaded = 0;
  for (const filePath of files) {
    const rel = relative(artifactRoot, filePath).replace(/\\/g, "/");
    const key = `${options.prefix}/${rel}`;
    const file = Bun.file(filePath);
    const type = file.type || "application/octet-stream";
    await client.file(key).write(file, { type });
    uploaded += 1;
    console.log(`↑ uploaded ${key}`);
  }
  return uploaded;
}

async function createArchive(artifactRoot: string, manifestDir: string, level: number) {
  const files = await listFilesRecursive(artifactRoot);
  const archiveEntries: Record<string, Uint8Array> = {};

  for (const filePath of files) {
    const rel = relative(artifactRoot, filePath).replace(/\\/g, "/");
    archiveEntries[rel] = await Bun.file(filePath).bytes();
  }

  const stamp = nowStamp();
  const archivePath = join(manifestDir, `root-artifacts-${stamp}.tar.gz`);
  const archive = new Bun.Archive(archiveEntries, { compress: "gzip", level });
  await Bun.write(archivePath, archive);
  return { archivePath, fileCount: files.length };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const artifactRoot = resolve(rootDir, ".artifacts");
  const metafilesDir = join(artifactRoot, "metafiles");
  const distDir = join(artifactRoot, "dist");
  const manifestDir = join(artifactRoot, "manifests");
  const stamp = nowStamp();

  const metafiles = await listRootMetafiles(rootDir);
  const distDirs = await listRootDistDirs(rootDir);

  await ensureDir(metafilesDir);
  await ensureDir(distDir);
  await ensureDir(manifestDir);

  const plannedMoves: MoveRecord[] = [];

  for (const filePath of metafiles) {
    const targetBase = join(metafilesDir, filePath.split("/").pop() || "metafile.json");
    const target = await uniquePath(targetBase);
    plannedMoves.push({ kind: "file", from: filePath, to: target });
  }

  for (const dirPath of distDirs) {
    const name = dirPath.split("/").pop() || "dist";
    const targetBase = join(distDir, name);
    const target = await uniquePath(targetBase);
    plannedMoves.push({ kind: "dir", from: dirPath, to: target });
  }

  console.log(`Found ${metafiles.length} root metafile(s) and ${distDirs.length} dist-like directorie(s).`);
  for (const move of plannedMoves) {
    console.log(`- ${options.apply ? "move" : "plan"} ${move.from} -> ${move.to}`);
  }

  if (!options.apply) {
    console.log("Dry run complete. Re-run with --apply to execute moves.");
    return;
  }

  for (const move of plannedMoves) {
    await rename(move.from, move.to);
  }

  const manifestPath = join(manifestDir, `root-artifacts-${stamp}.json`);
  const manifest = {
    generatedAt: new Date().toISOString(),
    cwd: rootDir,
    moved: plannedMoves.map((move) => ({
      kind: move.kind,
      from: relative(rootDir, move.from).replace(/\\/g, "/"),
      to: relative(rootDir, move.to).replace(/\\/g, "/"),
    })),
    upload: {
      requested: options.upload,
      archive: options.archive,
      archiveLevel: options.archiveLevel,
      bucket: options.bucket,
      endpoint: options.endpoint,
      prefix: options.prefix,
    },
  };
  await Bun.write(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Wrote manifest: ${manifestPath}`);

  let archivePath = "";
  if (options.archive) {
    const archive = await createArchive(artifactRoot, manifestDir, options.archiveLevel);
    archivePath = archive.archivePath;
    console.log(`Created archive: ${archive.archivePath} (${archive.fileCount} file(s))`);
  }

  if (!options.upload) {
    console.log("Organization complete (no upload requested).");
    return;
  }

  const uploadCandidates = (await listFilesRecursive(artifactRoot)).filter((filePath) => !filePath.endsWith(".tar.gz"));
  const uploadedCount = await uploadFilesToR2(options, artifactRoot, uploadCandidates);
  if (archivePath) {
    const archiveKey = `${options.prefix}/archive/${archivePath.split("/").pop()}`;
    await Bun.write(`s3://${options.bucket}/${archiveKey}`, Bun.file(archivePath));
    console.log(`↑ uploaded ${archiveKey}`);
  }

  console.log(`Upload complete: ${uploadedCount} file(s) to s3://${options.bucket}/${options.prefix}/`);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
