import {
  parseReleaseAssetId,
  parseReleaseKnowledgeExampleId,
  parseReleaseKnowledgeNodeId,
} from '../../../lib/types/branded.ts';
import type { ReleaseKnowledgeAst, ReleaseKnowledgeNode } from './knowledge-types.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function parseMetadata(value: unknown): Record<string, string> {
  if (!isRecord(value)) throw new Error('AST metadata must be an object');
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item)]));
}

export function parseReleaseKnowledgeAst(input: unknown): ReleaseKnowledgeAst {
  if (!isRecord(input) || typeof input.rootId !== 'string' || !Array.isArray(input.nodes)) {
    throw new Error('Release knowledge AST metadata is invalid');
  }
  const nodes = input.nodes.map((value, index): ReleaseKnowledgeNode => {
    if (!isRecord(value) || typeof value.id !== 'string' || typeof value.type !== 'string') {
      throw new Error(`Release knowledge AST node ${index} is invalid`);
    }
    const base = {
      id: parseReleaseKnowledgeNodeId(value.id),
      parentId:
        value.parentId === null ? null : parseReleaseKnowledgeNodeId(String(value.parentId)),
      childIds: (value.childIds as string[]).map(parseReleaseKnowledgeNodeId),
      sourceLine: Number(value.sourceLine),
      endLine: Number(value.endLine),
    };
    if (value.type === 'document') {
      return { ...base, type: 'document', parentId: null, metadata: parseMetadata(value.metadata) };
    }
    if (value.type === 'heading') {
      return {
        ...base,
        type: 'heading',
        depth: Number(value.depth) as 2 | 3 | 4,
        text: String(value.text),
        slug: String(value.slug),
      };
    }
    if (value.type === 'listItem') {
      return {
        ...base,
        type: 'listItem',
        marker: String(value.marker),
        indent: Number(value.indent),
        text: String(value.text),
      };
    }
    if (value.type === 'paragraph') {
      return { ...base, type: 'paragraph', childIds: [], text: String(value.text) };
    }
    if (value.type === 'codeBlock') {
      return {
        ...base,
        type: 'codeBlock',
        childIds: [],
        language: String(value.language),
        meta: String(value.meta),
        code: String(value.code),
        exampleId: parseReleaseKnowledgeExampleId(String(value.exampleId)),
      };
    }
    return {
      ...base,
      type: 'asset',
      childIds: [],
      directive: value.directive as 'image' | 'lazyVideo' | 'iframe',
      sourceUrls: [...(value.sourceUrls as string[])],
      assetIds: (value.assetIds as string[]).map(parseReleaseAssetId),
      metadata: parseMetadata(value.metadata),
    };
  });
  return { rootId: parseReleaseKnowledgeNodeId(input.rootId), nodes };
}
