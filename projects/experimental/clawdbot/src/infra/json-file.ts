import fs from "node:fs";
import path from "node:path";

/**
 * Load JSON file synchronously. Returns undefined if file doesn't exist or is invalid.
 */
export function loadJsonFile(pathname: string): unknown {
  try {
    if (!fs.existsSync(pathname)) return undefined;
    const raw = fs.readFileSync(pathname, "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Load JSON file asynchronously using Bun's native file API.
 * Faster than fs.promises.readFile + JSON.parse for large files.
 * Returns undefined if file doesn't exist or is invalid.
 */
export async function loadJsonFileAsync(pathname: string): Promise<unknown> {
  try {
    const file = Bun.file(pathname);
    if (!(await file.exists())) return undefined;
    return await file.json();
  } catch {
    return undefined;
  }
}

/**
 * Save JSON file synchronously with secure permissions (0o600).
 */
export function saveJsonFile(pathname: string, data: unknown) {
  const dir = path.dirname(pathname);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(pathname, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  fs.chmodSync(pathname, 0o600);
}

/**
 * Save JSON file asynchronously using Bun's native file API.
 * Creates parent directories and sets secure permissions (0o600).
 */
export async function saveJsonFileAsync(pathname: string, data: unknown): Promise<void> {
  const dir = path.dirname(pathname);
  await fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });
  const content = `${JSON.stringify(data, null, 2)}\n`;
  await Bun.write(pathname, content);
  await fs.promises.chmod(pathname, 0o600);
}
