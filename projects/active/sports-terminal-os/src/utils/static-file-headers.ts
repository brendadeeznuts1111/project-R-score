const STATIC_MIME_TYPES: Record<string, string> = {
  js: "application/javascript",
  mjs: "application/javascript",
  css: "text/css",
  html: "text/html",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  woff2: "font/woff2",
};

export function getStaticMimeType(extension: string): string {
  return STATIC_MIME_TYPES[extension] || "application/octet-stream";
}

export function getStaticFileHeaders(
  pathname: string,
  contentType: string
): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": contentType };

  if (pathname.startsWith("/assets/")) {
    headers["Cache-Control"] = "public, max-age=31536000, immutable";
  } else if (contentType === "text/html") {
    headers["Cache-Control"] = "no-cache";
  }

  return headers;
}
