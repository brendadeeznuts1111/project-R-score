// config/constants.ts (New - Matrix Add)
export const CLI_FILTER = {
  OPS: ['=', '!=', '>', '<', 'in'] as const,  // =val, !=false, >10, in:US,CA
  OR_SEP: '--or',  // Chain OR groups
  ARG_PREFIX: '--filter',
  MAX_FILTERS: 10
} as const;

export const BULK_CONFIG = {
  SUCCESS_RATE: 0.9,  // 90% success
  BATCH_SIZE: 500,
  PROGRESS_INTERVAL: 100,
  APPLE_DOMAINS: ['@icloud.com', '@me.com', '@mac.com'] as const,
  COUNTRIES: ['US', 'UK', 'CA', 'AU', 'DE'] as const,
  CITIES: {
    US: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
    UK: ['London', 'Manchester', 'Birmingham', 'Glasgow', 'Liverpool'],
    CA: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'],
    AU: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
    DE: ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt']
  },
  PHONE_PREFIXES: {
    US: '+1',
    UK: '+44',
    CA: '+1',
    AU: '+61',
    DE: '+49'
  }
} as const;

export interface AppleID {
  email: `apple${string}${typeof BULK_CONFIG.APPLE_DOMAINS[number]}`;  // Typed email
  password?: string;  // Reg ready
  phone: string;  // +1-555-...
  success: boolean;
  country: typeof BULK_CONFIG.COUNTRIES[number];  // Typed US/UK/CA/AU/DE
  city: string;
  filename: string;
  batchID: string;
  created: string;  // ISO date
  r2Key?: string;  // apple-ids/user1.json
  embedUrl?: string;  // Inline R2
  metadata?: Record<string, string>;  // Pattern/userId
}

export const QUERY_DEFAULTS = {
  PREFIX: 'apple-ids/',
  LIMIT: 1000,
  FORMAT: 'table' as 'table' | 'csv' | 'json',
  PARALLEL: false,
  JSON_OUT: 'query-results.json',
  BUCKET_OVERRIDE: ''  // CLI --bucket prod
} as const;
