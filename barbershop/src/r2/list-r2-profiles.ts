#!/usr/bin/env bun

import { createHash, createHmac } from 'node:crypto';
import { getFactorySecret } from './factory-secrets';

function wrapAnsiLine(text: string, columns = Number(Bun.env.COLUMNS || 120)) {
  const wrap = (
    Bun as unknown as {
      wrapAnsi?: (
        input: string,
        width: number,
        options?: { hard?: boolean; wordWrap?: boolean; trim?: boolean }
      ) => string;
    }
  ).wrapAnsi;
  if (typeof wrap === 'function') {
    return wrap(text, columns, { wordWrap: true, trim: false });
  }
  return text;
}

function arg(name: string, fallback = '') {
  const prefix = `--${name}=`;
  const found = Bun.argv.find(a => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

type R2Config = {
  accountId: string;
  endpoint: string;
  bucket: string;
  prefix: string;
  accessKeyId: string;
  secretAccessKey: string;
};

async function resolveR2(): Promise<R2Config | null> {
  const accountId = Bun.env.R2_ACCOUNT_ID || '';
  const endpoint =
    Bun.env.R2_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '') ||
    (await getFactorySecret('R2_ENDPOINT')) ||
    '';
  const bucket =
    Bun.env.R2_BUCKET || Bun.env.R2_BUCKET_NAME || (await getFactorySecret('R2_BUCKET')) || '';
  const prefix = Bun.env.R2_PREFIX || (await getFactorySecret('R2_PREFIX')) || 'barbershop';
  const accessKeyId =
    Bun.env.R2_ACCESS_KEY_ID || (await getFactorySecret('R2_ACCESS_KEY_ID')) || '';
  const secretAccessKey =
    Bun.env.R2_SECRET_ACCESS_KEY || (await getFactorySecret('R2_SECRET_ACCESS_KEY')) || '';

  let effectiveAccountId = accountId;
  if (!effectiveAccountId && endpoint.includes('.r2.cloudflarestorage.com')) {
    effectiveAccountId =
      endpoint.replace(/^https?:\/\//, '').split('.r2.cloudflarestorage.com')[0] || '';
  }

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  return {
    accountId: effectiveAccountId,
    endpoint,
    bucket,
    prefix: prefix.replace(/\/+$/g, ''),
    accessKeyId,
    secretAccessKey,
  };
}

function toAmzDate(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return { amz: `${y}${m}${day}T${hh}${mm}${ss}Z`, date: `${y}${m}${day}` };
}

function sha256Hex(data: string) {
  return createHash('sha256').update(data).digest('hex');
}

function hmac(key: Buffer | string, data: string) {
  return createHmac('sha256', key).update(data).digest();
}

function signV4(
  cfg: R2Config,
  method: string,
  canonicalUri: string,
  canonicalQuery: string,
  payloadHash: string
) {
  const host = new URL(cfg.endpoint).host;
  const { amz, date } = toAmzDate();
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amz}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuery}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const scope = `${date}/auto/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amz}\n${scope}\n${sha256Hex(canonicalRequest)}`;
  const kDate = hmac(`AWS4${cfg.secretAccessKey}`, date);
  const kRegion = hmac(kDate, 'auto');
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = hmac(kSigning, stringToSign).toString('hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return {
    host,
    amz,
    authorization,
  };
}

function decodeXmlValue(value: string) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

function parseContents(xml: string) {
  const items: Array<{ key: string; size: number; lastModified: string }> = [];
  const blocks = xml.match(/<Contents>[\s\S]*?<\/Contents>/g) || [];
  for (const block of blocks) {
    const key = block.match(/<Key>([\s\S]*?)<\/Key>/)?.[1] || '';
    const size = Number(block.match(/<Size>(\d+)<\/Size>/)?.[1] || '0');
    const lastModified = block.match(/<LastModified>([\s\S]*?)<\/LastModified>/)?.[1] || '';
    if (key) {
      items.push({ key: decodeXmlValue(key), size, lastModified });
    }
  }
  return items;
}

const max = Number(arg('max', '20'));
const extraPrefix = arg('prefix', '');
const json = arg('json', 'false') === 'true';

const r2 = await resolveR2();
if (!r2) {
  console.error('[list-r2-profiles] missing R2 config');
  process.exit(1);
}

const effectivePrefix = `${r2.prefix}/profiles/sampling/${extraPrefix}`;
const canonicalUri = `/${encodeURIComponent(r2.bucket).replaceAll('%2F', '/')}`;
const query = new URLSearchParams({
  'list-type': '2',
  prefix: effectivePrefix,
  'max-keys': String(Math.max(1, Math.min(1000, max))),
});
const canonicalQuery = query
  .toString()
  .split('&')
  .filter(Boolean)
  .map(part => part.split('=').map(decodeURIComponent))
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
  .join('&');

const payloadHash = sha256Hex('');
const signed = signV4(r2, 'GET', canonicalUri, canonicalQuery, payloadHash);
const url = `${r2.endpoint}/${r2.bucket}?${query.toString()}`;

const res = await fetch(url, {
  method: 'GET',
  headers: {
    Host: signed.host,
    Authorization: signed.authorization,
    'x-amz-date': signed.amz,
    'x-amz-content-sha256': payloadHash,
  },
});

if (!res.ok) {
  console.error(`[list-r2-profiles] list failed: ${res.status} ${res.statusText}`);
  console.error(await res.text());
  process.exit(1);
}

const xml = await res.text();
const items = parseContents(xml)
  .sort((a, b) => b.key.localeCompare(a.key))
  .slice(0, max);

if (json) {
  console.log(JSON.stringify({ prefix: effectivePrefix, count: items.length, items }, null, 2));
  process.exit(0);
}

console.log(`[list-r2-profiles] prefix=${effectivePrefix} count=${items.length}`);
for (const item of items) {
  console.log(wrapAnsiLine(`${item.lastModified || '-'}\t${item.size}\t${item.key}`));
}
