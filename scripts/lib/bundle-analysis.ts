import { resolve as resolvePath } from "node:path";

export type BundleAnalysis = {
  generatedAt: string;
  source: string;
  entrypoint: string;
  summary: {
    inputCount: number;
    outputCount: number;
    inputBytes: number;
    outputBytes: number;
    compressionRatio: number;
    externalDependencyCount: number;
  };
  largestInputs: Array<{ path: string; bytes: number }>;
  largestOutputs: Array<{ path: string; bytes: number }>;
  externalDependencies: string[];
};

export function parseArg(name: string, fallback = ""): string {
  const prefix = `--${name}=`;
  const exact = Bun.argv.find((arg) => arg.startsWith(prefix));
  if (exact) return exact.slice(prefix.length).trim();
  const idx = Bun.argv.findIndex((arg) => arg === `--${name}`);
  if (idx >= 0) return String(Bun.argv[idx + 1] || "").trim();
  return fallback;
}

export async function buildBundleAnalysis(entryArg: string): Promise<BundleAnalysis> {
  const entrypoint = resolvePath(process.cwd(), entryArg);
  const exists = await Bun.file(entrypoint).exists();
  if (!exists) {
    throw new Error(`entrypoint not found: ${entrypoint}`);
  }

  const result = await Bun.build({
    entrypoints: [entrypoint],
    target: "bun",
    format: "esm",
    splitting: false,
    metafile: true,
    write: false,
    throw: false,
  });

  if (!result.metafile) {
    throw new Error("Bun.build returned no metafile");
  }

  const inputEntries = Object.entries(result.metafile.inputs || {});
  const outputEntries = Object.entries(result.metafile.outputs || {});
  const inputBytes = inputEntries.reduce((sum, [, meta]: any) => sum + Number(meta?.bytes || 0), 0);
  const outputBytes = outputEntries.reduce((sum, [, meta]: any) => sum + Number(meta?.bytes || 0), 0);
  const ratio = inputBytes > 0 ? Number((outputBytes / inputBytes).toFixed(4)) : 0;
  const externalDependencies = new Set<string>();

  for (const [, meta] of inputEntries as any[]) {
    const imports = Array.isArray(meta?.imports) ? meta.imports : [];
    for (const imp of imports) {
      if (imp?.external) externalDependencies.add(String(imp.path));
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    source: "Bun.build({ metafile: true })",
    entrypoint,
    summary: {
      inputCount: inputEntries.length,
      outputCount: outputEntries.length,
      inputBytes,
      outputBytes,
      compressionRatio: ratio,
      externalDependencyCount: externalDependencies.size,
    },
    largestInputs: inputEntries
      .sort(([, a]: any, [, b]: any) => Number(b?.bytes || 0) - Number(a?.bytes || 0))
      .slice(0, 10)
      .map(([path, meta]: any) => ({ path, bytes: Number(meta?.bytes || 0) })),
    largestOutputs: outputEntries
      .sort(([, a]: any, [, b]: any) => Number(b?.bytes || 0) - Number(a?.bytes || 0))
      .slice(0, 10)
      .map(([path, meta]: any) => ({ path, bytes: Number(meta?.bytes || 0) })),
    externalDependencies: Array.from(externalDependencies).sort(),
  };
}
