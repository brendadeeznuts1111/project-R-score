// lib/har-analyzer/url-parser.ts — Parse URL strings into ParsedURL
// Uses built-in URL + fragment-analyzer. No external dependencies.

import type { ParsedURL } from "./types";
import { analyzeFragment } from "./fragment-analyzer";

// ─── Extension → MIME mapping ────────────────────────────────────────

export const MIME_MAP: Record<string, string> = {
  ".html": "text/html",
  ".htm":  "text/html",
  ".css":  "text/css",
  ".js":   "application/javascript",
  ".mjs":  "application/javascript",
  ".ts":   "application/typescript",
  ".tsx":  "application/typescript",
  ".json": "application/json",
  ".xml":  "application/xml",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".otf":  "font/otf",
  ".eot":  "application/vnd.ms-fontobject",
  ".mp4":  "video/mp4",
  ".webm": "video/webm",
  ".mp3":  "audio/mpeg",
  ".wasm": "application/wasm",
  ".map":  "application/json",
  ".pdf":  "application/pdf",
  ".cjs":  "application/javascript",
  ".mts":  "application/typescript",
  ".yaml": "text/yaml",
  ".yml":  "text/yaml",
  ".txt":  "text/plain",
  ".webmanifest": "application/manifest+json",
};

/** Extract file extension from a pathname */
function extractExtension(pathname: string): string {
  const lastSlash = pathname.lastIndexOf("/");
  const basename = lastSlash === -1 ? pathname : pathname.slice(lastSlash + 1);
  const dotIdx = basename.lastIndexOf(".");
  if (dotIdx <= 0) return "";
  return basename.slice(dotIdx).toLowerCase();
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Parse a URL string into a fully analyzed ParsedURL.
 * Handles data: and blob: URIs gracefully.
 */
export function parseURL(urlString: string): ParsedURL {
  const isDataURI = urlString.startsWith("data:");
  const isBlob = urlString.startsWith("blob:");

  // data: URIs can't be parsed by new URL() in a useful way for host/path
  if (isDataURI) {
    return {
      href: urlString,
      scheme: "data:",
      host: "",
      pathname: "",
      query: "",
      fragment: analyzeFragment(""),
      extension: "",
      mimeHint: urlString.split(",")[0].slice(5).split(";")[0] || "application/octet-stream",
      origin: "",
      cacheKey: urlString,
      isDataURI: true,
      isBlob: false,
    };
  }

  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    // Malformed URL — return a best-effort shell
    return {
      href: urlString,
      scheme: "",
      host: "",
      pathname: urlString,
      query: "",
      fragment: analyzeFragment(""),
      extension: extractExtension(urlString),
      mimeHint: MIME_MAP[extractExtension(urlString)] || "",
      origin: "",
      cacheKey: urlString,
      isDataURI: false,
      isBlob,
    };
  }

  const extension = extractExtension(url.pathname);
  const mimeHint = MIME_MAP[extension] || "";
  const fragmentRaw = url.hash ? url.hash.slice(1) : "";

  return {
    href: url.href,
    scheme: url.protocol,
    host: url.host,
    pathname: url.pathname,
    query: url.search,
    fragment: analyzeFragment(fragmentRaw),
    extension,
    mimeHint,
    origin: url.origin,
    cacheKey: url.origin + url.pathname + url.search,
    isDataURI: false,
    isBlob,
  };
}
