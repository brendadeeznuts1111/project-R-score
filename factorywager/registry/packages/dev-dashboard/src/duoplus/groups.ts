/**
 * Device grouping and tagging (cookie-based).
 */

const COOKIE_PREFIX = 'dw_';
const GROUPS_COOKIE = COOKIE_PREFIX + 'device_groups';
const TAG_PREFIX = COOKIE_PREFIX + 'tags_';

export interface DeviceGroup {
  name: string;
  devices: string[];
  color?: string;
  icon?: string;
  isSmart?: boolean;
  rules?: string;
  lastUpdated?: number;
}

export type DeviceGroups = Record<string, DeviceGroup>;

const DEFAULT_GROUPS: DeviceGroups = {
  favorites: {
    name: 'Favorites',
    devices: [],
    color: '#FFD700',
    icon: '⭐',
  },
  recently_viewed: {
    name: 'Recently Viewed',
    devices: [],
    color: '#4CAF50',
    icon: '🕒',
  },
  offline_devices: {
    name: 'Offline',
    devices: [],
    color: '#F44336',
    icon: '🔴',
  },
};

function getCookieMap(cookieHeader: string | null): Bun.CookieMap {
  return new Bun.CookieMap(cookieHeader || '');
}

const COOKIE_OPTIONS = { path: '/' as const, sameSite: 'lax' as const, maxAge: 365 * 24 * 60 * 60 };

export function getUserGroups(cookieHeader: string | null): DeviceGroups {
  const cookies = getCookieMap(cookieHeader);
  const raw = cookies.get(GROUPS_COOKIE);
  if (!raw) return { ...JSON.parse(JSON.stringify(DEFAULT_GROUPS)) };
  try {
    const parsed = JSON.parse(raw) as DeviceGroups;
    return { ...DEFAULT_GROUPS, ...parsed };
  } catch {
    return { ...JSON.parse(JSON.stringify(DEFAULT_GROUPS)) };
  }
}

export function setUserGroups(cookieHeader: string | null, groups: DeviceGroups): string[] {
  const cookies = getCookieMap(cookieHeader);
  cookies.set(GROUPS_COOKIE, JSON.stringify(groups), COOKIE_OPTIONS);
  return cookies.toSetCookieHeaders();
}

export function addToGroup(
  cookieHeader: string | null,
  groupId: string,
  deviceId: string
): { groups: DeviceGroups; headers: string[] } {
  const groups = getUserGroups(cookieHeader);
  if (!groups[groupId]) {
    groups[groupId] = {
      name: groupId,
      devices: [],
      color: '#888',
      icon: '📱',
    };
  }
  if (!groups[groupId].devices.includes(deviceId)) {
    groups[groupId].devices.push(deviceId);
  }
  const headers = setUserGroups(cookieHeader, groups);
  return { groups, headers };
}

export function removeFromGroup(
  cookieHeader: string | null,
  groupId: string,
  deviceId: string
): { groups: DeviceGroups; headers: string[] } {
  const groups = getUserGroups(cookieHeader);
  if (groups[groupId]) {
    groups[groupId].devices = groups[groupId].devices.filter((id) => id !== deviceId);
  }
  const headers = setUserGroups(cookieHeader, groups);
  return { groups, headers };
}

export function getDeviceTags(cookieHeader: string | null, deviceId: string): string[] {
  const cookies = getCookieMap(cookieHeader);
  const raw = cookies.get(TAG_PREFIX + deviceId);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function tagDevice(
  cookieHeader: string | null,
  deviceId: string,
  tags: string[]
): { tags: string[]; headers: string[] } {
  const current = getDeviceTags(cookieHeader, deviceId);
  const added = tags.filter((t) => typeof t === 'string' && !current.includes(t));
  const next = [...current];
  added.forEach((t) => next.push(t));
  const cookies = getCookieMap(cookieHeader);
  cookies.set(TAG_PREFIX + deviceId, JSON.stringify(next), COOKIE_OPTIONS);
  return { tags: next, headers: cookies.toSetCookieHeaders() };
}

export function untagDevice(
  cookieHeader: string | null,
  deviceId: string,
  tag: string
): { tags: string[]; headers: string[] } {
  const current = getDeviceTags(cookieHeader, deviceId).filter((t) => t !== tag);
  const cookies = getCookieMap(cookieHeader);
  cookies.set(TAG_PREFIX + deviceId, JSON.stringify(current), COOKIE_OPTIONS);
  return { tags: current, headers: cookies.toSetCookieHeaders() };
}

export function searchByTags(
  cookieHeader: string | null,
  deviceIds: string[],
  tags: string[]
): string[] {
  if (tags.length === 0) return deviceIds;
  return deviceIds.filter((id) => {
    const deviceTags = getDeviceTags(cookieHeader, id);
    return tags.every((t) => deviceTags.includes(t));
  });
}
