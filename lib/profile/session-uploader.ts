/**
 * Profile Session Uploader
 *
 * Auto-uploads Bun --cpu-prof-md and --heap-prof-md outputs to R2
 * with per-terminal-session organization and Bun.terminal identity binding.
 *
 * R2 path structure:
 *   profiles/sessions/{terminal-session-id}/{type}/{timestamp}.md
 *
 * Session manifest stored at:
 *   profiles/sessions/{terminal-session-id}/manifest.json
 *
 * @see https://github.com/oven-sh/bun/pull/26327 — --cpu-prof-md flag
 * @see https://github.com/oven-sh/bun/pull/26326 — --heap-prof-md flag
 * @see https://github.com/oven-sh/bun/pull/15740 — S3Client (native S3/R2)
 * @see https://github.com/oven-sh/bun/pull/24112 — --cpu-prof + filename format
 */

import { S3Client } from 'bun';
import { resolve, basename, join } from 'node:path';
import { type ProfileType, profileTimestamp, profileR2Key, manifestR2Key, generateSessionId } from '../core/fw-types';

// ==================== Types ====================

export interface TerminalIdentity {
  sessionId: string;
  pid: number;
  hostname: string;
  user: string;
  startedAt: string;
}

export interface ProfileEntry {
  filename: string;
  type: ProfileType;
  r2Key: string;
  localPath: string;
  sizeBytes: number;
  uploadedAt: string;
  terminal: TerminalIdentity;
  bunVersion: string;
}

export interface SessionManifest {
  sessionId: string;
  terminal: TerminalIdentity;
  profiles: ProfileEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ProfileUploaderConfig {
  /** Explicit bucket. If omitted, S3Client reads S3_BUCKET / AWS_BUCKET from env/bun.secrets. */
  bucket?: string;
  /** Explicit endpoint. If omitted, S3Client reads S3_ENDPOINT / AWS_ENDPOINT from env/bun.secrets. */
  endpoint?: string;
  /** Explicit access key. If omitted, S3Client reads S3_ACCESS_KEY_ID / AWS_ACCESS_KEY_ID from env/bun.secrets. */
  accessKeyId?: string;
  /** Explicit secret. If omitted, S3Client reads S3_SECRET_ACCESS_KEY / AWS_SECRET_ACCESS_KEY from env/bun.secrets. */
  secretAccessKey?: string;
  prefix?: string;
  profilesDir?: string;
}

// ==================== Naming Convention ====================

/**
 * Bun v1.3.7+ profile filenames:
 *   CPU.{timestamp}.{pid}.md   (from --cpu-prof-md)
 *   Heap.{timestamp}.{pid}.md  (from --heap-prof-md)
 *
 * This regex captures: type, timestamp, pid
 */
const PROFILE_FILENAME_RE = /^(CPU|Heap)\.(\d+)\.(\d+)\.md$/;

function parseProfileFilename(filename: string): { type: ProfileType; timestamp: string; pid: number } | null {
  const match = filename.match(PROFILE_FILENAME_RE);
  if (!match) return null;
  return {
    type: match[1].toLowerCase() as ProfileType,
    timestamp: match[2],
    pid: parseInt(match[3], 10),
  };
}

// ==================== Terminal Identity ====================

/**
 * Derive terminal identity from the current Bun.terminal PTY session.
 * Falls back to env vars (TERMINAL_SESSION_ID) and process metadata.
 */
function resolveTerminalIdentity(): TerminalIdentity {
  const sessionId = generateSessionId();

  return {
    sessionId,
    pid: process.pid,
    hostname: (Bun.env.HOSTNAME || Bun.env.HOST || 'unknown').split('.')[0],
    user: Bun.env.USER || Bun.env.LOGNAME || 'unknown',
    startedAt: new Date().toISOString(),
  };
}

// ==================== Config Resolution ====================

/**
 * Resolve uploader config from env vars / bun.secrets.
 *
 * Credentials are optional — if S3_BUCKET, S3_ACCESS_KEY_ID, S3_ENDPOINT
 * are set in bun.secrets or .env, Bun's S3Client picks them up automatically.
 * Explicit R2_* env vars override when present.
 */
export function resolveUploaderConfig(): ProfileUploaderConfig {
  const accountId = Bun.env.R2_ACCOUNT_ID;

  return {
    bucket: Bun.env.R2_BUCKET || Bun.env.R2_BUCKET_NAME || Bun.env.S3_BUCKET || undefined,
    endpoint: Bun.env.R2_ENDPOINT || Bun.env.S3_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined),
    accessKeyId: Bun.env.R2_ACCESS_KEY_ID || Bun.env.S3_ACCESS_KEY_ID || undefined,
    secretAccessKey: Bun.env.R2_SECRET_ACCESS_KEY || Bun.env.S3_SECRET_ACCESS_KEY || undefined,
    prefix: Bun.env.R2_PROFILE_PREFIX || 'profiles',
    profilesDir: Bun.env.PROFILE_OUTPUT_DIR || './profiles',
  };
}

// ==================== Core Uploader ====================

export class ProfileSessionUploader {
  private config: ProfileUploaderConfig;
  private terminal: TerminalIdentity;
  private prefix: string;
  private uploaded = new Set<string>();
  /** S3 options — only includes fields that are explicitly set. Bun resolves the rest from bun.secrets. */
  private s3Opts: Record<string, string>;

  constructor(config: ProfileUploaderConfig = {}, terminal?: TerminalIdentity) {
    this.config = config;
    this.terminal = terminal || resolveTerminalIdentity();
    this.prefix = config.prefix || 'profiles';

    // Build S3 options, omitting undefined so Bun falls back to bun.secrets / env
    const opts: Record<string, string> = {};
    if (config.bucket) opts.bucket = config.bucket;
    if (config.endpoint) opts.endpoint = config.endpoint;
    if (config.accessKeyId) opts.accessKeyId = config.accessKeyId;
    if (config.secretAccessKey) opts.secretAccessKey = config.secretAccessKey;
    this.s3Opts = opts;
  }

  /** R2 key for a profile: profiles/sessions/{sessionId}/{type}/{filename} */
  private profileKey(type: ProfileType, filename: string): string {
    return profileR2Key(this.terminal.sessionId, type, filename, this.prefix);
  }

  /** R2 key for session manifest */
  private manifestKey(): string {
    return manifestR2Key(this.terminal.sessionId, this.prefix);
  }

  /** Upload a single profile file to R2 */
  async uploadProfile(localPath: string): Promise<ProfileEntry> {
    const absPath = resolve(localPath);
    const filename = basename(absPath);
    const parsed = parseProfileFilename(filename);

    if (!parsed) {
      throw new Error(`Not a Bun profile file: ${filename} (expected CPU.{ts}.{pid}.md or Heap.{ts}.{pid}.md)`);
    }

    const file = Bun.file(absPath);
    if (!await file.exists()) {
      throw new Error(`Profile file not found: ${absPath}`);
    }

    const content = await file.text();
    const key = this.profileKey(parsed.type, filename);

    await S3Client.write(key, content, {
      ...this.s3Opts,
      type: 'text/markdown',
    });

    const entry: ProfileEntry = {
      filename,
      type: parsed.type,
      r2Key: key,
      localPath: absPath,
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
      terminal: this.terminal,
      bunVersion: Bun.version,
    };

    this.uploaded.add(filename);
    return entry;
  }

  /**
   * Scan the profiles directory for any .md profile files that haven't been uploaded yet.
   * Returns all newly uploaded entries.
   */
  async scanAndUpload(profilesDir?: string): Promise<ProfileEntry[]> {
    const dir = resolve(profilesDir || this.config.profilesDir || './profiles');
    const glob = new Bun.Glob('*.md');
    const entries: ProfileEntry[] = [];

    for await (const filename of glob.scan({ cwd: dir })) {
      if (this.uploaded.has(filename)) continue;
      if (!PROFILE_FILENAME_RE.test(filename)) continue;

      const entry = await this.uploadProfile(join(dir, filename));
      entries.push(entry);
    }

    if (entries.length > 0) {
      await this.updateManifest(entries);
    }

    return entries;
  }

  /** Update the session manifest in R2 with new entries */
  private async updateManifest(newEntries: ProfileEntry[]): Promise<void> {
    const key = this.manifestKey();

    // Try to load existing manifest
    let manifest: SessionManifest;
    try {
      const existing = await S3Client.read(key, this.s3Opts);
      manifest = JSON.parse(new TextDecoder().decode(existing));
    } catch {
      manifest = {
        sessionId: this.terminal.sessionId,
        terminal: this.terminal,
        profiles: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    manifest.profiles.push(...newEntries);
    manifest.updatedAt = new Date().toISOString();

    await S3Client.write(key, JSON.stringify(manifest, null, 2), {
      ...this.s3Opts,
      type: 'application/json',
    });
  }

  /** Get current terminal identity */
  getTerminalIdentity(): TerminalIdentity {
    return this.terminal;
  }

  /** Get count of uploaded profiles this session */
  getUploadedCount(): number {
    return this.uploaded.size;
  }
}

// ==================== CLI ====================

if (import.meta.main) {
  const config = resolveUploaderConfig();
  const uploader = new ProfileSessionUploader(config);
  const identity = uploader.getTerminalIdentity();

  console.log(`Terminal Session: ${identity.sessionId}`);
  console.log(`User: ${identity.user}@${identity.hostname} (PID ${identity.pid})`);
  console.log(`Scanning: ${resolve(config.profilesDir || './profiles')}`);
  console.log('');

  const entries = await uploader.scanAndUpload();

  if (entries.length === 0) {
    console.log('No new profile files found.');
  } else {
    console.log(`Uploaded ${entries.length} profile(s):`);
    for (const entry of entries) {
      console.log(`  ${entry.type.toUpperCase()} ${entry.filename} -> ${entry.r2Key} (${(entry.sizeBytes / 1024).toFixed(1)} KB)`);
    }
  }
}
