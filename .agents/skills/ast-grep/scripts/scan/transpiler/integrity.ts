import { readFile } from "node:fs/promises";

export type IntegrityManifest = {
  version?: number;
  files: Record<string, string>;
};

export async function sha256File(path: string): Promise<string> {
  const data = await Bun.file(path).arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function loadIntegrityManifest(path: string): Promise<IntegrityManifest | null> {
  try {
    const raw = JSON.parse(await readFile(path, "utf8")) as IntegrityManifest;
    if (!raw.files || typeof raw.files !== "object") return null;
    return raw;
  } catch {
    return null;
  }
}

export function checkIntegrity(
  relPath: string,
  actualHash: string,
  manifest: IntegrityManifest | null,
): { expected?: string; mismatch: boolean } {
  if (!manifest) return { mismatch: false };
  const expected = manifest.files[relPath];
  if (!expected) return { mismatch: false };
  return { expected, mismatch: expected !== actualHash };
}