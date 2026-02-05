import { describe, it, expect } from 'bun:test';
import { SECURITY_ERROR_CODES } from '../../packages/security-audit/src/error-codes';

describe('Security Audit Package', () => {
  describe('Security Error Codes Structure', () => {
    it('should have all required package security codes', () => {
      expect(SECURITY_ERROR_CODES['PKG001']).toBeDefined();
      expect(SECURITY_ERROR_CODES['PKG002']).toBeDefined();
      expect(SECURITY_ERROR_CODES['PKG003']).toBeDefined();
    });

    it('should have all required code security codes', () => {
      expect(SECURITY_ERROR_CODES['COD001']).toBeDefined();
      expect(SECURITY_ERROR_CODES['COD002']).toBeDefined();
      expect(SECURITY_ERROR_CODES['COD003']).toBeDefined();
      expect(SECURITY_ERROR_CODES['COD004']).toBeDefined();
    });

    it('should have all required infrastructure security codes', () => {
      expect(SECURITY_ERROR_CODES['INF001']).toBeDefined();
      expect(SECURITY_ERROR_CODES['INF002']).toBeDefined();
      expect(SECURITY_ERROR_CODES['INF003']).toBeDefined();
    });

    it('should have all required configuration security codes', () => {
      expect(SECURITY_ERROR_CODES['CFG001']).toBeDefined();
      expect(SECURITY_ERROR_CODES['CFG002']).toBeDefined();
    });
  });

  describe('Security Issue Structure Validation', () => {
    it('should have complete PKG001 structure', () => {
      const issue = SECURITY_ERROR_CODES['PKG001'];

      expect(issue.code).toBe('PKG001');
      expect(issue.severity).toBe('CRITICAL');
      expect(issue.category).toBe('Package Security');
      expect(issue.title).toBe('Vulnerable Package Dependency');
      expect(issue.description).toContain('known security vulnerabilities');
      expect(issue.impact).toContain('High risk of exploitation');
      expect(issue.suggestions).toBeInstanceOf(Array);
      expect(issue.suggestions.length).toBeGreaterThan(0);
      expect(issue.remediation).toContain('Update vulnerable packages');
      expect(issue.cwe).toBe('CWE-937');
      expect(issue.owasp).toBe('A06:2021-Vulnerable Components');
      expect(issue.references).toBeInstanceOf(Array);
    });

    it('should have complete security issue structure', () => {
      const issue = SECURITY_ERROR_CODES['PKG001'];

      expect(issue.code).toBe('PKG001');
      expect(issue.severity).toBe('CRITICAL');
      expect(issue.category).toBe('Package Security');
      expect(issue.title).toBeDefined();
      expect(issue.description).toBeDefined();
      expect(issue.impact).toBeDefined();
      expect(issue.suggestions).toBeInstanceOf(Array);
      expect(issue.suggestions.length).toBeGreaterThan(0);
      expect(issue.remediation).toBeDefined();
      expect(issue.cwe).toBeDefined();
      expect(issue.owasp).toBeDefined();
    });
  });

  describe('Severity Distribution', () => {
    it('should have appropriate CRITICAL severity issues', () => {
      const criticalIssues = Object.values(SECURITY_ERROR_CODES).filter(
        issue => issue.severity === 'CRITICAL'
      );

      expect(criticalIssues.length).toBeGreaterThan(0);
      criticalIssues.forEach(issue => {
        expect(issue.severity).toBe('CRITICAL');
        // Critical issues should have high-impact descriptions
        const impact = issue.impact.toLowerCase();
        expect(
          impact.includes('credential') ||
            impact.includes('exposure') ||
            impact.includes('unauthorized') ||
            impact.includes('breach') ||
            impact.includes('complete')
        ).toBe(true);
      });
    });

    it('should have appropriate HIGH severity issues', () => {
      const highIssues = Object.values(SECURITY_ERROR_CODES).filter(
        issue => issue.severity === 'HIGH'
      );

      expect(highIssues.length).toBeGreaterThan(0);
      highIssues.forEach(issue => {
        expect(issue.severity).toBe('HIGH');
        // High issues should have significant impact but less than critical
        const impact = issue.impact.toLowerCase();
        expect(
          impact.includes('missed') ||
            impact.includes('security') ||
            impact.includes('patches') ||
            impact.includes('bug') ||
            impact.includes('feature')
        ).toBe(true);
      });
    });

    it('should have appropriate MEDIUM severity issues', () => {
      const mediumIssues = Object.values(SECURITY_ERROR_CODES).filter(
        issue => issue.severity === 'MEDIUM'
      );

      expect(mediumIssues.length).toBeGreaterThan(0);
      mediumIssues.forEach(issue => {
        expect(issue.severity).toBe('MEDIUM');
        // Medium issues should have moderate impact
        const impact = issue.impact.toLowerCase();
        expect(
          impact.includes('no') ||
            impact.includes('security') ||
            impact.includes('updates') ||
            impact.includes('bug') ||
            impact.includes('fixes') ||
            impact.includes('support')
        ).toBe(true);
      });
    });
  });

  describe('Category Distribution', () => {
    it('should cover all security categories', () => {
      const categories = new Set(Object.values(SECURITY_ERROR_CODES).map(issue => issue.category));

      expect(categories.has('Package Security')).toBe(true);
      expect(categories.has('Code Security')).toBe(true);
      expect(categories.has('Infrastructure Security')).toBe(true);
      expect(categories.has('Configuration Security')).toBe(true);
    });

    it('should have balanced distribution across categories', () => {
      const categoryCounts: Record<string, number> = {};

      Object.values(SECURITY_ERROR_CODES).forEach(issue => {
        categoryCounts[issue.category] = (categoryCounts[issue.category] || 0) + 1;
      });

      // Each major category should have multiple issues
      expect(categoryCounts['Package Security']).toBeGreaterThanOrEqual(3);
      expect(categoryCounts['Code Security']).toBeGreaterThanOrEqual(4);
      expect(categoryCounts['Infrastructure Security']).toBeGreaterThanOrEqual(3);
      expect(categoryCounts['Configuration Security']).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Remediation Guidance', () => {
    it('should provide actionable remediation for all issues', () => {
      Object.values(SECURITY_ERROR_CODES).forEach(issue => {
        expect(issue.remediation).toBeDefined();
        expect(issue.remediation.length).toBeGreaterThan(0);
        // Should contain actionable language
        const remediation = issue.remediation.toLowerCase();
        expect(
          remediation.includes('implement') ||
            remediation.includes('use') ||
            remediation.includes('configure') ||
            remediation.includes('enable') ||
            remediation.includes('update') ||
            remediation.includes('apply') ||
            remediation.includes('set') ||
            remediation.includes('replace') ||
            remediation.includes('within')
        ).toBe(true);
      });
    });

    it('should provide comprehensive suggestions for all issues', () => {
      Object.values(SECURITY_ERROR_CODES).forEach(issue => {
        expect(issue.suggestions).toBeInstanceOf(Array);
        expect(issue.suggestions.length).toBeGreaterThan(0);
        expect(issue.suggestions.length).toBeLessThanOrEqual(10); // Reasonable limit

        // Each suggestion should be actionable
        issue.suggestions.forEach(suggestion => {
          expect(typeof suggestion).toBe('string');
          expect(suggestion.length).toBeGreaterThan(10); // Meaningful suggestions
        });
      });
    });

    it('should have time-sensitive remediation for critical issues', () => {
      const criticalIssues = Object.values(SECURITY_ERROR_CODES).filter(
        issue => issue.severity === 'CRITICAL'
      );

      criticalIssues.forEach(issue => {
        // Critical issues should mention immediate action or specific timelines
        expect(issue.remediation.toLowerCase()).toMatch(
          /(immediately|within|as soon as|urgent|critical)/
        );
      });
    });
  });

  describe('Security Standards Compliance', () => {
    it('should reference CWE for code security issues', () => {
      const codeIssues = Object.values(SECURITY_ERROR_CODES).filter(
        issue => issue.category === 'Code Security'
      );

      codeIssues.forEach(issue => {
        expect(issue.cwe).toBeDefined();
        expect(issue.cwe).toMatch(/^CWE-\d+$/);
      });
    });

    it('should reference OWASP for web security issues', () => {
      const webIssues = Object.values(SECURITY_ERROR_CODES).filter(issue =>
        ['Package Security', 'Code Security', 'Authentication Security'].includes(issue.category)
      );

      webIssues.forEach(issue => {
        expect(issue.owasp).toBeDefined();
        expect(issue.owasp).toMatch(/^A\d+:/);
      });
    });

    it('should provide reference links for major issues', () => {
      const majorIssues = Object.values(SECURITY_ERROR_CODES).filter(
        issue => issue.severity === 'CRITICAL' || issue.severity === 'HIGH'
      );

      majorIssues.forEach(issue => {
        if (issue.references) {
          expect(issue.references).toBeInstanceOf(Array);
          expect(issue.references.length).toBeGreaterThan(0);
          issue.references.forEach(ref => {
            expect(typeof ref).toBe('string');
            expect(ref).toMatch(/^https?:\/\//);
          });
        }
      });
    });
  });

  describe('Impact Assessment', () => {
    it('should provide detailed impact descriptions', () => {
      Object.values(SECURITY_ERROR_CODES).forEach(issue => {
        expect(issue.impact).toBeDefined();
        expect(issue.impact.length).toBeGreaterThan(20); // Meaningful description
        expect(issue.impact.length).toBeLessThan(500); // Not too verbose

        // Should mention specific consequences
        const impact = issue.impact.toLowerCase();
        expect(
          impact.includes('breach') ||
            impact.includes('compromise') ||
            impact.includes('unauthorized') ||
            impact.includes('exploit') ||
            impact.includes('vulnerability') ||
            impact.includes('risk') ||
            impact.includes('exposure') ||
            impact.includes('credential') ||
            impact.includes('access') ||
            impact.includes('security')
        ).toBe(true);
      });
    });

    it('should correlate severity with impact severity', () => {
      const criticalIssues = Object.values(SECURITY_ERROR_CODES).filter(
        issue => issue.severity === 'CRITICAL'
      );

      const highIssues = Object.values(SECURITY_ERROR_CODES).filter(
        issue => issue.severity === 'HIGH'
      );

      const mediumIssues = Object.values(SECURITY_ERROR_CODES).filter(
        issue => issue.severity === 'MEDIUM'
      );

      // Critical issues should have more severe impact language
      criticalIssues.forEach(issue => {
        const impact = issue.impact.toLowerCase();
        expect(
          impact.includes('complete') ||
            impact.includes('massive') ||
            impact.includes('critical') ||
            impact.includes('severe') ||
            impact.includes('credential') ||
            impact.includes('exposure') ||
            impact.includes('unauthorized') ||
            impact.includes('breach')
        ).toBe(true);
      });

      // High issues should have significant impact language
      highIssues.forEach(issue => {
        const impact = issue.impact.toLowerCase();
        expect(
          impact.includes('significant') ||
            impact.includes('substantial') ||
            impact.includes('high') ||
            impact.includes('increased')
        ).toBe(true);
      });

      // Medium issues should have moderate impact language
      mediumIssues.forEach(issue => {
        const impact = issue.impact.toLowerCase();
        expect(
          impact.includes('moderate') ||
            impact.includes('limited') ||
            impact.includes('partial') ||
            impact.includes('potential')
        ).toBe(true);
      });
    });
  });

  describe('Security Issue Categories', () => {
    describe('Package Security Issues', () => {
      it('should handle vulnerable dependencies', () => {
        const issue = SECURITY_ERROR_CODES['PKG001'];
        expect(issue.title).toBe('Vulnerable Package Dependency');
        expect(issue.suggestions).toContain('Update package to latest secure version immediately');
        expect(issue.suggestions).toContain('Review vulnerability details and exploit vectors');
      });

      it('should handle outdated packages', () => {
        const issue = SECURITY_ERROR_CODES['PKG002'];
        expect(issue.title).toBe('Outdated Package Version');
        expect(issue.suggestions).toContain('Update to latest stable version');
        expect(issue.suggestions).toContain('Check changelog for breaking changes');
      });

      it('should handle unmaintained packages', () => {
        const issue = SECURITY_ERROR_CODES['PKG003'];
        expect(issue.title).toBe('Unmaintained Package');
        expect(issue.suggestions).toContain('Evaluate package necessity and usage frequency');
        expect(issue.suggestions).toContain('Find actively maintained alternative packages');
      });
    });

    describe('Code Security Issues', () => {
      it('should handle SQL injection', () => {
        const issue = SECURITY_ERROR_CODES['COD001'];
        expect(issue.title).toBe('SQL Injection Vulnerability');
        expect(issue.suggestions).toContain('Use parameterized queries or prepared statements');
        expect(issue.suggestions).toContain('Implement input sanitization and validation');
      });

      it('should handle XSS vulnerabilities', () => {
        const issue = SECURITY_ERROR_CODES['COD002'];
        expect(issue.title).toBe('Cross-Site Scripting (XSS)');
        expect(issue.suggestions).toContain('Implement input validation and sanitization');
        expect(issue.suggestions).toContain('Use Content Security Policy (CSP)');
      });

      it('should handle Broken Authentication', () => {
        const issue = SECURITY_ERROR_CODES['COD003'];
        expect(issue.title).toBe('Broken Authentication');
        expect(issue.suggestions).toContain('Implement multi-factor authentication (MFA)');
        expect(issue.suggestions).toContain('Use secure session management');
      });
    });
  });
});
