import { CLI_DOCUMENTATION_URLS } from '../../../lib/docs/constants/cli';
import { BUN_UTILS_URLS } from '../../../lib/docs/constants/utils';

type ConstantValidation = { isValid: boolean; errors: string[] };
type ConstantValidatorLike = {
  validateConstant(name: string): ConstantValidation;
};
type AutoHealerLike = {
  healAll(): Promise<{ totalFixes: number }>;
};

type PlatformValidators = {
  ConstantValidator: ConstantValidatorLike;
  AutoHealer: AutoHealerLike;
};

type PlatformModule = {
  ConstantValidator: ConstantValidatorLike;
  AutoHealer: AutoHealerLike;
};

function collectPaths(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    out.push(value);
    return out;
  }
  if (value && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectPaths(nested, out);
    }
  }
  return out;
}

function normalizePath(path: string): string {
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  return withSlash.replace(/\/+/g, '/');
}

const fallbackConstantValidator: ConstantValidatorLike = {
  validateConstant(name: string): ConstantValidation {
    const errors: string[] = [];
    switch (name) {
      case 'cli-categories-count': {
        const count = Object.keys(CLI_DOCUMENTATION_URLS).length;
        if (count === 0) errors.push('CLI_DOCUMENTATION_URLS has no categories');
        break;
      }
      case 'utils-categories-count': {
        const count = Object.keys(BUN_UTILS_URLS).length;
        if (count === 0) errors.push('BUN_UTILS_URLS has no categories');
        break;
      }
      case 'documentation-base-url': {
        const paths = [...collectPaths(CLI_DOCUMENTATION_URLS), ...collectPaths(BUN_UTILS_URLS)];
        for (const path of paths) {
          if (!path.startsWith('/docs/')) {
            errors.push(`Non-doc path detected: ${path}`);
          }
        }
        break;
      }
      default:
        errors.push(`Unknown constant: ${name}`);
        break;
    }
    return { isValid: errors.length === 0, errors };
  },
};

const fallbackAutoHealer: AutoHealerLike = {
  async healAll(): Promise<{ totalFixes: number }> {
    const paths = [...collectPaths(CLI_DOCUMENTATION_URLS), ...collectPaths(BUN_UTILS_URLS)];
    const fixable = paths.filter((p) => normalizePath(p) !== p).length;
    return { totalFixes: fixable };
  },
};

let validatorsPromise: Promise<PlatformValidators> | null = null;

function createDefaultPlatformValidatorLoader(): () => Promise<unknown> {
  return async () => {
    const modulePath = '../../../lib/validation/' + 'cli-constants-validation';
    const dynamicImport = new Function('m', 'return import(m)') as (
      m: string
    ) => Promise<unknown>;
    return dynamicImport(modulePath);
  };
}

let platformValidatorLoader: () => Promise<unknown> = createDefaultPlatformValidatorLoader();

function isPlatformModule(value: unknown): value is PlatformModule {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  const hasConstantValidator =
    !!candidate.ConstantValidator &&
    typeof (candidate.ConstantValidator as Record<string, unknown>).validateConstant ===
      'function';
  const hasAutoHealer =
    !!candidate.AutoHealer &&
    typeof (candidate.AutoHealer as Record<string, unknown>).healAll === 'function';
  return hasConstantValidator && hasAutoHealer;
}

export async function getPlatformValidators(): Promise<PlatformValidators> {
  if (!validatorsPromise) {
    validatorsPromise = (async () => {
      try {
        // Load dynamically to avoid hard compile-time coupling to the platform module graph.
        const mod = await platformValidatorLoader();
        if (isPlatformModule(mod)) {
          return {
            ConstantValidator: mod.ConstantValidator,
            AutoHealer: mod.AutoHealer,
          };
        }
      } catch {
        // Fall through to validated local fallback behavior.
      }
      return { ConstantValidator: fallbackConstantValidator, AutoHealer: fallbackAutoHealer };
    })();
  }
  return validatorsPromise;
}

export function setPlatformValidatorLoaderForTest(loader: (() => Promise<unknown>) | null): void {
  platformValidatorLoader = loader ?? createDefaultPlatformValidatorLoader();
  validatorsPromise = null;
}

export async function runAutoHealForTest(): Promise<{ totalFixes: number }> {
  const { AutoHealer } = await getPlatformValidators();
  return AutoHealer.healAll();
}
