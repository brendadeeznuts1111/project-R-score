/**
 * Governance CLI - Enforces code quality, naming, documentation, and bloat boundaries
 * 
 * Enhanced with cryptographic integrity checking using Bun's native hashing
 * 
 * Usage:
 *   bun run governance --check          # Run all checks
 *   bun run governance --check naming   # Check naming conventions
 *   bun run governance --check docs      # Check documentation
 *   bun run governance --check bloat     # Check code bloat
 *   bun run governance --check integrity # Check file integrity
 *   bun run governance --fix             # Auto-fix issues where possible
 */

import { parseArgs } from "../src/utils/cli-parser.js";
import { NamingGovernance } from "./governance/naming.js";
import { DocumentationGovernance } from "./governance/documentation.js";
import { BloatGovernance } from "./governance/bloat.js";
import { IntegrityGovernance } from "./governance/integrity.js";
import { getLogger } from "../src/utils/logger.js";

const logger = getLogger();

interface GovernanceResult {
  passed: boolean;
  violations: GovernanceViolation[];
}

interface GovernanceViolation {
  file: string;
  line?: number;
  rule: string;
  message: string;
  severity: "error" | "warning";
  fixable?: boolean;
}

class GovernanceChecker {
  private naming: NamingGovernance;
  private documentation: DocumentationGovernance;
  private bloat: BloatGovernance;
  private integrity: IntegrityGovernance;

  constructor() {
    this.naming = new NamingGovernance();
    this.documentation = new DocumentationGovernance();
    this.bloat = new BloatGovernance();
    this.integrity = new IntegrityGovernance();
  }

  async checkAll(): Promise<GovernanceResult> {
    const results = await Promise.all([
      this.checkNaming(),
      this.checkDocumentation(),
      this.checkBloat(),
      this.checkIntegrity(),
    ]);

    const allViolations = results.flatMap((r) => r.violations);
    const passed = allViolations.every((v) => v.severity === "error");

    return {
      passed,
      violations: allViolations,
    };
  }

  async checkNaming(): Promise<GovernanceResult> {
    logger.info("Checking naming conventions...");
    return await this.naming.check();
  }

  async checkDocumentation(): Promise<GovernanceResult> {
    logger.info("Checking documentation...");
    return await this.documentation.check();
  }

  async checkBloat(): Promise<GovernanceResult> {
    logger.info("Checking code bloat...");
    return await this.bloat.check();
  }

  async checkIntegrity(): Promise<GovernanceResult> {
    logger.info("Checking file integrity...");
    return await this.integrity.check();
  }

  async fix(): Promise<void> {
    logger.info("Auto-fixing issues...");
    
    const [namingResult, docsResult, bloatResult, integrityResult] = await Promise.all([
      this.checkNaming(),
      this.checkDocumentation(),
      this.checkBloat(),
      this.checkIntegrity(),
    ]);

    const fixableViolations = [
      ...namingResult.violations,
      ...docsResult.violations,
      ...bloatResult.violations,
      ...integrityResult.violations,
    ].filter((v) => v.fixable);

    logger.info(`Found ${fixableViolations.length} fixable violations`);

    for (const violation of fixableViolations) {
      logger.debug(`Fixing: ${violation.message} in ${violation.file}`);
      // Implement auto-fix logic here
    }
  }
}

// CLI interface
async function main() {
  const { values } = parseArgs({
    options: {
      check: { type: "boolean" },
      fix: { type: "boolean" },
      type: { type: "string" },
    },
    allowPositionals: true,
    strict: false,
  });

  const checker = new GovernanceChecker();

  if (values.fix) {
    await checker.fix();
    return;
  }

  let result: GovernanceResult;

  const checkType = values.type as string | undefined;
  if (checkType === "naming") {
    result = await checker.checkNaming();
  } else if (checkType === "docs") {
    result = await checker.checkDocumentation();
  } else if (checkType === "bloat") {
    result = await checker.checkBloat();
  } else if (checkType === "integrity") {
    result = await checker.checkIntegrity();
  } else {
    result = await checker.checkAll();
  }

  // Report results
  if (result.violations.length === 0) {
    logger.info("✅ All governance checks passed!");
    process.exit(0);
  }

  const errors = result.violations.filter((v) => v.severity === "error");
  const warnings = result.violations.filter((v) => v.severity === "warning");

  logger.error(`Found ${errors.length} errors and ${warnings.length} warnings`);

  for (const violation of result.violations) {
    const prefix = violation.severity === "error" ? "❌" : "⚠️";
    const location = violation.line
      ? `${violation.file}:${violation.line}`
      : violation.file;
    logger.warn(`${prefix} [${violation.rule}] ${location}: ${violation.message}`);
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((error) => {
  logger.error("Governance check failed", error);
  process.exit(1);
});

export { GovernanceChecker, GovernanceResult, GovernanceViolation };

