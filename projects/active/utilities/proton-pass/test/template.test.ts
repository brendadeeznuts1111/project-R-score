import { describe, expect, it } from 'bun:test';
import { applyPlaceholders } from '../src/template.ts';

describe('applyPlaceholders', () => {
  it('replaces placeholders in strings', () => {
    const result = applyPlaceholders('Hello {NAME}', { NAME: 'World' });
    expect(result).toBe('Hello World');
  });

  it('replaces multiple occurrences', () => {
    const result = applyPlaceholders('{X} and {X}', { X: 'Y' });
    expect(result).toBe('Y and Y');
  });

  it('handles nested objects', () => {
    const result = applyPlaceholders({ title: '{TITLE}', note: '{NOTE}' }, {
      TITLE: 'T',
      NOTE: 'N',
    });
    expect(result).toEqual({ title: 'T', note: 'N' });
  });

  it('escapes regex-special placeholder keys', () => {
    const result = applyPlaceholders('{A.B}', { 'A.B': 'ok' });
    expect(result).toBe('ok');
  });
});
