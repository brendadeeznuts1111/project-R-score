/**
 * Private Registry Service
 * Package registry for internal packages and themes
 */

import { R2Storage } from './r2StorageService';

export interface PackageMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  repository: string;
  homepage?: string;
  bugs?: string;
  keywords: string[];
  registryUrl: string;
  tarball: string;
  shasum: string;
  integrity: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  dist: {
    tarball: string;
    shasum: string;
    integrity: string;
    fileCount: number;
    unpackedSize: number;
  };
  publishedAt: number;
  publishedBy: string;
  downloads: number;
  rating: number;
}

export class PrivateRegistry {
  private packages = new Map<string, PackageMetadata[]>();
  private r2Storage: R2Storage;

  constructor(r2Storage: R2Storage) {
    this.r2Storage = r2Storage;
  }

  async publishPackage(
    name: string,
    version: string,
    tarball: Buffer,
    metadata: Omit<PackageMetadata, 'dist' | 'publishedAt' | 'publishedBy' | 'registryUrl' | 'tarball' | 'shasum' | 'integrity'>
  ): Promise<PackageMetadata> {
    const shasum = this.calculateShasum(tarball);
    const integrity = this.calculateIntegrity(tarball);
    
    const tarballUrl = await this.r2Storage.uploadFile(
      `packages/${name}/${version}.tgz`,
      tarball,
      { name, version, shasum }
    );
    
    const packageMeta: PackageMetadata = {
      ...metadata,
      registryUrl: `https://registry.duoplus.dev/${name}`,
      tarball: tarballUrl,
      shasum,
      integrity,
      dist: {
        tarball: tarballUrl,
        shasum,
        integrity,
        fileCount: 0,
        unpackedSize: tarball.length,
      },
      publishedAt: Date.now(),
      publishedBy: metadata.author,
      downloads: 0,
      rating: 0,
    };
    
    if (!this.packages.has(name)) {
      this.packages.set(name, []);
    }
    this.packages.get(name)!.push(packageMeta);
    
    console.log(`📦 Published package: ${name}@${version}`);
    return packageMeta;
  }

  async getPackage(name: string, version?: string): Promise<PackageMetadata | null> {
    const versions = this.packages.get(name);
    if (!versions) return null;
    
    if (!version) {
      return versions[versions.length - 1];
    }
    
    return versions.find(v => v.version === version) || null;
  }

  async listPackages(author?: string): Promise<PackageMetadata[]> {
    const all = Array.from(this.packages.values()).flat();
    return author ? all.filter(p => p.author === author) : all;
  }

  async getPackageVersions(name: string): Promise<PackageMetadata[]> {
    return this.packages.get(name) || [];
  }

  async searchPackages(query: string): Promise<PackageMetadata[]> {
    const q = query.toLowerCase();
    return Array.from(this.packages.values())
      .flat()
      .filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.keywords.some(k => k.toLowerCase().includes(q))
      );
  }

  async incrementDownloads(name: string, version: string): Promise<void> {
    const pkg = await this.getPackage(name, version);
    if (pkg) {
      pkg.downloads++;
    }
  }

  async ratePackage(name: string, version: string, rating: number): Promise<void> {
    const pkg = await this.getPackage(name, version);
    if (pkg && rating >= 0 && rating <= 5) {
      pkg.rating = (pkg.rating + rating) / 2;
    }
  }

  async deprecatePackage(name: string, version: string): Promise<void> {
    const pkg = await this.getPackage(name, version);
    if (pkg) {
      pkg.description = `[DEPRECATED] ${pkg.description}`;
    }
  }

  async getPackageStats(): Promise<{
    totalPackages: number;
    totalVersions: number;
    totalDownloads: number;
    topPackages: PackageMetadata[];
  }> {
    const all = Array.from(this.packages.values()).flat();
    const totalDownloads = all.reduce((sum, p) => sum + p.downloads, 0);
    const topPackages = all.sort((a, b) => b.downloads - a.downloads).slice(0, 10);
    
    return {
      totalPackages: this.packages.size,
      totalVersions: all.length,
      totalDownloads,
      topPackages,
    };
  }

  private calculateShasum(buffer: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha1').update(buffer).digest('hex');
  }

  private calculateIntegrity(buffer: Buffer): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha512').update(buffer).digest('base64');
    return `sha512-${hash}`;
  }
}

export const privateRegistry = new PrivateRegistry(require('./r2StorageService').r2Storage);

