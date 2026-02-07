/**
 * Unified Profile Engine
 *
 * Consolidates profiling capabilities:
 * - CPU profiling (Bun --cpu-prof)
 * - Heap profiling (Bun --heap-prof)
 * - Sampling profiles (bun:jsc)
 * - Custom performance markers
 * - R2 integration for profile storage
 */

import * as jsc from 'bun:jsc';
import { S3Client } from 'bun';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ==================== Types ====================

export type ProfileType = 'cpu' | 'heap' | 'sampling' | 'custom';
export type ProfileStatus = 'idle' | 'running' | 'completed' | 'error';

export interface ProfileConfig {
  type: ProfileType;
  outputDir: string;
  filename?: string;
  metadata?: Record<string, unknown>;
  uploadToR2?: boolean;
  r2Config?: R2UploadConfig;
}

export interface R2UploadConfig {
  bucket: string;
  prefix: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface ProfileSession {
  id: string;
  type: ProfileType;
  status: ProfileStatus;
  startTime: number;
  endTime?: number;
  outputPath?: string;
  metadata: Record<string, unknown>;
  error?: string;
}

export interface SamplingConfig {
  target: string;
  iterations: number;
  intervalUs: number;
  warmupIterations?: number;
}

export interface SamplingResult {
  durationMs: number;
  iterationsCompleted: number;
  sampleIntervalUs: number;
  functions: string;
  bytecodes: string;
  stackTraces: string;
  profileKeys: string[];
}

export interface PerformanceMarker {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface ProfileReport {
  session: ProfileSession;
  summary: {
    durationMs: number;
    outputSize: number;
    files: string[];
  };
  upload?: {
    success: boolean;
    key?: string;
    error?: string;
  };
}

// ==================== Storage ====================

interface ProfileStorage {
  sessions: Map<string, ProfileSession>;
  markers: Map<string, PerformanceMarker[]>;

  saveSession: (session: ProfileSession) => void;
  getSession: (id: string) => ProfileSession | undefined;
  getAllSessions: () => ProfileSession[];
  addMarker: (sessionId: string, marker: PerformanceMarker) => void;
  getMarkers: (sessionId: string) => PerformanceMarker[];
  clear: () => void;
}

function createProfileStorage(): ProfileStorage {
  const sessions = new Map<string, ProfileSession>();
  const markers = new Map<string, PerformanceMarker[]>();

  return {
    sessions,
    markers,

    saveSession(session: ProfileSession): void {
      sessions.set(session.id, session);
    },

    getSession(id: string): ProfileSession | undefined {
      return sessions.get(id);
    },

    getAllSessions(): ProfileSession[] {
      return Array.from(sessions.values()).sort((a, b) => b.startTime - a.startTime);
    },

    addMarker(sessionId: string, marker: PerformanceMarker): void {
      const sessionMarkers = markers.get(sessionId) || [];
      sessionMarkers.push(marker);
      markers.set(sessionId, sessionMarkers);
    },

    getMarkers(sessionId: string): PerformanceMarker[] {
      return markers.get(sessionId) || [];
    },

    clear(): void {
      sessions.clear();
      markers.clear();
    },
  };
}

// ==================== R2 Integration ====================

class ProfileR2Uploader {
  private config: R2UploadConfig;

  constructor(config: R2UploadConfig) {
    this.config = config;
  }

  async upload(key: string, data: Buffer | string, contentType: string): Promise<void> {
    await S3Client.write(key, data, {
      bucket: this.config.bucket,
      endpoint: this.config.endpoint,
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
      type: contentType,
    });
  }

  async uploadProfile(
    session: ProfileSession,
    outputPath: string
  ): Promise<{ success: boolean; key?: string; error?: string }> {
    try {
      const timestamp = new Date(session.startTime).toISOString().replace(/[:.]/g, '-');
      const baseKey = `${this.config.prefix}/${session.type}/${timestamp}`;

      // Upload main profile file
      const profileFile = Bun.file(outputPath);
      const profileData = await profileFile.arrayBuffer();
      const profileKey = `${baseKey}/profile.${this.getExtension(session.type)}`;

      await this.upload(profileKey, Buffer.from(profileData), this.getContentType(session.type));

      // Upload metadata
      const metadataKey = `${baseKey}/metadata.json`;
      await this.upload(metadataKey, JSON.stringify(session.metadata, null, 2), 'application/json');

      return { success: true, key: baseKey };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private getExtension(type: ProfileType): string {
    switch (type) {
      case 'cpu':
        return 'cpuprofile';
      case 'heap':
        return 'heapsnapshot';
      case 'sampling':
        return 'json';
      case 'custom':
        return 'json';
      default:
        return 'profile';
    }
  }

  private getContentType(type: ProfileType): string {
    switch (type) {
      case 'cpu':
        return 'application/json';
      case 'heap':
        return 'application/json';
      case 'sampling':
        return 'application/json';
      case 'custom':
        return 'application/json';
      default:
        return 'application/octet-stream';
    }
  }
}

// ==================== Main Profile Engine ====================

export class ProfileEngine {
  private storage: ProfileStorage;
  private currentSession: ProfileSession | null = null;
  private r2Uploader: ProfileR2Uploader | null = null;

  constructor(private defaultConfig: Partial<ProfileConfig> = {}) {
    this.storage = createProfileStorage();
  }

  // ==================== Session Management ====================

  startSession(type: ProfileType, metadata: Record<string, unknown> = {}): ProfileSession {
    if (this.currentSession?.status === 'running') {
      throw new Error(`Session ${this.currentSession.id} is already running`);
    }

    const session: ProfileSession = {
      id: `profile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      status: 'running',
      startTime: performance.now(),
      metadata: {
        ...metadata,
        bunVersion: Bun.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    this.currentSession = session;
    this.storage.saveSession(session);

    return session;
  }

  endSession(outputPath?: string, error?: string): ProfileSession {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const session = this.currentSession;
    session.endTime = performance.now();
    session.status = error ? 'error' : 'completed';
    session.outputPath = outputPath;
    session.error = error;

    this.storage.saveSession(session);
    this.currentSession = null;

    return session;
  }

  getCurrentSession(): ProfileSession | null {
    return this.currentSession;
  }

  getSession(id: string): ProfileSession | undefined {
    return this.storage.getSession(id);
  }

  getAllSessions(): ProfileSession[] {
    return this.storage.getAllSessions();
  }

  // ==================== Sampling Profile ====================

  async runSampling(
    config: SamplingConfig,
    workload?: () => Promise<void>
  ): Promise<ProfileReport> {
    const session = this.startSession('sampling', {
      target: config.target,
      iterations: config.iterations,
      intervalUs: config.intervalUs,
    });

    const outputDir = this.defaultConfig.outputDir || './profiles';
    mkdirSync(outputDir, { recursive: true });

    try {
      // Warmup
      if (config.warmupIterations) {
        for (let i = 0; i < config.warmupIterations; i++) {
          if (workload) {
            await workload();
          } else {
            await fetch(config.target);
          }
        }
      }

      // Run profiled workload
      const startedAt = performance.now();

      const profile = await jsc.profile(async () => {
        for (let i = 0; i < config.iterations; i++) {
          if (workload) {
            await workload();
          } else {
            const res = await fetch(config.target, {
              headers: { Accept: 'application/json' },
            });
            await res.text();
          }
        }
      }, config.intervalUs);

      const durationMs = Math.round((performance.now() - startedAt) * 1000) / 1000;

      // Extract profile data
      const stackTracesRaw = (profile as Record<string, unknown>).stackTraces;
      const stackTraces = Array.isArray(stackTracesRaw)
        ? stackTracesRaw.map(item => String(item)).join('\n\n')
        : String(stackTracesRaw ?? '');
      const functionsText = String((profile as Record<string, unknown>).functions ?? '');
      const bytecodesText = String((profile as Record<string, unknown>).bytecodes ?? '');

      // Write output files
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const runDir = join(outputDir, `sampling-${timestamp}`);
      mkdirSync(runDir, { recursive: true });

      await Bun.write(join(runDir, 'functions.txt'), functionsText);
      await Bun.write(join(runDir, 'bytecodes.txt'), bytecodesText);
      await Bun.write(join(runDir, 'stack-traces.txt'), stackTraces);

      const summary = {
        target: config.target,
        iterations: config.iterations,
        sampleIntervalUs: config.intervalUs,
        durationMs,
        generatedAt: new Date().toISOString(),
        profileKeys: Object.keys(profile as Record<string, unknown>),
        files: ['functions.txt', 'bytecodes.txt', 'stack-traces.txt'],
      };
      await Bun.write(join(runDir, 'summary.json'), JSON.stringify(summary, null, 2));

      // Create archive
      const archive = new Bun.Archive(
        {
          'summary.json': await Bun.file(join(runDir, 'summary.json')).text(),
          'functions.txt': functionsText,
          'bytecodes.txt': bytecodesText,
          'stack-traces.txt': stackTraces,
        },
        { compress: 'gzip', level: 9 }
      );

      const archivePath = join(runDir, 'sampling-profile.tar.gz');
      await Bun.write(archivePath, archive);

      // End session
      const completedSession = this.endSession(runDir);

      // Upload to R2 if configured
      let uploadResult;
      if (this.defaultConfig.uploadToR2 && this.defaultConfig.r2Config) {
        this.r2Uploader = new ProfileR2Uploader(this.defaultConfig.r2Config);
        uploadResult = await this.r2Uploader.uploadProfile(completedSession, archivePath);
      }

      // Calculate output size
      const archiveStat = await Bun.file(archivePath).stat();

      return {
        session: completedSession,
        summary: {
          durationMs,
          outputSize: archiveStat?.size || 0,
          files: [archivePath, join(runDir, 'summary.json')],
        },
        upload: uploadResult,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.endSession(undefined, errorMessage);
      throw error;
    }
  }

  // ==================== Performance Markers ====================

  mark(name: string, metadata?: Record<string, unknown>): PerformanceMarker {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const marker: PerformanceMarker = {
      name,
      startTime: performance.now(),
      metadata,
    };

    this.storage.addMarker(this.currentSession.id, marker);
    return marker;
  }

  measure(name: string, startMarker?: string): PerformanceMarker {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const endTime = performance.now();

    // If start marker provided, find it
    let startTime = endTime;
    if (startMarker) {
      const markers = this.storage.getMarkers(this.currentSession.id);
      const marker = markers.find(m => m.name === startMarker);
      if (marker) {
        startTime = marker.startTime;
      }
    }

    const marker: PerformanceMarker = {
      name,
      startTime,
      endTime,
      duration: endTime - startTime,
    };

    this.storage.addMarker(this.currentSession.id, marker);
    return marker;
  }

  getMarkers(sessionId?: string): PerformanceMarker[] {
    const id = sessionId || this.currentSession?.id;
    if (!id) return [];
    return this.storage.getMarkers(id);
  }

  // ==================== Utilities ====================

  clear(): void {
    this.storage.clear();
    this.currentSession = null;
  }

  formatReport(report: ProfileReport): string {
    const lines = [
      '═══════════════════════════════════════════════════════════',
      '                    PROFILE REPORT                          ',
      '═══════════════════════════════════════════════════════════',
      '',
      `Session ID:    ${report.session.id}`,
      `Type:          ${report.session.type}`,
      `Status:        ${report.session.status}`,
      `Duration:      ${(report.summary.durationMs / 1000).toFixed(2)}s`,
      `Output Size:   ${(report.summary.outputSize / 1024).toFixed(1)} KB`,
      '',
      'Files Generated:',
      ...report.summary.files.map(f => `  • ${f}`),
      '',
    ];

    if (report.upload) {
      lines.push('R2 Upload:', `  Success: ${report.upload.success ? '✓' : '✗'}`);
      if (report.upload.key) {
        lines.push(`  Key: ${report.upload.key}`);
      }
      if (report.upload.error) {
        lines.push(`  Error: ${report.upload.error}`);
      }
      lines.push('');
    }

    if (report.session.error) {
      lines.push('Error:', `  ${report.session.error}`, '');
    }

    lines.push('═══════════════════════════════════════════════════════════');

    return lines.join('\n');
  }
}

// ==================== Factory Functions ====================

export function createProfileEngine(config?: Partial<ProfileConfig>): ProfileEngine {
  return new ProfileEngine(config);
}

export function resolveR2ConfigFromEnv(): R2UploadConfig | null {
  const bucket = Bun.env.R2_BUCKET || Bun.env.R2_BUCKET_NAME;
  const accountId = Bun.env.R2_ACCOUNT_ID;
  const endpoint =
    Bun.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : null);
  const accessKeyId = Bun.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = Bun.env.R2_SECRET_ACCESS_KEY;
  const prefix = Bun.env.R2_PREFIX || 'profiles';

  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    bucket,
    prefix,
    endpoint,
    accessKeyId,
    secretAccessKey,
  };
}

// ==================== CLI Helpers ====================

export function parseProfileArgs(): {
  type: ProfileType;
  target: string;
  iterations: number;
  intervalUs: number;
  outputDir: string;
  uploadR2: boolean;
} {
  const args = Bun.argv.slice(2);

  const getArg = (name: string, defaultValue: string): string => {
    const prefix = `--${name}=`;
    const found = args.find(a => a.startsWith(prefix));
    return found ? found.slice(prefix.length) : defaultValue;
  };

  const hasFlag = (name: string): boolean => args.includes(`--${name}`);

  return {
    type: getArg('type', 'sampling') as ProfileType,
    target: getArg('target', 'http://localhost:3001/ops/status'),
    iterations: parseInt(getArg('iterations', '200'), 10),
    intervalUs: parseInt(getArg('interval-us', '100'), 10),
    outputDir: getArg('output', './profiles'),
    uploadR2: hasFlag('upload-r2') || getArg('upload-r2', 'false') === 'true',
  };
}

export default ProfileEngine;
