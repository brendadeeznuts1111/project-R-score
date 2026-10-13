import { isIP } from 'node:net';

function blockedIpv4(host: string): boolean {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a = 0, b = 0] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
}

function ipv6Bytes(host: string): number[] | null {
  if (!host.includes(':')) return null;
  const [left = '', right = ''] = host.split('::');
  if (host.split('::').length > 2) return null;
  const parseSide = (side: string): number[] | null => {
    if (!side) return [];
    const words: number[] = [];
    for (const part of side.split(':')) {
      if (!/^[0-9a-f]{1,4}$/i.test(part)) return null;
      words.push(Number.parseInt(part, 16));
    }
    return words;
  };
  const before = parseSide(left);
  const after = parseSide(right);
  if (!before || !after) return null;
  const omitted = 8 - before.length - after.length;
  if ((host.includes('::') && omitted < 1) || (!host.includes('::') && omitted !== 0)) return null;
  const words = [...before, ...Array.from({ length: omitted }, () => 0), ...after];
  return words.flatMap(word => [word >> 8, word & 0xff]);
}

function blockedIpv6(host: string): boolean {
  if (!host.includes(':')) return false;
  const bytes = ipv6Bytes(host);
  if (!bytes) return true;
  if (
    bytes.every(byte => byte === 0) ||
    (bytes.slice(0, 15).every(byte => byte === 0) && bytes[15] === 1)
  )
    return true;
  if ((bytes[0]! & 0xfe) === 0xfc || bytes[0] === 0xff) return true;
  // Only globally routable unicast is eligible; exclude site-local, NAT64 and transition ranges.
  if ((bytes[0]! & 0xe0) !== 0x20) return true;
  if (bytes[0] === 0x20 && bytes[1] === 0x02) return true;
  if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2]! < 2) return true;
  if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x0d && bytes[3] === 0xb8) return true;
  const mapped =
    bytes.slice(0, 10).every(byte => byte === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
  return mapped && blockedIpv4(bytes.slice(12).join('.'));
}

export function blockedRemoteHost(hostname: string): boolean {
  const host = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.+$/, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  if (blockedIpv4(host)) return true;
  return blockedIpv6(host);
}

export function isPublicRemoteAddress(address: string): boolean {
  return isIP(address) !== 0 && !blockedRemoteHost(address);
}
