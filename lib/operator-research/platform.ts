// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { loadOperators } from './operators.ts';
import { runDoctor, type DoctorReport } from './doctor.ts';
import { listTaskIds } from './tasks.ts';
import { checkBunVersion } from './version-check.ts';

export type PlatformSnapshot = {
  bun: {
    version: string;
    revision: string;
    required: string;
    satisfies: boolean;
  };
  agent: {
    name: string;
    version: string;
  };
  features: DoctorReport['features'];
  tools: DoctorReport['tools'];
  checks: DoctorReport['checks'];
  auth: {
    enabled: boolean;
    keyCount: number;
  };
  config: {
    operators: number;
    watched: boolean;
    tasks: number;
  };
  generatedAt: string;
};

let configWatchActive = false;

export function setConfigWatchingActive(active: boolean): void {
  configWatchActive = active;
}

export function isConfigWatchingActive(): boolean {
  return configWatchActive;
}

function authKeysExist(): boolean {
  return Boolean(
    Bun.env.PARTNER_API_TOKEN ||
      Bun.env.OPERATOR_API_TOKEN ||
      Bun.env.OPERATOR_RESEARCH_API_KEY ||
      Bun.env.FACTORYWAGER_API_KEY
  );
}

async function getApiKeyCount(): Promise<number> {
  const keys = [
    Bun.env.PARTNER_API_TOKEN,
    Bun.env.OPERATOR_API_TOKEN,
    Bun.env.OPERATOR_RESEARCH_API_KEY,
    Bun.env.FACTORYWAGER_API_KEY,
    Bun.env.API_KEY,
  ].filter(k => typeof k === 'string' && k.length > 0);
  return new Set(keys).size;
}

/** Full `/api/platform` payload — version, features, tools, auth, config. */
export async function getPlatformSnapshot(): Promise<PlatformSnapshot> {
  const [version, doctor, operators, keyCount] = await Promise.all([
    checkBunVersion(),
    runDoctor(),
    loadOperators(),
    getApiKeyCount(),
  ]);

  return {
    bun: {
      version: version.bunVersion,
      revision: version.bunRevision,
      required: version.required,
      satisfies: version.satisfies,
    },
    agent: {
      name: version.packageName,
      version: version.agentVersion,
    },
    features: doctor.features,
    tools: doctor.tools,
    checks: doctor.checks,
    auth: {
      enabled: authKeysExist(),
      keyCount,
    },
    config: {
      operators: operators.length,
      watched: isConfigWatchingActive(),
      tasks: listTaskIds().length,
    },
    generatedAt: new Date().toISOString(),
  };
}
