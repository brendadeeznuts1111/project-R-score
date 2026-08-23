// @see https://bun.com/docs/test — bun:test
/**
 * console-format-scan patterns — object-dump ratchet + suppress.
 */
import { describe, expect, test } from 'bun:test';
import {
  CONSOLE_FORMAT_PATTERNS,
  CONSOLE_FORMAT_SUPPRESS,
  stripConsoleFormatLine,
} from '../lib/console-format-scan.ts';

function pattern(id: string /* brand-ok — pattern id, not a domain Id */) {
  const p = CONSOLE_FORMAT_PATTERNS.find(x => x.id === id);
  if (!p) throw new Error(`missing pattern ${id}`);
  return p;
}

describe('console-object-dump pattern', () => {
  const dump = pattern('console-object-dump');

  test('matches object-literal console.log', () => {
    const code = stripConsoleFormatLine('console.log({ a: 1 });');
    expect(code).not.toBeNull();
    expect(dump.re.test(code!)).toBe(true);
  });

  test('matches dump-shaped bare identifiers', () => {
    for (const line of [
      'console.log(report);',
      'console.info(data)',
      'console.log(result)',
      'console.log(netReport)',
    ]) {
      const code = stripConsoleFormatLine(line);
      expect(dump.re.test(code!)).toBe(true);
    }
  });

  test('skips string-only and HELP/line printers', () => {
    for (const line of [
      'console.log("ok");',
      'console.info(HELP);',
      'console.log(line);',
      'console.log(text);',
    ]) {
      const code = stripConsoleFormatLine(line);
      expect(dump.re.test(code!)).toBe(false);
    }
  });

  test('console-ok suppress marker', () => {
    expect(CONSOLE_FORMAT_SUPPRESS.test('console.log(report); // console-ok')).toBe(true);
  });
});
