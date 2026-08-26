import type { ReleaseKnowledgeShapeIssue } from './knowledge-shape.ts';

const AST_KEYS = ['rootId', 'nodes'] as const;
const NODE_BASE_KEYS = ['id', 'type', 'parentId', 'childIds', 'sourceLine', 'endLine'] as const;
const NODE_KEYS = {
  document: [...NODE_BASE_KEYS, 'metadata'],
  heading: [...NODE_BASE_KEYS, 'depth', 'text', 'slug'],
  listItem: [...NODE_BASE_KEYS, 'marker', 'indent', 'text'],
  paragraph: [...NODE_BASE_KEYS, 'text'],
  codeBlock: [...NODE_BASE_KEYS, 'language', 'meta', 'code', 'exampleId'],
  asset: [...NODE_BASE_KEYS, 'directive', 'sourceUrls', 'assetIds', 'metadata'],
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function add(
  issues: ReleaseKnowledgeShapeIssue[],
  code: ReleaseKnowledgeShapeIssue['code'],
  path: string,
  message: string
): void {
  issues.push({ code, path, message });
}

function inspectKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  issues: ReleaseKnowledgeShapeIssue[]
): void {
  const known = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!known.has(key)) add(issues, 'unknown-key', `${path}.${key}`, `Unknown property ${key}`);
  }
}

function nonEmptyString(
  value: Record<string, unknown>,
  key: string,
  path: string,
  issues: ReleaseKnowledgeShapeIssue[]
): void {
  const item = value[key];
  if (item === undefined) add(issues, 'required', `${path}.${key}`, 'Property is required');
  else if (typeof item !== 'string') add(issues, 'type', `${path}.${key}`, 'Expected a string');
  else if (!item.length) add(issues, 'value', `${path}.${key}`, 'String must not be empty');
}

function parseStringArrayShapeIssues(
  value: unknown,
  path: string,
  issues: ReleaseKnowledgeShapeIssue[]
): void {
  if (!Array.isArray(value)) {
    add(issues, 'type', path, 'Expected an array of strings');
    return;
  }
  value.forEach((item, index) => {
    if (typeof item !== 'string') add(issues, 'type', `${path}[${index}]`, 'Expected a string');
    else if (!item.length) add(issues, 'value', `${path}[${index}]`, 'String must not be empty');
  });
}

function parseMetadataShapeIssues(
  value: unknown,
  path: string,
  issues: ReleaseKnowledgeShapeIssue[]
): void {
  if (!isRecord(value)) {
    add(issues, 'type', path, 'Expected a string record');
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (!key || typeof item !== 'string')
      add(issues, 'type', `${path}.${key}`, 'Expected a string');
  }
}

export function parseAstShapeIssues(value: unknown): ReleaseKnowledgeShapeIssue[] {
  const issues: ReleaseKnowledgeShapeIssue[] = [];
  if (!isRecord(value)) {
    add(issues, 'type', '$.ast', 'Expected an AST object');
    return issues;
  }
  inspectKeys(value, AST_KEYS, '$.ast', issues);
  nonEmptyString(value, 'rootId', '$.ast', issues);
  if (!Array.isArray(value.nodes)) {
    add(issues, 'type', '$.ast.nodes', 'Expected an array');
    return issues;
  }
  value.nodes.forEach((node, index) => {
    const path = `$.ast.nodes[${index}]`;
    if (!isRecord(node)) return add(issues, 'type', path, 'Expected an object');
    const type = node.type;
    if (
      type !== 'document' &&
      type !== 'heading' &&
      type !== 'listItem' &&
      type !== 'paragraph' &&
      type !== 'codeBlock' &&
      type !== 'asset'
    ) {
      return add(issues, 'value', `${path}.type`, 'Expected a supported AST node type');
    }
    inspectKeys(node, NODE_KEYS[type], path, issues);
    nonEmptyString(node, 'id', path, issues);
    if (node.parentId !== null && (typeof node.parentId !== 'string' || !node.parentId)) {
      add(issues, 'type', `${path}.parentId`, 'Expected a node ID or null');
    }
    parseStringArrayShapeIssues(node.childIds, `${path}.childIds`, issues);
    for (const key of ['sourceLine', 'endLine']) {
      if (!Number.isSafeInteger(node[key]) || Number(node[key]) <= 0) {
        add(issues, 'type', `${path}.${key}`, 'Expected a positive safe integer');
      }
    }
    if (type === 'document') parseMetadataShapeIssues(node.metadata, `${path}.metadata`, issues);
    if (type === 'heading') {
      if (![2, 3, 4].includes(Number(node.depth)))
        add(issues, 'value', `${path}.depth`, 'Expected depth 2, 3, or 4');
      nonEmptyString(node, 'text', path, issues);
      nonEmptyString(node, 'slug', path, issues);
    }
    if (type === 'listItem') {
      nonEmptyString(node, 'marker', path, issues);
      nonEmptyString(node, 'text', path, issues);
      if (!Number.isSafeInteger(node.indent) || Number(node.indent) < 0) {
        add(issues, 'type', `${path}.indent`, 'Expected a non-negative safe integer');
      }
    }
    if (type === 'paragraph') nonEmptyString(node, 'text', path, issues);
    if (type === 'codeBlock') {
      for (const key of ['language', 'code', 'exampleId']) nonEmptyString(node, key, path, issues);
      if (typeof node.meta !== 'string') add(issues, 'type', `${path}.meta`, 'Expected a string');
    }
    if (type === 'asset') {
      if (!['image', 'lazyVideo', 'iframe'].includes(String(node.directive))) {
        add(issues, 'value', `${path}.directive`, 'Expected a supported media directive');
      }
      parseStringArrayShapeIssues(node.sourceUrls, `${path}.sourceUrls`, issues);
      parseStringArrayShapeIssues(node.assetIds, `${path}.assetIds`, issues);
      parseMetadataShapeIssues(node.metadata, `${path}.metadata`, issues);
    }
  });
  return issues;
}
