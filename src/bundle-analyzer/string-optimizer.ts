export class StringOptimizer {
  private static cache = new Map<string, string>();
  private static readonly units = ["B", "KB", "MB", "GB"] as const;

  static formatBytes(bytes: number): string {
    const normalized = Number.isFinite(bytes) && bytes >= 0 ? bytes : 0;
    const cacheKey = `bytes:${normalized}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    let size = normalized;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < StringOptimizer.units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    const result = `${size.toFixed(2)} ${StringOptimizer.units[unitIndex]}`;
    this.cache.set(cacheKey, result);
    return result;
  }

  static getFileName(path: string): string {
    const lastSlash = path.lastIndexOf("/");
    return lastSlash === -1 ? path : path.slice(lastSlash + 1);
  }

  static getExtension(path: string): string {
    const lastDot = path.lastIndexOf(".");
    return lastDot === -1 ? "" : path.slice(lastDot);
  }

  static isExternalImport(path: string): boolean {
    return (
      path.startsWith("node:") ||
      path.startsWith("npm:") ||
      path.startsWith("http://") ||
      path.startsWith("https://")
    );
  }

  static isTypeScriptFile(path: string): boolean {
    return (
      path.endsWith(".ts") ||
      path.endsWith(".tsx") ||
      path.endsWith(".mts") ||
      path.endsWith(".cts")
    );
  }

  static isJavaScriptFile(path: string): boolean {
    return (
      path.endsWith(".js") ||
      path.endsWith(".jsx") ||
      path.endsWith(".mjs") ||
      path.endsWith(".cjs")
    );
  }

  static safeTrim(str: string): string {
    return str.trim();
  }

  static safeTrimStart(str: string): string {
    return str.trimStart();
  }

  static safeTrimEnd(str: string): string {
    return str.trimEnd();
  }

  static replaceAll(str: string, search: string, replacement: string): string {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return str.replace(new RegExp(escaped, "g"), replacement);
  }

  static joinPaths(...parts: string[]): string {
    return parts.join("/").replace(/\/+/g, "/");
  }

  static clearCache(): void {
    this.cache.clear();
  }

  static benchmark(iterations = 1_000_000): void {
    console.info("Benchmarking optimized string operations");

    const testPath = "src/components/Button.tsx";
    const testString = "  Hello World  ";

    let start = performance.now();
    for (let i = 0; i < iterations; i++) testPath.startsWith("src/");
    console.info(`startsWith: ${(performance.now() - start).toFixed(2)}ms`);

    start = performance.now();
    for (let i = 0; i < iterations; i++) testPath.endsWith(".tsx");
    console.info(`endsWith: ${(performance.now() - start).toFixed(2)}ms`);

    start = performance.now();
    for (let i = 0; i < iterations; i++) testString.trim();
    console.info(`trim: ${(performance.now() - start).toFixed(2)}ms`);

    start = performance.now();
    for (let i = 0; i < iterations; i++) testString.replace("World", "Bun");
    console.info(`replace: ${(performance.now() - start).toFixed(2)}ms`);
  }
}
