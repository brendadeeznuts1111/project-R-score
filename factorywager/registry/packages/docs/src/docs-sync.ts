#!/usr/bin/env bun
/**
 * 🔄 Documentation Sync Service
 * 
 * Syncs cached documentation, user preferences, and reading progress across devices.
 * Uses R2 as the central sync backend.
 */

import { styled, FW_COLORS } from '@factorywager/theme';

export interface UserPreferences {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  readingWidth: 'narrow' | 'medium' | 'wide';
  codeTheme: string;
  autoSync: boolean;
  offlineMode: boolean;
  cacheRetention: number; // days
}

export interface ReadingProgress {
  userId: string;
  packageName: string;
  version: string;
  scrollPosition: number;
  lastReadSection?: string;
  bookmarks: Array<{
    id: string;
    title: string;
    position: number;
    createdAt: string;
  }>;
  lastReadAt: string;
}

export interface DocSet {
  id: string;
  userId: string;
  name: string;
  description?: string;
  packages: string[];
  createdAt: string;
  updatedAt: string;
  shared?: boolean;
  shareUrl?: string;
}

export interface SyncData {
  preferences: UserPreferences;
  progress: ReadingProgress[];
  docSets: DocSet[];
  cachedPackages: string[];
  lastSyncedAt: string;
  deviceId: string;
}

export class DocumentationSync {
  private r2Bucket: string;
  private baseUrl: string;
  private deviceId: string;

  constructor(
    private userId: string,
    config?: {
      bucketName?: string;
      accountId?: string;
    }
  ) {
    this.r2Bucket = config?.bucketName || process.env.R2_DOCS_BUCKET || 'docs-sync';
    const accountId = config?.accountId || process.env.R2_ACCOUNT_ID || '';
    this.baseUrl = `https://${accountId}.r2.cloudflarestorage.com`;
    this.deviceId = this.getDeviceId();
  }

  /**
   * Get or create device ID
   */
  private getDeviceId(): string {
    // In a real app, store this in localStorage or similar
    return crypto.randomUUID();
  }

  /**
   * Get auth header for R2 requests
   */
  private getAuthHeader(): string {
    const accessKey = process.env.R2_ACCESS_KEY_ID || '';
    const secretKey = process.env.R2_SECRET_ACCESS_KEY || '';
    return `Basic ${btoa(`${accessKey}:${secretKey}`)}`;
  }

  /**
   * Sync data to R2
   */
  async syncToCloud(data: Partial<SyncData>): Promise<boolean> {
    const syncData: SyncData = {
      preferences: data.preferences || await this.getDefaultPreferences(),
      progress: data.progress || [],
      docSets: data.docSets || [],
      cachedPackages: data.cachedPackages || [],
      lastSyncedAt: new Date().toISOString(),
      deviceId: this.deviceId,
    };

    const key = `sync/${this.userId}/data.json`;

    try {
      const response = await fetch(`${this.baseUrl}/${this.r2Bucket}/${key}`, {
        method: 'PUT',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
          'x-amz-meta-device': this.deviceId,
          'x-amz-meta-synced': syncData.lastSyncedAt,
        },
        body: JSON.stringify(syncData, null, 2),
      });

      if (response.ok) {
        console.log(styled(`✅ Synced to cloud`, 'success'));
        return true;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error(styled(`❌ Sync failed: ${error.message}`, 'error'));
      return false;
    }
  }

  /**
   * Sync data from R2
   */
  async syncFromCloud(): Promise<SyncData | null> {
    const key = `sync/${this.userId}/data.json`;

    try {
      const response = await fetch(`${this.baseUrl}/${this.r2Bucket}/${key}`, {
        headers: {
          'Authorization': this.getAuthHeader(),
        },
      });

      if (response.status === 404) {
        console.log(styled(`ℹ️ No sync data found`, 'muted'));
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: SyncData = await response.json();
      console.log(styled(`✅ Synced from cloud (${data.deviceId})`, 'success'));
      return data;
    } catch (error) {
      console.error(styled(`❌ Sync failed: ${error.message}`, 'error'));
      return null;
    }
  }

  /**
   * Save reading progress
   */
  async saveProgress(progress: ReadingProgress): Promise<boolean> {
    const key = `progress/${this.userId}/${progress.packageName}@${progress.version}.json`;

    try {
      const response = await fetch(`${this.baseUrl}/${this.r2Bucket}/${key}`, {
        method: 'PUT',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(progress, null, 2),
      });

      return response.ok;
    } catch (error) {
      console.error(styled(`❌ Failed to save progress: ${error.message}`, 'error'));
      return false;
    }
  }

  /**
   * Get reading progress
   */
  async getProgress(packageName: string, version: string): Promise<ReadingProgress | null> {
    const key = `progress/${this.userId}/${packageName}@${version}.json`;

    try {
      const response = await fetch(`${this.baseUrl}/${this.r2Bucket}/${key}`, {
        headers: {
          'Authorization': this.getAuthHeader(),
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(styled(`❌ Failed to get progress: ${error.message}`, 'error'));
      return null;
    }
  }

  /**
   * Create a documentation set
   */
  async createDocSet(name: string, packages: string[], description?: string): Promise<DocSet> {
    const docSet: DocSet = {
      id: crypto.randomUUID(),
      userId: this.userId,
      name,
      description,
      packages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const key = `docsets/${this.userId}/${docSet.id}.json`;

    try {
      await fetch(`${this.baseUrl}/${this.r2Bucket}/${key}`, {
        method: 'PUT',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(docSet, null, 2),
      });

      return docSet;
    } catch (error) {
      console.error(styled(`❌ Failed to create doc set: ${error.message}`, 'error'));
      throw error;
    }
  }

  /**
   * Get all doc sets for user
   */
  async getDocSets(): Promise<DocSet[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.r2Bucket}?list-type=2&prefix=docsets/${this.userId}/`,
        {
          headers: {
            'Authorization': this.getAuthHeader(),
          },
        }
      );

      if (!response.ok) {
        return [];
      }

      const xml = await response.text();
      const keys = this.parseObjectKeys(xml);

      const docSets: DocSet[] = [];
      for (const key of keys) {
        const dsResponse = await fetch(`${this.baseUrl}/${this.r2Bucket}/${key}`, {
          headers: { 'Authorization': this.getAuthHeader() },
        });
        if (dsResponse.ok) {
          docSets.push(await dsResponse.json());
        }
      }

      return docSets;
    } catch (error) {
      console.error(styled(`❌ Failed to get doc sets: ${error.message}`, 'error'));
      return [];
    }
  }

  /**
   * Share a doc set
   */
  async shareDocSet(docSetId: string): Promise<string | null> {
    try {
      const docSets = await this.getDocSets();
      const docSet = docSets.find(ds => ds.id === docSetId);
      
      if (!docSet) return null;

      // Generate share URL
      const shareToken = btoa(`${this.userId}:${docSetId}`).replace(/=/g, '');
      const shareUrl = `https://docs.factory-wager.com/share/${shareToken}`;

      // Update doc set
      docSet.shared = true;
      docSet.shareUrl = shareUrl;
      docSet.updatedAt = new Date().toISOString();

      // Save share metadata
      const key = `shares/${shareToken}.json`;
      await fetch(`${this.baseUrl}/${this.r2Bucket}/${key}`, {
        method: 'PUT',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          docSetId,
          userId: this.userId,
          createdAt: new Date().toISOString(),
        }),
      });

      // Update doc set
      const dsKey = `docsets/${this.userId}/${docSetId}.json`;
      await fetch(`${this.baseUrl}/${this.r2Bucket}/${dsKey}`, {
        method: 'PUT',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(docSet, null, 2),
      });

      return shareUrl;
    } catch (error) {
      console.error(styled(`❌ Failed to share doc set: ${error.message}`, 'error'));
      return null;
    }
  }

  /**
   * Get default preferences
   */
  private async getDefaultPreferences(): Promise<UserPreferences> {
    return {
      userId: this.userId,
      theme: 'system',
      fontSize: 16,
      readingWidth: 'medium',
      codeTheme: 'github-dark',
      autoSync: true,
      offlineMode: false,
      cacheRetention: 30,
    };
  }

  /**
   * Parse object keys from S3 XML response
   */
  private parseObjectKeys(xml: string): string[] {
    const keys: string[] = [];
    const regex = /<Key>([^<]+)<\/Key>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      keys.push(match[1]);
    }
    return keys;
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    lastSynced: string | null;
    deviceCount: number;
    totalPackages: number;
  }> {
    try {
      const data = await this.syncFromCloud();
      
      if (!data) {
        return { lastSynced: null, deviceCount: 0, totalPackages: 0 };
      }

      return {
        lastSynced: data.lastSyncedAt,
        deviceCount: 1, // Would track multiple devices in production
        totalPackages: data.cachedPackages.length,
      };
    } catch {
      return { lastSynced: null, deviceCount: 0, totalPackages: 0 };
    }
  }
}

// CLI interface
if (import.meta.main) {
  const userId = process.env.USER_ID || 'anonymous';
  const sync = new DocumentationSync(userId);
  const args = process.argv.slice(2);
  const command = args[0];

  console.log(styled('🔄 Documentation Sync', 'accent'));
  console.log(styled('=====================', 'accent'));

  switch (command) {
    case 'sync': {
      const data: Partial<SyncData> = {
        preferences: {
          userId,
          theme: 'dark',
          fontSize: 16,
          readingWidth: 'medium',
          codeTheme: 'github-dark',
          autoSync: true,
          offlineMode: false,
          cacheRetention: 30,
        },
        cachedPackages: ['lodash', 'express', 'react'],
      };

      const success = await sync.syncToCloud(data);
      console.log(styled(`\n${success ? '✅' : '❌'} Sync ${success ? 'successful' : 'failed'}`, success ? 'success' : 'error'));
      break;
    }

    case 'status': {
      const status = await sync.getSyncStatus();
      console.log(styled('\n📊 Sync Status:', 'info'));
      console.log(styled(`  Last synced: ${status.lastSynced || 'Never'}`, 'muted'));
      console.log(styled(`  Devices: ${status.deviceCount}`, 'muted'));
      console.log(styled(`  Packages: ${status.totalPackages}`, 'muted'));
      break;
    }

    case 'docset:create': {
      const name = args[1];
      const packages = args[2]?.split(',') || [];
      
      if (!name) {
        console.error(styled('Usage: docs-sync docset:create <name> <pkg1,pkg2,...>', 'error'));
        process.exit(1);
      }

      const docSet = await sync.createDocSet(name, packages);
      console.log(styled(`\n✅ Created doc set: ${docSet.name}`, 'success'));
      console.log(styled(`   ID: ${docSet.id}`, 'muted'));
      console.log(styled(`   Packages: ${packages.length}`, 'muted'));
      break;
    }

    case 'docset:list': {
      const docSets = await sync.getDocSets();
      console.log(styled(`\n📚 Documentation Sets (${docSets.length}):`, 'info'));
      
      for (const ds of docSets) {
        const sharedBadge = ds.shared ? styled(' [shared]', 'success') : '';
        console.log(styled(`\n  📁 ${ds.name}${sharedBadge}`, 'muted'));
        console.log(styled(`     Packages: ${ds.packages.join(', ')}`, 'muted'));
        if (ds.shareUrl) {
          console.log(styled(`     URL: ${ds.shareUrl}`, 'info'));
        }
      }
      break;
    }

    case 'docset:share': {
      const docSetId = args[1];
      if (!docSetId) {
        console.error(styled('Usage: docs-sync docset:share <docset-id>', 'error'));
        process.exit(1);
      }

      const shareUrl = await sync.shareDocSet(docSetId);
      if (shareUrl) {
        console.log(styled(`\n🔗 Share URL:`, 'success'));
        console.log(styled(`   ${shareUrl}`, 'info'));
      } else {
        console.error(styled('❌ Failed to create share', 'error'));
      }
      break;
    }

    default:
      console.log(styled('\nCommands:', 'info'));
      console.log(styled('  sync                    Sync to cloud', 'muted'));
      console.log(styled('  status                  Show sync status', 'muted'));
      console.log(styled('  docset:create <n> <pkgs> Create doc set', 'muted'));
      console.log(styled('  docset:list             List doc sets', 'muted'));
      console.log(styled('  docset:share <id>       Share doc set', 'muted'));
  }
}
