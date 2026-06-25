// tests/unit/safeFilename.bun.test.ts
/**
 * 🧪 Safe Filename Bun-Native Module Tests
 * 
 * Tests the Bun-native safe filename implementation
 * with comprehensive edge cases and security scenarios
 */

import { test, expect, describe } from 'bun:test';
import { 
  safeFilename, 
  encodeContentDisposition,
  safeEvidenceFilename,
  safeArchiveFilename,
  safeReportFilename,
  META,
  PERFORMANCE_HINTS
} from '../../src/native/safeFilename.bun.ts';

describe('Safe Filename - Core Functionality', () => {
  test('handles basic filenames', () => {
    expect(safeFilename('document.pdf')).toBe('document.pdf');
    expect(safeFilename('report.txt')).toBe('report.txt');
    expect(safeFilename('data.csv')).toBe('data.csv');
  });

  test('normalizes Unicode characters', () => {
    expect(safeFilename('café.pdf')).toBe('café.pdf');
    expect(safeFilename('naïve.txt')).toBe('naïve.txt');
    expect(safeFilename('测试.doc')).toBe('测试.doc');
  });

  test('removes dangerous characters', () => {
    expect(safeFilename('file<name>.pdf')).toBe('file-name-.pdf');
    expect(safeFilename('file:name?.txt')).toBe('file-name-.txt');
    expect(safeFilename('file*name|.doc')).toBe('file-name-.doc');
    expect(safeFilename('file"name|.csv')).toBe('file-name-.csv');
    expect(safeFilename('file/name|.json')).toBe('file-name-.json');
    expect(safeFilename('file\\name|.xml')).toBe('file-name-.xml');
  });

  test('handles control characters', () => {
    expect(safeFilename('file\x00name.pdf')).toBe('filename.pdf');
    expect(safeFilename('file\x1fname.txt')).toBe('filename.txt');
    expect(safeFilename('file\x7fname.doc')).toBe('filename.doc');
  });

  test('normalizes whitespace and separators', () => {
    expect(safeFilename('file   name.pdf')).toBe('file-name.pdf');
    expect(safeFilename('file---name.txt')).toBe('file-name.txt');
    expect(safeFilename('file___name.doc')).toBe('file-name.doc');
    expect(safeFilename('file - _ - name.csv')).toBe('file-name.csv');
  });

  test('handles leading and trailing separators', () => {
    expect(safeFilename('-filename.pdf')).toBe('filename.pdf');
    expect(safeFilename('filename-.pdf')).toBe('filename.pdf');
    expect(safeFilename('...filename.pdf')).toBe('filename.pdf');
    expect(safeFilename('filename...pdf')).toBe('filename.pdf');
  });

  test('respects maxLength parameter', () => {
    const longName = 'a'.repeat(300);
    const result = safeFilename(longName, 50);
    expect(result.length).toBeLessThanOrEqual(50);
  });

  test('prevents path traversal', () => {
    expect(safeFilename('../../../etc/passwd')).toBe('etc-passwd');
    expect(safeFilename('..\\..\\windows\\system32')).toBe('windows-system32');
    expect(safeFilename('file/../../name')).toBe('file-name');
    expect(safeFilename('file..name')).toBe('filename');
  });

  test('provides fallback for empty input', () => {
    expect(safeFilename('')).toBe('file');
    expect(safeFilename('---')).toBe('file');
    expect(safeFilename('...')).toBe('file');
  });
});

describe('Content-Disposition Encoding', () => {
  test('encodes basic filenames', () => {
    const result = encodeContentDisposition('document.pdf');
    expect(result).toContain('attachment');
    expect(result).toContain('filename="document.pdf"');
    expect(result).toContain('filename*=UTF-8');
  });

  test('encodes Unicode filenames', () => {
    const result = encodeContentDisposition('café.pdf');
    expect(result).toContain('attachment');
    expect(result).toContain('filename*=UTF-8');
    expect(result).toContain('caf%C3%A9.pdf');
  });

  test('supports inline type', () => {
    const result = encodeContentDisposition('image.png', 'inline');
    expect(result).toContain('inline');
    expect(result).toContain('filename="image.png"');
  });

  test('handles special characters', () => {
    const result = encodeContentDisposition('file name.pdf');
    expect(result).toContain('filename="file-name.pdf"');
  });
});

describe('Evidence Integrity Pipeline Functions', () => {
  test('creates safe evidence filenames', () => {
    const evidenceId = 'ev-001';
    const timestamp = new Date('2024-01-15T10:30:00Z');
    
    const result = safeEvidenceFilename(evidenceId, timestamp);
    expect(result).toContain('ev-001');
    expect(result).toContain('2024-01-15T10-30-00-000Z');
    expect(result).toContain('.json');
    expect(result).not.toContain(' ');
    expect(result).not.toContain(':');
  });

  test('creates safe archive filenames', () => {
    const archiveId = 'arc-001';
    const timestamp = new Date('2024-01-15T10:30:00Z');
    
    const result = safeArchiveFilename(archiveId, 'gzip', timestamp);
    expect(result).toContain('arc-001');
    expect(result).toContain('2024-01-15T10-30-00-000Z');
    expect(result).toContain('.tar.gz');
  });

  test('creates safe report filenames', () => {
    const reportType = 'monthly';
    const userId = 'user-123';
    const timestamp = new Date('2024-01-15T10:30:00Z');
    
    const result = safeReportFilename(reportType, userId, timestamp);
    expect(result).toContain('monthly');
    expect(result).toContain('user-123');
    expect(result).toContain('2024-01-15T10-30-00-000Z');
    expect(result).toContain('.csv');
  });

  test('handles special characters in evidence IDs', () => {
    const evidenceId = 'ev<>001';
    const timestamp = new Date('2024-01-15T10:30:00Z');
    
    const result = safeEvidenceFilename(evidenceId, timestamp);
    expect(result).toContain('ev-001');
    expect(result).not.toContain('<>');
  });
});

describe('Security and Compliance', () => {
  test('prevents directory traversal attacks', () => {
    const maliciousInputs = [
      '../../../etc/passwd',
      '..\\..\\windows\\system32',
      '/etc/shadow',
      'C:\\Windows\\System32\\config\\SAM',
      'file/../../../etc/passwd',
      'file\\..\\..\\windows\\system32'
    ];

    for (const input of maliciousInputs) {
      const result = safeFilename(input);
      expect(result).not.toContain('..');
      expect(result).not.toContain('\\');
      expect(result).not.toContain('/');
      expect(result).not.toContain('C:');
    }
  });

  test('handles null bytes and control characters', () => {
    const maliciousInputs = [
      'file\x00name.pdf',
      'file\x1fname.txt',
      'file\x7fname.doc',
      'file\r\nname.pdf',
      'file\tname.txt'
    ];

    for (const input of maliciousInputs) {
      const result = safeFilename(input);
      expect(result).not.toContain('\x00');
      expect(result).not.toContain('\x1f');
      expect(result).not.toContain('\x7f');
      expect(result).not.toContain('\r');
      expect(result).not.toContain('\n');
      expect(result).not.toContain('\t');
    }
  });

  test('complies with RFC 5987 encoding', () => {
    const unicodeName = 'café résumé.pdf';
    const result = encodeContentDisposition(unicodeName);
    
    expect(result).toMatch(/^attachment;/);
    expect(result).toContain('filename=');
    expect(result).toContain('filename*=');
    expect(result).toContain('UTF-8');
    expect(result).toContain('%C3%A9'); // é encoded
  });

  test('complies with POSIX pathname requirements', () => {
    const inputs = [
      'normal-file.txt',
      'file with spaces.pdf',
      'file-with-dashes.doc',
      'file_with_underscores.csv'
    ];

    for (const input of inputs) {
      const result = safeFilename(input);
      expect(result).toMatch(/^[a-zA-Z0-9._-]+$/);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(255);
    }
  });
});

describe('Performance and Metadata', () => {
  test('provides correct metadata', () => {
    expect(META.version).toBe('1.0.0');
    expect(META.stability).toBe('stable');
    expect(META.references).toContain('rfc5987');
    expect(META.references).toContain('rfc6266');
    expect(META.references).toContain('posix-path');
    expect(typeof META.bunNative).toBe('boolean');
  });

  test('provides performance hints', () => {
    expect(PERFORMANCE_HINTS.unicodeNormalization).toContain('Built-in OS ICU');
    expect(PERFORMANCE_HINTS.characterFiltering).toContain('WASM syscall');
    expect(PERFORMANCE_HINTS.memorySafety).toContain('Zero-copy');
    expect(PERFORMANCE_HINTS.coldStart).toContain('0.3ms');
  });

  test('performs efficiently with large inputs', () => {
    const largeInput = 'a'.repeat(10000) + '<>' + 'b'.repeat(10000);
    
    const start = performance.now();
    const result = safeFilename(largeInput);
    const end = performance.now();
    
    expect(result.length).toBeLessThanOrEqual(255);
    expect(end - start).toBeLessThan(10); // Should be very fast
  });
});

describe('Edge Cases', () => {
  test('handles extremely long inputs', () => {
    const veryLongInput = 'a'.repeat(10000);
    const result = safeFilename(veryLongInput, 100);
    expect(result.length).toBeLessThanOrEqual(100);
  });

  test('handles Unicode normalization edge cases', () => {
    // Composed vs decomposed forms
    const composed = 'e\u0301'; // e + combining acute
    const decomposed = 'é'; // precomposed é
    
    const result1 = safeFilename(composed);
    const result2 = safeFilename(decomposed);
    
    // Both should normalize to the same form
    expect(result1).toBe(result2);
  });

  test('handles mixed character sets', () => {
    const mixedInput = '测试caféтестαβγδε.pdf';
    const result = safeFilename(mixedInput);
    
    expect(result).toContain('测试');
    expect(result).toContain('café');
    expect(result).toContain('тест');
    expect(result).toContain('αβγδε');
    expect(result).toContain('.pdf');
  });

  test('handles consecutive dangerous characters', () => {
    const result = safeFilename('file<><>"|?*\\/.pdf');
    expect(result).toBe('file-.pdf');
  });

  test('handles empty and whitespace-only inputs', () => {
    expect(safeFilename('')).toBe('file');
    expect(safeFilename('   ')).toBe('file');
    expect(safeFilename('\t\n\r')).toBe('file');
    expect(safeFilename('---')).toBe('file');
    expect(safeFilename('...')).toBe('file');
  });
});
