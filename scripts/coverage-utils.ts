#!/usr/bin/env bun

import { basename, dirname, resolve } from "node:path";

export type FileCoverage = {
  file: string;
  linesFound: number;
  linesHit: number;
  lineCoverage: number;
};

export type CoverageSummary = {
  files: FileCoverage[];
  totals: {
    files: number;
    linesFound: number;
    linesHit: number;
    lineCoverage: number;
  };
};

export type ComponentCoverage = {
  component: string;
  files: number;
  linesFound: number;
  linesHit: number;
  coverage: number;
};

function pct(hit: number, found: number): number {
  if (found <= 0) return 0;
  return Number(((hit / found) * 100).toFixed(2));
}

export async function expandGlobs(patterns: string[]): Promise<string[]> {
  const seen = new Set<string>();
  for (const rawPattern of patterns) {
    const pattern = rawPattern.trim();
    if (!pattern) continue;
    if (!hasGlob(pattern)) {
      const file = Bun.file(pattern);
      if (await file.exists()) {
        seen.add(resolve(pattern));
      }
      continue;
    }
    const glob = new Bun.Glob(pattern);
    for await (const match of glob.scan(".")) {
      seen.add(resolve(match));
    }
  }
  return [...seen].sort();
}

export async function parseLcovFiles(paths: string[]): Promise<CoverageSummary> {
  const byFile = new Map<string, { linesFound: number; linesHit: number }>();

  for (const path of paths) {
    const text = await Bun.file(path).text();
    const chunks = text.split("end_of_record");
    for (const chunk of chunks) {
      const lines = chunk.split("\n");
      let sf = "";
      let lf = 0;
      let lh = 0;
      for (const line of lines) {
        if (line.startsWith("SF:")) sf = line.slice(3).trim();
        else if (line.startsWith("LF:")) lf = Number.parseInt(line.slice(3).trim(), 10) || 0;
        else if (line.startsWith("LH:")) lh = Number.parseInt(line.slice(3).trim(), 10) || 0;
      }
      if (!sf) continue;
      const prev = byFile.get(sf) || { linesFound: 0, linesHit: 0 };
      byFile.set(sf, {
        linesFound: prev.linesFound + lf,
        linesHit: prev.linesHit + lh,
      });
    }
  }

  const files: FileCoverage[] = [...byFile.entries()]
    .map(([file, v]) => ({
      file,
      linesFound: v.linesFound,
      linesHit: v.linesHit,
      lineCoverage: pct(v.linesHit, v.linesFound),
    }))
    .sort((a, b) => a.file.localeCompare(b.file));

  const totals = files.reduce(
    (acc, f) => {
      acc.files += 1;
      acc.linesFound += f.linesFound;
      acc.linesHit += f.linesHit;
      return acc;
    },
    { files: 0, linesFound: 0, linesHit: 0, lineCoverage: 0 }
  );
  totals.lineCoverage = pct(totals.linesHit, totals.linesFound);

  return { files, totals };
}

export function groupByComponent(
  files: FileCoverage[],
  excludePatterns: string[] = []
): ComponentCoverage[] {
  const exclude = excludePatterns.map((p) => p.trim()).filter(Boolean);
  const byComponent = new Map<string, { files: number; linesFound: number; linesHit: number }>();

  for (const item of files) {
    const normalized = item.file.replace(/\\/g, "/");
    if (exclude.some((p) => normalized.includes(p))) continue;
    const component = inferComponent(normalized);
    const prev = byComponent.get(component) || { files: 0, linesFound: 0, linesHit: 0 };
    byComponent.set(component, {
      files: prev.files + 1,
      linesFound: prev.linesFound + item.linesFound,
      linesHit: prev.linesHit + item.linesHit,
    });
  }

  return [...byComponent.entries()]
    .map(([component, v]) => ({
      component,
      files: v.files,
      linesFound: v.linesFound,
      linesHit: v.linesHit,
      coverage: pct(v.linesHit, v.linesFound),
    }))
    .sort((a, b) => a.component.localeCompare(b.component));
}

function inferComponent(file: string): string {
  const parts = file.split("/").filter(Boolean);
  const rootIdx = parts.findIndex((part) =>
    ["lib", "tests", "utils", "cli", "barbershop", "scratch", "dashboard", "scripts", "src"].includes(part)
  );
  if (rootIdx >= 0) {
    if (parts.length > rootIdx + 1) return `${parts[rootIdx]}/${parts[rootIdx + 1]}`;
    return parts[rootIdx];
  }
  return basename(dirname(file)) || "root";
}

export function parseArg(flag: string, args: string[], fallback = ""): string {
  const idx = args.indexOf(flag);
  if (idx < 0 || idx + 1 >= args.length) return fallback;
  return args[idx + 1] || fallback;
}

function hasGlob(pattern: string): boolean {
  return /[*?\[\]{}]/.test(pattern);
}
