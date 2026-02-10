export type MulticastScope = "interface-local" | "link-local" | "site-local" | "organization" | "global" | "admin";
export type Reliability = "best-effort" | "reliable";
export type Security = "none" | "auth" | "encrypt";
export type Scale = "small" | "medium" | "large";
export type MulticastIpFamily = "ipv4" | "ipv6";

export interface MulticastRequirements {
  scope: MulticastScope;
  reliability: Reliability;
  security: Security;
  scale: Scale;
  ipFamily?: MulticastIpFamily;
}

export interface MulticastSelection {
  address: string;
  ttl: number;
}

export class MulticastAddressSelector {
  select(req: MulticastRequirements): MulticastSelection {
    if (req.ipFamily === "ipv6") {
      return this.selectIPv6(req);
    }

    const h = this.hash(req);

    switch (req.scope) {
      case "interface-local":
        // No IPv4 equivalent — map to loopback-scoped 224.0.0.x, TTL 0
        return {
          address: `224.0.0.${this.octet(h, 100, 199)}`,
          ttl: 0,
        };
      case "link-local":
        // 224.0.0.0/24 — link-local, TTL always 1
        return {
          address: `224.0.0.${this.octet(h, 100, 199)}`,
          ttl: 1,
        };
      case "site-local":
      case "admin":
        // 239.0.0.0/8 — admin-scoped / private
        return {
          address: `239.${this.octet(h, 192, 251)}.${this.octet(h >> 8, 0, 255)}.${this.octet(h >> 16, 1, 254)}`,
          ttl: scaleTTL(req.scale, 15, 31, 63),
        };
      case "organization":
        // IPv4: admin-scoped with wider TTL to span multiple sites
        return {
          address: `239.${this.octet(h, 0, 191)}.${this.octet(h >> 8, 0, 255)}.${this.octet(h >> 16, 1, 254)}`,
          ttl: scaleTTL(req.scale, 31, 63, 127),
        };
      case "global":
        if (req.security === "encrypt") {
          // 232.0.0.0/8 — SSM for tighter sender control
          return {
            address: `232.${this.octet(h, 1, 254)}.${this.octet(h >> 8, 0, 255)}.${this.octet(h >> 16, 1, 254)}`,
            ttl: scaleTTL(req.scale, 64, 96, 127),
          };
        }
        // 224.1.0.0+ — avoid 224.0.0.0/24 local control block
        return {
          address: `224.${this.octet(h, 1, 255)}.${this.octet(h >> 8, 0, 255)}.${this.octet(h >> 16, 1, 254)}`,
          ttl: scaleTTL(req.scale, 48, 64, 96),
        };
    }
  }

  selectIPv6(req: MulticastRequirements): MulticastSelection {
    const h = this.hash(req);
    const group = this.hex16(h);
    switch (req.scope) {
      case "interface-local":
        // FF01::/16 — loopback-only IPC
        return { address: `ff01::${group}`, ttl: 0 };
      case "link-local":
        // FF02::/16 — NDP, DHCPv6, mDNS
        return { address: `ff02::${group}`, ttl: 1 };
      case "site-local":
        // FF05::/16 — corporate discovery, internal services
        return { address: `ff05::${group}`, ttl: scaleTTL(req.scale, 15, 31, 63) };
      case "admin":
        // FF15::/16 — transient site-local
        return { address: `ff15::${group}`, ttl: scaleTTL(req.scale, 15, 31, 63) };
      case "organization":
        // FF08::/16 — multi-site enterprise
        return { address: `ff08::${group}`, ttl: scaleTTL(req.scale, 31, 63, 127) };
      case "global":
        if (req.security === "encrypt") {
          // FF3E::/32 — SSM v6
          return { address: `ff3e::${group}`, ttl: scaleTTL(req.scale, 64, 96, 127) };
        }
        // FF0E::/16 — internet-scale
        return { address: `ff0e::${group}`, ttl: scaleTTL(req.scale, 48, 64, 96) };
    }
  }

  private hash(req: MulticastRequirements): number {
    const seed = `${req.scope}:${req.reliability}:${req.security}:${req.scale}:${req.ipFamily ?? "ipv4"}`;
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  private octet(h: number, min: number, max: number): number {
    return min + (h % (max - min + 1));
  }

  private hex16(h: number): string {
    return (h & 0xffff).toString(16).padStart(4, "0");
  }
}

function scaleTTL(scale: Scale, small: number, medium: number, large: number): number {
  switch (scale) {
    case "small": return small;
    case "medium": return medium;
    case "large": return large;
  }
}
