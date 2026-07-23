/**
 * Factory — artifact registry core.
 *
 * The factory provides an R2-backed artifact registry with npm-compatible
 * index format, Bun semver versioning, and etag-based optimistic locking.
 *
 * @see https://bun.com/docs/runtime/semver — Bun.semver
 * @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
 * @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
 * @see https://bun.com/docs/runtime/s3#bun-s3client-bun-s3 — S3Client
 *
 * @example
 * ```ts
 * import { registry, asArtifactName } from 'lib/factory';
 *
 * const data = await Bun.file('my-lib-1.0.0.tgz').bytes();
 * await registry.publish('my-lib', '1.0.0', data, {
 *   type: 'library',
 *   description: 'My shared library',
 * });
 *
 * const result = await registry.install('my-lib', '^1.0.0');
 * if (result) await Bun.write('output.tgz', result.data);
 * ```
 */

export {
  type ArtifactName,
  type ArtifactVersion,
  type ArtifactId,
  type ArtifactType,
  type ArtifactStorage,
  type ArtifactRelease,
  type PackageInfo,
  type RegistryIndex,
  validateArtifactName,
  asArtifactName,
  asArtifactVersion,
  asArtifactId,
  tryArtifactName,
  tryArtifactVersion,
  parseArtifactId,
  FACTORY_BRAND_SPECS,
} from './artifact';

export { sortVersions, latestVersion, satisfiesRange, resolveVersion } from './semver';

export { RegistryClient, registry } from './registry';

export { parseRegistryObjectKey } from './http-keys';

export { resolveArtifact, artifactPublicUrl } from './resolve';

export {
  buildRegistryHealthReport,
  publicRegistryHealthReport,
  healthHttpStatus,
  type RegistryHealthReport,
  type RegistryPublicHealthReport,
} from './health';

export {
  sendRegistryAlert,
  type AlertSeverity,
  type RegistryAlertFetch,
  type RegistryAlertOptions,
} from './alerts';

export { runIntegrityCheck, type IntegrityReport, type IntegrityFailure } from './integrity';

export {
  createRegistryServer,
  createRegistryRoutes,
  createRegistryFetchHandler,
  publishRegistryVersion,
  type RegistryGatewayOptions,
} from './server';

export {
  type RegistryObjectStore,
  type ObjectPutOptions,
  createMemoryObjectStore,
  createS3RegistryStore,
  factoryRegistryBucketFromEnv,
  requireFactoryRegistryS3Config,
} from './object-store';

export { renderReadmeHTML, renderReadmeAnsi } from './markdown';
export { withRetry, withCache } from './retry';
