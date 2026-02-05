/**
 * Session file handling utilities for MemoryIndexManager.
 * Extracts session transcript content for memory indexing.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { resolveSessionTranscriptsDirForAgent } from "../config/sessions/paths.js";
import { hashText } from "./internal.js";

export type SessionFileEntry = {
  path: string;
  absPath: string;
  mtimeMs: number;
  size: number;
  hash: string;
  content: string;
};

/**
 * List all session transcript files for an agent.
 */
export async function listSessionFiles(agentId: string): Promise<string[]> {
  const dir = resolveSessionTranscriptsDirForAgent(agentId);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => name.endsWith(".jsonl"))
      .map((name) => path.join(dir, name));
  } catch {
    return [];
  }
}

/**
 * Convert absolute path to relative session path.
 */
export function sessionPathForFile(absPath: string): string {
  return path.join("sessions", path.basename(absPath)).replace(/\\/g, "/");
}

/**
 * Check if a session file belongs to a specific agent.
 */
export function isSessionFileForAgent(sessionFile: string, agentId: string): boolean {
  if (!sessionFile) return false;
  const sessionsDir = resolveSessionTranscriptsDirForAgent(agentId);
  const resolvedFile = path.resolve(sessionFile);
  const resolvedDir = path.resolve(sessionsDir);
  return resolvedFile.startsWith(`${resolvedDir}${path.sep}`);
}

/**
 * Normalize session text by collapsing whitespace.
 */
function normalizeSessionText(value: string): string {
  return value
    .replace(/\s*\n+\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract text content from session message content.
 */
function extractSessionText(content: unknown): string | null {
  if (typeof content === "string") {
    const normalized = normalizeSessionText(content);
    return normalized ? normalized : null;
  }
  if (!Array.isArray(content)) return null;
  const parts: string[] = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const record = block as { type?: unknown; text?: unknown };
    if (record.type !== "text" || typeof record.text !== "string") continue;
    const normalized = normalizeSessionText(record.text);
    if (normalized) parts.push(normalized);
  }
  if (parts.length === 0) return null;
  return parts.join(" ");
}

/**
 * Build a session file entry from an absolute path.
 * Returns null if the file cannot be read or has no indexable content.
 */
export async function buildSessionEntry(
  absPath: string,
  debug?: (message: string) => void,
): Promise<SessionFileEntry | null> {
  try {
    const stat = await fs.stat(absPath);
    const raw = await fs.readFile(absPath, "utf-8");
    const lines = raw.split("\n");
    const collected: string[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      let record: unknown;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }
      if (
        !record ||
        typeof record !== "object" ||
        (record as { type?: unknown }).type !== "message"
      ) {
        continue;
      }
      const message = (record as { message?: unknown }).message as
        | { role?: unknown; content?: unknown }
        | undefined;
      if (!message || typeof message.role !== "string") continue;
      if (message.role !== "user" && message.role !== "assistant") continue;
      const text = extractSessionText(message.content);
      if (!text) continue;
      const label = message.role === "user" ? "User" : "Assistant";
      collected.push(`${label}: ${text}`);
    }
    const content = collected.join("\n");
    return {
      path: sessionPathForFile(absPath),
      absPath,
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      hash: hashText(content),
      content,
    };
  } catch (err) {
    debug?.(`Failed reading session file ${absPath}: ${String(err)}`);
    return null;
  }
}
