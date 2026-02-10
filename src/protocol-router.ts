#!/usr/bin/env bun

type EnhancedProtocolRouterOptions = {
  enableHTTP2Upgrade: boolean;
  useRegExpSIMD: boolean;
  enableProfiling: boolean;
  compileBytecode: boolean;
  baseUrl?: string;
};

type RouteResult = {
  ok: boolean;
  status: number;
  durationMs: number;
  protocol?: string;
  response: unknown;
};

const DEFAULT_BASE = process.env.PLAYGROUND_BASE_URL || "http://localhost:3011";

export class EnhancedProtocolRouter {
  private readonly baseUrl: string;
  private readonly options: EnhancedProtocolRouterOptions;
  private readonly protocolMatchers: RegExp[];

  constructor(options: EnhancedProtocolRouterOptions) {
    this.baseUrl = options.baseUrl || DEFAULT_BASE;
    this.options = options;

    // Keep patterns fixed and reusable to align with Bun v1.3.9 RegExp SIMD/JIT improvements.
    this.protocolMatchers = options.useRegExpSIMD
      ? [/^https:\/\//i, /^http:\/\//i, /^s3:\/\//i, /^file:\/\//i]
      : [];
  }

  async initialize(): Promise<void> {
    if (this.options.enableHTTP2Upgrade) {
      await fetch(`${this.baseUrl}/api/control/http2-upgrade/start`, { method: "POST" }).catch(() => {
        // Non-fatal: routing still works without runtime control plane.
      });
    }
  }

  classify(url: string): "https" | "http" | "s3" | "file" | "unknown" {
    if (this.protocolMatchers.length > 0) {
      if (this.protocolMatchers[0].test(url)) return "https";
      if (this.protocolMatchers[1].test(url)) return "http";
      if (this.protocolMatchers[2].test(url)) return "s3";
      if (this.protocolMatchers[3].test(url)) return "file";
      return "unknown";
    }

    if (url.startsWith("https://")) return "https";
    if (url.startsWith("http://")) return "http";
    if (url.startsWith("s3://")) return "s3";
    if (url.startsWith("file://")) return "file";
    return "unknown";
  }

  async route(url: string, opts?: { dryRun?: boolean; method?: string; bodyType?: string }): Promise<RouteResult> {
    const started = this.options.enableProfiling ? performance.now() : 0;
    const payload = {
      url,
      method: opts?.method || "GET",
      dryRun: opts?.dryRun !== false,
      bodyType: opts?.bodyType || (this.classify(url) === "file" ? "file" : "string"),
    };

    const res = await fetch(`${this.baseUrl}/api/fetch/protocol-router`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    const durationMs = this.options.enableProfiling
      ? Number((performance.now() - started).toFixed(2))
      : 0;

    return {
      ok: res.ok && Boolean((json as any)?.ok),
      status: res.status,
      durationMs,
      protocol: (json as any)?.metadata?.protocol,
      response: json,
    };
  }

  describeRuntime() {
    return {
      baseUrl: this.baseUrl,
      bunVersion: Bun.version,
      bunRevision: Bun.revision || "unknown",
      options: this.options,
      notes: {
        useRegExpSIMD: this.options.useRegExpSIMD,
        compileBytecode: this.options.compileBytecode,
      },
    };
  }
}

async function main() {
  // Auto HTTP/2, SIMD RegExp, parallel testing style config.
  const router = new EnhancedProtocolRouter({
    enableHTTP2Upgrade: true,
    useRegExpSIMD: true,
    enableProfiling: true,
    compileBytecode: true,
  });

  await router.initialize();

  const targets = [
    "https://example.com",
    "http://example.com",
    "s3://demo-bucket/demo-key",
    "file:///tmp/demo.txt",
  ];

  const results = await Promise.all(targets.map((url) => router.route(url, { dryRun: true })));

  console.log(
    JSON.stringify(
      {
        runtime: router.describeRuntime(),
        results,
      },
      null,
      2
    )
  );
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
