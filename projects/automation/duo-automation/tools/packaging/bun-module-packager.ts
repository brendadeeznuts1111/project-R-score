import { VersionedTaxonomyValidator } from '../utils/versioned-taxonomy-validator';
import { createR2Manager } from '../utils/bun-r2-manager';
import { loadScopedSecrets } from '../utils/secrets-loader';
import { semver } from 'bun';

export interface PackedPackage {
  name: string;
  version: string;
  size: number;
  tarball: string;
}

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
}

export class BunModulePackager {
  private validator: VersionedTaxonomyValidator;
  private r2: ReturnType<typeof createR2Manager>;

  constructor() {
    this.validator = new VersionedTaxonomyValidator();
    // Start with environment-derived config
    this.r2 = this.initializeR2();
  }

  private initializeR2() {
    return createR2Manager({
      endpoint: Bun.env.R2_ENDPOINT || '',
      accessKeyId: Bun.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: Bun.env.R2_SECRET_ACCESS_KEY || '',
      bucket: Bun.env.R2_BUCKET || 'duoplus-registry',
    });
  }

  private async ensureR2Config() {
    // If we're missing basic config, try to load from secrets
    if (!Bun.env.R2_ENDPOINT) {
      try {
        const secrets = await loadScopedSecrets();
        if (secrets.r2Endpoint) {
          this.r2 = createR2Manager({
            endpoint: secrets.r2Endpoint,
            accessKeyId: secrets.r2AccessKeyId || '',
            secretAccessKey: secrets.r2SecretAccessKey || '',
            bucket: secrets.r2Bucket || 'duoplus-registry',
          });
        }
      } catch (e) {
        // Fallback or silent failure - will error on actual upload if still missing
      }
    }
  }

  /**
   * Pack a single module by name
   */
  async packModule(nodeId: string): Promise<PackedPackage> {
    const node = this.validator.getVersionedNode(nodeId);
    if (!node) {
      throw new Error(`Module ${nodeId} not found in taxonomy`);
    }

    const version = node.version || '0.0.0';
    const name = nodeId;
    
    // Simulate packing by creating a dummy tarball path and size
    // In a real implementation, this would use Bun.write() and potentially tar
    const tarball = `${name}-${version}.tgz`;
    const size = Math.floor(Math.random() * 500) + 100; // Mock size in KB

    return {
      name,
      version,
      size: size * 1024,
      tarball
    };
  }

  /**
   * Pack all modules in a given domain
   */
  async packDomain(domain: string): Promise<PackedPackage[]> {
    const nodes = Array.from(this.validator.getAllVersionedNodes().values());
    const domainNodes = nodes.filter(n => n.domain === domain);
    
    const packed: PackedPackage[] = [];
    for (const node of domainNodes) {
      if (node.version) {
        // Find the ID for the node
        const id = Array.from(this.validator.getAllVersionedNodes().entries())
          .find(([_, n]) => n === node)?.[0];
        if (id) {
          packed.push(await this.packModule(id));
        }
      }
    }
    return packed;
  }

  /**
   * Get all versioned modules from taxonomy
   */
  async getAllVersionedModules(): Promise<any[]> {
    const nodes = Array.from(this.validator.getAllVersionedNodes().entries());
    return nodes.map(([id, node]) => ({
      id,
      name: id,
      version: node.version,
      domain: node.domain
    }));
  }

  /**
   * Validate a package tarball
   */
  async validatePackage(tarball: string): Promise<ValidationResult> {
    // Basic validation logic
    const isValid = tarball.endsWith('.tgz');
    const warnings: string[] = [];
    
    if (isValid && tarball.includes('0.0.0')) {
      warnings.push('Package has development version (0.0.0)');
    }

    return {
      valid: isValid,
      warnings
    };
  }

  /**
   * Publish a package to a registry (R2 Bucket)
   */
  async publish(nodeId: string, _registryUrl?: string): Promise<void> {
    await this.ensureR2Config();
    const node = this.validator.getVersionedNode(nodeId);
    if (!node) {
      throw new Error(`Module ${nodeId} not found`);
    }

    const pkg = await this.packModule(nodeId);
    const key = `packages/${pkg.name}/${pkg.version}/${pkg.tarball}`;

    console.log(`Publishing ${pkg.name}@${pkg.version} to R2 bucket...`);
    
    // In a real scenario, we would read the actual tarball file
    // For this simulation, we'll upload a buffer representing the package
    const dummyPackageData = Buffer.from(`Module: ${pkg.name}\nVersion: ${pkg.version}\nSize: ${pkg.size}`);
    
    const result = await this.r2.upload({
      key,
      data: dummyPackageData,
      contentType: 'application/gzip',
      metadata: {
        module: pkg.name,
        version: pkg.version,
        domain: node.domain,
        packedAt: new Date().toISOString()
      }
    });

    if (result.success) {
      console.log(`Successfully published to ${key}`);
    } else {
      throw new Error(`Failed to publish ${pkg.name} to R2`);
    }
  }
}