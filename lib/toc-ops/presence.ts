/**
 * TOC Ops geo + network presence — types helpers, demo seeds, rollup metrics.
 * Demo-plane only (not live GeoIP / DNS lookups on Pages).
 *
 * @see lib/toc-ops/types.ts
 * @see docs/harness/tenants/toc-ops.md
 */
import type {
  TocGeoPoint,
  TocPartner,
  TocPlacementContext,
  TocPresence,
  TocPresenceSummary,
} from './types.ts';

const EARTH_KM = 6371;

/** Great-circle distance (km) between two WGS84 points. */
export function haversineKm(a: TocGeoPoint, b: TocGeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function sameMetro(a: TocGeoPoint, b: TocGeoPoint, radiusKm = 80): boolean {
  return haversineKm(a, b) <= radiusKm;
}

function withHouseMetrics(presence: TocPresence, house: TocPresence): TocPresence {
  const distanceKmFromHouse = Math.round(haversineKm(presence.geo, house.geo) * 10) / 10;
  return {
    ...presence,
    metrics: {
      distanceKmFromHouse,
      sameMetroAsHouse: sameMetro(presence.geo, house.geo),
    },
  };
}

/** House / ops desk presence (Tampa demo). */
export function demoHousePresence(observedAt = '2026-07-23T18:00:00.000Z'): TocPresence {
  return {
    geo: {
      lat: 27.9506,
      lon: -82.4572,
      accuracyM: 50,
      source: 'demo',
      observedAt,
    },
    postal: {
      country: 'US',
      region: 'FL',
      city: 'Tampa',
      zip: '33602',
      timezone: 'America/New_York',
    },
    network: {
      ipv4: '104.21.48.12',
      ipv6: '2606:4700:3030::ac43:3012',
      asn: 13335,
      asOrg: 'CLOUDFLARENET',
      isp: 'Cloudflare',
      reverseDns: 'ops.factory-wager.com',
      dns: {
        hostname: 'ops.factory-wager.com',
        resolvedAt: observedAt,
        a: ['104.21.48.12'],
        aaaa: ['2606:4700:3030::ac43:3012'],
        cname: ['pages.factory-wager.com'],
        ttlSec: 300,
        resolver: '1.1.1.1',
      },
      lastSeenAt: observedAt,
      vpnSuspected: false,
      connectionType: 'datacenter',
    },
  };
}

type PartnerPresenceSeed = {
  city: string;
  zip: string;
  lat: number;
  lon: number;
  ipv4: string;
  ipv6: string;
  asn: number;
  asOrg: string;
  isp: string;
  reverseDns: string;
  dnsHost: string;
  connectionType: NonNullable<TocPresence['network']['connectionType']>;
  vpnSuspected?: boolean;
};

const PARTNER_SEEDS: Record<'ASH' | 'PAT' | 'NOV', PartnerPresenceSeed> = {
  ASH: {
    city: 'Miami Beach',
    zip: '33139',
    lat: 25.7907,
    lon: -80.13,
    ipv4: '73.145.22.91',
    ipv6: '2601:58:4000:a1b2::91',
    asn: 7922,
    asOrg: 'COMCAST-7922',
    isp: 'Comcast Cable',
    reverseDns: 'c-73-145-22-91.hsd1.fl.comcast.net',
    dnsHost: 'ash.partner.toc.local',
    connectionType: 'residential',
  },
  PAT: {
    city: 'Orlando',
    zip: '32801',
    lat: 28.5383,
    lon: -81.3792,
    ipv4: '98.203.44.17',
    ipv6: '2600:1700:2a10:8c80::17',
    asn: 7018,
    asOrg: 'ATT-INTERNET4',
    isp: 'AT&T Fiber',
    reverseDns: '98-203-44-17.lightspeed.orlnfl.sbcglobal.net',
    dnsHost: 'pat.partner.toc.local',
    connectionType: 'residential',
  },
  NOV: {
    city: 'Jacksonville',
    zip: '32202',
    lat: 30.3322,
    lon: -81.6557,
    ipv4: '174.64.88.203',
    ipv6: '2607:fb90:1a2b:3c4d::203',
    asn: 22394,
    asOrg: 'CELLCO',
    isp: 'Verizon Wireless',
    reverseDns: 'mobile-174-64-88-203.fl.vzwnet.com',
    dnsHost: 'nov.partner.toc.local',
    connectionType: 'mobile',
    vpnSuspected: true,
  },
};

/** Partner HQ presence for demo codes. */
export function demoPartnerPresence(
  code: 'ASH' | 'PAT' | 'NOV',
  house = demoHousePresence(),
  observedAt = '2026-07-23T16:00:00.000Z'
): TocPresence {
  const s = PARTNER_SEEDS[code];
  const base: TocPresence = {
    geo: {
      lat: s.lat,
      lon: s.lon,
      accuracyM: 35,
      source: 'demo',
      observedAt,
    },
    postal: {
      country: 'US',
      region: 'FL',
      city: s.city,
      zip: s.zip,
      timezone: 'America/New_York',
    },
    network: {
      ipv4: s.ipv4,
      ipv6: s.ipv6,
      asn: s.asn,
      asOrg: s.asOrg,
      isp: s.isp,
      reverseDns: s.reverseDns,
      dns: {
        hostname: s.dnsHost,
        resolvedAt: observedAt,
        a: [s.ipv4],
        aaaa: [s.ipv6],
        ttlSec: 600,
        resolver: '1.1.1.1',
      },
      lastSeenAt: observedAt,
      vpnSuspected: s.vpnSuspected ?? false,
      connectionType: s.connectionType,
    },
  };
  return withHouseMetrics(base, house);
}

/** Slightly offset account/device presence from partner HQ. */
export function demoAccountPresence(
  callSign: string, // brand-ok
  partnerCode: 'ASH' | 'PAT' | 'NOV',
  house = demoHousePresence(),
  index = 0
): TocPresence {
  const partner = demoPartnerPresence(partnerCode, house);
  const jitter = (index + 1) * 0.008;
  const octetBump = (index + 1) % 40;
  const ipv4Parts = (partner.network.ipv4 ?? '0.0.0.0').split('.').map(Number);
  ipv4Parts[3] = ((ipv4Parts[3] ?? 0) + octetBump) % 250 || 10;
  const ipv4 = ipv4Parts.join('.');
  const observedAt = `2026-07-2${Math.min(3, index + 1)}T1${index}:30:00.000Z`;
  const base: TocPresence = {
    geo: {
      lat: Math.round((partner.geo.lat + jitter) * 10_000) / 10_000,
      lon: Math.round((partner.geo.lon - jitter / 2) * 10_000) / 10_000,
      accuracyM: 80 + index * 10,
      source: index === 0 ? 'profile' : 'ip',
      observedAt,
    },
    postal: {
      ...partner.postal,
      zip: String(Number(partner.postal.zip) + index), // brand-ok — nearby ZIP
    },
    network: {
      ...partner.network,
      ipv4,
      ipv6: partner.network.ipv6
        ? partner.network.ipv6.replace(/::[0-9a-f]+$/i, `::${(16 + index).toString(16)}`)
        : undefined,
      reverseDns: partner.network.reverseDns?.replace(/\d+\.\d+\.\d+\.\d+/, ipv4),
      dns: partner.network.dns
        ? {
            ...partner.network.dns,
            hostname: `${callSign.toLowerCase()}.drum.toc.local`,
            a: [ipv4],
            aaaa: partner.network.ipv6
              ? [partner.network.ipv6.replace(/::[0-9a-f]+$/i, `::${(16 + index).toString(16)}`)]
              : undefined,
            resolvedAt: observedAt,
          }
        : undefined,
      lastSeenAt: observedAt,
      connectionType: partnerCode === 'NOV' ? 'mobile' : index % 2 === 0 ? 'residential' : 'mobile',
    },
  };
  return withHouseMetrics(base, house);
}

/** Placement context derived from account presence at play time. */
export function demoPlacementFromPresence(
  presence: TocPresence,
  at = presence.geo.observedAt ?? '2026-07-22T15:00:00.000Z'
): TocPlacementContext {
  return {
    geo: { ...presence.geo, observedAt: at, source: 'ip' },
    postal: {
      country: presence.postal.country,
      region: presence.postal.region,
      city: presence.postal.city,
      zip: presence.postal.zip,
    },
    ipv4: presence.network.ipv4,
    ipv6: presence.network.ipv6,
    asn: presence.network.asn,
    dnsHostname: presence.network.dns?.hostname,
  };
}

function bump(map: Record<string, number>, key: string | undefined | null): void {
  if (!key) return;
  map[key] = (map[key] ?? 0) + 1;
}

/** Roll up geo / IP / DNS coverage across partners + plays. */
export function summarizePresence(partners: TocPartner[], house?: TocPresence): TocPresenceSummary {
  const zips = new Set<string>();
  const cities = new Set<string>();
  const asns = new Set<number>();
  const byCountry: Record<string, number> = {};
  const byTimezone: Record<string, number> = {};
  const byAsn: Record<string, number> = {};
  const byConnectionType: Record<string, number> = {};
  let partnersWithGeo = 0;
  let accountsWithGeo = 0;
  let playsWithPlacement = 0;
  let ipv4Count = 0;
  let ipv6Count = 0;
  let dnsResolved = 0;
  let vpnSuspected = 0;
  const distances: number[] = [];

  const note = (p: TocPresence | undefined) => {
    if (!p?.geo) return false;
    zips.add(p.postal.zip);
    if (p.postal.city) cities.add(p.postal.city);
    bump(byCountry, p.postal.country);
    bump(byTimezone, p.postal.timezone);
    if (p.network.ipv4) ipv4Count++;
    if (p.network.ipv6) ipv6Count++;
    if (p.network.dns?.a?.length || p.network.dns?.aaaa?.length) dnsResolved++;
    if (p.network.vpnSuspected) vpnSuspected++;
    if (p.network.asn != null) {
      asns.add(p.network.asn);
      bump(byAsn, String(p.network.asn));
    }
    bump(byConnectionType, p.network.connectionType ?? 'unknown');
    if (p.metrics?.distanceKmFromHouse != null) {
      distances.push(p.metrics.distanceKmFromHouse);
    } else if (house) {
      distances.push(haversineKm(p.geo, house.geo));
    }
    return true;
  };

  for (const partner of partners) {
    if (note(partner.presence)) partnersWithGeo++;
    for (const a of partner.accounts) {
      if (note(a.presence)) accountsWithGeo++;
    }
    for (const play of partner.recentPlays) {
      if (play.placement?.geo || play.placement?.ipv4 || play.placement?.ipv6) {
        playsWithPlacement++;
        if (play.placement.postal?.zip) zips.add(play.placement.postal.zip);
        if (play.placement.postal?.city) cities.add(play.placement.postal.city);
        bump(byCountry, play.placement.postal?.country);
        if (play.placement.ipv4) ipv4Count++;
        if (play.placement.ipv6) ipv6Count++;
        if (play.placement.dnsHostname) dnsResolved++;
        if (play.placement.asn != null) {
          asns.add(play.placement.asn);
          bump(byAsn, String(play.placement.asn));
        }
      }
    }
  }

  const avgDistanceKmFromHouse =
    distances.length === 0
      ? null
      : Math.round((distances.reduce((n, d) => n + d, 0) / distances.length) * 10) / 10;

  return {
    partnersWithGeo,
    accountsWithGeo,
    playsWithPlacement,
    uniqueZips: zips.size,
    uniqueCities: cities.size,
    uniqueAsns: asns.size,
    ipv4Count,
    ipv6Count,
    dnsResolved,
    vpnSuspected,
    byCountry,
    byTimezone,
    byAsn,
    byConnectionType,
    avgDistanceKmFromHouse,
  };
}

/** Attach house-distance metrics to every partner/account presence. */
export function enrichPresenceMetrics(partners: TocPartner[], house: TocPresence): TocPartner[] {
  return partners.map(p => ({
    ...p,
    presence: p.presence ? withHouseMetrics(p.presence, house) : p.presence,
    accounts: p.accounts.map(a => ({
      ...a,
      presence: a.presence ? withHouseMetrics(a.presence, house) : a.presence,
    })),
  }));
}
