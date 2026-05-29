/**
 * DuoPlus Cloud Phone API fragment loader.
 *
 * Fetches device info from the DuoPlus API and renders HTML fragments with
 * cookie-based caching and user preferences (theme, compact view).
 *
 * API: POST /api/v1/cloudPhone/info with body { image_id }
 */

const COOKIE_PREFIX = 'dw_';
const MY_DEVICES_COOKIE = COOKIE_PREFIX + 'my_devices';
const DEVICE_CACHE_PREFIX = COOKIE_PREFIX + 'device_';
const MEMORY_CACHE_MS = 5 * 60 * 1000; // 5 min
const COOKIE_CACHE_SEC = 120; // 2 min

export interface DuoPlusDeviceInfo {
  id?: string;
  name?: string;
  os?: string;
  proxy?: { city?: string; country?: string };
  sim?: { status?: number; msisdn?: string };
  device?: { model?: string; imei?: string };
  wifi?: { status?: number; name?: string };
  error?: string;
}

export interface DuoPlusApiResponse {
  code: number;
  message?: string;
  data?: DuoPlusDeviceInfo;
}

export interface DuoPlusFragmentOptions {
  apiBaseUrl: string;
  apiKey?: string;
}

export class DuoPlusFragmentLoader {
  private apiBaseUrl: string;
  private apiKey?: string;
  private deviceCache = new Map<string, { data: DuoPlusDeviceInfo; timestamp: number }>();

  constructor(options: DuoPlusFragmentOptions) {
    this.apiBaseUrl = options.apiBaseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
  }

  /**
   * Fetch device info from DuoPlus API with memory + cookie cache.
   * @param options.bypassCache - When true, skip cache and fetch from API (for real-time monitor).
   */
  async fetchDeviceInfo(
    imageId: string,
    cookieHeader: string | null,
    options?: { bypassCache?: boolean }
  ): Promise<DuoPlusDeviceInfo> {
    const cacheKey = DEVICE_CACHE_PREFIX + imageId;
    const bypassCache = options?.bypassCache === true;

    if (!bypassCache) {
      // Memory cache
      const mem = this.deviceCache.get(cacheKey);
      if (mem && Date.now() - mem.timestamp < MEMORY_CACHE_MS) {
        return mem.data;
      }

      // Cookie cache (user-specific)
      const cookies = new Bun.CookieMap(cookieHeader || '');
      const cookieCached = cookies.get(cacheKey);
      if (cookieCached) {
        try {
          const parsed = JSON.parse(cookieCached) as { data: DuoPlusDeviceInfo; timestamp: number };
          if (Date.now() - parsed.timestamp < COOKIE_CACHE_SEC * 1000) {
            this.deviceCache.set(cacheKey, parsed);
            return parsed.data;
          }
        } catch {
          // invalid cookie, proceed to fetch
        }
      }
    }

    try {
      const url = `${this.apiBaseUrl}/api/v1/cloudPhone/info`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ image_id: imageId }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = (await response.json()) as DuoPlusApiResponse;
      if (result.code !== 200) {
        throw new Error(result.message || `API error: ${result.code}`);
      }

      const data = result.data ?? { id: imageId, name: 'Unknown', error: 'No data' };
      if (!data.id) data.id = imageId;

      const cacheData = { data, timestamp: Date.now() };
      this.deviceCache.set(cacheKey, cacheData);

      if (!bypassCache) {
        const cookies = new Bun.CookieMap(cookieHeader || '');
        cookies.set(cacheKey, JSON.stringify(cacheData), {
          maxAge: COOKIE_CACHE_SEC,
          path: '/',
          sameSite: 'lax',
        });
      }

      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        id: imageId,
        name: 'Device (Offline)',
        error: msg,
      };
    }
  }

  /**
   * Create HTML fragment for a device, using cookie preferences (theme, view_mode).
   */
  async createDeviceFragment(
    imageId: string,
    cookieHeader: string | null,
    options?: { theme?: string; compact?: boolean }
  ): Promise<{ html: string; setCookieHeaders: string[] }> {
    const cookies = new Bun.CookieMap(cookieHeader || '');
    const deviceInfo = await this.fetchDeviceInfo(imageId, cookieHeader);
    const theme = options?.theme ?? cookies.get('dw_theme') ?? 'dark';
    const compact = options?.compact ?? cookies.get('dw_view_mode') === 'compact';
    const html = this.renderDeviceFragment(deviceInfo, { theme, compact });
    const setCookieHeaders = cookies.toSetCookieHeaders();
    return { html, setCookieHeaders };
  }

  /**
   * Render device data as an HTML fragment.
   */
  renderDeviceFragment(
    device: DuoPlusDeviceInfo,
    options: { theme: string; compact: boolean }
  ): string {
    const { theme, compact } = options;
    const themeClass = theme === 'dark' ? 'dark-theme' : theme === 'blue' ? 'blue-theme' : 'light-theme';
    const layoutClass = compact ? 'compact-view' : 'detailed-view';
    const id = device.id ?? 'unknown';
    const name = device.name ?? 'Unnamed Device';
    const simOnline = device.sim?.status === 1;
    const statusClass = simOnline ? 'online' : 'offline';
    const statusText = simOnline ? '🟢 Online' : '🔴 Offline';

    const detailsHtml =
      compact
        ? ''
        : `
  <div class="device-details">
    <div class="detail-row"><span class="label">OS:</span><span class="value">${escapeHtml(device.os ?? 'Unknown')}</span></div>
    <div class="detail-row"><span class="label">Location:</span><span class="value">${escapeHtml([device.proxy?.city, device.proxy?.country].filter(Boolean).join(', ') || 'Unknown')}</span></div>
    <div class="detail-row"><span class="label">Phone:</span><span class="value">${escapeHtml(device.sim?.msisdn ?? 'N/A')}</span></div>
    <div class="detail-row"><span class="label">Model:</span><span class="value">${escapeHtml(device.device?.model ?? 'Unknown')}</span></div>
    <div class="detail-row"><span class="label">IMEI:</span><span class="value">${escapeHtml(device.device?.imei ?? 'N/A')}</span></div>
    ${device.wifi?.status === 1 ? `<div class="detail-row"><span class="label">WiFi:</span><span class="value connected">${escapeHtml(device.wifi?.name ?? 'Connected')}</span></div>` : ''}
  </div>`;

    return `
<div class="device-fragment ${themeClass} ${layoutClass}" data-device-id="${escapeHtml(id)}">
  <div class="device-header">
    <h3>${escapeHtml(name)}</h3>
    <span class="device-status ${statusClass}">${statusText}</span>
  </div>
  ${detailsHtml}
  ${device.error ? `<p class="device-error">${escapeHtml(device.error)}</p>` : ''}
  <div class="device-actions">
    <button type="button" class="btn-refresh" data-device-id="${escapeHtml(id)}">Refresh</button>
    <button type="button" class="btn-details" data-device-id="${escapeHtml(id)}">Details</button>
  </div>
</div>`;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Parse my_devices from cookie (JSON array of device IDs).
 */
export function getMyDevicesFromCookie(cookieHeader: string | null): string[] {
  const cookies = new Bun.CookieMap(cookieHeader || '');
  const raw = cookies.get(MY_DEVICES_COOKIE);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Set my_devices cookie and return Set-Cookie headers.
 */
export function setMyDevicesCookie(cookieHeader: string | null, deviceIds: string[]): string[] {
  const cookies = new Bun.CookieMap(cookieHeader || '');
  cookies.set(MY_DEVICES_COOKIE, JSON.stringify(deviceIds), {
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
    sameSite: 'lax',
  });
  return cookies.toSetCookieHeaders();
}
