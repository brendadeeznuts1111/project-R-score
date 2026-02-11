#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type BucketSource = "R2_BUCKET_NAME" | "S3_BUCKET_NAME" | "AWS_BUCKET_NAME" | "default";

function isSemver(value: string): boolean {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
}

function getPkgVersion(): string {
  const pkgPath = resolve(process.cwd(), "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
  return String(pkg.version || "").trim();
}

function getResolvedBucket(): { name: string; source: BucketSource; conflict: boolean } {
  const r2 = (process.env.R2_BUCKET_NAME || "").trim();
  const s3 = (process.env.S3_BUCKET_NAME || "").trim();
  const aws = (process.env.AWS_BUCKET_NAME || "").trim();

  const nonEmpty = [
    ["R2_BUCKET_NAME", r2],
    ["S3_BUCKET_NAME", s3],
    ["AWS_BUCKET_NAME", aws],
  ].filter(([, v]) => v.length > 0) as Array<[BucketSource, string]>;

  const uniqueValues = new Set(nonEmpty.map(([, v]) => v));
  const conflict = uniqueValues.size > 1;

  if (r2) return { name: r2, source: "R2_BUCKET_NAME", conflict };
  if (s3) return { name: s3, source: "S3_BUCKET_NAME", conflict };
  if (aws) return { name: aws, source: "AWS_BUCKET_NAME", conflict };
  return { name: "scanner-cookies", source: "default", conflict: false };
}

async function main() {
  const version = getPkgVersion();
  const semverOk = isSemver(version);
  const bucket = getResolvedBucket();
  const runtimeBucket = bucket.name;

  if (!semverOk) {
    console.error(`[ci:r2:version:check][fail] package.json version is not semver: "${version}"`);
    process.exit(1);
  }

  if (bucket.conflict) {
    console.error("[ci:r2:version:check][fail] conflicting bucket env vars detected:");
    console.error(`  R2_BUCKET_NAME=${process.env.R2_BUCKET_NAME || ""}`);
    console.error(`  S3_BUCKET_NAME=${process.env.S3_BUCKET_NAME || ""}`);
    console.error(`  AWS_BUCKET_NAME=${process.env.AWS_BUCKET_NAME || ""}`);
    process.exit(1);
  }

  if (bucket.source === "default") {
    console.warn(
      "[ci:r2:version:check][warn] no bucket env set; using default bucket \"scanner-cookies\""
    );
  }

  console.log(
    `[ci:r2:version:check][pass] version=${version} bucket=${runtimeBucket} source=${bucket.source}`
  );
}

await main();
