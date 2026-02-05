// infrastructure/bun-pack-enforcer.ts
import { feature } from "bun:bundle";

// Ensures bin/ directories always included, matching npm pack
export class BunPackEnforcer {
  // Zero-cost when PACK_ENFORCER is disabled
  static async pack(
    packageJsonPath: string,
    options: { includeBin?: boolean } = {}
  ): Promise<Uint8Array> {
    if (!feature("PACK_ENFORCER")) {
      // Legacy: may miss bin directories
      return this.legacyPack(packageJsonPath);
    }

    const packageJson = await Bun.file(packageJsonPath).json();
    const pkgDir = packageJsonPath.replace("/package.json", "");

    // Determine files to include
    const files = await this.getFilesToPack(packageJson, pkgDir);

    // Ensure bin/ directories are included
    if (options.includeBin !== false) {
      await this.includeBinDirectories(files, packageJson, pkgDir);
    }

    // Create tarball
    const tarball = await this.createTarball(files, pkgDir);

    // Log enforcement (Component #11 audit)
    this.logPackEnforcement(packageJson.name, files.size);

    return tarball;
  }

  private static async getFilesToPack(
    packageJson: any,
    pkgDir: string
  ): Promise<Set<string>> {
    const files = new Set<string>();

    // Add files from "files" array
    if (packageJson.files) {
      for (const pattern of packageJson.files) {
        const matched = await this.glob(pattern, pkgDir);
        matched.forEach(f => files.add(f));
      }
    } else {
      // Default: include all files
      const allFiles = await this.getAllFiles(pkgDir);
      allFiles.forEach(f => files.add(f));
    }

    return files;
  }

  private static async includeBinDirectories(
    files: Set<string>,
    packageJson: any,
    pkgDir: string
  ): Promise<void> {
    const bins: string[] = [];

    // From "bin" field
    if (packageJson.bin) {
      if (typeof packageJson.bin === 'string') {
        bins.push(packageJson.bin);
      } else {
        bins.push(...Object.values(packageJson.bin as Record<string, string>));
      }
    }

    // From "directories.bin"
    if (packageJson.directories?.bin) {
      const binFiles = await this.glob(`${packageJson.directories.bin}/*`, pkgDir);
      bins.push(...binFiles);
    }

    // Add all bin files to set
    for (const bin of bins) {
      files.add(bin);

      // Also add directories in path
      const dir = bin.substring(0, bin.lastIndexOf('/'));
      if (dir) {
        files.add(dir);
      }
    }
  }

  private static async createTarball(files: Set<string>, baseDir: string): Promise<Uint8Array> {
    // Simple tarball creation using Bun
    const entries: Uint8Array[] = [];

    for (const file of files) {
      const fullPath = `${baseDir}/${file}`;
      const content = await Bun.file(fullPath).arrayBuffer();
      // Simple header + content (not full tar format)
      const header = new TextEncoder().encode(`${file}\0`);
      entries.push(new Uint8Array([...header, ...new Uint8Array(content)]));
    }

    // Concatenate all entries
    const totalSize = entries.reduce((sum, entry) => sum + entry.length, 0);
    const tarball = new Uint8Array(totalSize);
    let offset = 0;
    for (const entry of entries) {
      tarball.set(entry, offset);
      offset += entry.length;
    }

    return tarball;
  }

  private static async glob(pattern: string, dir: string): Promise<string[]> {
    const matches: string[] = [];
    try {
      const proc = Bun.spawn(["find", dir, "-type", "f"], { stdout: "pipe" });
      const output = await new Response(proc.stdout).text();

      for (const file of output.split('\n')) {
        if (file && this.matchesPattern(file.replace(`${dir}/`, ''), pattern)) {
          matches.push(file.replace(`${dir}/`, ''));
        }
      }
    } catch {
      // Fallback: no matches
    }
    return matches;
  }

  private static matchesPattern(file: string, pattern: string): boolean {
    const regex = new RegExp(
      pattern.replace(/\*/g, '.*').replace(/\?/g, '.')
    );
    return regex.test(file);
  }

  private static async getAllFiles(dir: string): Promise<string[]> {
    try {
      const proc = Bun.spawn(["find", dir, "-type", "f", "-not", "-path", "*/node_modules/*"], { stdout: "pipe" });
      const output = await new Response(proc.stdout).text();
      return output.split('\n')
        .map(f => f.replace(`${dir}/`, ''))
        .filter(f => f);
    } catch {
      return [];
    }
  }

  private static async legacyPack(packageJsonPath: string): Promise<Uint8Array> {
    // Legacy: may miss bin directories
    // Simplified fallback
    return new Uint8Array(0);
  }

  private static logPackEnforcement(packageName: string, fileCount: number): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 70,
        package: packageName,
        files: fileCount,
        binIncluded: true,
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
}

// Zero-cost export
export const { pack } = feature("PACK_ENFORCER")
  ? BunPackEnforcer
  : { pack: async (path: string) => new Uint8Array(0) };