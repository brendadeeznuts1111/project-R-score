// @see https://bun.com/docs/runtime/utils#bun-deepequals
import { parseCanonicalJsonValue, type CanonicalJson } from './canonical-json.ts';

export type SemanticDiffChange = {
  operation: 'add' | 'remove' | 'replace';
  path: string;
  before?: CanonicalJson;
  after?: CanonicalJson;
};

export type SemanticDiff = {
  changed: boolean;
  totalChanges: number;
  truncated: boolean;
  changes: SemanticDiffChange[];
};

function pointerPart(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1');
}

function childPath(path: string, key: string | number): string {
  return `${path}/${pointerPart(String(key))}`;
}

function isObject(value: CanonicalJson): value is { [key: string]: CanonicalJson } {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function collectDiff(
  before: CanonicalJson,
  after: CanonicalJson,
  path: string,
  changes: SemanticDiffChange[]
): void {
  if (Bun.deepEquals(before, after, true)) return;
  if (Array.isArray(before) && Array.isArray(after)) {
    const common = Math.min(before.length, after.length);
    for (let index = 0; index < common; index++) {
      collectDiff(before[index]!, after[index]!, childPath(path, index), changes);
    }
    for (let index = before.length - 1; index >= after.length; index--) {
      changes.push({ operation: 'remove', path: childPath(path, index), before: before[index] });
    }
    for (let index = common; index < after.length; index++) {
      changes.push({ operation: 'add', path: childPath(path, index), after: after[index] });
    }
    return;
  }
  if (isObject(before) && isObject(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    for (const key of keys) {
      if (!(key in after)) {
        changes.push({ operation: 'remove', path: childPath(path, key), before: before[key] });
      } else if (!(key in before)) {
        changes.push({ operation: 'add', path: childPath(path, key), after: after[key] });
      } else {
        collectDiff(before[key]!, after[key]!, childPath(path, key), changes);
      }
    }
    return;
  }
  changes.push({ operation: 'replace', path: path || '/', before, after });
}

export function semanticJsonDiff(
  beforeValue: CanonicalJson,
  afterValue: CanonicalJson,
  options: { maxChanges?: number } = {}
): SemanticDiff {
  const maxChanges = options.maxChanges ?? 1_000;
  if (!Number.isSafeInteger(maxChanges) || maxChanges < 0) {
    throw new RangeError('semantic diff maxChanges must be a non-negative safe integer');
  }
  const all: SemanticDiffChange[] = [];
  collectDiff(parseCanonicalJsonValue(beforeValue), parseCanonicalJsonValue(afterValue), '', all);
  return {
    changed: all.length > 0,
    totalChanges: all.length,
    truncated: all.length > maxChanges,
    changes: all.slice(0, maxChanges),
  };
}
