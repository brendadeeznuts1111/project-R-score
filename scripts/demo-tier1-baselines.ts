#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Tier1Provider = "bun-blog" | "bun-release" | "bun-docs" | "mdn" | "linux-kernel";

export type Tier1Source = {
  id: string;
  provider: Tier1Provider;
  title: string;
  url: string;
};

export type DemoBaseline = {
  id: string;
  benchmark: {
    mode: "hash" | "string" | "map-size";
    iterations: number;
    minOpsPerSec: number;
  };
  sourceIds: string[];
};

type DemoContractFile = {
  modules: Record<string, unknown>;
};

const ROOT = process.cwd();
const CONTRACT_PATH = join(ROOT, "scratch", "bun-v1.3.9-examples", "playground-web", "demo-module-contract.json");
const ALLOWED_HOSTS = new Set([
  "bun.com",
  "github.com",
  "developer.mozilla.org",
  "www.kernel.org",
  "kernel.org",
]);

export const TIER1_SOURCES: Record<string, Tier1Source> = {
  bun_blog_parallel: {
    id: "bun_blog_parallel",
    provider: "bun-blog",
    title: "Bun v1.3.9: bun run --parallel and --sequential",
    url: "https://bun.com/blog/bun-v1.3.9#bun-run-parallel-and-bun-run-sequential",
  },
  bun_blog_http2: {
    id: "bun_blog_http2",
    provider: "bun-blog",
    title: "Bun v1.3.9: HTTP/2 connection upgrades via net.Server",
    url: "https://bun.com/blog/bun-v1.3.9#http-2-connection-upgrades-via-net-server",
  },
  bun_blog_symbol_dispose: {
    id: "bun_blog_symbol_dispose",
    provider: "bun-blog",
    title: "Bun v1.3.9: Symbol.dispose support for mock/spyOn",
    url: "https://bun.com/blog/bun-v1.3.9#symbol-dispose-support-for-mock-and-spyon",
  },
  bun_blog_no_proxy: {
    id: "bun_blog_no_proxy",
    provider: "bun-blog",
    title: "Bun v1.3.9: NO_PROXY respected for explicit proxy options",
    url: "https://bun.com/blog/bun-v1.3.9#no-proxy-now-respected-for-explicit-proxy-options",
  },
  bun_release_v139: {
    id: "bun_release_v139",
    provider: "bun-release",
    title: "Bun v1.3.9 release notes",
    url: "https://github.com/oven-sh/bun/releases/tag/bun-v1.3.9",
  },
  bun_docs_test_writing: {
    id: "bun_docs_test_writing",
    provider: "bun-docs",
    title: "Bun docs: writing tests",
    url: "https://bun.com/docs/test/writing-tests",
  },
  bun_docs_test_cli: {
    id: "bun_docs_test_cli",
    provider: "bun-docs",
    title: "Bun docs: test CLI usage",
    url: "https://bun.com/docs/test#cli-usage",
  },
  mdn_keep_alive: {
    id: "mdn_keep_alive",
    provider: "mdn",
    title: "MDN: Keep-Alive header",
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Keep-Alive",
  },
  linux_kernel_signal_api: {
    id: "linux_kernel_signal_api",
    provider: "linux-kernel",
    title: "Linux kernel docs: send_sig API",
    url: "https://www.kernel.org/doc/html/latest/core-api/kernel-api.html#c.send_sig",
  },
};

function getAllDemoIds(): string[] {
  const contract = JSON.parse(readFileSync(CONTRACT_PATH, "utf8")) as DemoContractFile;
  return Object.keys(contract.modules || {});
}

function pickMode(id: string): DemoBaseline["benchmark"]["mode"] {
  if (id.includes("performance") || id.includes("markdown") || id.includes("stringwidth")) return "string";
  if (id.includes("protocol") || id.includes("governance") || id.includes("health")) return "map-size";
  return "hash";
}

function pickSources(id: string): string[] {
  if (id.includes("http2")) return ["bun_blog_http2", "bun_release_v139", "mdn_keep_alive"];
  if (id.includes("proxy")) return ["bun_blog_no_proxy", "bun_release_v139", "mdn_keep_alive"];
  if (id.includes("mocks") || id.includes("symbol-dispose")) {
    return ["bun_blog_symbol_dispose", "bun_docs_test_writing", "bun_release_v139"];
  }
  if (id.includes("parallel") || id.includes("workspace") || id.includes("orchestration")) {
    return ["bun_blog_parallel", "bun_docs_test_cli", "bun_release_v139"];
  }
  if (id.includes("signals") || id.includes("process")) {
    return ["linux_kernel_signal_api", "bun_release_v139", "bun_docs_test_cli"];
  }
  return ["bun_release_v139", "bun_docs_test_writing", "mdn_keep_alive"];
}

export function buildBaselineForDemo(id: string): DemoBaseline {
  return {
    id,
    benchmark: {
      mode: pickMode(id),
      iterations: 200_000,
      minOpsPerSec: 50_000,
    },
    sourceIds: pickSources(id),
  };
}

export function validateTier1SourcesForDemo(id: string): { ok: boolean; errors: string[]; baseline: DemoBaseline } {
  const baseline = buildBaselineForDemo(id);
  const errors: string[] = [];
  if (baseline.sourceIds.length === 0) errors.push(`${id}: missing sourceIds`);

  for (const sourceId of baseline.sourceIds) {
    const source = TIER1_SOURCES[sourceId];
    if (!source) {
      errors.push(`${id}: unknown source id '${sourceId}'`);
      continue;
    }
    let host = "";
    try {
      host = new URL(source.url).host;
    } catch {
      errors.push(`${id}: invalid URL for source '${sourceId}'`);
      continue;
    }
    if (!ALLOWED_HOSTS.has(host)) {
      errors.push(`${id}: source '${sourceId}' has non-tier1 host '${host}'`);
    }
  }

  return { ok: errors.length === 0, errors, baseline };
}

export function validateTier1CoverageAcrossDemos(ids: string[]): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const providersSeen = new Set<Tier1Provider>();

  for (const id of ids) {
    const { ok, errors: localErrors, baseline } = validateTier1SourcesForDemo(id);
    if (!ok) errors.push(...localErrors);
    for (const sourceId of baseline.sourceIds) {
      const source = TIER1_SOURCES[sourceId];
      if (source) providersSeen.add(source.provider);
    }
  }

  for (const provider of ["bun-blog", "bun-release", "bun-docs", "mdn", "linux-kernel"] as Tier1Provider[]) {
    if (!providersSeen.has(provider)) {
      errors.push(`missing provider coverage: ${provider}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

if (import.meta.main) {
  const ids = getAllDemoIds();
  const result = validateTier1CoverageAcrossDemos(ids);
  if (!result.ok) {
    for (const err of result.errors) console.error(`[demo-tier1][fail] ${err}`);
    process.exit(1);
  }
  console.log(`[demo-tier1][pass] demos=${ids.length} providers=${new Set(Object.values(TIER1_SOURCES).map((s) => s.provider)).size}`);
}
