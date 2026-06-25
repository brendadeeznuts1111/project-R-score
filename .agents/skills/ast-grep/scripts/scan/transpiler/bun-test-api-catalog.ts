/** Official API reference — https://bun.com/reference/bun/test */

export const BUN_TEST_API_REF = "https://bun.com/reference/bun/test";

export type BunTestApiEntry = {
  name: string;
  ref: string;
  summary: string;
};

export type BunTestApiCatalog = {
  ref: string;
  summary: string;
  exports: BunTestApiEntry[];
  hooks: BunTestApiEntry[];
  describeModifiers: BunTestApiEntry[];
  utilities: BunTestApiEntry[];
  matcherGroups: Record<string, BunTestApiEntry[]>;
  asymmetric: BunTestApiEntry[];
  jestNamespace: BunTestApiEntry[];
  skillUsage: string[];
};

function ref(path: string): string {
  return `${BUN_TEST_API_REF}${path}`;
}

export const BUN_TEST_API_CATALOG: BunTestApiCatalog = {
  ref: BUN_TEST_API_REF,
  summary: "Fast built-in test runner — Jest-compatible expect, describe, lifecycle hooks, mocks",
  exports: [
    { name: "test", ref: ref("/test"), summary: "Run a test (alias: it)" },
    { name: "describe", ref: ref("/describe"), summary: "Group related tests" },
    { name: "expect", ref: ref("/expect"), summary: "Assertions and asymmetric matchers" },
    { name: "expectTypeOf", ref: ref("/expectTypeOf"), summary: "Compile-time type expectations" },
    { name: "mock", ref: ref("/mock"), summary: "Create mock functions" },
    { name: "spyOn", ref: ref("/spyOn"), summary: "Spy on object methods" },
    { name: "jest", ref: ref("/jest"), summary: "Jest-compat timers, mocks, setSystemTime" },
    { name: "vi", ref: ref("/vi"), summary: "Vitest-compat mocking utilities" },
    { name: "xtest", ref: ref("/xtest"), summary: "Skip test (test.skip alias)" },
    { name: "xdescribe", ref: ref("/xdescribe"), summary: "Skip describe (describe.skip alias)" },
  ],
  hooks: [
    { name: "beforeAll", ref: ref("/beforeAll"), summary: "Once before all tests in file" },
    { name: "beforeEach", ref: ref("/beforeEach"), summary: "Before each test" },
    { name: "afterEach", ref: ref("/afterEach"), summary: "After each test" },
    { name: "afterAll", ref: ref("/afterAll"), summary: "Once after all tests in file" },
    { name: "onTestFinished", ref: ref("/onTestFinished"), summary: "After test + afterEach hooks complete" },
  ],
  describeModifiers: [
    { name: "describe.concurrent", ref: ref("/Describe/concurrent"), summary: "Run group concurrently" },
    { name: "describe.serial", ref: ref("/Describe/serial"), summary: "Force serial even with --concurrent" },
    { name: "describe.only", ref: ref("/Describe/only"), summary: "Run only this group" },
    { name: "describe.skip", ref: ref("/Describe/skip"), summary: "Skip group" },
    { name: "describe.todo", ref: ref("/Describe/todo"), summary: "Mark group as todo" },
    { name: "describe.each", ref: ref("/Describe/each"), summary: "Parameterized describe table" },
    { name: "describe.if", ref: ref("/Describe/if"), summary: "Conditional group" },
    { name: "describe.skipIf", ref: ref("/Describe/skipIf"), summary: "Skip when condition true" },
  ],
  utilities: [
    { name: "setSystemTime", ref: ref("/setSystemTime"), summary: "Mock Date.now / new Date / Intl" },
    { name: "setDefaultTimeout", ref: ref("/setDefaultTimeout"), summary: "File-level default timeout (ms)" },
  ],
  matcherGroups: {
    equality: [
      { name: "toBe", ref: ref("/Matchers/toBe"), summary: "Primitive identity" },
      { name: "toEqual", ref: ref("/Matchers/toEqual"), summary: "Deep equality" },
      { name: "toStrictEqual", ref: ref("/Matchers/toStrictEqual"), summary: "Deep equality + type" },
      { name: "toBeCloseTo", ref: ref("/Matchers/toBeCloseTo"), summary: "Floating-point approximate" },
    ],
    type: [
      { name: "toBeArray", ref: ref("/Matchers/toBeArray"), summary: "Value is array" },
      { name: "toBeObject", ref: ref("/Matchers/toBeObject"), summary: "Value is object" },
      { name: "toBeString", ref: ref("/Matchers/toBeString"), summary: "Value is string" },
      { name: "toBeNumber", ref: ref("/Matchers/toBeNumber"), summary: "Value is number" },
      { name: "toBeBoolean", ref: ref("/Matchers/toBeBoolean"), summary: "Value is boolean" },
      { name: "toBeTypeOf", ref: ref("/Matchers/toBeTypeOf"), summary: "typeof match" },
      { name: "toBeInstanceOf", ref: ref("/Matchers/toBeInstanceOf"), summary: "instanceof check" },
    ],
    object: [
      { name: "toContainKey", ref: ref("/Matchers/toContainKey"), summary: "Object has key" },
      { name: "toContainKeys", ref: ref("/Matchers/toContainKeys"), summary: "Object has all listed keys" },
      { name: "toContainAllKeys", ref: ref("/Matchers/toContainAllKeys"), summary: "Exact key set only" },
      { name: "toContainAnyKeys", ref: ref("/Matchers/toContainAnyKeys"), summary: "At least one key" },
      { name: "toContainValue", ref: ref("/Matchers/toContainValue"), summary: "Deep value in object" },
      { name: "toContainValues", ref: ref("/Matchers/toContainValues"), summary: "All listed values present" },
      { name: "toContainAllValues", ref: ref("/Matchers/toContainAllValues"), summary: "Exact value set only" },
      { name: "toContainAnyValues", ref: ref("/Matchers/toContainAnyValues"), summary: "At least one value" },
      { name: "toBeEmptyObject", ref: ref("/Matchers/toBeEmptyObject"), summary: "Empty object {}" },
    ],
    array: [
      { name: "toContain", ref: ref("/Matchers/toContain"), summary: "Array/string/set contains item" },
      { name: "toContainEqual", ref: ref("/Matchers/toContainEqual"), summary: "Deep equal member in array" },
      { name: "toBeArrayOfSize", ref: ref("/Matchers/toBeArrayOfSize"), summary: "Array length" },
      { name: "toBeEmpty", ref: ref("/Matchers/toBeEmpty"), summary: "Empty array/string/set/object" },
    ],
    string: [
      { name: "toStartWith", ref: ref("/Matchers/toStartWith"), summary: "String prefix" },
      { name: "toEndWith", ref: ref("/Matchers/toEndWith"), summary: "String suffix" },
      { name: "toMatch", ref: ref("/Matchers/toMatch"), summary: "String/regex match" },
      { name: "toInclude", ref: ref("/Matchers/toInclude"), summary: "Substring (alias semantics)" },
    ],
    promise: [
      { name: "resolves", ref: ref("/Matchers/resolves"), summary: "Promise resolves — .resolves.toBe()" },
      { name: "rejects", ref: ref("/Matchers/rejects"), summary: "Promise rejects" },
      { name: "resolvesTo", ref: ref("/Expect/resolvesTo"), summary: "Asymmetric resolved value" },
      { name: "rejectsTo", ref: ref("/Expect/rejectsTo"), summary: "Asymmetric rejected value" },
    ],
    mock: [
      { name: "toBeCalled", ref: ref("/Matchers/toBeCalled"), summary: "Mock was called" },
      { name: "toBeCalledWith", ref: ref("/Matchers/toBeCalledWith"), summary: "Mock called with args" },
      { name: "toBeCalledTimes", ref: ref("/Matchers/toBeCalledTimes"), summary: "Exact call count" },
      { name: "nthCalledWith", ref: ref("/Matchers/nthCalledWith"), summary: "Nth call arguments" },
    ],
  },
  asymmetric: [
    { name: "expect.any", ref: ref("/Expect/any"), summary: "Constructor match" },
    { name: "expect.anything", ref: ref("/Expect/anything"), summary: "Non-null/non-undefined" },
    { name: "expect.objectContaining", ref: ref("/Expect/objectContaining"), summary: "Partial object shape" },
    { name: "expect.arrayContaining", ref: ref("/Expect/arrayContaining"), summary: "Subset array elements" },
    { name: "expect.stringContaining", ref: ref("/Expect/stringContaining"), summary: "Substring match" },
    { name: "expect.stringMatching", ref: ref("/Expect/stringMatching"), summary: "Regex string match" },
    { name: "expect.closeTo", ref: ref("/Expect/closeTo"), summary: "Float tolerance in objects" },
    { name: "expect.not", ref: ref("/Expect/not"), summary: "Negated asymmetric matchers" },
    { name: "expect.extend", ref: ref("/Expect/extend"), summary: "Register custom matchers" },
  ],
  jestNamespace: [
    { name: "jest.fn", ref: ref("/jest/fn"), summary: "Mock function" },
    { name: "jest.spyOn", ref: ref("/jest/spyOn"), summary: "Spy on method" },
    { name: "jest.useFakeTimers", ref: ref("/jest/useFakeTimers"), summary: "Fake timers + setSystemTime" },
    { name: "jest.useRealTimers", ref: ref("/jest/useRealTimers"), summary: "Restore real timers" },
    { name: "jest.setSystemTime", ref: ref("/jest/setSystemTime"), summary: "Set mocked clock" },
    { name: "jest.now", ref: ref("/jest"), summary: "Current mocked timestamp" },
    { name: "jest.advanceTimersByTime", ref: ref("/jest/advanceTimersByTime"), summary: "Advance fake timers" },
  ],
  skillUsage: [
    "tests use describe/test/expect from bun:test",
    "concurrent-*.test.ts + describe.concurrent align with describe.concurrent + concurrentTestGlob",
    "expect-shapes.ts — toContainKeys / toContainAllKeys on BundleScanReport, DoctorSnapshotV2",
    "object-matchers.test.ts — official object matcher examples",
    "mock-clock.test.ts — setSystemTime, jest.useFakeTimers (jest namespace)",
    "expect.objectContaining — partial shape checks for optional report fields",
  ],
};

export function listMatcherNames(): string[] {
  return Object.values(BUN_TEST_API_CATALOG.matcherGroups).flat().map((m) => m.name);
}

export function formatApiCatalogMarkdown(): string {
  const c = BUN_TEST_API_CATALOG;
  const lines = [
    `# bun:test API (${c.ref})`,
    "",
    c.summary,
    "",
    "## Exports",
  ];
  for (const e of c.exports) lines.push(`- [${e.name}](${e.ref}) — ${e.summary}`);
  lines.push("", "## Hooks");
  for (const e of c.hooks) lines.push(`- [${e.name}](${e.ref})`);
  lines.push("", "## describe modifiers");
  for (const e of c.describeModifiers) lines.push(`- [${e.name}](${e.ref})`);
  for (const [group, entries] of Object.entries(c.matcherGroups)) {
    lines.push("", `## Matchers — ${group}`);
    for (const e of entries) lines.push(`- [${e.name}](${e.ref}) — ${e.summary}`);
  }
  lines.push("", "## Asymmetric (expect.*)");
  for (const e of c.asymmetric) lines.push(`- [${e.name}](${e.ref}) — ${e.summary}`);
  lines.push("", "## Skill usage");
  for (const u of c.skillUsage) lines.push(`- ${u}`);
  return lines.join("\n");
}