import { getSecret } from './bun-secrets-adapter';

export interface ResolvedR2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  bucketName: string;
}

const DEFAULT_INFRA_SERVICES = [
  Bun.env.FW_INFRA_SECRETS_SERVICE || 'com.factorywager.infra',
  Bun.env.FW_R2_SECRETS_SERVICE || 'com.factorywager.r2',
  Bun.env.REGISTRY_SECRETS_SERVICE || 'com.factorywager.registry',
];

const ALLOW_GENERIC_SECRET_SERVICE =
  String(Bun.env.FW_ALLOW_GENERIC_SECRET_SERVICE || '').toLowerCase() === 'true';

function uniq(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((v): v is string => !!v && v.trim().length > 0))];
}

async function resolveSecretField(
  name: string,
  envKeys: string[],
  services: string[],
  fallback = ''
): Promise<string> {
  for (const envKey of envKeys) {
    const value = Bun.env[envKey];
    if (typeof value === 'string' && value.length > 0) return value;
  }

  if (services.length > 0) {
    const value = await getSecret({
      service: services[0],
      legacyServices: services.slice(1),
      name,
      envKeys,
    });
    if (value) return value;
  }

  return fallback;
}

export async function resolveR2InfraConfig(options: {
  services?: string[];
  bucketFallback?: string;
  endpointOptional?: boolean;
} = {}): Promise<ResolvedR2Config> {
  const requestedServices = options.services || DEFAULT_INFRA_SERVICES;
  const services = uniq(
    ALLOW_GENERIC_SECRET_SERVICE ? [...requestedServices, 'default'] : requestedServices
  );
  const bucketFallback = options.bucketFallback || 'npm-registry';

  const accountId = await resolveSecretField('R2_ACCOUNT_ID', ['R2_ACCOUNT_ID'], services);
  const accessKeyId = await resolveSecretField('R2_ACCESS_KEY_ID', ['R2_ACCESS_KEY_ID'], services);
  const secretAccessKey = await resolveSecretField(
    'R2_SECRET_ACCESS_KEY',
    ['R2_SECRET_ACCESS_KEY'],
    services
  );
  const bucketName = await resolveSecretField(
    'R2_REGISTRY_BUCKET',
    ['R2_REGISTRY_BUCKET', 'R2_BUCKET_NAME', 'R2_BUCKET'],
    services,
    bucketFallback
  );

  const endpoint = await resolveSecretField(
    'R2_ENDPOINT',
    ['R2_ENDPOINT'],
    services,
    accountId ? `https://${accountId}.r2.cloudflarestorage.com` : ''
  );

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    endpoint: endpoint || (options.endpointOptional ? undefined : endpoint),
    bucketName,
  };
}

export function resolveProfileSecretsService(): string {
  return Bun.env.PROFILE_SECRETS_SERVICE || 'factorywager';
}
