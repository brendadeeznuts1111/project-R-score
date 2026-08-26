#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @updated Bun.deepEquals · changed v0.4.0 · 2022-12-23 · https://bun.com/blog/bun-v0.4.0
// @updated Bun.deepEquals · fixed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.deepEquals · fixed v1.1.13 · 2024-06-05 · https://bun.com/blog/bun-v1.1.13
// @updated Bun.deepEquals · changed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.deepEquals · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.deepEquals · changed v1.1.35 · 2024-11-19 · https://bun.com/blog/bun-v1.1.35
// @updated Bun.deepEquals · changed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.deepEquals · fixed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.deepEquals · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.deepEquals · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/utils#bun-deepequals
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @updated Bun.file · fixed v0.2.2 · 2022-10-27 · https://bun.com/blog/bun-v0.2.2
// @updated Bun.file · changed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.file · fixed v0.6.5 · 2023-05-29 · https://bun.com/blog/bun-v0.6.5
// @updated Bun.file · changed v0.6.12 · 2023-06-30 · https://bun.com/blog/bun-v0.6.12
// @updated Bun.file · fixed v1.0.1 · 2023-09-12 · https://bun.com/blog/bun-v1.0.1
// @updated Bun.file · fixed v1.0.2 · 2023-09-15 · https://bun.com/blog/bun-v1.0.2
// @updated Bun.file · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.file · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.file · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.file · fixed v1.0.25 · 2024-01-21 · https://bun.com/blog/bun-v1.0.25
// @updated Bun.file · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.file · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.file · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.file · changed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.file · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.file · changed v1.1.9 · 2024-05-22 · https://bun.com/blog/bun-v1.1.9
// @updated Bun.file · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.file · fixed v1.1.22 · 2024-08-07 · https://bun.com/blog/bun-v1.1.22
// @updated Bun.file · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.file · fixed v1.1.28 · 2024-09-18 · https://bun.com/blog/bun-v1.1.28
// @updated Bun.file · fixed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.file · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.file · changed v1.1.43 · 2025-01-08 · https://bun.com/blog/bun-v1.1.43
// @updated Bun.file · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.file · fixed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.file · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · changed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.file · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.file · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.file · fixed v1.3.11 · 2026-03-18 · https://bun.com/blog/bun-v1.3.11
// @updated Bun.file · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.file · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · fixed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @updated Bun.file · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.file · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/file-io
// @see https://bun.com/reference/bun/JSON5 — Bun.JSON5
// @verified Bun.JSON5 · Bun v1.4.0 · 2026-08-25 · https://bun.com/reference/bun/JSON5
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @updated Bun.TOML.parse · fixed v1.3.7 · 2026-01-27 · https://bun.com/blog/bun-v1.3.7
// @updated Bun.TOML.parse · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @verified Bun.TOML.parse · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/toml#bun-toml-parse
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import {
  FACTORY_WAGER_LOCAL_REGISTRY_WRITE_URL,
  FACTORY_WAGER_NPM_REGISTRY_URL,
  FACTORY_WAGER_REGISTRY_ORIGIN,
} from '../config/r2-env.ts';
import { checkProjectRegistryConfigs } from './lib/project-registry-config-check.ts';

export type RegistryConfigDocuments = {
  npmrc: string;
  bunfig: string;
  localBunfig: string;
  packageJson: string;
  releaseTargetsJson: string;
  registryConfigJson5: string;
  envExample: string;
};

export type RegistryConfigCheck = { ok: boolean; errors: string[] };

type UnknownRecord = Record<string, unknown>;

function parseRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function parseNormalizedUrl(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\/+$/, '') : '';
}

function isLoopbackHttp(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' ||
        url.hostname === '::1' ||
        /^127(?:\.\d{1,3}){3}$/.test(url.hostname))
    );
  } catch {
    return false;
  }
}

function npmrcValues(text: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator > 0)
      values.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  return values;
}

export function checkRegistryConfigDocuments(
  documents: RegistryConfigDocuments
): RegistryConfigCheck {
  const errors: string[] = [];
  const npmrc = npmrcValues(documents.npmrc);
  const scopeUrl = parseNormalizedUrl(npmrc.get('@factorywager:registry'));
  if (scopeUrl !== FACTORY_WAGER_NPM_REGISTRY_URL) {
    errors.push(`.npmrc: @factorywager must use ${FACTORY_WAGER_NPM_REGISTRY_URL}`);
  }
  for (const [key] of npmrc) {
    if (
      key.includes('registry.factory-wager.com') &&
      (key.endsWith(':_authToken') || key.endsWith(':always-auth'))
    ) {
      errors.push('.npmrc: public registry must not receive credentials');
    }
  }

  const bunfig = parseRecord(Bun.TOML.parse(documents.bunfig));
  const install = parseRecord(bunfig.install);
  const scopes = parseRecord(install.scopes);
  const factoryScope = parseRecord(scopes['@factorywager']);
  if (parseNormalizedUrl(factoryScope.url) !== FACTORY_WAGER_NPM_REGISTRY_URL) {
    errors.push(`bunfig.toml: @factorywager must use ${FACTORY_WAGER_NPM_REGISTRY_URL}`);
  }
  if ('token' in factoryScope) errors.push('bunfig.toml: public registry scope must be tokenless');
  const publishRegistry = parseNormalizedUrl(parseRecord(bunfig.publish).registry);
  if (publishRegistry === FACTORY_WAGER_NPM_REGISTRY_URL) {
    errors.push('bunfig.toml: publish registry must not equal the public read URL');
  }

  const localBunfig = parseRecord(Bun.TOML.parse(documents.localBunfig));
  const localScope = parseRecord(
    parseRecord(parseRecord(localBunfig.install).scopes)['@factorywager']
  );
  if (!isLoopbackHttp(localScope.url)) {
    errors.push('bunfig.local-registry.toml: local scope must use HTTP loopback');
  }
  if ('token' in localScope) {
    errors.push('bunfig.local-registry.toml: credentials must be injected at runtime');
  }
  if (
    parseNormalizedUrl(parseRecord(localBunfig.publish).registry) === FACTORY_WAGER_NPM_REGISTRY_URL
  ) {
    errors.push('bunfig.local-registry.toml: publish registry must not equal the public read URL');
  }

  const packageJson = parseRecord(JSON.parse(documents.packageJson));
  const packagePublishRegistry = parseNormalizedUrl(
    parseRecord(packageJson.publishConfig).registry
  );
  if (packagePublishRegistry === FACTORY_WAGER_NPM_REGISTRY_URL) {
    errors.push('package.json: publishConfig.registry must not equal the public read URL');
  }

  const releaseTargets = parseRecord(JSON.parse(documents.releaseTargetsJson));
  if (parseNormalizedUrl(releaseTargets.readRegistryUrl) !== FACTORY_WAGER_NPM_REGISTRY_URL) {
    errors.push('config/release-targets.json: readRegistryUrl differs from canonical npm URL');
  }
  for (const target of Array.isArray(releaseTargets.targets) ? releaseTargets.targets : []) {
    const routes = parseRecord(parseRecord(target).publicationRoutes);
    for (const [routeName, routeValue] of Object.entries(routes)) {
      if (parseNormalizedUrl(parseRecord(routeValue).endpoint) === FACTORY_WAGER_NPM_REGISTRY_URL) {
        errors.push(
          `config/release-targets.json: ${routeName} endpoint must not equal the public read URL`
        );
      }
    }
  }

  const registryConfig = parseRecord(Bun.JSON5.parse(documents.registryConfigJson5));
  const read = parseRecord(registryConfig.read);
  const npm = parseRecord(read.npm);
  if (parseNormalizedUrl(read.origin) !== FACTORY_WAGER_REGISTRY_ORIGIN) {
    errors.push('config/registry.config.json5: read origin differs from canonical origin');
  }
  if (parseNormalizedUrl(npm.url) !== FACTORY_WAGER_NPM_REGISTRY_URL) {
    errors.push('config/registry.config.json5: npm read URL differs from canonical URL');
  }
  if (!Bun.deepEquals(npm.methods, ['GET', 'HEAD'])) {
    errors.push('config/registry.config.json5: npm read methods must be GET and HEAD only');
  }
  const localWrite = parseRecord(registryConfig.localWrite);
  if (!isLoopbackHttp(localWrite.url)) {
    errors.push('config/registry.config.json5: local SDK write URL must use HTTP loopback');
  }
  const productionWrite = parseRecord(registryConfig.productionWrite);
  if (productionWrite.type !== 'r2-sigv4' || 'url' in productionWrite) {
    errors.push('config/registry.config.json5: production write must be URL-free R2 SigV4');
  }

  if (/^REGISTRY_URL=/m.test(documents.envExample)) {
    errors.push('.env.example: ambiguous REGISTRY_URL is forbidden');
  }
  for (const required of [
    `FACTORY_WAGER_NPM_REGISTRY_URL=${FACTORY_WAGER_NPM_REGISTRY_URL}`,
    `FACTORY_WAGER_REGISTRY_ORIGIN=${FACTORY_WAGER_REGISTRY_ORIGIN}`,
    `FACTORY_WAGER_LOCAL_REGISTRY_WRITE_URL=${FACTORY_WAGER_LOCAL_REGISTRY_WRITE_URL}`,
  ]) {
    if (!documents.envExample.includes(required)) errors.push(`.env.example: missing ${required}`);
  }

  return { ok: errors.length === 0, errors };
}

export async function checkRegistryConfig(
  root = `${import.meta.dir}/..`
): Promise<RegistryConfigCheck> {
  const read = (path: string) => Bun.file(`${root}/${path}`).text();
  return checkRegistryConfigDocuments({
    npmrc: await read('.npmrc'),
    bunfig: await read('bunfig.toml'),
    localBunfig: await read('bunfig.local-registry.toml'),
    packageJson: await read('package.json'),
    releaseTargetsJson: await read('config/release-targets.json'),
    registryConfigJson5: await read('config/registry.config.json5'),
    envExample: await read('.env.example'),
  });
}

if (isModuleEntrypoint(import.meta)) {
  const rootResult = await checkRegistryConfig();
  const projectResult = await checkProjectRegistryConfigs();
  const errors = [...rootResult.errors, ...projectResult.errors];
  if (errors.length === 0) {
    console.log(
      `registry config aligned: 7 root contracts, ${projectResult.leaves} product leaves`
    );
  } else {
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  }
}
