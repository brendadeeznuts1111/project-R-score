// lib/mcp/r2-wiki-storage.ts - R2 wiki storage integration with versioning and backups

import { WikiTemplate, WikiGenerationResult } from './wiki-generator-mcp';
import { r2MCPIntegration } from './r2-integration';
import { masterTokenManager } from '../security/master-token';
import { Subprocess } from 'bun';
import { join } from 'path';

interface CompressionIPCRequest {
  id: string;
  action: 'compress' | 'decompress';
  data: string;
}

interface CompressionIPCResponse {
  id: string;
  result?: string;
  error?: string;
}

const COMPRESSION_WORKER_PATH = join(import.meta.dir, 'compression-worker.ts');
const IPC_TIMEOUT_MS = 10_000;

export interface WikiStorageConfig {
  bucket: string;
  namespace: string;
  enableVersioning: boolean;
  enableBackups: boolean;
  backupInterval: number; // in milliseconds
  maxVersions: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export interface WikiDocument {
  id: string;
  templateName: string;
  content: string;
  metadata: {
    title: string;
    description?: string;
    tags?: string[];
    category?: string;
    author?: string;
    createdAt: string;
    updatedAt: string;
    version: number;
  };
  versions: WikiDocumentVersion[];
  backups?: WikiDocumentBackup[];
}

export interface WikiDocumentVersion {
  version: number;
  content: string;
  createdAt: string;
  author?: string;
  changeDescription?: string;
  size: number;
  checksum: string;
}

export interface WikiDocumentBackup {
  id: string;
  documentId: string;
  content: string;
  createdAt: string;
  size: number;
  checksum: string;
  compressed: boolean;
  encrypted: boolean;
}

export interface StorageStats {
  totalDocuments: number;
  totalVersions: number;
  totalBackups: number;
  storageUsed: number; // in bytes
  averageDocumentSize: number;
  lastBackupTime?: string;
  compressionRatio?: number;
}

/**
 * R2 Wiki Storage with versioning, backups, and advanced features
 */
export class R2WikiStorage {
  private config: WikiStorageConfig;
  private backupTimer?: NodeJS.Timeout;
  private compressionWorker?: Subprocess;
  private pendingRequests = new Map<string, { resolve: (v: string) => void; reject: (e: Error) => void }>();
  private requestCounter = 0;
  private encryptionKey?: string;

  constructor(config: Partial<WikiStorageConfig> = {}) {
    this.config = {
      bucket: 'wiki-storage',
      namespace: 'default',
      enableVersioning: true,
      enableBackups: true,
      backupInterval: 24 * 60 * 60 * 1000, // 24 hours
      maxVersions: 50,
      compressionEnabled: true,
      encryptionEnabled: false,
      ...config
    };

    if (this.config.encryptionEnabled) {
      this.encryptionKey = masterTokenManager.getEncryptionKey();
    }

    if (this.config.enableBackups) {
      this.startBackupScheduler();
    }

    if (this.config.compressionEnabled) {
      this.initializeCompressionWorker();
    }
  }

  /**
   * Store a wiki document with versioning
   */
  public async storeDocument(
    id: string,
    templateName: string,
    content: string,
    metadata: Partial<WikiDocument['metadata']> = {},
    changeDescription?: string
  ): Promise<WikiDocument> {
    const now = new Date().toISOString();
    const checksum = this.calculateChecksum(content);

    // Get existing document or create new one
    let document = await this.getDocument(id);
    
    if (!document) {
      document = {
        id,
        templateName,
        content,
        metadata: {
          title: metadata.title || id,
          description: metadata.description,
          tags: metadata.tags || [],
          category: metadata.category,
          author: metadata.author,
          createdAt: now,
          updatedAt: now,
          version: 1
        },
        versions: []
      };
    } else {
      // Check if content has changed
      const latestVersion = document.versions[document.versions.length - 1];
      if (latestVersion && latestVersion.checksum === checksum) {
        return document; // No changes detected
      }

      document.content = content;
      document.metadata.updatedAt = now;
      document.metadata.version = (document.metadata.version || 0) + 1;
    }

    // Create new version
    const version: WikiDocumentVersion = {
      version: document.metadata.version,
      content,
      createdAt: now,
      author: metadata.author,
      changeDescription,
      size: content.length,
      checksum
    };

    document.versions.push(version);

    // Limit versions if maxVersions is set
    if (this.config.maxVersions > 0 && document.versions.length > this.config.maxVersions) {
      const excessVersions = document.versions.splice(0, document.versions.length - this.config.maxVersions);
      
      // Clean up old versions from storage
      for (const oldVersion of excessVersions) {
        await this.deleteVersionFromStorage(id, oldVersion.version);
      }
    }

    // Store document and versions
    await this.storeDocumentInStorage(document);
    
    // Store individual version
    await this.storeVersionInStorage(id, version);

    return document;
  }

  /**
   * Retrieve a wiki document
   */
  public async getDocument(id: string, version?: number): Promise<WikiDocument | null> {
    try {
      const key = this.getDocumentKey(id);
      const stored = await r2MCPIntegration.get(key);
      
      if (!stored) return null;

      let document: WikiDocument = JSON.parse(stored);
      
      // If specific version requested, load that version content
      if (version && version !== document.metadata.version) {
        const versionData = await this.getVersion(id, version);
        if (versionData) {
          document.content = versionData.content;
        }
      }

      return document;
    } catch (error) {
      console.error(`Failed to get document ${id}:`, error);
      return null;
    }
  }

  /**
   * Get a specific version of a document
   */
  public async getVersion(documentId: string, version: number): Promise<WikiDocumentVersion | null> {
    try {
      const key = this.getVersionKey(documentId, version);
      const stored = await r2MCPIntegration.get(key);
      
      if (!stored) return null;

      return JSON.parse(stored);
    } catch (error) {
      console.error(`Failed to get version ${version} of document ${documentId}:`, error);
      return null;
    }
  }

  /**
   * List all documents with optional filtering
   */
  public async listDocuments(options: {
    templateName?: string;
    category?: string;
    tags?: string[];
    author?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<WikiDocument[]> {
    try {
      const prefix = this.getDocumentPrefix();
      const objects = await r2MCPIntegration.list(prefix);
      
      let documents: WikiDocument[] = [];
      
      for (const object of objects) {
        if (object.key.endsWith('/version')) continue; // Skip version files
        
        const stored = await r2MCPIntegration.get(object.key);
        if (stored) {
          const document: WikiDocument = JSON.parse(stored);
          documents.push(document);
        }
      }

      // Apply filters
      if (options.templateName) {
        documents = documents.filter(doc => doc.templateName === options.templateName);
      }
      
      if (options.category) {
        documents = documents.filter(doc => doc.metadata.category === options.category);
      }
      
      if (options.tags && options.tags.length > 0) {
        documents = documents.filter(doc => 
          options.tags!.some(tag => doc.metadata.tags?.includes(tag))
        );
      }
      
      if (options.author) {
        documents = documents.filter(doc => doc.metadata.author === options.author);
      }

      // Sort by updated date
      documents.sort((a, b) => 
        new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime()
      );

      // Apply pagination
      const offset = options.offset || 0;
      const limit = options.limit || documents.length;
      
      return documents.slice(offset, offset + limit);
    } catch (error) {
      console.error('Failed to list documents:', error);
      return [];
    }
  }

  /**
   * Delete a document and all its versions
   */
  public async deleteDocument(id: string): Promise<boolean> {
    try {
      const document = await this.getDocument(id);
      if (!document) return false;

      // Delete all versions
      for (const version of document.versions) {
        await this.deleteVersionFromStorage(id, version.version);
      }

      // Delete backups
      if (document.backups) {
        for (const backup of document.backups) {
          await this.deleteBackupFromStorage(backup.id);
        }
      }

      // Delete main document
      const key = this.getDocumentKey(id);
      await r2MCPIntegration.delete(key);

      return true;
    } catch (error) {
      console.error(`Failed to delete document ${id}:`, error);
      return false;
    }
  }

  /**
   * Create a backup of a document
   */
  public async createBackup(documentId: string): Promise<WikiDocumentBackup | null> {
    try {
      const document = await this.getDocument(documentId);
      if (!document) return null;

      let content = document.content;
      let compressed = false;
      let encrypted = false;

      // Apply compression if enabled
      if (this.config.compressionEnabled) {
        content = await this.compressContent(content);
        compressed = true;
      }

      // Apply encryption if enabled
      if (this.config.encryptionEnabled && this.encryptionKey) {
        content = await this.encryptContent(content, this.encryptionKey);
        encrypted = true;
      }

      const backup: WikiDocumentBackup = {
        id: `backup_${documentId}_${Date.now()}`,
        documentId,
        content,
        createdAt: new Date().toISOString(),
        size: content.length,
        checksum: this.calculateChecksum(content),
        compressed,
        encrypted
      };

      // Store backup
      await this.storeBackupInStorage(backup);

      // Update document with backup reference
      if (!document.backups) document.backups = [];
      document.backups.push(backup);
      
      // Limit backups (keep last 10)
      if (document.backups.length > 10) {
        const oldBackups = document.backups.splice(0, document.backups.length - 10);
        for (const oldBackup of oldBackups) {
          await this.deleteBackupFromStorage(oldBackup.id);
        }
      }

      await this.storeDocumentInStorage(document);

      return backup;
    } catch (error) {
      console.error(`Failed to create backup for document ${documentId}:`, error);
      return null;
    }
  }

  /**
   * Restore a document from backup
   */
  public async restoreFromBackup(backupId: string): Promise<WikiDocument | null> {
    try {
      const backup = await this.getBackup(backupId);
      if (!backup) return null;

      let content = backup.content;

      // Decrypt if needed
      if (backup.encrypted && this.encryptionKey) {
        content = await this.decryptContent(content, this.encryptionKey);
      }

      // Decompress if needed
      if (backup.compressed) {
        content = await this.decompressContent(content);
      }

      // Restore document with backup content
      const document = await this.storeDocument(
        backup.documentId,
        '', // template name will be preserved in existing document
        content,
        {
          updatedAt: new Date().toISOString(),
          author: 'System Restore'
        },
        `Restored from backup ${backupId}`
      );

      return document;
    } catch (error) {
      console.error(`Failed to restore from backup ${backupId}:`, error);
      return null;
    }
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<StorageStats> {
    try {
      const documents = await this.listDocuments();
      let totalVersions = 0;
      let totalBackups = 0;
      let storageUsed = 0;

      for (const document of documents) {
        totalVersions += document.versions.length;
        totalBackups += document.backups?.length || 0;
        storageUsed += document.content.length;
        
        // Add version sizes
        for (const version of document.versions) {
          storageUsed += version.size;
        }
        
        // Add backup sizes
        if (document.backups) {
          for (const backup of document.backups) {
            storageUsed += backup.size;
          }
        }
      }

      return {
        totalDocuments: documents.length,
        totalVersions,
        totalBackups,
        storageUsed,
        averageDocumentSize: documents.length > 0 ? storageUsed / documents.length : 0
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalDocuments: 0,
        totalVersions: 0,
        totalBackups: 0,
        storageUsed: 0,
        averageDocumentSize: 0
      };
    }
  }

  /**
   * Start automatic backup scheduler
   */
  private startBackupScheduler(): void {
    this.backupTimer = setInterval(async () => {
      try {
        await this.performScheduledBackup();
      } catch (error) {
        console.error('Scheduled backup failed:', error);
      }
    }, this.config.backupInterval);
  }

  /**
   * Perform scheduled backup of all documents
   */
  private async performScheduledBackup(): Promise<void> {
    const documents = await this.listDocuments();
    
    for (const document of documents) {
      // Only backup documents updated since last backup
      const lastBackup = document.backups?.[document.backups.length - 1];
      const lastBackupTime = lastBackup ? new Date(lastBackup.createdAt).getTime() : 0;
      const documentUpdateTime = new Date(document.metadata.updatedAt).getTime();
      
      if (documentUpdateTime > lastBackupTime) {
        await this.createBackup(document.id);
      }
    }
  }

  /**
   * Initialize compression worker
   */
  private initializeCompressionWorker(): void {
    try {
      this.compressionWorker = Bun.spawn(['bun', COMPRESSION_WORKER_PATH], {
        ipc: (message: CompressionIPCResponse) => {
          const pending = this.pendingRequests.get(message.id);
          if (!pending) return;
          this.pendingRequests.delete(message.id);
          if (message.error) {
            pending.reject(new Error(message.error));
          } else {
            pending.resolve(message.result!);
          }
        },
        stdio: ['ignore', 'ignore', 'ignore'],
      });

      // Auto-respawn on unexpected exit
      this.compressionWorker.exited.then(() => {
        this.compressionWorker = undefined;
        // Reject any in-flight requests
        for (const [id, pending] of this.pendingRequests) {
          pending.reject(new Error('Compression worker exited'));
          this.pendingRequests.delete(id);
        }
      });
    } catch (err) {
      console.error('Failed to spawn compression worker:', err);
      this.compressionWorker = undefined;
    }
  }

  private sendToWorker(action: 'compress' | 'decompress', data: string): Promise<string> {
    // Lazy respawn if worker is dead
    if (!this.compressionWorker) {
      this.initializeCompressionWorker();
    }

    if (!this.compressionWorker) {
      // Worker failed to spawn — caller should use sync fallback
      return Promise.reject(new Error('Compression worker unavailable'));
    }

    const id = `req_${++this.requestCounter}`;

    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Compression worker IPC timeout'));
      }, IPC_TIMEOUT_MS);

      this.pendingRequests.set(id, {
        resolve: (v: string) => { clearTimeout(timer); resolve(v); },
        reject: (e: Error) => { clearTimeout(timer); reject(e); },
      });

      this.compressionWorker!.send({ id, action, data } satisfies CompressionIPCRequest);
    });
  }

  /**
   * Compress content using gzip
   */
  private async compressContent(content: string): Promise<string> {
    try {
      return await this.sendToWorker('compress', content);
    } catch {
      // Sync fallback
      const compressed = Bun.gzipSync(content);
      return Buffer.from(compressed).toString('base64');
    }
  }

  /**
   * Decompress content
   */
  private async decompressContent(compressedContent: string): Promise<string> {
    try {
      return await this.sendToWorker('decompress', compressedContent);
    } catch {
      // Sync fallback
      const compressed = Buffer.from(compressedContent, 'base64');
      const decompressed = Bun.gunzipSync(compressed);
      return Buffer.from(decompressed).toString();
    }
  }

  /**
   * Encrypt content
   */
  private async encryptContent(content: string, key: string): Promise<string> {
    // Implement encryption using the master token manager
    return masterTokenManager.encrypt(content, key);
  }

  /**
   * Decrypt content
   */
  private async decryptContent(encryptedContent: string, key: string): Promise<string> {
    return masterTokenManager.decrypt(encryptedContent, key);
  }

  /**
   * Calculate checksum for content integrity
   */
  private calculateChecksum(content: string): string {
    // Use Bun's built-in crypto for checksum calculation
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = Bun.CryptoHasher('sha256').update(data).digest();
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Helper methods for key generation
   */
  private getDocumentKey(id: string): string {
    return `${this.config.namespace}/${this.config.bucket}/documents/${id}`;
  }

  private getVersionKey(documentId: string, version: number): string {
    return `${this.config.namespace}/${this.config.bucket}/documents/${documentId}/versions/${version}`;
  }

  private getBackupKey(backupId: string): string {
    return `${this.config.namespace}/${this.config.bucket}/backups/${backupId}`;
  }

  private getDocumentPrefix(): string {
    return `${this.config.namespace}/${this.config.bucket}/documents/`;
  }

  /**
   * Storage operations
   */
  private async storeDocumentInStorage(document: WikiDocument): Promise<void> {
    const key = this.getDocumentKey(document.id);
    await r2MCPIntegration.set(key, JSON.stringify(document));
  }

  private async storeVersionInStorage(documentId: string, version: WikiDocumentVersion): Promise<void> {
    const key = this.getVersionKey(documentId, version.version);
    await r2MCPIntegration.set(key, JSON.stringify(version));
  }

  private async storeBackupInStorage(backup: WikiDocumentBackup): Promise<void> {
    const key = this.getBackupKey(backup.id);
    await r2MCPIntegration.set(key, JSON.stringify(backup));
  }

  private async deleteVersionFromStorage(documentId: string, version: number): Promise<void> {
    const key = this.getVersionKey(documentId, version);
    await r2MCPIntegration.delete(key);
  }

  private async deleteBackupFromStorage(backupId: string): Promise<void> {
    const key = this.getBackupKey(backupId);
    await r2MCPIntegration.delete(key);
  }

  private async getBackup(backupId: string): Promise<WikiDocumentBackup | null> {
    try {
      const key = this.getBackupKey(backupId);
      const stored = await r2MCPIntegration.get(key);
      
      if (!stored) return null;
      return JSON.parse(stored);
    } catch (error) {
      console.error(`Failed to get backup ${backupId}:`, error);
      return null;
    }
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = undefined;
    }

    if (this.compressionWorker) {
      this.compressionWorker.kill();
      await this.compressionWorker.exited;
      this.compressionWorker = undefined;
    }

    // Reject any remaining pending requests
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error('Storage cleanup'));
      this.pendingRequests.delete(id);
    }
  }
}

export default R2WikiStorage;
