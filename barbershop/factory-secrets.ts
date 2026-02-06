import { env, secrets } from 'bun';

type Component = 'pty' | 'r2' | 'csrf' | 'barber' | 'admin';

type SecretSpec = {
  id: string;
  component: Component;
  name: string;
  envKey: string;
  defaultValue?: string;
  legacy?: Array<{ service: string; name: string }>;
};

const FACTORY_ORG = 'factorywager';
const FACTORY_APP = 'abtest';
const APP_ENV = env.APP_ENV ?? 'local';
const USE_BUN_SECRETS = env.USE_BUN_SECRETS === 'true';

export const FACTORY_SECRET_SPECS: SecretSpec[] = [
  {
    id: 'PAYPAL_SECRET',
    component: 'barber',
    name: 'paypal_secret',
    envKey: 'PAYPAL_SECRET',
    defaultValue: 'sk_test_xxx',
    legacy: [{ service: 'barber', name: 'PAYPAL_SECRET' }]
  },
  {
    id: 'ADMIN_KEY',
    component: 'admin',
    name: 'admin_key',
    envKey: 'ADMIN_KEY',
    defaultValue: 'godmode123',
    legacy: [{ service: 'admin', name: 'ADMIN_KEY' }]
  },
  {
    id: 'R2_BUCKET',
    component: 'r2',
    name: 'bucket',
    envKey: 'R2_BUCKET',
    legacy: [{ service: 'r2', name: 'BUCKET' }]
  },
  {
    id: 'R2_PREFIX',
    component: 'r2',
    name: 'prefix',
    envKey: 'R2_PREFIX',
    defaultValue: 'barbershop',
    legacy: [{ service: 'r2', name: 'PREFIX' }]
  },
  {
    id: 'R2_ACCESS_KEY_ID',
    component: 'r2',
    name: 'access_key_id',
    envKey: 'R2_ACCESS_KEY_ID',
    legacy: [{ service: 'r2', name: 'ACCESS_KEY_ID' }]
  },
  {
    id: 'R2_SECRET_ACCESS_KEY',
    component: 'r2',
    name: 'secret_access_key',
    envKey: 'R2_SECRET_ACCESS_KEY',
    legacy: [{ service: 'r2', name: 'SECRET_ACCESS_KEY' }]
  },
  {
    id: 'R2_ENDPOINT',
    component: 'r2',
    name: 'endpoint',
    envKey: 'R2_ENDPOINT',
    legacy: [{ service: 'r2', name: 'ENDPOINT' }]
  },
  {
    id: 'CLOUDFLARE_ACCOUNT_ID',
    component: 'r2',
    name: 'account_id',
    envKey: 'CLOUDFLARE_ACCOUNT_ID',
    legacy: [{ service: 'r2', name: 'ACCOUNT_ID' }]
  },
  {
    id: 'CSRF_HMAC_KEY',
    component: 'csrf',
    name: 'csrf_hmac_key',
    envKey: 'CSRF_HMAC_KEY'
  },
  {
    id: 'CSRF_ROTATION_KEY',
    component: 'csrf',
    name: 'csrf_rotation_key',
    envKey: 'CSRF_ROTATION_KEY'
  },
  {
    id: 'PTY_ADMIN_KEY',
    component: 'pty',
    name: 'admin_key',
    envKey: 'PTY_ADMIN_KEY'
  },
  {
    id: 'PTY_SESSION_SIGNING_KEY',
    component: 'pty',
    name: 'session_signing_key',
    envKey: 'PTY_SESSION_SIGNING_KEY'
  }
];

export function factoryService(component: Component) {
  return `${FACTORY_ORG}.${FACTORY_APP}.${component}.${APP_ENV}`;
}

export function getSecretSpec(id: string) {
  return FACTORY_SECRET_SPECS.find((spec) => spec.id === id);
}

export async function getFactorySecret(id: string): Promise<string | null> {
  const spec = getSecretSpec(id);
  if (!spec) return null;
  const envValue = env[spec.envKey];
  if (envValue) return envValue;
  if (!USE_BUN_SECRETS) return spec.defaultValue ?? null;

  const primary = await secrets.get({ service: factoryService(spec.component), name: spec.name });
  if (primary?.value) return primary.value;

  for (const legacy of spec.legacy ?? []) {
    const old = await secrets.get({ service: legacy.service, name: legacy.name });
    if (old?.value) return old.value;
  }
  return spec.defaultValue ?? null;
}

export async function setFactorySecret(id: string, value: string) {
  const spec = getSecretSpec(id);
  if (!spec) return false;
  await secrets.set({ service: factoryService(spec.component), name: spec.name, value });
  return true;
}

export async function probeFactorySecret(id: string) {
  const spec = getSecretSpec(id);
  if (!spec) return { id, found: false, source: 'missing-spec' };
  if (env[spec.envKey]) return { id, found: true, source: 'env', service: null, name: spec.name };
  if (!USE_BUN_SECRETS) return { id, found: Boolean(spec.defaultValue), source: spec.defaultValue ? 'default' : 'not-configured', service: null, name: spec.name };

  const service = factoryService(spec.component);
  const primary = await secrets.get({ service, name: spec.name });
  if (primary?.value) return { id, found: true, source: 'bun.secrets', service, name: spec.name };
  for (const legacy of spec.legacy ?? []) {
    const old = await secrets.get({ service: legacy.service, name: legacy.name });
    if (old?.value) return { id, found: true, source: 'legacy-bun.secrets', service: legacy.service, name: legacy.name };
  }
  return { id, found: Boolean(spec.defaultValue), source: spec.defaultValue ? 'default' : 'not-configured', service, name: spec.name };
}
