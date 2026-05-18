import { test, expect } from "bun:test";
import { RedactionEngine } from "../../server/compliance/redaction-engine";

test("redaction engine scans and redacts PCI data", () => {
  const engine = new RedactionEngine();
  const { redactedText, violations } = engine.scan(
    "Card: 4111-1111-1111-1111",
    ["creditCard"]
  );

  expect(redactedText).toBe("Card: XXXX-XXXX-XXXX-1111");
  expect(violations.length).toBe(1);
});

test("redaction engine scans and redacts email data", () => {
  const engine = new RedactionEngine();
  const { redactedText, violations } = engine.scan(
    "Email: user@example.com",
    ["email"]
  );

  expect(redactedText).toBe("Email: XXXX@XXX.XX");
  expect(violations.length).toBe(1);
});
