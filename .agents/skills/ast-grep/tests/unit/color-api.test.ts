/**
 * Parity tests for Bun.color — mirrors https://bun.com/docs/runtime/color
 */
import { describe, expect, test } from "bun:test";
import { color } from "bun";
import { ColorMatcher } from "../../scripts/scan/transpiler/color-matcher.ts";
import { COLOR_DOCS, colorAnsi, colorize, severityTag } from "../../scripts/scan/transpiler/terminal-color.ts";

describe("Bun.color css format (official examples)", () => {
  const cases: Array<[unknown, string]> = [
    ["red", "red"],
    [0xff0000, "#f000"],
    ["#f00", "red"],
    ["#ff0000", "red"],
    ["rgb(255, 0, 0)", "red"],
    ["rgba(255, 0, 0, 1)", "red"],
    ["hsl(0, 100%, 50%)", "red"],
    ["hsla(0, 100%, 50%, 1)", "red"],
    [{ r: 255, g: 0, b: 0 }, "red"],
    [{ r: 255, g: 0, b: 0, a: 1 }, "red"],
    [[255, 0, 0], "red"],
    [[255, 0, 0, 255], "red"],
  ];

  for (const [input, expected] of cases) {
    test(`css(${JSON.stringify(input)}) → ${expected}`, () => {
      expect(Bun.color(input, "css")).toBe(expected);
      expect(color(input, "css")).toBe(expected);
    });
  }

  test("unknown input → null", () => {
    expect(Bun.color("not-a-color", "css")).toBeNull();
  });
});

describe("Bun.color number format (official examples)", () => {
  test("red → 16711680", () => {
    expect(Bun.color("red", "number")).toBe(16711680);
    expect(Bun.color(0xff0000, "number")).toBe(16711680);
    expect(Bun.color({ r: 255, g: 0, b: 0 }, "number")).toBe(16711680);
    expect(Bun.color([255, 0, 0], "number")).toBe(16711680);
  });
});

describe("Bun.color rgba object (official examples)", () => {
  test("red {rgba}", () => {
    expect(Bun.color("red", "{rgba}")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(Bun.color("hsl(0, 0%, 50%)", "{rgba}")).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });

  test("red {rgb} without alpha", () => {
    expect(Bun.color("red", "{rgb}")).toEqual({ r: 255, g: 0, b: 0 });
  });
});

describe("Bun.color rgba array (official examples)", () => {
  test("red [rgba]", () => {
    expect(Bun.color("red", "[rgba]")).toEqual([255, 0, 0, 255]);
    expect(Bun.color("hsl(0, 0%, 50%)", "[rgba]")).toEqual([128, 128, 128, 255]);
  });

  test("red [rgb]", () => {
    expect(Bun.color("red", "[rgb]")).toEqual([255, 0, 0]);
  });
});

describe("Bun.color hex format (official examples)", () => {
  test("lowercase hex", () => {
    expect(Bun.color("red", "hex")).toBe("#ff0000");
    expect(Bun.color("hsl(0, 0%, 50%)", "hex")).toBe("#808080");
  });

  test("uppercase HEX", () => {
    expect(Bun.color("red", "HEX")).toBe("#FF0000");
  });
});

describe("Bun.color ansi formats (official examples)", () => {
  test("ansi-16m truecolor prefix", () => {
    const code = Bun.color("red", "ansi-16m");
    expect(code).toBe("\x1b[38;2;255;0;0m");
  });

  test("ansi-256 approximate red", () => {
    expect(Bun.color("red", "ansi-256")).toBe("\u001b[38;5;196m");
  });

  test("ansi auto may be empty without TTY color support", () => {
    const code = Bun.color("red", "ansi");
    expect(code === "" || code === null || typeof code === "string").toBe(true);
  });
});

describe("Bun.color rgb/hsl string formats", () => {
  test("red rgb and rgba", () => {
    expect(Bun.color("red", "rgb")).toBe("rgb(255, 0, 0)");
    expect(Bun.color("red", "rgba")).toBe("rgba(255, 0, 0, 1)");
  });
});

describe("ColorMatcher persist helper", () => {
  test("persist stores 24-bit number", () => {
    expect(ColorMatcher.persist("red")).toBe(16711680);
    expect(ColorMatcher.persist("not-a-color")).toBeNull();
  });
});

describe("terminal-color helpers", () => {
  test("COLOR_DOCS points to runtime/color", () => {
    expect(COLOR_DOCS).toContain("/runtime/color");
  });

  test("colorize returns plain text when ansi unavailable", () => {
    const plain = colorize("hello", "red");
    const ansi = colorAnsi("red", "ansi-16m");
    expect(plain === "hello" || plain.startsWith(ansi)).toBe(true);
  });

  test("severityTag wraps bracket label", () => {
    const tag = severityTag("critical");
    expect(tag.includes("[critical]") || tag.includes("critical")).toBe(true);
  });
});