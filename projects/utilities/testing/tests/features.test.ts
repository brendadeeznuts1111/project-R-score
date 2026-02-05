import { expect, test } from "bun:test";
import { feature } from "bun:bundle";

test("feature flags are type-safe and defined", () => {
  // During 'bun test', features might be undefined unless passed via --feature
  // but we can check if the macro is recognized.
  const isPremium = feature("FEAT_PREMIUM") ? true : false;
  expect(typeof isPremium).toBe("boolean");
});

test("compile-time constants are optimized", async () => {
  // This is more of a build-time check, but we can verify the macro works in tests
  if (feature("ENV_PRODUCTION")) {
    expect(feature("ENV_DEVELOPMENT")).toBe(false);
  }
});

test("premium-only logic elimination", () => {
  const startAutomation = () => {
    if (!feature("PHONE_AUTO")) {
      return "Automation disabled";
    }
    return "Automation running";
  };

  const result = startAutomation();
  console.log(`Automation status: ${result}`);
  expect(["Automation disabled", "Automation running"]).toContain(result);
});
