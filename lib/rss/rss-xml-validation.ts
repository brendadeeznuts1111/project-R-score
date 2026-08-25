export type XmlRecord = Record<string, unknown>;
const RSS_DATE =
  /^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+)?\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,}\s+\d{2}:\d{2}(?::\d{2})?\s+(?:UT|GMT|EST|EDT|CST|CDT|MST|MDT|PST|PDT|[+-]\d{4})$/;

export function isXmlRecord(value: unknown): value is XmlRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseXmlText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  return isXmlRecord(value) ? parseXmlText(value['#text']) : '';
}

export function parseXmlElements(value: unknown, field: string): XmlRecord[] {
  if (value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];
  if (values.some(entry => !isXmlRecord(entry))) {
    throw new Error(`${field} must contain elements`);
  }
  return values as XmlRecord[];
}

export function assertSingletons(
  record: XmlRecord,
  fields: readonly string[],
  context: string
): void {
  for (const field of fields) {
    if (Array.isArray(record[field])) throw new Error(`${context} <${field}> must not repeat`);
  }
}

export function requiredText(record: XmlRecord, field: string, context: string): string {
  const value = parseXmlText(record[field]);
  if (!value) throw new Error(`${context} requires <${field}>`);
  return value;
}

export function absoluteHttpUrl(value: string, field: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${field} must be an absolute HTTP(S) URL`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error(`${field} must be an absolute HTTP(S) URL without credentials`);
  }
  return url.href;
}

export function assertRssDate(value: string, field: string): void {
  if (!RSS_DATE.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be an RFC 822 date`);
  }
}

export function parseXmlInteger(
  value: unknown,
  field: string,
  options: { min: number; fallback?: number }
): number {
  const raw = parseXmlText(value);
  if (!raw && options.fallback !== undefined) return options.fallback;
  if (!/^(?:0|[1-9]\d*)$/.test(raw)) throw new Error(`${field} must be an integer`);
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < options.min) {
    throw new Error(`${field} must be an integer >= ${options.min}`);
  }
  return parsed;
}
