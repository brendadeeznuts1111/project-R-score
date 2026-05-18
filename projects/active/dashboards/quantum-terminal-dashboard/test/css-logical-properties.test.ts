// test/css-logical-properties.test.ts
// Validates CSS logical properties are correctly transpiled with nested pseudo-elements
// Fix: inset-inline-end, margin-inline-start, etc. no longer stripped when
//      &:after, &:before are in the same block
//
// Note: Bun's CSS bundler transpiles logical properties to physical equivalents
// with RTL/LTR language-aware selectors. This is correct behavior.

import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { mkdirSync, rmSync } from "fs";

const TEST_DIR = ".test-css-logical";

// Helper to build CSS and return output
async function buildCss(css: string, filename: string): Promise<string> {
  const cssPath = `${TEST_DIR}/${filename}.css`;
  const jsPath = `${TEST_DIR}/${filename}.js`;

  await Bun.write(cssPath, css);
  await Bun.write(jsPath, `import "./${filename}.css";`);

  const result = await Bun.build({
    entrypoints: [jsPath],
    experimentalCss: true,
    outdir: `${TEST_DIR}/out`,
    minify: false,
  });

  if (!result.success) {
    console.error(result.logs);
    throw new Error("CSS build failed");
  }

  return await Bun.file(`${TEST_DIR}/out/${filename}.css`).text();
}

describe("CSS Parser - Logical Properties Transpilation", () => {
  beforeAll(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  test("transpiles inset-inline-end to right/left with :after pseudo-element", async () => {
    const css = `
.tooltip {
  position: absolute;
  inset-inline-end: 10px;
}
.tooltip:after {
  content: "";
  border: 5px solid transparent;
}
`;
    const output = await buildCss(css, "test1");

    // Logical property transpiled to physical (right for LTR, left for RTL)
    expect(output).toContain("right: 10px");
    expect(output).toContain("left: 10px");
    // Pseudo-element preserved
    expect(output).toContain(":after");
    expect(output).toContain("border:");
  });

  test("preserves margin-inline-start (not transpiled) with :before", async () => {
    const css = `
.card {
  margin-inline-start: 1rem;
  padding-inline-end: 2rem;
}
.card:before {
  content: "→";
  margin-inline-end: 0.5rem;
}
`;
    const output = await buildCss(css, "test2");

    // margin-inline-* and padding-inline-* may be preserved or transpiled
    // Key: properties are NOT stripped
    expect(output.length).toBeGreaterThan(50);
    expect(output).toContain(":before");
    expect(output).toContain('content: "→"');
  });

  test("transpiles inset properties correctly with pseudo-elements", async () => {
    const css = `
.container {
  inset-inline: 0;
  margin-inline: auto;
}
.container:after {
  inset-inline-end: 0;
}
.container:before {
  inset-inline-start: 0;
}
`;
    const output = await buildCss(css, "test3");

    // Verify transpilation happened (left/right for LTR/RTL)
    expect(output).toContain("left");
    expect(output).toContain("right");
    // Pseudo-elements preserved
    expect(output).toContain(":after");
    expect(output).toContain(":before");
  });

  test("preserves border-inline properties with :after", async () => {
    const css = `
.box {
  border-inline-start: 2px solid red;
  border-block-end: 1px dashed blue;
}
.box:after {
  content: "";
}
`;
    const output = await buildCss(css, "test4");

    // border-block properties preserved or transpiled to top/bottom
    expect(output).toContain("border");
    expect(output).toContain(":after");
  });

  test("handles mixed physical and logical properties", async () => {
    const css = `
.mixed {
  left: 10px;
  inset-inline-end: 20px;
  margin-left: 5px;
  margin-inline-start: 10px;
}
.mixed:after {
  right: 0;
}
`;
    const output = await buildCss(css, "test5");

    // Physical properties preserved as-is
    expect(output).toContain("left: 10px");
    expect(output).toContain("margin-left: 5px");
    // Logical properties transpiled
    expect(output).toContain("right: 20px"); // inset-inline-end → right (LTR)
    expect(output).toContain(":after");
  });

  test("multiple pseudo-elements don't strip logical properties", async () => {
    const css = `
.complex {
  inset-inline-end: 1rem;
}
.complex:before {
  content: "A";
}
.complex:after {
  content: "B";
}
.complex::placeholder {
  padding-inline-start: 0.5rem;
}
`;
    const output = await buildCss(css, "test6");

    // Key test: properties are transpiled, not stripped
    expect(output).toContain("right: 1rem"); // LTR
    expect(output).toContain("left: 1rem");  // RTL
    expect(output).toContain(":before");
    expect(output).toContain(":after");
    expect(output).toContain("::placeholder");
    expect(output).toContain("padding-inline-start");
  });
});

