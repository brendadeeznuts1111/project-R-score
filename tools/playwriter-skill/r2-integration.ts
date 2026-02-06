#!/usr/bin/env bun

/**
 * Playwriter R2 Integration
 * 
 * Store browser automation artifacts in Cloudflare R2
 * - Screenshots
 * - Session recordings
 * -HAR files
 * - Accessibility snapshots
 */

import { R2Storage } from '../../lib/r2/r2-storage-enhanced';

interface PlaywriterR2Config {
  bucket?: string;
  prefix?: string;
  sessionId: string | number;
}

interface ScreenshotMetadata {
  url: string;
  timestamp: string;
  width: number;
  height: number;
  fullPage: boolean;
  labels?: boolean;
}

interface SessionArtifact {
  type: 'screenshot' | 'har' | 'snapshot' | 'recording';
  sessionId: string;
  timestamp: string;
  data: Uint8Array | string;
  metadata?: Record<string, any>;
}

class PlaywriterR2Integration {
  private r2: R2Storage;
  private config: PlaywriterR2Config;

  constructor(config: PlaywriterR2Config) {
    this.config = {
      bucket: config.bucket || 'playwriter-artifacts',
      prefix: config.prefix || `sessions/${config.sessionId}`,
      sessionId: config.sessionId,
    };

    // Initialize R2 storage
    this.r2 = new R2Storage({
      bucket: this.config.bucket!,
      accountId: process.env.R2_ACCOUNT_ID || '',
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    });
  }

  /**
   * Upload a screenshot to R2
   */
  async uploadScreenshot(
    screenshotData: Uint8Array,
    metadata: ScreenshotMetadata
  ): Promise<string> {
    const timestamp = Date.now();
    const key = `${this.config.prefix}/screenshots/${timestamp}.png`;

    await this.r2.upload(key, screenshotData, {
      contentType: 'image/png',
      metadata: {
        'playwriter-session': String(this.config.sessionId),
        'playwriter-url': metadata.url,
        'playwriter-timestamp': metadata.timestamp,
        'playwriter-width': String(metadata.width),
        'playwriter-height': String(metadata.height),
        'playwriter-fullpage': String(metadata.fullPage),
        'playwriter-labels': String(metadata.labels || false),
      },
    });

    return `r2://${this.config.bucket}/${key}`;
  }

  /**
   * Upload HAR file to R2
   */
  async uploadHAR(harData: string): Promise<string> {
    const timestamp = Date.now();
    const key = `${this.config.prefix}/network/${timestamp}.har`;

    await this.r2.upload(key, Buffer.from(harData), {
      contentType: 'application/json',
      metadata: {
        'playwriter-session': String(this.config.sessionId),
        'playwriter-type': 'har',
        'playwriter-timestamp': new Date().toISOString(),
      },
    });

    return `r2://${this.config.bucket}/${key}`;
  }

  /**
   * Upload accessibility snapshot to R2
   */
  async uploadSnapshot(snapshot: string): Promise<string> {
    const timestamp = Date.now();
    const key = `${this.config.prefix}/snapshots/${timestamp}.json`;

    await this.r2.upload(key, Buffer.from(snapshot), {
      contentType: 'application/json',
      metadata: {
        'playwriter-session': String(this.config.sessionId),
        'playwriter-type': 'accessibility-snapshot',
        'playwriter-timestamp': new Date().toISOString(),
      },
    });

    return `r2://${this.config.bucket}/${key}`;
  }

  /**
   * Upload session recording to R2
   */
  async uploadRecording(recordingData: Uint8Array): Promise<string> {
    const timestamp = Date.now();
    const key = `${this.config.prefix}/recordings/${timestamp}.webm`;

    await this.r2.upload(key, recordingData, {
      contentType: 'video/webm',
      metadata: {
        'playwriter-session': String(this.config.sessionId),
        'playwriter-type': 'recording',
        'playwriter-timestamp': new Date().toISOString(),
      },
    });

    return `r2://${this.config.bucket}/${key}`;
  }

  /**
   * List all artifacts for this session
   */
  async listArtifacts(prefix?: string): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
    const searchPrefix = prefix 
      ? `${this.config.prefix}/${prefix}`
      : this.config.prefix;

    return await this.r2.list(searchPrefix);
  }

  /**
   * Download an artifact from R2
   */
  async downloadArtifact(key: string): Promise<Uint8Array> {
    return await this.r2.download(key);
  }

  /**
   * Get public URL for an artifact (if bucket is public)
   */
  getPublicUrl(key: string): string {
    return `https://${this.config.bucket}.r2.dev/${key}`;
  }

  /**
   * Clean up old artifacts for this session
   */
  async cleanup(maxAge?: number): Promise<number> {
    const artifacts = await this.listArtifacts();
    const now = Date.now();
    const maxAgeMs = maxAge || 7 * 24 * 60 * 60 * 1000; // 7 days default

    let deleted = 0;
    for (const artifact of artifacts) {
      if (now - artifact.lastModified.getTime() > maxAgeMs) {
        await this.r2.delete(artifact.key);
        deleted++;
      }
    }

    return deleted;
  }
}

/**
 * Execute playwriter command and upload result to R2
 */
export async function executeAndUpload(
  sessionId: number,
  code: string,
  options: {
    uploadScreenshot?: boolean;
    uploadHAR?: boolean;
    uploadSnapshot?: boolean;
  } = {}
): Promise<{
  output: string;
  artifacts: Array<{ type: string; url: string }>;
}> {
  const r2 = new PlaywriterR2Integration({ sessionId });
  const artifacts: Array<{ type: string; url: string }> = [];

  // Execute the command
  const proc = Bun.spawn(['playwriter', '-s', String(sessionId), '-e', code], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const output = stdout + (stderr ? `\n${stderr}` : '');

  // Upload screenshot if requested
  if (options.uploadScreenshot) {
    try {
      const screenshotCode = `
        const buffer = await page.screenshot({ fullPage: true });
        console.log('SCREENSHOT_DATA:' + buffer.toString('base64'));
      `;
      
      const ssProc = Bun.spawn(['playwriter', '-s', String(sessionId), '-e', screenshotCode], {
        stdout: 'pipe',
      });
      
      const ssOutput = await new Response(ssProc.stdout).text();
      const match = ssOutput.match(/SCREENSHOT_DATA:([A-Za-z0-9+/=]+)/);
      
      if (match) {
        const buffer = Buffer.from(match[1], 'base64');
        const url = await r2.uploadScreenshot(new Uint8Array(buffer), {
          url: 'unknown',
          timestamp: new Date().toISOString(),
          width: 1920,
          height: 1080,
          fullPage: true,
        });
        artifacts.push({ type: 'screenshot', url });
      }
    } catch (e) {
      console.error('Screenshot upload failed:', e);
    }
  }

  // Upload HAR if requested
  if (options.uploadHAR) {
    try {
      const harCode = `
        const har = await page.evaluate(() => JSON.stringify(performance.getEntries()));
        console.log('HAR_DATA:' + har);
      `;
      
      const harProc = Bun.spawn(['playwriter', '-s', String(sessionId), '-e', harCode], {
        stdout: 'pipe',
      });
      
      const harOutput = await new Response(harProc.stdout).text();
      const match = harOutput.match(/HAR_DATA:(.+)/);
      
      if (match) {
        const url = await r2.uploadHAR(match[1]);
        artifacts.push({ type: 'har', url });
      }
    } catch (e) {
      console.error('HAR upload failed:', e);
    }
  }

  return { output, artifacts };
}

export { PlaywriterR2Integration };
export type { PlaywriterR2Config, ScreenshotMetadata, SessionArtifact };
