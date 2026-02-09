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
const RESOLUTION_CACHE = new Map<string, DomainBrandingResolution>();
const CACHE_MAX = 256;

const THREE_PART_PUBLIC_SUFFIXES = new Set([
  'co.uk',
  'org.uk',
  'gov.uk',
  'ac.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.jp',
  'com.br',
  'com.mx',
  'com.tr',
]);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeHue(seed: number): number {
  return ((seed % 360) + 360) % 360;
}

function splitDomain(
  input: string,
  cfg: Required<DomainBrandingConfig>
): { apexDomain: string; subdomain: string } {
  const normalized = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');

  const configuredDomains = Object.keys(cfg.domains || {}).sort((a, b) => b.length - a.length);
  for (const domain of configuredDomains) {
    if (normalized === domain) {
      return { apexDomain: domain, subdomain: '@' };
    }
    if (normalized.endsWith(`.${domain}`)) {
      const subdomain = normalized.slice(0, normalized.length - domain.length - 1) || '@';
      return { apexDomain: domain, subdomain };
    }
  }

  const labels = normalized.split('.').filter(Boolean);
  if (labels.length < 2) {
    return {
      apexDomain: normalized || 'factory-wager.com',
      subdomain: '@',
    };
  }

  const suffix2 = labels.slice(-2).join('.');
  const apexPartCount = labels.length >= 3 && THREE_PART_PUBLIC_SUFFIXES.has(suffix2) ? 3 : 2;
  const apexDomain = labels.slice(-apexPartCount).join('.');
  const subdomain = labels.length > apexPartCount ? labels.slice(0, -apexPartCount).join('.') : '@';
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
  const normalizedInput = String(domainOrHost || '').trim().toLowerCase();
  const cached = RESOLUTION_CACHE.get(normalizedInput);
  if (cached) {
    return cached;
  }

  const cfg = loadConfig();
  const { apexDomain, subdomain } = splitDomain(normalizedInput, cfg);
  const domainCfg = cfg.domains[apexDomain] || {};

  const baseSeed = clamp(Number(domainCfg.baseSeed ?? cfg.default.baseSeed), 0, 360);
  const saturation = clamp(Number(domainCfg.saturation ?? cfg.default.saturation), 0, 100);
  const lightness = clamp(Number(domainCfg.lightness ?? cfg.default.lightness), 0, 100);

  const offsets = domainCfg.subdomainOffsets || {};
  const labels = subdomain === '@' ? [] : subdomain.split('.').filter(Boolean);
  const nearestLabel = labels.length > 0 ? labels[labels.length - 1] : '@';
  const offset = Number(offsets[subdomain] ?? offsets[nearestLabel] ?? offsets['@'] ?? 0);

  const resolvedSeed = normalizeHue(baseSeed + offset);
  const primary = `hsl(${resolvedSeed}, ${saturation}%, ${lightness}%)`;
  const secondary = `hsl(${normalizeHue(resolvedSeed + 30)}, ${clamp(saturation - 15, 0, 100)}%, ${clamp(lightness + 5, 0, 100)}%)`;
  const accent = `hsl(${normalizeHue(resolvedSeed + 180)}, ${clamp(saturation + 5, 0, 100)}%, ${clamp(lightness - 10, 0, 100)}%)`;

  const contrast = checkContrast(parseHSL(primary), parseHSL(accent));
  const generated = generatePalette({ h: resolvedSeed, s: saturation, l: lightness });

  const resolved: DomainBrandingResolution = {
    requestDomain: normalizedInput,
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

  if (RESOLUTION_CACHE.size >= CACHE_MAX) {
    RESOLUTION_CACHE.clear();
  }
  RESOLUTION_CACHE.set(normalizedInput, resolved);

  return resolved;
}
