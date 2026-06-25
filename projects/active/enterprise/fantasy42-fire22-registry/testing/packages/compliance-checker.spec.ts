import { describe, it, expect } from 'bun:test';
import {
  getComplianceViolation,
  getComplianceViolationsByFramework,
  getComplianceViolationsBySeverity,
  calculateViolationDeadline,
  COMPLIANCE_ERROR_CODES,
} from '../../packages/compliance-checker/src/error-codes';

describe('Compliance Checker Package', () => {
  describe('Compliance Violation Lookup', () => {
    it('should return GDPR violation details by code', () => {
      const violation = getComplianceViolation('GDPR001');

      expect(violation).toBeDefined();
      expect(violation?.code).toBe('GDPR001');
      expect(violation?.framework).toBe('gdpr');
      expect(violation?.requirement).toBe('consentMechanism');
      expect(violation?.severity).toBe('CRITICAL');
      expect(violation?.category).toBe('GDPR Compliance');
      expect(violation?.title).toBe('Personal Data Processing Without Consent');
      expect(violation?.responsibleParty).toBe('Privacy Team');
      expect(violation?.regulatoryBody).toBe('National Data Protection Authorities');
      expect(violation?.penalty).toBe('Up to 4% of global annual turnover');
    });

    it('should return PCI DSS violation details by code', () => {
      const violation = getComplianceViolation('PCI001');

      expect(violation).toBeDefined();
      expect(violation?.code).toBe('PCI001');
      expect(violation?.framework).toBe('pci');
      expect(violation?.requirement).toBe('cardholderDataEncryption');
      expect(violation?.severity).toBe('CRITICAL');
      expect(violation?.category).toBe('PCI DSS Compliance');
      expect(violation?.title).toBe('Cardholder Data Not Encrypted');
      expect(violation?.responsibleParty).toBe('Security Team');
      expect(violation?.regulatoryBody).toBe('Payment Card Industry Security Standards Council');
    });

    it('should return AML violation details by code', () => {
      const violation = getComplianceViolation('AML001');

      expect(violation).toBeDefined();
      expect(violation?.code).toBe('AML001');
      expect(violation?.framework).toBe('aml');
      expect(violation?.severity).toBe('CRITICAL');
      expect(violation?.category).toBe('AML/KYC Compliance');
      expect(violation?.responsibleParty).toBe('Compliance Team');
    });

    it('should return PCI DSS violation details by code', () => {
      const violation = getComplianceViolation('PCI002');

      expect(violation).toBeDefined();
      expect(violation?.code).toBe('PCI002');
      expect(violation?.framework).toBe('pci');
      expect(violation?.severity).toBe('HIGH');
      expect(violation?.category).toBe('PCI DSS Compliance');
      expect(violation?.responsibleParty).toBe('IT Security');
    });

    it('should return null for non-existent violation code', () => {
      const violation = getComplianceViolation('NONEXISTENT001');
      expect(violation).toBeNull();
    });
  });

  describe('Framework-based Violation Filtering', () => {
    it('should return all GDPR violations', () => {
      const gdprViolations = getComplianceViolationsByFramework('gdpr');

      expect(gdprViolations.length).toBeGreaterThan(0);
      gdprViolations.forEach(violation => {
        expect(violation.framework).toBe('gdpr');
        expect(violation.category).toBe('GDPR Compliance');
      });
    });

    it('should return all PCI DSS violations', () => {
      const pciViolations = getComplianceViolationsByFramework('pci');

      expect(pciViolations.length).toBeGreaterThan(0);
      pciViolations.forEach(violation => {
        expect(violation.framework).toBe('pci');
        expect(violation.category).toBe('PCI DSS Compliance');
      });
    });

    it('should return all AML violations', () => {
      const amlViolations = getComplianceViolationsByFramework('aml');

      expect(amlViolations.length).toBeGreaterThan(0);
      amlViolations.forEach(violation => {
        expect(violation.framework).toBe('aml');
        expect(violation.category).toBe('AML/KYC Compliance');
      });
    });

    it('should return all AML violations', () => {
      const amlViolations = getComplianceViolationsByFramework('aml');

      expect(amlViolations.length).toBeGreaterThan(0);
      amlViolations.forEach(violation => {
        expect(violation.framework).toBe('aml');
        expect(violation.category).toBe('AML/KYC Compliance');
      });
    });

    it('should return empty array for non-existent framework', () => {
      const violations = getComplianceViolationsByFramework('nonexistent-framework');
      expect(violations).toHaveLength(0);
    });
  });

  describe('Severity-based Violation Filtering', () => {
    it('should return all CRITICAL violations', () => {
      const criticalViolations = getComplianceViolationsBySeverity('CRITICAL');

      expect(criticalViolations.length).toBeGreaterThan(0);
      criticalViolations.forEach(violation => {
        expect(violation.severity).toBe('CRITICAL');
      });
    });

    it('should return all HIGH violations', () => {
      const highViolations = getComplianceViolationsBySeverity('HIGH');

      expect(highViolations.length).toBeGreaterThan(0);
      highViolations.forEach(violation => {
        expect(violation.severity).toBe('HIGH');
      });
    });

    it('should return all MEDIUM violations', () => {
      const mediumViolations = getComplianceViolationsBySeverity('MEDIUM');

      expect(mediumViolations.length).toBeGreaterThan(0);
      mediumViolations.forEach(violation => {
        expect(violation.severity).toBe('MEDIUM');
      });
    });

    it('should return all MEDIUM violations', () => {
      const mediumViolations = getComplianceViolationsBySeverity('MEDIUM');

      expect(mediumViolations.length).toBeGreaterThan(0);
      mediumViolations.forEach(violation => {
        expect(violation.severity).toBe('MEDIUM');
      });
    });
  });

  describe('Violation Deadline Calculation', () => {
    it('should calculate deadline for GDPR violations', () => {
      const detectionDate = '2024-01-01T10:00:00Z';
      const deadline = calculateViolationDeadline('GDPR001', detectionDate);

      // GDPR001 has 30 days deadline
      expect(deadline).toBe('2024-01-31');
    });

    it('should calculate deadline for PCI DSS violations', () => {
      const detectionDate = '2024-01-15T10:00:00Z';
      const deadline = calculateViolationDeadline('PCI001', detectionDate);

      // PCI001 has 30 days deadline
      expect(deadline).toBe('2024-02-14');
    });

    it('should calculate deadline for AML violations', () => {
      const detectionDate = '2024-02-01T10:00:00Z';
      const deadline = calculateViolationDeadline('AML001', detectionDate);

      // AML001 has 60 days deadline - should be around March 31st/April 1st
      expect(deadline).toMatch(/^2024-0[34]/);
    });

    it('should calculate deadline for PCI DSS violations', () => {
      const detectionDate = '2024-01-15T10:00:00Z';
      const deadline = calculateViolationDeadline('PCI001', detectionDate);

      // PCI001 has 30 days deadline - should be around February
      expect(deadline).toMatch(/^2024-02/);
    });

    it('should return empty string for non-existent violation code', () => {
      const deadline = calculateViolationDeadline('NONEXISTENT001', '2024-01-01T10:00:00Z');
      expect(deadline).toBe('');
    });
  });

  describe('Compliance Error Codes Structure', () => {
    it('should have all required GDPR compliance codes', () => {
      expect(COMPLIANCE_ERROR_CODES['GDPR001']).toBeDefined();
      expect(COMPLIANCE_ERROR_CODES['GDPR002']).toBeDefined();
      expect(COMPLIANCE_ERROR_CODES['GDPR003']).toBeDefined();
    });

    it('should have all required PCI DSS compliance codes', () => {
      expect(COMPLIANCE_ERROR_CODES['PCI001']).toBeDefined();
      expect(COMPLIANCE_ERROR_CODES['PCI002']).toBeDefined();
    });

    it('should have all required AML compliance codes', () => {
      expect(COMPLIANCE_ERROR_CODES['AML001']).toBeDefined();
      expect(COMPLIANCE_ERROR_CODES['AML002']).toBeDefined();
    });
  });

  describe('Violation Structure Validation', () => {
    it('should have complete GDPR violation structure', () => {
      const violation = COMPLIANCE_ERROR_CODES['GDPR001'];

      expect(violation.code).toBe('GDPR001');
      expect(violation.framework).toBe('gdpr');
      expect(violation.requirement).toBe('consentMechanism');
      expect(violation.severity).toBe('CRITICAL');
      expect(violation.category).toBe('GDPR Compliance');
      expect(violation.title).toBeDefined();
      expect(violation.description).toBeDefined();
      expect(violation.impact).toBeDefined();
      expect(violation.suggestions).toBeInstanceOf(Array);
      expect(violation.suggestions.length).toBeGreaterThan(0);
      expect(violation.remediation).toBeDefined();
      expect(violation.deadline).toBeDefined();
      expect(violation.responsibleParty).toBeDefined();
      expect(violation.reference).toBeDefined();
    });

    it('should have complete AML violation structure', () => {
      const violation = COMPLIANCE_ERROR_CODES['AML001'];

      expect(violation.code).toBe('AML001');
      expect(violation.framework).toBe('aml');
      expect(violation.severity).toBe('CRITICAL');
      expect(violation.category).toBe('AML/KYC Compliance');
      expect(violation.title).toBeDefined();
      expect(violation.description).toBeDefined();
      expect(violation.impact).toBeDefined();
      expect(violation.suggestions).toBeInstanceOf(Array);
      expect(violation.suggestions.length).toBeGreaterThan(0);
      expect(violation.remediation).toBeDefined();
      expect(violation.deadline).toBeDefined();
      expect(violation.responsibleParty).toBeDefined();
      expect(violation.reference).toBeDefined();
    });

    it('should have actionable suggestions for all violations', () => {
      Object.values(COMPLIANCE_ERROR_CODES).forEach(violation => {
        expect(violation.suggestions).toBeInstanceOf(Array);
        expect(violation.suggestions.length).toBeGreaterThan(0);
        expect(violation.suggestions.every(suggestion => typeof suggestion === 'string')).toBe(
          true
        );
      });
    });

    it('should have remediation steps for all violations', () => {
      Object.values(COMPLIANCE_ERROR_CODES).forEach(violation => {
        expect(violation.remediation).toBeDefined();
        expect(violation.remediation.length).toBeGreaterThan(0);
      });
    });

    it('should have responsible parties assigned for all violations', () => {
      Object.values(COMPLIANCE_ERROR_CODES).forEach(violation => {
        expect(violation.responsibleParty).toBeDefined();
        expect(violation.responsibleParty.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Regulatory Framework Coverage', () => {
    it('should cover major regulatory frameworks', () => {
      const frameworks = new Set(Object.values(COMPLIANCE_ERROR_CODES).map(v => v.framework));

      expect(frameworks.has('gdpr')).toBe(true);
      expect(frameworks.has('pci')).toBe(true);
      expect(frameworks.has('aml')).toBe(true);
    });

    it('should have appropriate severity distribution', () => {
      const severities = Object.values(COMPLIANCE_ERROR_CODES).map(v => v.severity);
      const criticalCount = severities.filter(s => s === 'CRITICAL').length;
      const highCount = severities.filter(s => s === 'HIGH').length;
      const mediumCount = severities.filter(s => s === 'MEDIUM').length;
      const lowCount = severities.filter(s => s === 'LOW').length;

      expect(criticalCount).toBeGreaterThan(0);
      expect(highCount).toBeGreaterThan(0);
      expect(mediumCount).toBeGreaterThan(0);
      expect(lowCount).toBeGreaterThanOrEqual(0);

      // Should have more high-severity than critical (most issues should be fixable)
      expect(highCount).toBeGreaterThanOrEqual(criticalCount);
    });

    it('should have reasonable deadline distribution', () => {
      const deadlines = Object.values(COMPLIANCE_ERROR_CODES).map(v =>
        parseInt(v.deadline.split(' ')[0])
      );
      const shortDeadlines = deadlines.filter(d => d <= 30).length;
      const mediumDeadlines = deadlines.filter(d => d > 30 && d <= 60).length;
      const longDeadlines = deadlines.filter(d => d > 60).length;

      expect(shortDeadlines).toBeGreaterThan(0); // Some urgent fixes
      expect(mediumDeadlines).toBeGreaterThan(0); // Most fixes
      expect(longDeadlines).toBeGreaterThanOrEqual(0); // Some complex fixes
    });
  });

  describe('Violation Impact Assessment', () => {
    it('should have impact descriptions for all violations', () => {
      Object.values(COMPLIANCE_ERROR_CODES).forEach(violation => {
        expect(violation.impact).toBeDefined();
        expect(violation.impact.length).toBeGreaterThan(0);
        const impact = violation.impact.toLowerCase();
        expect(
          impact.includes('risk') ||
            impact.includes('compliance') ||
            impact.includes('legal') ||
            impact.includes('financial') ||
            impact.includes('fines') ||
            impact.includes('penalties')
        ).toBe(true);
      });
    });

    it('should have regulatory body information for all violations', () => {
      Object.values(COMPLIANCE_ERROR_CODES).forEach(violation => {
        expect(violation.regulatoryBody).toBeDefined();
        expect(violation.regulatoryBody.length).toBeGreaterThan(0);
      });
    });

    it('should have penalty information for high-impact violations', () => {
      const highImpactViolations = Object.values(COMPLIANCE_ERROR_CODES).filter(
        v => v.severity === 'CRITICAL' || v.severity === 'HIGH'
      );

      highImpactViolations.forEach(violation => {
        expect(violation.penalty).toBeDefined();
        expect(violation.penalty.length).toBeGreaterThan(0);
      });
    });
  });
});
