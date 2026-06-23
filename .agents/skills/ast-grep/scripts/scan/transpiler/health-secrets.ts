const PLATFORM_SCOPE = process.platform === "win32" ? "ENTERPRISE" : "USER";

export type HealthSecretRef = {
  /** Original spec, e.g. sports-terminal/health/prod */
  channel: string;
  service: string;
  name: string;
  scopedService: string;
};

export function parseHealthUrlSecret(spec: string): HealthSecretRef {
  const trimmed = spec.trim();
  const slash = trimmed.indexOf("/");
  const service = slash < 0 ? trimmed : trimmed.slice(0, slash);
  const name = slash < 0 ? "health-url" : trimmed.slice(slash + 1);
  const scopedService = `supply-chain-${service}-${PLATFORM_SCOPE}`;
  return { channel: trimmed, service, name, scopedService };
}

type SecretOptions = {
  service: string;
  name: string;
  persist?: "CRED_PERSIST_ENTERPRISE";
};

function secretGetOptions(ref: HealthSecretRef): SecretOptions {
  const base: SecretOptions = { service: ref.scopedService, name: ref.name };
  if (process.platform === "win32") {
    return { ...base, persist: "CRED_PERSIST_ENTERPRISE" };
  }
  return base;
}

export async function resolveHealthUrlSecret(spec: string): Promise<{
  url: string;
  ref: HealthSecretRef;
}> {
  const ref = parseHealthUrlSecret(spec);
  const secrets = (Bun as { secrets?: typeof Bun.secrets }).secrets;
  if (!secrets?.get) {
    throw new Error("Bun.secrets unavailable — use --health-url for raw URL");
  }

  const value = await secrets.get(secretGetOptions(ref) as Parameters<typeof secrets.get>[0]);
  if (!value || typeof value !== "string") {
    throw new Error(
      `secret not found: ${ref.channel} (service=${ref.scopedService} name=${ref.name})`,
    );
  }
  const url = value.trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(`secret ${ref.channel} must be an http(s) URL`);
  }
  return { url, ref };
}

export function formatSecretChannelLog(ref: HealthSecretRef): string {
  const isolation = process.platform === "win32" ? "CRED_PERSIST_ENTERPRISE" : "USER";
  return `${ref.channel} (${ref.scopedService}/${ref.name} · ${isolation})`;
}