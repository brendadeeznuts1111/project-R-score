// utils/query-opts.ts (New - CLI Parser)
import { QUERY_DEFAULTS } from '../config/constants';

export type QueryFormat = typeof QUERY_DEFAULTS.FORMAT;

export interface SuperQueryOpts {
  prefix: string;
  limit: number;
  format: QueryFormat;
  parallel: boolean;
  jsonOut: string;
  bucket: string;
  minSize?: number;
  maxSize?: number;
  since?: string;
  until?: string;
}

export function parseQueryOpts(cliArgs: string[]): SuperQueryOpts {
  const minSize = cliArgs.find(a => a.startsWith('--min-size='))?.split('=')[1];
  const maxSize = cliArgs.find(a => a.startsWith('--max-size='))?.split('=')[1];
  const since = cliArgs.find(a => a.startsWith('--since='))?.split('=')[1];
  const until = cliArgs.find(a => a.startsWith('--until='))?.split('=')[1];

  return {
    prefix: cliArgs.find(a => a.startsWith('--prefix='))?.split('=')[1] || QUERY_DEFAULTS.PREFIX,
    limit: +(cliArgs.find(a => a.startsWith('--limit='))?.split('=')[1] || QUERY_DEFAULTS.LIMIT),
    format: (cliArgs.find(a => a.startsWith('--format='))?.split('=')[1] as QueryFormat) || QUERY_DEFAULTS.FORMAT,
    parallel: cliArgs.includes('--parallel'),
    jsonOut: cliArgs.find(a => a.startsWith('--json-out='))?.split('=')[1] || QUERY_DEFAULTS.JSON_OUT,
    bucket: cliArgs.find(a => a.startsWith('--bucket='))?.split('=')[1] || Bun.env.R2_BUCKET || 'apple-ids-bucket',
    minSize: minSize ? parseInt(minSize) : undefined,
    maxSize: maxSize ? parseInt(maxSize) : undefined,
    since,
    until
  };
}
