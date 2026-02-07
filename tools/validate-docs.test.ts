// tools/validate-docs.test.ts — Tests for validate-docs

import { test, expect, describe } from 'bun:test';
import { checkUrls, checkEnums, checkImports } from './validate-docs';
import snapshot from './validate-docs.snapshot.json';

describe('validate-docs', () => {
  describe('checkUrls', () => {
    test('should return a result with name "URL patterns"', async () => {
      const result = await checkUrls();
      expect(result.name).toBe('URL patterns');
      expect(result.issues).toBeArray();
    });

    test('should not flag feed.xml in the core files after fix', async () => {
      const result = await checkUrls();
      const coreFiles = [
        'lib/docs/constants/domains.ts',
        'lib/docs/constants/categories.ts',
        'cli/integrated-cli.ts',
        'server/base-server.ts',
        'examples/comprehensive-usage.ts',
      ];
      const coreIssues = result.issues.filter(
        i => coreFiles.includes(i.file) && i.message.includes('feed.xml')
      );
      expect(coreIssues).toHaveLength(0);
    });

    test('should not flag @planned annotated lines', async () => {
      const result = await checkUrls();
      const plannedIssues = result.issues.filter(
        i => i.file === 'lib/docs/constants/domains.ts' &&
             i.message.includes('docs.bun.sh')
      );
      expect(plannedIssues).toHaveLength(0);
    });

    test('should only flag docs.bun.sh in test/demo files, not core constants', async () => {
      const result = await checkUrls();
      const coreConstantFiles = [
        'lib/docs/constants/domains.ts',
        'lib/docs/constants/categories.ts',
        'lib/core/core-documentation.ts',
      ];
      const coreDocsBunShIssues = result.issues.filter(
        i => coreConstantFiles.includes(i.file) && i.message.includes('docs.bun.sh')
      );
      expect(coreDocsBunShIssues).toHaveLength(0);
    });
  });

  describe('checkEnums', () => {
    test('should return a result with name "Enum definitions"', async () => {
      const result = await checkEnums();
      expect(result.name).toBe('Enum definitions');
      expect(result.issues).toBeArray();
    });

    test('should not flag the canonical source itself', async () => {
      const result = await checkEnums();
      const canonicalIssues = result.issues.filter(
        i => i.file === 'lib/docs/constants/enums.ts'
      );
      expect(canonicalIssues).toHaveLength(0);
    });

    test('should not flag re-exports in domains.ts or domain-mapper.ts', async () => {
      const result = await checkEnums();
      // These files now import+re-export, not define inline enums
      const reExportIssues = result.issues.filter(
        i => i.file === 'lib/docs/constants/domains.ts' ||
             i.file === 'lib/har-analyzer/domain-mapper.ts'
      );
      expect(reExportIssues).toHaveLength(0);
    });
  });

  describe('checkImports', () => {
    test('should return a result with name "Import paths"', async () => {
      const result = await checkImports();
      expect(result.name).toBe('Import paths');
      expect(result.issues).toBeArray();
    });

    test('should not flag the 18 fixed import files', async () => {
      const result = await checkImports();
      const fixedFiles = [
        'lib/core/core-documentation.ts',
        'lib/core/cli-documentation-handler.ts',
        'lib/core/documentation-url-handler.ts',
        'lib/core/url-service.ts',
        'lib/docs/documentation-validator.ts',
        'lib/mcp/cli-documentation-mcp.ts',
        'lib/validation/complete-documentation-validator.ts',
        'lib/wiki/wiki-generator-cli.ts',
        'lib/wiki/wiki-generator.ts',
        'server/base-server.ts',
        'tests/documentation-url-handler.test.ts',
        'scripts/url-validator.ts',
        'examples/documentation-fragment-integration.ts',
        'examples/enhanced-documentation-integration.ts',
        'examples/enhanced-docs-usage.ts',
        'examples/bun-quick-usage-demo.ts',
        'examples/comprehensive-usage.ts',
        'examples/cli-documentation-integration.ts',
      ];
      const fixedIssues = result.issues.filter(i => fixedFiles.includes(i.file));
      expect(fixedIssues).toHaveLength(0);
    });
  });

  describe('snapshot regression', () => {
    test('URL issue count matches baseline snapshot', async () => {
      const result = await checkUrls();
      const expected = snapshot.checks['URL patterns'];
      expect(result.issues.length).toBe(expected.totalIssues);
    });

    test('Enum issue count matches baseline snapshot', async () => {
      const result = await checkEnums();
      const expected = snapshot.checks['Enum definitions'];
      expect(result.issues.length).toBe(expected.totalIssues);
    });

    test('Import issue count matches baseline snapshot', async () => {
      const result = await checkImports();
      const expected = snapshot.checks['Import paths'];
      expect(result.issues.length).toBe(expected.totalIssues);
    });

    test('total issues match baseline snapshot', async () => {
      const [urls, enums, imports] = await Promise.all([checkUrls(), checkEnums(), checkImports()]);
      const total = urls.issues.length + enums.issues.length + imports.issues.length;
      expect(total).toBe(snapshot.totals.totalIssues);
    });

    test('issue sources match baseline snapshot', async () => {
      const [urls, enums, imports] = await Promise.all([checkUrls(), checkEnums(), checkImports()]);
      const allIssues = [...urls.issues, ...enums.issues, ...imports.issues];
      const bySource: Record<string, number> = {};
      for (const issue of allIssues) {
        bySource[issue.source] = (bySource[issue.source] || 0) + 1;
      }
      expect(bySource).toEqual(snapshot.totals.bySource);
    });
  });

  describe('JSON output structure', () => {
    test('all checkers return valid CheckResult shape', async () => {
      const results = await Promise.all([checkUrls(), checkEnums(), checkImports()]);
      for (const r of results) {
        expect(r).toHaveProperty('name');
        expect(r).toHaveProperty('issues');
        expect(r).toHaveProperty('passed');
        expect(r).toHaveProperty('failed');
        expect(typeof r.name).toBe('string');
        expect(Array.isArray(r.issues)).toBe(true);
        for (const issue of r.issues) {
          expect(issue).toHaveProperty('type');
          expect(issue).toHaveProperty('severity');
          expect(issue).toHaveProperty('file');
          expect(issue).toHaveProperty('line');
          expect(issue).toHaveProperty('message');
          expect(['url', 'enum', 'import']).toContain(issue.type);
          expect(['error', 'warning']).toContain(issue.severity);
        }
      }
    });
  });
});
