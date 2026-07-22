/**
 * Factory — artifact registry core.
 *
 * The factory provides an R2-backed artifact registry with npm-compatible
 * index format, Bun semver versioning, and etag-based optimistic locking.
 *
 * @see https://bun.sh/docs/runtime/semver — Bun.semver
 * @see https://bun.sh/docs/runtime/file-io#reading-files-bunfile — Bun.file
 * @see https://bun.sh/docs/runtime/file-io#writing-files-bun-write — Bun.write
 * @see https://bun.sh/docs/runtime/plugins#onresolve — onResolve (roadmap: @factorywager/* import resolution)
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
