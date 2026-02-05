#!/usr/bin/env bun
/**
 * R2 Bucket Management
 * List, sync, and cleanup R2 assets
 */

import { S3Client } from "bun";
import { R2_BUCKETS } from "../packages/core/src/infra/constants";
import { createLogger } from "../shared/logger";

// Use env vars for credentials (loaded by Bun from .env)
const R2_ACCOUNT_ID = Bun.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = Bun.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = Bun.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET = Bun.env.R2_BUCKET || R2_BUCKETS.REGISTRY_PROD.name;

const s3 = new S3Client({
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  bucket: R2_BUCKET,
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
});

const logger = createLogger('r2-manage');
const command = (process.argv[2] as Command) || "list";
const prefix = process.argv[3] || "";

async function listObjects(prefix: string = "") {
  logger.header(`R2 Objects${prefix ? ` (prefix: ${prefix})` : ""}`, `Bucket: ${R2_BUCKET}`);

  const objects: Array<{ key: string; size: number; modified: Date }> = [];

  // Use instance list method with prefix
  const result = await s3.list({ prefix });

  for (const obj of result.contents || []) {
    objects.push({
      key: obj.key,
      size: obj.size,
      modified: new Date(obj.lastModified),
    });
  }

  if (objects.length === 0) {
    logger.warn("No objects found", { operation: "list", metadata: { prefix } });
    return objects;
  }

  // Display as table
  const tableData = objects.map((obj) => ({
    Key: obj.key,
    Size: `${(obj.size / 1024).toFixed(2)} KB`,
    Modified: obj.modified.toISOString().split("T")[0],
  }));

  logger.table(tableData);

  const totalSize = objects.reduce((sum, obj) => sum + obj.size, 0);
  logger.metrics("Total Objects", objects.length, "files", { operation: "list" });
  logger.metrics("Total Size", (totalSize / 1024).toFixed(2), "KB", { operation: "list" });

  return objects;
}

async function deleteObjects(keys: string[]) {
  logger.info(`Starting deletion of ${keys.length} objects`, {
    operation: "delete",
    metadata: { count: keys.length }
  });

  let successCount = 0;
  let errorCount = 0;

  for (const key of keys) {
    try {
      await s3.delete(key);
      logger.success(`Deleted: ${key}`, { operation: "delete" });
      successCount++;
    } catch (error: any) {
      logger.error(`Failed to delete: ${key}`, error, { operation: "delete" });
      errorCount++;
    }
  }

  logger.summary({
    "Successfully Deleted": successCount,
    "Failed Deletions": errorCount,
    "Total Processed": keys.length
  }, { operation: "delete" });
}

async function cleanup(prefix: string) {
  const objects = await listObjects(prefix);

  if (objects.length === 0) {
    logger.info("No objects to clean up", { operation: "cleanup", metadata: { prefix } });
    return;
  }

  logger.warn(`This operation will delete ${objects.length} objects`, {
    operation: "cleanup",
    metadata: { prefix, count: objects.length }
  });

  logger.info("To proceed, run with --confirm flag:", {
    operation: "cleanup",
    metadata: { command: `bun scripts/r2-manage.ts cleanup ${prefix} --confirm` }
  });

  if (process.argv.includes("--confirm")) {
    await deleteObjects(objects.map((o) => o.key));
    logger.success("Cleanup complete", { operation: "cleanup", metadata: { prefix } });
  }
}

async function main() {
  switch (command) {
    case "list":
      await listObjects(prefix);
      break;

    case "delete":
      if (!prefix) {
        logger.error("Missing key parameter for delete command", undefined, {
          operation: "delete",
          metadata: { usage: "bun scripts/r2-manage.ts delete <key>" }
        });
        process.exit(1);
      }
      await deleteObjects([prefix]);
      break;

    case "cleanup":
      await cleanup(prefix);
      break;

    case "sync":
      logger.info("Use dedicated sync command", {
        operation: "sync",
        metadata: { command: "bun run sync:r2" }
      });
      break;

    default:
      logger.header("R2 Bucket Manager", "Cloud Storage Management Tool");
      console.log(`
Usage:
  bun scripts/r2-manage.ts <command> [prefix]

Commands:
  list [prefix]     List objects (optionally filtered by prefix)
  delete <key>      Delete a specific object
  cleanup <prefix>  Delete all objects with prefix (requires --confirm)
  sync              Sync blog/dist to R2 (alias for bun run sync:r2)

Examples:
  bun scripts/r2-manage.ts list
  bun scripts/r2-manage.ts list blog/
  bun scripts/r2-manage.ts delete _healthcheck.txt
  bun scripts/r2-manage.ts cleanup blog/old/ --confirm
`);
  }
}

main().catch((error) => {
  logger.error("Script execution failed", error, { operation: "main" });
  process.exit(1);
});
