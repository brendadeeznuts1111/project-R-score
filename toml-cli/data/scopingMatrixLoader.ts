import { SCOPING_MATRIX, ScopingRule } from "./scopingMatrix.ts";

let cachedMatrix: ScopingRule[] | null = null;
let lastLoadTime: number = 0;
const CACHE_TTL = 30000; // 30 seconds

/**
 * Load scoping matrix with zero-copy deserialization using Bun.file().json()
 * Falls back to embedded matrix if external file doesn't exist
 */
async function loadMatrix(): Promise<ScopingRule[]> {
  const now = Date.now();

  // Return cached matrix if still fresh
  if (cachedMatrix && (now - lastLoadTime) < CACHE_TTL) {
    return cachedMatrix;
  }

  // Try to load from external JSON file (zero-copy deserialization)
  const file = Bun.file(import.meta.dir + "/scopingMatrix.json");
  if (await file.exists()) {
    try {
      const externalMatrix = await file.json() as ScopingRule[];
      // Validate the external matrix structure
      if (Array.isArray(externalMatrix) && externalMatrix.length > 0) {
        cachedMatrix = externalMatrix;
        lastLoadTime = now;
        console.log(`✅ Loaded external scoping matrix (${externalMatrix.length} rules)`);
        return cachedMatrix;
      }
    } catch (error) {
      console.warn("⚠️ Failed to load external scoping matrix, falling back to embedded:", error);
    }
  }

  // Fallback to embedded matrix
  cachedMatrix = SCOPING_MATRIX;
  lastLoadTime = now;
  console.log(`ℹ️ Using embedded scoping matrix (${SCOPING_MATRIX.length} rules)`);
  return cachedMatrix;
}

/**
 * Get the current scoping matrix (with caching and external file support)
 */
export async function getScopingMatrix(): Promise<ScopingRule[]> {
  if (!cachedMatrix) {
    cachedMatrix = await loadMatrix();
    // Hint GC if memory pressure (optional)
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > 100_000_000) {
      // Note: Bun.gc() may not be available in all versions
      if (typeof Bun !== 'undefined' && Bun.gc) {
        Bun.gc(true);
      }
    }
  }
  return cachedMatrix;
}

/**
 * Force reload the scoping matrix from external file or embedded fallback
 */
export async function reloadScopingMatrix(): Promise<ScopingRule[]> {
  cachedMatrix = null;
  return await getScopingMatrix();
}

/**
 * Save the current matrix to external JSON file for customization
 */
export async function saveScopingMatrix(matrix: ScopingRule[]): Promise<void> {
  const filePath = import.meta.dir + "/scopingMatrix.json";
  await Bun.write(filePath, JSON.stringify(matrix, null, 2));
  console.log(`💾 Saved scoping matrix to ${filePath} (${matrix.length} rules)`);

  // Update cache
  cachedMatrix = matrix;
  lastLoadTime = Date.now();
}

/**
 * Validate scoping matrix structure
 */
export function validateScopingMatrix(matrix: ScopingRule[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(matrix)) {
    errors.push("Matrix must be an array");
    return { valid: false, errors };
  }

  if (matrix.length === 0) {
    errors.push("Matrix cannot be empty");
  }

  matrix.forEach((rule, index) => {
    if (!rule.servingDomain) {
      errors.push(`Rule ${index}: missing servingDomain`);
    }

    if (!["ENTERPRISE", "DEVELOPMENT", "PERSONAL", "PUBLIC"].includes(rule.detectedScope)) {
      errors.push(`Rule ${index}: invalid detectedScope '${rule.detectedScope}'`);
    }

    if (!["Windows", "macOS", "Linux", "Android", "iOS", "Other", "Any"].includes(rule.platform)) {
      errors.push(`Rule ${index}: invalid platform '${rule.platform}'`);
    }

    if (!rule.features || typeof rule.features !== "object") {
      errors.push(`Rule ${index}: missing or invalid features`);
    }

    if (!rule.limits || typeof rule.limits !== "object") {
      errors.push(`Rule ${index}: missing or invalid limits`);
    }

    if (!rule.integrations || typeof rule.integrations !== "object") {
      errors.push(`Rule ${index}: missing or invalid integrations`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Create a default scoping matrix file for customization
 */
export async function createDefaultMatrixFile(): Promise<void> {
  const validation = validateScopingMatrix(SCOPING_MATRIX);
  if (!validation.valid) {
    throw new Error(`Embedded matrix is invalid: ${validation.errors.join(", ")}`);
  }

  await saveScopingMatrix(SCOPING_MATRIX);
  console.log("📝 Created default scopingMatrix.json for customization");
}

/**
 * Get matrix statistics
 */
export async function getMatrixStats(): Promise<{
  totalRules: number;
  domains: string[];
  scopes: string[];
  platforms: string[];
  rulesByScope: Record<string, number>;
  rulesByPlatform: Record<string, number>;
  source: "external" | "embedded";
  lastLoadTime: number;
}> {
  const matrix = await getScopingMatrix();
  const isExternal = await Bun.file(import.meta.dir + "/scopingMatrix.json").exists();

  return {
    totalRules: matrix.length,
    domains: [...new Set(matrix.map(r => r.servingDomain))],
    scopes: [...new Set(matrix.map(r => r.detectedScope))],
    platforms: [...new Set(matrix.map(r => r.platform))],
    rulesByScope: matrix.reduce((acc, rule) => {
      acc[rule.detectedScope] = (acc[rule.detectedScope] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    rulesByPlatform: matrix.reduce((acc, rule) => {
      acc[rule.platform] = (acc[rule.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    source: isExternal ? "external" : "embedded",
    lastLoadTime,
  };
}