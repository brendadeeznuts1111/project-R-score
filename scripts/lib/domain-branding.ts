import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkContrast, generatePalette, parseHSL } from '../../lib/utils/advanced-hsl-colors';

type DomainBrandingConfig = {
  default?: {
    baseSeed?: number;
    saturation?: number;
    lightness?: number;
  };
  domains?: Record<
    string,
    {
      baseSeed?: number;
      saturation?: number;
      lightness?: number;
      subdomainOffsets?: Record<string, number>;
    }
  >;
};

export type DomainBrandingResolution = {
  requestDomain: string;
  apexDomain: string;
  subdomain: string;
  baseSeed: number;
  offset: number;
  resolvedSeed: number;
  saturation: number;
  lightness: number;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  contrast: {
    ratio: number;
    level: 'fail' | 'AA' | 'AAA';
  };
};

const DEFAULT_CONFIG: Required<DomainBrandingConfig> = {
  default: {
    baseSeed: 210,
    saturation: 90,
    lightness: 60,
  },
  domains: {
    'factory-wager.com': {
      baseSeed: 210,
      saturation: 90,
      lightness: 60,
      subdomainOffsets: {
        '@': 0,
        www: 0,
        dashboard: 0,
        docs: -20,
        api: 15,
        status: 45,
        monitor: 45,
        admin: 10,
        cdn: 20,
        registry: 12,
        r2: 18,
        blog: -10,
      },
    },
  },
};

let cachedConfig: Required<DomainBrandingConfig> | null = null;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeHue(seed: number): number {
  return ((seed % 360) + 360) % 360;
}

function splitDomain(input: string): { apexDomain: string; subdomain: string } {
  const normalized = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
  const labels = normalized.split('.').filter(Boolean);
  if (labels.length < 2) {
    return {
      apexDomain: normalized || 'factory-wager.com',
      subdomain: '@',
    };
  }

  const apexDomain = labels.slice(-2).join('.');
  const subdomain = labels.length > 2 ? labels.slice(0, -2).join('.') : '@';
  return { apexDomain, subdomain };
}

function loadConfig(): Required<DomainBrandingConfig> {
  if (cachedConfig) return cachedConfig;

  const path = resolve(process.cwd(), 'config', 'domain-branding.json');
  if (!existsSync(path)) {
    cachedConfig = DEFAULT_CONFIG;
    return cachedConfig;
  }

  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as DomainBrandingConfig;
    const fallback = DEFAULT_CONFIG.default;
    const normalized: Required<DomainBrandingConfig> = {
      default: {
        baseSeed: clamp(Number(parsed.default?.baseSeed ?? fallback.baseSeed), 0, 360),
        saturation: clamp(Number(parsed.default?.saturation ?? fallback.saturation), 0, 100),
        lightness: clamp(Number(parsed.default?.lightness ?? fallback.lightness), 0, 100),
      },
      domains: parsed.domains || DEFAULT_CONFIG.domains,
    };
    cachedConfig = normalized;
    return normalized;
  } catch {
    cachedConfig = DEFAULT_CONFIG;
    return cachedConfig;
  }
}

export function resolveDomainBranding(domainOrHost: string): DomainBrandingResolution {
  const cfg = loadConfig();
  const { apexDomain, subdomain } = splitDomain(domainOrHost);
  const domainCfg = cfg.domains[apexDomain] || {};

  const baseSeed = clamp(Number(domainCfg.baseSeed ?? cfg.default.baseSeed), 0, 360);
  const saturation = clamp(Number(domainCfg.saturation ?? cfg.default.saturation), 0, 100);
  const lightness = clamp(Number(domainCfg.lightness ?? cfg.default.lightness), 0, 100);

  const offsets = domainCfg.subdomainOffsets || {};
  const rootLabel = subdomain === '@' ? '@' : subdomain.split('.')[0] || '@';
  const offset = Number(offsets[subdomain] ?? offsets[rootLabel] ?? offsets['@'] ?? 0);

  const resolvedSeed = normalizeHue(baseSeed + offset);
  const primary = `hsl(${resolvedSeed}, ${saturation}%, ${lightness}%)`;
  const secondary = `hsl(${normalizeHue(resolvedSeed + 30)}, ${clamp(saturation - 15, 0, 100)}%, ${clamp(lightness + 5, 0, 100)}%)`;
  const accent = `hsl(${normalizeHue(resolvedSeed + 180)}, ${clamp(saturation + 5, 0, 100)}%, ${clamp(lightness - 10, 0, 100)}%)`;

  const contrast = checkContrast(parseHSL(primary), parseHSL(accent));
  const generated = generatePalette({ h: resolvedSeed, s: saturation, l: lightness });

  return {
    requestDomain: String(domainOrHost || '').trim().toLowerCase(),
    apexDomain,
    subdomain,
    baseSeed,
    offset,
    resolvedSeed,
    saturation,
    lightness,
    palette: {
      primary: generated.palette.primary,
      secondary: Bun.color(secondary, 'hex') || generated.palette.analogous[0] || generated.palette.primary,
      accent: Bun.color(accent, 'hex') || generated.palette.complementary,
    },
    contrast: {
      ratio: Number(contrast.ratio.toFixed(2)),
      level: contrast.level,
    },
  };
}
