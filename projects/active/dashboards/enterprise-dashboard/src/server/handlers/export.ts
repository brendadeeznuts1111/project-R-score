/**
 * Export Handler
 * 
 * Handles S3/R2 export and snapshot management.
 */

import * as db from "../db";
import { feature } from "bun:bundle";
import type { Project, DashboardStats, SystemMetrics, ApiResponse } from "../../types";

export interface ExportHandlerContext {
  config: {
    S3: {
      BUCKET?: string;
      REQUESTER_PAYS?: boolean;
    };
  };
  getS3Config: () => { BUCKET?: string; ACCESS_KEY_ID?: string; SECRET_ACCESS_KEY?: string; ENDPOINT?: string; REGION?: string };
  getS3Client: () => ReturnType<typeof Bun.s3>;
  isS3Configured: () => boolean;
  projects: Project[];
  getStats: () => DashboardStats;
  getCachedSystemMetrics: () => Promise<SystemMetrics>;
}

/**
 * Export dashboard snapshot to S3
 */
export async function handleExportS3(context: ExportHandlerContext): Promise<Response> {
  if (!feature("S3_EXPORT")) {
    return Response.json({ error: "S3 export not enabled" }, { status: 403 });
  }

  const success = await exportDashboardSnapshot(context);
  if (success) {
    return Response.json({
      data: {
        status: "exported",
        bucket: context.config.S3.BUCKET,
        requesterPays: context.config.S3.REQUESTER_PAYS,
        timestamp: new Date().toISOString(),
      }
    });
  }
  return Response.json({ error: "Export failed" }, { status: 500 });
}

/**
 * Create and download snapshot archive
 */
export async function handleSnapshotGet(context: ExportHandlerContext): Promise<Response> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const currentStats = context.getStats();
  const systemMetrics = await context.getCachedSystemMetrics();

  // Build archive contents
  const archiveContents: Record<string, string> = {
    "projects.json": JSON.stringify(context.projects, null, 2),
    "stats.json": JSON.stringify(currentStats, null, 2),
    "system.json": JSON.stringify(systemMetrics, null, 2),
    "metadata.txt": [
      `Enterprise Dashboard Snapshot`,
      `Timestamp: ${new Date().toISOString()}`,
      `Bun Version: ${Bun.version}`,
      `Projects: ${context.projects.length}`,
      `Uptime: ${currentStats.uptime}s`,
      `Total Requests: ${currentStats.totalRequests}`,
      `Success Rate: ${currentStats.successRate}%`,
    ].join("\n"),
  };

  // Add individual project files
  for (const proj of context.projects) {
    archiveContents[`projects/${proj.name}.json`] = JSON.stringify(proj, null, 2);
  }

  try {
    const archive = new Bun.Archive(archiveContents);
    const blob = await archive.blob();

    return new Response(blob, {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="dashboard-snapshot-${timestamp}.tar.gz"`,
      },
    });
  } catch (error) {
    return Response.json({
      error: `Failed to create archive: ${error instanceof Error ? error.message : "Unknown error"}`
    }, { status: 500 });
  }
}

/**
 * Store snapshot to R2/S3
 */
export async function handleSnapshotPost(context: ExportHandlerContext): Promise<Response> {
  // Store snapshot to R2/S3
  if (!context.isS3Configured()) {
    return Response.json({ error: "S3/R2 not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and S3_ENDPOINT for R2." }, { status: 400 });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `snapshots/dashboard-${timestamp}.tar.gz`;
  const currentStats = context.getStats();
  const systemMetrics = await context.getCachedSystemMetrics();

  const archiveContents: Record<string, string> = {
    "projects.json": JSON.stringify(context.projects, null, 2),
    "stats.json": JSON.stringify(currentStats, null, 2),
    "system.json": JSON.stringify(systemMetrics, null, 2),
    "metadata.txt": [
      `Enterprise Dashboard Snapshot`,
      `Timestamp: ${new Date().toISOString()}`,
      `Bun Version: ${Bun.version}`,
      `Projects: ${context.projects.length}`,
    ].join("\n"),
  };

  for (const proj of context.projects) {
    archiveContents[`projects/${proj.name}.json`] = JSON.stringify(proj, null, 2);
  }

  try {
    const archive = new Bun.Archive(archiveContents);
    const blob = await archive.blob();
    const bytes = await blob.arrayBuffer();

    const s3Client = context.getS3Client();
    await s3Client.write(filename, new Uint8Array(bytes), {
      type: "application/gzip",
    });

    // Save to local database as well
    db.saveSnapshot({
      id: Bun.randomUUIDv7(),
      filename,
      size: bytes.byteLength,
      projectCount: context.projects.length,
      storedIn: "r2",
      checksum: Bun.hash.crc32(new Uint8Array(bytes)).toString(16).padStart(8, "0"),
    });

    return Response.json({
      data: {
        stored: true,
        filename,
        size: bytes.byteLength,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    return Response.json({
      error: `Failed to store snapshot: ${error instanceof Error ? error.message : "Unknown error"}`
    }, { status: 500 });
  }
}

/**
 * List stored snapshots
 */
export async function handleSnapshotsList(context: ExportHandlerContext): Promise<Response> {
  const s3Config = context.getS3Config();

  if (!context.isS3Configured()) {
    // Fall back to local database snapshots
    const localSnapshots = db.getSnapshots(50);
    return Response.json({
      data: {
        snapshots: localSnapshots.map(s => ({
          key: s.filename,
          name: s.filename.replace("snapshots/", ""),
          size: s.size,
          lastModified: s.created_at,
          storedIn: s.stored_in,
          url: `/api/snapshots/${encodeURIComponent(s.filename.replace("snapshots/", ""))}`,
        })),
        source: "local",
        bucket: null,
        endpoint: null,
      },
    });
  }

  try {
    const s3Client = context.getS3Client();
    // List objects with prefix using Bun.s3 list API
    const files: Array<{ key: string; size: number; lastModified: Date }> = [];

    // Bun.s3 uses an async iterator for listing
    for await (const file of s3Client.list("snapshots/")) {
      files.push({
        key: file.name,
        size: file.size,
        lastModified: file.lastModified,
      });
    }

    const snapshots = files.map((obj) => ({
      key: obj.key,
      name: obj.key.replace("snapshots/", ""),
      size: obj.size,
      lastModified: obj.lastModified,
      storedIn: "r2",
      url: `/api/snapshots/${encodeURIComponent(obj.key.replace("snapshots/", ""))}`,
    }));

    return Response.json({
      data: {
        snapshots,
        source: "r2",
        bucket: s3Config.BUCKET,
        endpoint: s3Config.ENDPOINT,
      },
    });
  } catch (error) {
    return Response.json({
      error: `Failed to list snapshots: ${error instanceof Error ? error.message : "Unknown error"}`,
      data: { snapshots: [], source: "error", bucket: null, endpoint: null },
    });
  }
}

/**
 * Get specific snapshot contents
 */
export async function handleSnapshotGetFile(
  context: ExportHandlerContext,
  filename: string,
  download: boolean = false
): Promise<Response> {
  if (!context.isS3Configured()) {
    return Response.json({ error: "S3/R2 not configured" }, { status: 400 });
  }

  try {
    const s3Client = context.getS3Client();
    const key = `snapshots/${decodeURIComponent(filename)}`;
    const file = s3Client.file(key);
    const exists = await file.exists();

    if (!exists) {
      return Response.json({ error: "Snapshot not found" }, { status: 404 });
    }

    if (download) {
      // Return raw file for download - use arrayBuffer since blob() isn't available
      const buffer = await file.arrayBuffer();
      return new Response(buffer, {
        headers: {
          "Content-Type": "application/gzip",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Extract and return contents as JSON for inline viewing
    const bytes = await file.arrayBuffer();
    // Bun.Archive API - cast to any since types may be incomplete
    const extracted = await (new Bun.Archive(new Uint8Array(bytes)) as any).unpack() as Record<string, Uint8Array>;

    // Convert extracted files to JSON-friendly format
    const contents: Record<string, string> = {};
    for (const [path, data] of Object.entries(extracted)) {
      if (data instanceof Uint8Array) {
        contents[path] = new TextDecoder().decode(data);
      } else {
        contents[path] = String(data);
      }
    }

    return Response.json({
      data: {
        filename,
        files: Object.keys(contents),
        contents,
      }
    });
  } catch (error) {
    return Response.json({
      error: `Failed to read snapshot: ${error instanceof Error ? error.message : "Unknown error"}`
    }, { status: 500 });
  }
}

/**
 * Export dashboard snapshot helper (used by handleExportS3)
 */
async function exportDashboardSnapshot(context: ExportHandlerContext): Promise<boolean> {
  if (!feature("S3_EXPORT")) return false;

  const snapshot = {
    timestamp: new Date().toISOString(),
    projects: context.projects.map(p => ({ name: p.name, branch: p.branch, health: p.health, status: p.status })),
    stats: context.getStats(),
    system: await context.getCachedSystemMetrics(),
  };

  const filename = `snapshots/dashboard-${Date.now()}.json`;
  
  try {
    const s3Client = context.getS3Client();
    await s3Client.write(filename, JSON.stringify(snapshot, null, 2), {
      type: "application/json",
    });
    return true;
  } catch (error) {
    console.error("S3 export failed:", error);
    return false;
  }
}
