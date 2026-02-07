/**
 * Profile Reader — R2 read layer
 *
 * Reads profiles and session manifests back from R2.
 * Used by the wiki dashboard and any future consumer.
 *
 * R2 path structure (set by session-uploader):
 *   {prefix}/sessions/{sessionId}/{type}/{filename}.md
 *   {prefix}/sessions/{sessionId}/manifest.json
 */

import { S3Client } from 'bun';
import type { SessionManifest, ProfileUploaderConfig } from './session-uploader';

// ==================== Types ====================

export interface SessionSummary {
  sessionId: string;
  manifestKey: string;
}

// ==================== Reader ====================

export class ProfileReader {
  private prefix: string;
  private s3Opts: Record<string, string>;

  constructor(config: ProfileUploaderConfig = {}) {
    this.prefix = config.prefix || 'profiles';

    const opts: Record<string, string> = {};
    if (config.bucket) opts.bucket = config.bucket;
    if (config.endpoint) opts.endpoint = config.endpoint;
    if (config.accessKeyId) opts.accessKeyId = config.accessKeyId;
    if (config.secretAccessKey) opts.secretAccessKey = config.secretAccessKey;
    this.s3Opts = opts;
  }

  /**
   * List all session prefixes in R2.
   * Uses S3 list with delimiter='/' to enumerate session directories.
   */
  async listSessions(): Promise<SessionSummary[]> {
    const prefix = `${this.prefix}/sessions/`;

    const response = await S3Client.list(prefix, {
      ...this.s3Opts,
      delimiter: '/',
    });

    const prefixes: string[] = (response as any).commonPrefixes || [];

    return prefixes.map((p) => {
      // p is e.g. "profiles/sessions/abc123/"
      const sessionId = p.replace(prefix, '').replace(/\/$/, '');
      return {
        sessionId,
        manifestKey: `${prefix}${sessionId}/manifest.json`,
      };
    });
  }

  /**
   * Read and parse a session's manifest.json from R2.
   */
  async getManifest(sessionId: string): Promise<SessionManifest> {
    const key = `${this.prefix}/sessions/${sessionId}/manifest.json`;
    const raw = await S3Client.read(key, this.s3Opts);
    return JSON.parse(new TextDecoder().decode(raw));
  }

  /**
   * Read a raw profile markdown file from R2.
   * @param type  "cpu" or "heap"
   */
  async getProfile(sessionId: string, type: string, filename: string): Promise<string> {
    const key = `${this.prefix}/sessions/${sessionId}/${type}/${filename}`;
    const raw = await S3Client.read(key, this.s3Opts);
    return new TextDecoder().decode(raw);
  }
}
