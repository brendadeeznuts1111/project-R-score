#!/usr/bin/env bun
/**
 * Render supply-chain JSON reports via Bun.markdown.
 *
 *   bun scripts/markdown-cli.ts --format html < report.json
 *   bun scripts/markdown-cli.ts --format ansi --colored < report.json
 *   cat report.json | bun scripts/markdown-cli.ts --format plaintext
 */

import { readFile } from "node:fs/promises";
import {
  buildPackageScanMarkdown,
  buildPolicyCheckMarkdown,
  buildPolicyListMarkdown,
  buildSupplyChainMarkdown,
  renderMarkdownDocument,
  type ReportRenderFormat,
} from "./scan/transpiler/markdown-reporter.ts";
import type { BundleScanReport } from "./scan/transpiler/types.ts";
import type { PackageEvaluation } from "./scan/transpiler/policy-engine.ts";

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = { format: "markdown", colored: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--colored") out.colored = true;
    else if (a === "--no-colored") out.colored = false;
    else if (a === "--stdin") out.stdin = true;
    else if (a.startsWith("--format=")) out.format = a.slice("--format=".length);
    else if (a === "--format" && argv[i + 1]) {
      out.format = argv[++i];
    } else if (a.startsWith("--") && a !== "--") {
      out[a.slice(2)] = true;
    } else if (!a.startsWith("-")) {
      out.input = a;
    }
  }
  return out;
}

function isBundleReport(payload: Record<string, unknown>): payload is BundleScanReport {
  return Array.isArray(payload.targets) && payload.layer === "4.5";
}

function isPackagePayload(payload: Record<string, unknown>): boolean {
  return payload.command === "scan packages" || (payload.layer === "5" && Array.isArray(payload.findings));
}

function isPolicyList(payload: Record<string, unknown>): boolean {
  return payload.command === "policy" && Array.isArray(payload.allowed);
}

function isPolicyCheck(payload: Record<string, unknown>): boolean {
  return payload.command === "policy check" && payload.evaluation != null;
}

function markdownFromPayload(payload: Record<string, unknown>): string {
  if (payload.markdown_source && typeof payload.markdown_source === "string") {
    return payload.markdown_source.endsWith("\n")
      ? payload.markdown_source
      : `${payload.markdown_source}\n`;
  }
  if (isBundleReport(payload)) return buildSupplyChainMarkdown(payload);
  if (isPolicyCheck(payload)) {
    return buildPolicyCheckMarkdown(payload.evaluation as PackageEvaluation, { explain: true });
  }
  if (isPolicyList(payload)) {
    return buildPolicyListMarkdown({
      policyVersion: payload.policyVersion as number | undefined,
      scannerVersion: payload.scannerVersion as string | undefined,
      allowed: payload.allowed as Array<{ package: string; range: string }>,
      blocked: payload.blocked as Array<{ package: string; range: string }>,
      semverRules: payload.semverRules as Array<{
        id: string;
        package: string;
        range: string;
        safeRange?: string;
        severity: string;
      }>,
    });
  }
  if (isPackagePayload(payload)) {
    return buildPackageScanMarkdown({
      layer: String(payload.layer ?? "5"),
      profile: payload.profile as string | undefined,
      targetId: payload.targetId as string | undefined,
      threatFeed: Boolean(payload.threatFeed),
      clean: Boolean(payload.clean),
      findings: payload.findings as BundleScanReport["targets"][0]["findings"],
      plan: payload.plan as Parameters<typeof buildPackageScanMarkdown>[0]["plan"],
      fixesApplied: payload.fixesApplied as string[] | undefined,
    });
  }
  throw new Error("unrecognized report JSON — expected bundle scan, packages, or policy payload");
}

async function readInput(opts: Record<string, string | boolean>): Promise<string> {
  if (opts.stdin === true || !opts.input) return Bun.stdin.text();
  return readFile(String(opts.input), "utf8");
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const raw = (await readInput(opts)).trim();
  if (!raw) return;
  const payload = JSON.parse(raw) as Record<string, unknown>;
  const format = String(opts.format ?? "markdown") as ReportRenderFormat;
  const markdown = markdownFromPayload(payload);
  process.stdout.write(renderMarkdownDocument(markdown, format, {
    colored: opts.colored !== false,
  }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});