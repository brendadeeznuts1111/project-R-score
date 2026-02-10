export type SecretRef = {
  service: string;
  name: string;
};

export type SecretGetOptions = SecretRef & {
  legacyServices?: string[];
  envKeys?: string[];
};

export type SecretSetOptions = SecretRef & {
  value: string;
  allowUnrestrictedAccess?: boolean;
};

const GENERIC_SERVICE_NAMES = new Set(['api', 'app', 'service', 'default', 'secrets']);

function normalizeService(service: string): string {
  return service.trim();
}

function defaultEnvKeys(ref: SecretRef): string[] {
  const snake = `${ref.service}_${ref.name}`
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return [snake];
}

function hasBunSecrets(): boolean {
  return typeof Bun !== 'undefined' && typeof Bun.secrets !== 'undefined';
}

export function validateSecretServiceName(service: string): string[] {
  const warnings: string[] = [];
  if (!service.includes('.')) {
    warnings.push('Service name should use reverse-domain notation (for example, com.example.app).');
  }
  if (GENERIC_SERVICE_NAMES.has(service)) {
    warnings.push(`Service name "${service}" is too generic and may collide with other tools.`);
  }
  return warnings;
}

export async function getSecret(options: SecretGetOptions): Promise<string | null> {
  const service = normalizeService(options.service);
  const primaryRef: SecretRef = { service, name: options.name };
  const refs: SecretRef[] = [primaryRef];

  for (const legacyService of options.legacyServices || []) {
    refs.push({ service: normalizeService(legacyService), name: options.name });
  }

  if (hasBunSecrets()) {
    for (const ref of refs) {
      try {
        const value = await Bun.secrets.get(ref);
        if (value !== null) return value;
      } catch {
        // Continue to fallback refs/env.
      }
    }
  }

  const envKeys = options.envKeys && options.envKeys.length > 0 ? options.envKeys : defaultEnvKeys(primaryRef);
  for (const envKey of envKeys) {
    const value = Bun.env[envKey];
    if (typeof value === 'string' && value.length > 0) return value;
  }

  return null;
}

export async function setSecret(options: SecretSetOptions): Promise<void> {
  const service = normalizeService(options.service);
  const payload = {
    service,
    name: options.name,
    value: options.value,
    ...(options.allowUnrestrictedAccess !== undefined
      ? { allowUnrestrictedAccess: options.allowUnrestrictedAccess }
      : {}),
  };

  if (!hasBunSecrets()) {
    throw new Error('Bun.secrets is unavailable on this runtime');
  }

  await Bun.secrets.set(payload);
}

export async function deleteSecret(ref: SecretRef): Promise<boolean> {
  if (!hasBunSecrets()) return false;
  try {
    return await Bun.secrets.delete({
      service: normalizeService(ref.service),
      name: ref.name,
    });
  } catch {
    return false;
  }
}
