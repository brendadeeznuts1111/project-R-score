export type SecretRef = {
  service: string;
  name: string;
};

export type SecretGetOptions = SecretRef & {
  legacyServices?: string[];
  envKeys?: string[];
};

const DEFAULT_LEGACY_SERVICE = 'cloudflare';

function hasBunSecrets(): boolean {
  return typeof Bun !== 'undefined' && typeof Bun.secrets !== 'undefined';
}

function defaultEnvKeys(ref: SecretRef): string[] {
  const explicitMap: Record<string, string> = {
    'com.barbershop.vectorize:api_token': 'CLOUDFLARE_API_TOKEN',
    'com.barbershop.vectorize:account_id': 'CLOUDFLARE_ACCOUNT_ID',
    'cloudflare:api_token': 'CLOUDFLARE_API_TOKEN',
    'cloudflare:account_id': 'CLOUDFLARE_ACCOUNT_ID',
  };

  const key = `${ref.service}:${ref.name}`;
  if (explicitMap[key]) return [explicitMap[key]];

  return [
    key
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, ''),
  ];
}

export async function getSecret(options: SecretGetOptions): Promise<string | null> {
  const refs: SecretRef[] = [{ service: options.service, name: options.name }];
  for (const service of options.legacyServices || []) {
    refs.push({ service, name: options.name });
  }
  if (!options.legacyServices?.length && options.service !== DEFAULT_LEGACY_SERVICE) {
    refs.push({ service: DEFAULT_LEGACY_SERVICE, name: options.name });
  }

  if (hasBunSecrets()) {
    for (const ref of refs) {
      try {
        const value = await Bun.secrets.get(ref);
        if (value !== null) return value;
      } catch {
        // Continue fallback
      }
    }
  }

  const envKeys = options.envKeys && options.envKeys.length > 0 ? options.envKeys : defaultEnvKeys(options);
  for (const envKey of envKeys) {
    const value = Bun.env[envKey];
    if (typeof value === 'string' && value.length > 0) return value;
  }

  return null;
}

export async function setSecret(options: {
  service: string;
  name: string;
  value: string;
  allowUnrestrictedAccess?: boolean;
}): Promise<void> {
  if (!hasBunSecrets()) throw new Error('Bun.secrets is unavailable on this runtime');

  await Bun.secrets.set({
    service: options.service,
    name: options.name,
    value: options.value,
    ...(options.allowUnrestrictedAccess !== undefined
      ? { allowUnrestrictedAccess: options.allowUnrestrictedAccess }
      : {}),
  });
}

export async function deleteSecret(ref: SecretRef): Promise<boolean> {
  if (!hasBunSecrets()) return false;
  try {
    return await Bun.secrets.delete(ref);
  } catch {
    return false;
  }
}
