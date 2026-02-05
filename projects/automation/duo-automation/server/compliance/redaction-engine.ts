// [SEC][COMPLIANCE][FIX][BUG][META:{pci:true,gdpr:true}] [CRITICAL] [#REF:FIX-REDAC-004][BUN:6.1-NATIVE]

export type RedactionRule = "creditCard" | "email";

export class RedactionEngine {
  private static readonly RULES = {
    creditCard: {
      pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
      redact: (match: string) => `XXXX-XXXX-XXXX-${match.slice(-4)}`,
      compliance: "PCI DSS 3.4",
      test: "4111-1111-1111-1111 -> XXXX-XXXX-XXXX-1111"
    },
    email: {
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      redact: () => "XXXX@XXX.XX",
      compliance: "GDPR Article 32",
      test: "user@example.com -> XXXX@XXX.XX"
    }
  } as const;

  redact(text: string, rules: RedactionRule[]): { text: string; redacted: string[] } {
    const redacted: string[] = [];
    let result = text;

    for (const rule of rules) {
      const config = RedactionEngine.RULES[rule];
      if (!config) continue;

      const matches = result.matchAll(config.pattern);

      for (const match of matches) {
        const original = match[0];
        const replacement = config.redact(original);
        result = result.replace(original, replacement);
        redacted.push(`[${config.compliance}] ${original} -> ${replacement}`);
      }
    }

    return { text: result, redacted };
  }

  scan(text: string, rules: RedactionRule[]): { violations: string[]; redactedText: string } {
    const violations: string[] = [];
    let result = text;

    for (const rule of rules) {
      const config = RedactionEngine.RULES[rule];
      if (!config) continue;

      const matches = [...result.matchAll(config.pattern)];
      for (const match of matches) {
        violations.push(`[${config.compliance}] Found: ${match[0]}`);
        result = result.replace(match[0], config.redact(match[0]));
      }
    }

    return { violations, redactedText: result };
  }
}
