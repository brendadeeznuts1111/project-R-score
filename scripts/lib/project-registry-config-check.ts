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
// @see https://bun.com/reference/bun/TOML/parse — Bun.TOML.parse
// @updated Bun.TOML.parse · fixed v1.3.7 · 2026-01-27 · https://bun.com/blog/bun-v1.3.7
// @updated Bun.TOML.parse · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @verified Bun.TOML.parse · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/toml#bun-toml-parse
import {
  FACTORY_WAGER_NPM_REGISTRY_URL,
  FACTORY_WAGER_REGISTRY_ORIGIN,
} from '../../config/r2-env.ts';
import { discoverProjectLeaves } from '../../tools/projects-root-check.ts';

type UnknownRecord = Record<string, unknown>;

export type ProjectRegistryDocuments = {
  packageJson: string;
  npmrc?: string;
  bunfig?: string;
};

export type ProjectRegistryCheck = {
  leaves: number;
  errors: string[];
};

function parseRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function parseNormalizedUrl(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\/+$/, '') : '';
}

function isFactoryPublicUrl(value: unknown): boolean {
  if (typeof value !== 'string' || value.includes('$')) return false;
  try {
    return new URL(value).origin === FACTORY_WAGER_REGISTRY_ORIGIN;
  } catch {
    return false;
  }
}

function npmrcValues(text = ''): Map<string, string> {
  const values = new Map<string, string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator > 0) {
      values.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
    }
  }
  return values;
}

function parseScopeUrl(value: unknown): string {
  return typeof value === 'string' ? value : parseNormalizedUrl(parseRecord(value).url);
}

export function checkProjectRegistryDocuments(
  projectPath: string,
  documents: ProjectRegistryDocuments
): string[] {
  const errors: string[] = [];
  let packageJson: UnknownRecord;
  try {
    packageJson = parseRecord(JSON.parse(documents.packageJson));
  } catch {
    return [`${projectPath}/package.json: invalid JSON`];
  }

  const publishRegistry = parseRecord(packageJson.publishConfig).registry;
  if (isFactoryPublicUrl(publishRegistry)) {
    errors.push(`${projectPath}/package.json: public FactoryWager host is read-only`);
  }

  const npmrc = npmrcValues(documents.npmrc);
  for (const [key, value] of npmrc) {
    if (
      key.includes('registry.factory-wager.com') &&
      (key.endsWith(':_authToken') || key.endsWith(':always-auth'))
    ) {
      errors.push(`${projectPath}/.npmrc: public FactoryWager host must not receive credentials`);
    }
    if (
      key === '@factorywager:registry' &&
      parseNormalizedUrl(value) !== FACTORY_WAGER_NPM_REGISTRY_URL
    ) {
      errors.push(`${projectPath}/.npmrc: @factorywager must use the canonical tokenless read URL`);
    }
    if (key === '@duoplus:registry' && isFactoryPublicUrl(value)) {
      errors.push(`${projectPath}/.npmrc: @duoplus is not owned by the FactoryWager read plane`);
    }
  }

  if (documents.bunfig) {
    let bunfig: UnknownRecord;
    try {
      bunfig = parseRecord(Bun.TOML.parse(documents.bunfig));
    } catch {
      return [...errors, `${projectPath}/bunfig.toml: invalid TOML`];
    }
    const install = parseRecord(bunfig.install);
    if (isFactoryPublicUrl(install.registry)) {
      errors.push(
        `${projectPath}/bunfig.toml: public FactoryWager host cannot be a default registry`
      );
    }
    if (isFactoryPublicUrl(parseRecord(bunfig.publish).registry)) {
      errors.push(`${projectPath}/bunfig.toml: public FactoryWager host is not a publish plane`);
    }
    for (const [name, value] of Object.entries(parseRecord(install.scopes))) {
      const url = parseScopeUrl(value);
      if (name === '@factorywager') {
        if (parseNormalizedUrl(url) !== FACTORY_WAGER_NPM_REGISTRY_URL) {
          errors.push(`${projectPath}/bunfig.toml: @factorywager must use the canonical read URL`);
        }
        if ('token' in parseRecord(value)) {
          errors.push(`${projectPath}/bunfig.toml: @factorywager public reads must be tokenless`);
        }
      }
      if (name === '@duoplus' && isFactoryPublicUrl(url)) {
        errors.push(`${projectPath}/bunfig.toml: @duoplus is not a FactoryWager scope`);
      }
      if (isFactoryPublicUrl(url) && 'token' in parseRecord(value)) {
        errors.push(`${projectPath}/bunfig.toml: public FactoryWager scopes must not carry tokens`);
      }
    }
  }

  return errors;
}

async function optionalText(path: string): Promise<string | undefined> {
  const file = Bun.file(path);
  return (await file.exists()) ? file.text() : undefined;
}

export async function checkProjectRegistryConfigs(
  root = `${import.meta.dir}/../..`
): Promise<ProjectRegistryCheck> {
  const discovered = await discoverProjectLeaves(root);
  const leaves = discovered.leaves.filter(leaf => leaf.tier !== 'archive');
  const errors = [...discovered.issues.map(issue => `${issue.path}: ${issue.kind}`)];

  for (const leaf of leaves) {
    const projectRoot = `${root}/${leaf.path}`;
    errors.push(
      ...checkProjectRegistryDocuments(leaf.path, {
        packageJson: await Bun.file(`${projectRoot}/package.json`).text(),
        npmrc: await optionalText(`${projectRoot}/.npmrc`),
        bunfig: await optionalText(`${projectRoot}/bunfig.toml`),
      })
    );
  }

  return { leaves: leaves.length, errors };
}
