#!/usr/bin/env bun

import { mkdir, stat } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';

type EnvName = 'development' | 'staging' | 'production' | string;

type VariantSpec = {
  name: string;
  audience: number;
  changes?: Record<string, string | number | boolean>;
};

type BuildMetrics = {
  totalSize: number;
  outputCount: number;
};

type BuildResult = {
  outputs: string[];
  metrics: BuildMetrics;
};

type BuiltVariant = {
  variant: string;
  build: BuildResult;
  config: EnvironmentConfig;
  audience: number;
};

type ABTestConfig = {
  experiment: string;
  baseEnvironment: string;
  domain: string;
  subdomains: string[];
  variants: Array<{
    name: string;
    bundle: string;
    audience: number;
    size: number;
  }>;
  routing: Record<string, number>;
  generatedAt: string;
};

type CreateVariantResult = {
  builds: BuiltVariant[];
  testConfig: ABTestConfig;
};

type EnvironmentConfig = {
  name: EnvName;
  variables: Record<string, string>;
  build: {
    minify: boolean;
    sourcemap: 'none' | 'inline' | 'external' | 'linked';
    naming: string;
    packages: 'bundle' | 'external';
    external: string[];
  };
};

type DeployResult = {
  variant: string;
  url: string;
  size: number;
};

type ABBuilderOptions = {
  entrypoints?: string[];
  outdir?: string;
  manifestPath?: string;
  experiment?: string;
  domain?: string;
  subdomains?: string[];
};

class EnvironmentBuildManager {
  getEnvironmentConfig(name: EnvName): EnvironmentConfig {
    const base: EnvironmentConfig = {
      name,
      variables: {
        NODE_ENV: this.resolveNodeEnv(name),
        PUBLIC_API_URL: process.env.PUBLIC_API_URL || 'https://api.factory-wager.com',
        R2_BUCKET: process.env.R2_BUCKET || 'bun-secrets',
      },
      build: {
        minify: true,
        sourcemap: 'linked',
        naming: '[name]-[hash].[ext]',
        packages: 'bundle',
        external: ['bun'],
      },
    };

    return base;
  }

  async buildForEnvironment(
    envName: EnvName,
    config: {
      entrypoints: string[];
      outdir: string;
      analyze?: boolean;
      variables?: Record<string, string>;
      build?: Partial<EnvironmentConfig['build']>;
    }
  ): Promise<BuildResult> {
    const envConfig = this.getEnvironmentConfig(envName);
    const mergedVars = {
      ...envConfig.variables,
      ...(config.variables || {}),
    };

    const buildConfig = {
      ...envConfig.build,
      ...(config.build || {}),
    };

    await mkdir(config.outdir, { recursive: true });

    const result = await Bun.build({
      entrypoints: config.entrypoints,
      outdir: config.outdir,
      minify: buildConfig.minify,
      sourcemap: buildConfig.sourcemap,
      naming: buildConfig.naming,
      packages: buildConfig.packages,
      external: buildConfig.external,
      env: 'PUBLIC_*',
      define: Object.fromEntries(
        Object.entries(mergedVars).map(([k, v]) => [`process.env.${k}`, JSON.stringify(String(v))])
      ),
    });

    if (!result.success) {
      const message = result.logs.map((l) => l.message).join('; ') || 'Unknown build failure';
      throw new Error(`Build failed for ${envName}: ${message}`);
    }

    const outputs = result.outputs
      .map((output) => output.path)
      .filter((p): p is string => typeof p === 'string' && p.length > 0);

    const sizes = await Promise.all(
      outputs.map(async (p) => {
        try {
          const info = await stat(p);
          return info.size;
        } catch {
          return 0;
        }
      })
    );

    return {
      outputs,
      metrics: {
        totalSize: sizes.reduce((a, b) => a + b, 0),
        outputCount: outputs.length,
      },
    };
  }

  private resolveNodeEnv(name: string): string {
    if (name.includes('prod')) return 'production';
    if (name.includes('stag')) return 'staging';
    return 'development';
  }
}

class ABTestBuilder {
  private manager = new EnvironmentBuildManager();
  private options: Required<ABBuilderOptions>;

  constructor(options?: ABBuilderOptions) {
    this.options = {
      entrypoints: options?.entrypoints || ['./tools/scanner-cli.ts'],
      outdir: options?.outdir || './dist/ab-test-builds',
      manifestPath: options?.manifestPath || './reports/ab-tests/latest.json',
      experiment: options?.experiment || 'feature_experiment_1',
      domain: options?.domain || process.env.DOMAIN || 'factory-wager.com',
      subdomains:
        options?.subdomains ||
        (process.env.SUBDOMAINS ? process.env.SUBDOMAINS.split(',').map((s) => s.trim()).filter(Boolean) : ['www', 'api', 'cdn']),
    };
  }

  async createTestVariants(baseEnvironment: string, variants: VariantSpec[]): Promise<CreateVariantResult> {
    const builds: BuiltVariant[] = [];

    for (const variant of variants) {
      const baseConfig = this.manager.getEnvironmentConfig(baseEnvironment);
      const variantConfig: EnvironmentConfig = {
        ...baseConfig,
        variables: {
          ...baseConfig.variables,
          AB_TEST_VARIANT: variant.name,
          AB_TEST_AUDIENCE: String(variant.audience),
          ...(variant.changes ? Object.fromEntries(Object.entries(variant.changes).map(([k, v]) => [k, String(v)])) : {}),
        },
      };

      const build = await this.manager.buildForEnvironment(`${baseEnvironment}-${variant.name}`, {
        entrypoints: this.options.entrypoints,
        outdir: join(this.options.outdir, variant.name),
        analyze: true,
        variables: variantConfig.variables,
        build: variantConfig.build,
      });

      builds.push({
        variant: variant.name,
        build,
        config: variantConfig,
        audience: variant.audience,
      });
    }

    const testConfig: ABTestConfig = {
      experiment: this.options.experiment,
      baseEnvironment,
      domain: this.options.domain,
      subdomains: this.options.subdomains,
      variants: builds.map((b) => ({
        name: b.variant,
        bundle: b.build.outputs[0] || '',
        audience: b.audience,
        size: b.build.metrics.totalSize,
      })),
      routing: builds.reduce((config, b) => {
        config[b.variant] = b.audience;
        return config;
      }, {} as Record<string, number>),
      generatedAt: new Date().toISOString(),
    };

    await this.writeManifest(testConfig);
    return { builds, testConfig };
  }

  async deployTestVariants(variants: CreateVariantResult): Promise<DeployResult[]> {
    const deployments: DeployResult[] = [];

    for (const variant of variants.builds) {
      const artifactPath = variant.build.outputs[0];
      if (!artifactPath) {
        throw new Error(`No build output for variant '${variant.variant}'`);
      }

      const deployment = await deployToCDN(artifactPath, `ab-test/${this.options.domain}/${variant.variant}`);
      deployments.push({
        variant: variant.variant,
        url: deployment.url,
        size: variant.build.metrics.totalSize,
      });
    }

    await updateRoutingConfig(variants.testConfig);
    return deployments;
  }

  private async writeManifest(testConfig: ABTestConfig): Promise<void> {
    const output = resolve(testConfigPath(this.options.manifestPath));
    await mkdir(dirname(output), { recursive: true });
    await Bun.write(output, JSON.stringify(testConfig, null, 2));
  }
}

async function deployToCDN(localPath: string, cdnPath: string): Promise<{ url: string }> {
  const bucket = process.env.R2_BUCKET || 'bun-secrets';
  const publicBase = process.env.CDN_BASE_URL || `https://${bucket}.r2.dev`;
  const normalized = cdnPath.replace(/^\/+/, '');

  if (process.env.AB_DEPLOY_DRY_RUN === '1' || !process.env.R2_ENDPOINT) {
    return { url: `${publicBase}/${normalized}` };
  }

  const target = `s3://${bucket}/${normalized}/${basename(localPath)}`;
  await Bun.write(target, Bun.file(localPath));
  return { url: `${publicBase}/${normalized}/${basename(localPath)}` };
}

async function updateRoutingConfig(config: ABTestConfig): Promise<void> {
  const routingPath = resolve('./reports/ab-tests/routing.json');
  await mkdir(dirname(routingPath), { recursive: true });
  await Bun.write(routingPath, JSON.stringify(config, null, 2));
}

function basename(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

function testConfigPath(input: string): string {
  return input.endsWith('.json') ? input : `${input}.json`;
}

function parseVariants(raw: string | undefined): VariantSpec[] {
  if (!raw) {
    return [
      { name: 'control', audience: 50, changes: { PUBLIC_AB_FLAG: 'control' } },
      { name: 'treatment', audience: 50, changes: { PUBLIC_AB_FLAG: 'treatment' } },
    ];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('variants must be an array');
    return parsed.map((entry: any) => ({
      name: String(entry.name),
      audience: Number(entry.audience),
      changes: entry.changes && typeof entry.changes === 'object' ? entry.changes : undefined,
    }));
  } catch (error) {
    throw new Error(`Invalid AB_VARIANTS JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function parseArgs(argv: string[]) {
  const get = (name: string): string | undefined => {
    const direct = argv.find((a) => a.startsWith(`--${name}=`));
    if (direct) return direct.slice(name.length + 3);
    const idx = argv.indexOf(`--${name}`);
    if (idx >= 0 && idx + 1 < argv.length) return argv[idx + 1];
    return undefined;
  };

  return {
    env: get('env') || process.env.AB_BASE_ENV || 'production',
    deploy: argv.includes('--deploy'),
    domain: get('domain') || process.env.DOMAIN || 'factory-wager.com',
    subdomains: (get('subdomains') || process.env.SUBDOMAINS || 'www,api,cdn')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    experiment: get('experiment') || process.env.AB_EXPERIMENT || 'feature_experiment_1',
    entrypoints: (get('entrypoints') || './tools/scanner-cli.ts')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    outdir: get('outdir') || './dist/ab-test-builds',
    manifestPath: get('manifest') || './reports/ab-tests/latest.json',
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const variants = parseVariants(process.env.AB_VARIANTS);

  const totalAudience = variants.reduce((sum, v) => sum + v.audience, 0);
  if (Math.round(totalAudience) !== 100) {
    throw new Error(`Variant audience must total 100 (got ${totalAudience})`);
  }

  const builder = new ABTestBuilder({
    entrypoints: args.entrypoints,
    outdir: args.outdir,
    manifestPath: args.manifestPath,
    experiment: args.experiment,
    domain: args.domain,
    subdomains: args.subdomains,
  });

  const created = await builder.createTestVariants(args.env, variants);

  let deployments: DeployResult[] = [];
  if (args.deploy) {
    deployments = await builder.deployTestVariants(created);
  }

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        experiment: created.testConfig.experiment,
        domain: created.testConfig.domain,
        subdomains: created.testConfig.subdomains,
        variants: created.testConfig.variants,
        routing: created.testConfig.routing,
        deployments,
        manifest: resolve(testConfigPath(args.manifestPath)),
      },
      null,
      2
    )
  );
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(`[ab-test-builder] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}

export { ABTestBuilder, EnvironmentBuildManager, type VariantSpec, type ABTestConfig, type CreateVariantResult };
