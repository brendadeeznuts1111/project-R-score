// [DUOPLUS][SPEC][CLI][FEAT][META:{gap_analysis:true}] [BUN:6.1-NATIVE]

export type CLIMatrix = Record<string, {
  command: string;
  claims: string[];
  implementation: {
    status: "SIMULATED" | "BROKEN" | "PARTIAL" | "IMPLEMENTED";
    file: string;
    lines?: number[];
    evidence?: string;
    issues?: string[];
  };
  gaps?: string[];
  compliance_violation?: string;
  fix?: {
    effort: string;
    tests: string;
    tag: string;
  };
}>;

export const cliMatrix: CLIMatrix = {
  "factorywager-inspector-enhanced": {
    command: "inspect",
    claims: [
      "Real URL inspection",
      "Compliance scanning + redaction",
      "QR onboarding flow",
      "15 checks with timing metrics"
    ],
    implementation: {
      status: "SIMULATED",
      file: "cli/factorywager-inspector-enhanced.ts:243",
      lines: [240, 260],
      evidence: "Mock data: const result = {...}"
    },
    gaps: [
      "No fetch() integration",
      "No rule engine",
      "Simulated QR codes",
      "No timing metrics collection"
    ],
    fix: {
      effort: "2 weeks",
      tests: "integration tests + fixtures",
      tag: "[DUO][CLI][INSPECT][BUG][CRITICAL][#REF:FIX-CLI-001]"
    }
  },
  "factorywager-cli": {
    command: "compliance",
    claims: ["PCI DSS compliance check", "GDPR redaction"],
    implementation: {
      status: "BROKEN",
      file: "cli/factorywager-inspector-enhanced.ts:85",
      issues: [
        "Credit card regex uses nonexistent capture group",
        "global regex .test() causes stateful failures",
        "Pass/fail logic inverted"
      ]
    },
    compliance_violation: "PCI DSS Requirement 3.4 - Data not actually redacted",
    fix: {
      effort: "3 days",
      tests: "regex unit tests + redaction fixtures",
      tag: "[SEC][COMPLIANCE][BUG][CRITICAL][#REF:FIX-COMPLIANCE-002]"
    }
  }
};
