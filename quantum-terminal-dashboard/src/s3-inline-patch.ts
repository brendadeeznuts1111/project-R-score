// s3-inline-patch.ts  (zero-breaking, additive)
// S3 contentDisposition support for Quantum Cash-Flow Lattice v1.5.1
// Enables inline browser display of tension graphs, bundles, and PNGs

import { s3 } from "bun";

/* ---------- Types ---------------------------------------- */
export interface S3InlineOptions {
  bucket?: string;
  contentType?: string;
  contentDisposition?: "inline" | "attachment";
  cacheControl?: string;
}

/* ---------- inline lattice artefacts --------------------- */
/**
 * Upload to S3 with inline content-disposition
 * Browser displays content instead of forcing download
 *
 * @param key - S3 object key (path)
 * @param data - File content (ArrayBuffer, string, or Uint8Array)
 * @param mime - MIME type (auto-detected if not provided)
 * @param options - Additional S3 options
 */
export const s3Inline = async (
  key: string,
  data: ArrayBuffer | string | Uint8Array,
  mime?: string,
  options: Partial<S3InlineOptions> = {}
) => {
  const {
    bucket = "quantum-releases",
    contentDisposition = "inline",
    cacheControl = "public, max-age=31536000",
  } = options;

  return s3.write(key, data, {
    bucket,
    contentDisposition, // ← browser displays, no download
    contentType: mime ?? detectMimeType(key),
    cacheControl,
  });
};

/**
 * Upload with forced download (attachment disposition)
 */
export const s3Download = async (
  key: string,
  data: ArrayBuffer | string | Uint8Array,
  mime?: string,
  options: Partial<S3InlineOptions> = {}
) => {
  return s3Inline(key, data, mime, {
    ...options,
    contentDisposition: "attachment",
  });
};

/* ---------- MIME type detection -------------------------- */
const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".ts": "application/typescript",
  ".wasm": "application/wasm",
  ".tar": "application/x-tar",
  ".gz": "application/gzip",
  ".tar.gz": "application/gzip",
  ".tgz": "application/gzip",
  ".zip": "application/zip",
  ".pdf": "application/pdf",
  ".mmd": "text/plain",
  ".txt": "text/plain",
  ".md": "text/markdown",
};

function detectMimeType(key: string): string {
  const lower = key.toLowerCase();

  // Check compound extensions first
  if (lower.endsWith(".tar.gz")) return MIME_TYPES[".tar.gz"];

  // Check simple extensions
  for (const [ext, mime] of Object.entries(MIME_TYPES)) {
    if (lower.endsWith(ext)) return mime;
  }

  return "application/octet-stream";
}

/* ---------- Lattice-specific helpers --------------------- */
/**
 * Upload tension graph PNG (inline browser preview)
 */
export const uploadTensionPng = async (pngBuffer: ArrayBuffer | Uint8Array, date?: string) => {
  const dateStr = date ?? new Date().toISOString().split("T")[0];
  return s3Inline(`lattice/tension-${dateStr}.png`, pngBuffer, "image/png");
};

/**
 * Upload bundle tarball (inline browser stream)
 */
export const uploadBundle = async (gzBuffer: ArrayBuffer | Uint8Array, version: string) => {
  return s3Inline(`bundle/v${version}.tar.gz`, gzBuffer, "application/gzip");
};

/**
 * Upload JSON report (inline browser render)
 */
export const uploadReport = async (jsonData: object | string, date?: string) => {
  const dateStr = date ?? new Date().toISOString().split("T")[0];
  const jsonText = typeof jsonData === "string" ? jsonData : JSON.stringify(jsonData, null, 2);
  return s3Inline(`report/state-${dateStr}.json`, jsonText, "application/json");
};

/**
 * Upload Mermaid diagram (inline text)
 */
export const uploadMermaid = async (mermaidDot: string, name: string) => {
  return s3Inline(`diagrams/${name}.mmd`, mermaidDot, "text/plain");
};

/* ---------- exports -------------------------------------- */
export default {
  s3Inline,
  s3Download,
  detectMimeType,
  uploadTensionPng,
  uploadBundle,
  uploadReport,
  uploadMermaid,
};

