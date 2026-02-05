import { env, secrets } from 'bun';
import { VersionGraph } from './version-graph';

export type VersionMetadata = {
  author?: string;
  description?: string;
  level?: 'STANDARD' | 'HIGH' | 'CRITICAL';
  tags?: Record<string, string>;
};

export type VersionNode = {
  id: string;
  version: string;
  timestamp: string;
  author?: string;
  description?: string;
  hash: string;
  previous?: string;
  metadata?: VersionMetadata;
  action: 'SET' | 'ROLLBACK' | 'ROTATE';
  archivedKey?: string;
  visual?: Record<string, string>;
};

const FW_COLORS: Record<string, string> = {
  STANDARD: '#3B82F6',
  HIGH: '#F59E0B',
  CRITICAL: '#EF4444'
};

export class VersionedSecretManager {
  private graph = new VersionGraph();
  private cache = new Map<string, VersionNode[]>();

  private async getMetadata(key: string) {
    try {
      return await secrets.metadata(key);
    } catch {
      return { tags: {} } as any;
    }
  }

  private generateVersion(_key: string, previous?: string, metadata?: VersionMetadata) {
    if (metadata?.tags?.['factorywager:version']) return metadata.tags['factorywager:version'];
    if (previous && previous.startsWith('v')) {
      const parts = previous.replace(/^v/, '').split('.').map(Number);
      if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
        return `v${parts[0]}.${parts[1]}.${parts[2] + 1}`;
      }
    }
    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12);
    return `v${stamp}`;
  }

  async set(key: string, value: string, metadata: VersionMetadata = {}) {
    const current = await this.getWithVersion(key);
    const newVersion = this.generateVersion(key, current?.version, metadata);
    const versionedKey = `${key}@${newVersion}`;

    await secrets.set(versionedKey, value, {
      description: metadata.description || `Version ${newVersion} of ${key}`,
      tags: {
        ...metadata.tags,
        'factorywager:version': newVersion,
        'factorywager:previous': current?.version || 'none',
        'factorywager:author': metadata.author || 'system',
        'visual:color': FW_COLORS[metadata.level || 'STANDARD']
      }
    });

    const node: VersionNode = {
      id: `v${Date.now()}`,
      version: newVersion,
      timestamp: new Date().toISOString(),
      author: metadata.author,
      description: metadata.description,
      hash: Bun.hash.sha256(value).toString('hex'),
      previous: current?.version,
      metadata,
      action: 'SET'
    };

    await this.graph.update(key, node);

    await secrets.set(key, value, {
      description: `Current: ${newVersion} - ${metadata.description || 'No description'}`,
      tags: { 'factorywager:current-version': newVersion }
    });

    return { version: newVersion, key: versionedKey };
  }

  async getWithVersion(key: string, version?: string) {
    const target = version || 'current';

    if (target === 'current') {
      const value = await secrets.get(key);
      const metadata = await this.getMetadata(key);
      return { value, version: metadata.tags?.['factorywager:current-version'], metadata };
    }

    const versionedKey = `${key}@${version}`;
    try {
      const value = await secrets.get(versionedKey);
      const metadata = await this.getMetadata(versionedKey);
      return { value, version, metadata };
    } catch {
      const history = await this.getHistory(key, 100);
      const found = history.find((v) => v.version === version);
      if (found?.archivedKey && env.R2_BUCKET) {
        const archived = await env.R2_BUCKET.get(found.archivedKey);
        return { value: await archived?.text(), version, metadata: found };
      }
      throw new Error(`Version ${version} not found for ${key}`);
    }
  }

  async rollback(key: string, targetVersion: string, options: { confirm?: boolean; reason?: string; dryRun?: boolean } = {}) {
    const { confirm = true, reason = 'Manual rollback', dryRun = false } = options;
    const target = await this.getWithVersion(key, targetVersion);
    const current = await this.getWithVersion(key);

    const diff = this.generateDiff(current.value, target.value);

    if (confirm && !dryRun) {
      // Caller responsible for confirmation UI
    }

    if (!dryRun) {
      await secrets.set(key, target.value, {
        description: `Rollback to ${targetVersion}: ${reason}`,
        tags: {
          'factorywager:current-version': targetVersion,
          'factorywager:rollback-from': current.version,
          'factorywager:rollback-reason': reason,
          'factorywager:rollback-timestamp': new Date().toISOString()
        }
      });

      const node: VersionNode = {
        id: `rb${Date.now()}`,
        version: targetVersion,
        timestamp: new Date().toISOString(),
        author: 'rollback',
        description: reason,
        hash: Bun.hash.sha256(target.value).toString('hex'),
        previous: current.version,
        action: 'ROLLBACK'
      };

      await this.graph.update(key, node);
    }

    return { success: !dryRun, dryRun, from: current.version, to: targetVersion, diff, reason };
  }

  async getHistory(key: string, limit = 10) {
    if (!this.cache.has(key)) {
      const history = await this.graph.getHistory(key, limit * 5);
      this.cache.set(key, history);
    }
    const list = this.cache.get(key) || [];
    return list.slice(0, limit);
  }

  async visualize(key: string) {
    return this.graph.generateVisualization(key);
  }

  private generateDiff(oldVal: string, newVal: string) {
    const oldHash = Bun.hash.sha256(oldVal).toString('hex');
    const newHash = Bun.hash.sha256(newVal).toString('hex');
    return {
      changed: oldHash !== newHash,
      lengthChange: newVal.length - oldVal.length,
      oldHash,
      newHash
    };
  }
}
