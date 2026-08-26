import {
  type ReleaseAssetId,
  type ReleaseKnowledgeExampleId,
  type ReleaseKnowledgeNodeId,
} from '../../../lib/types/branded.ts';
import { releaseAstAssetId, releaseAstNodeId } from './knowledge-ast-id.ts';
import {
  cleanInlineMarkdown,
  knowledgeSlug,
  normalizeFenceLanguage,
} from './knowledge-markdown.ts';
import type { ReleaseKnowledgeAst, ReleaseKnowledgeNode } from './knowledge-types.ts';

function parseMetadata(input: string): Record<string, string> {
  const metadata: Record<string, string> = {};
  const pattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of input.matchAll(pattern)) {
    const key = match[1]?.toLowerCase();
    if (key) metadata[key] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return Object.fromEntries(
    Object.entries(metadata).sort(([left], [right]) => left.localeCompare(right))
  );
}

function frontmatterMetadata(lines: readonly string[], closing: number): Record<string, string> {
  if (closing <= 0) return {};
  const entries: Array<[string, string]> = [];
  for (const line of lines.slice(1, closing)) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*?)\s*$/.exec(line);
    if (match?.[1]) entries.push([match[1], match[2] ?? '']);
  }
  return Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right)));
}

/** Materializes heading, fenced-code, and media nodes without duplicating prose rows. */
export function extractReleaseKnowledgeAst(
  markdown: string,
  version: string,
  exampleIdsBySourceLine: ReadonlyMap<number, ReleaseKnowledgeExampleId>
): ReleaseKnowledgeAst {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const closing =
    lines[0]?.trim() === '---'
      ? lines.findIndex((line, index) => index > 0 && line.trim() === '---')
      : -1;
  const rootId = releaseAstNodeId(version, 'document', 'root');
  const nodes: ReleaseKnowledgeNode[] = [
    {
      id: rootId,
      type: 'document',
      parentId: null,
      childIds: [],
      sourceLine: 1,
      endLine: lines.length,
      metadata: frontmatterMetadata(lines, closing),
    },
  ];
  const byId = new Map<ReleaseKnowledgeNodeId, ReleaseKnowledgeNode>([[rootId, nodes[0]!]]);
  const headingStack: Array<Extract<ReleaseKnowledgeNode, { type: 'heading' }>> = [];
  const siblingCounts = new Map<string, number>();
  const append = (node: ReleaseKnowledgeNode): void => {
    nodes.push(node);
    byId.set(node.id, node);
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (!parent) throw new Error(`AST node ${node.id} has no parent`);
    parent.childIds.push(node.id);
  };
  const parentId = (): ReleaseKnowledgeNodeId => headingStack.at(-1)?.id ?? rootId;

  for (let index = closing > 0 ? closing + 1 : 0; index < lines.length; index++) {
    const line = lines[index] ?? '';
    const heading = /^(#{2,4})\s+(.+?)\s*$/.exec(line);
    if (heading) {
      const depth = heading[1]!.length as 2 | 3 | 4;
      const text = cleanInlineMarkdown(heading[2] ?? '');
      while (headingStack.at(-1) && headingStack.at(-1)!.depth >= depth) {
        headingStack.pop()!.endLine = index;
      }
      const ownerId = parentId();
      const siblingKey = `${ownerId}\u0000${depth}\u0000${text}`;
      const ordinal = (siblingCounts.get(siblingKey) ?? 0) + 1;
      siblingCounts.set(siblingKey, ordinal);
      const node: Extract<ReleaseKnowledgeNode, { type: 'heading' }> = {
        id: releaseAstNodeId(version, 'heading', `${siblingKey}\u0000${ordinal}`),
        type: 'heading',
        parentId: ownerId,
        childIds: [],
        sourceLine: index + 1,
        endLine: lines.length,
        depth,
        text,
        slug: knowledgeSlug(text),
      };
      append(node);
      headingStack.push(node);
      continue;
    }

    const fence = /^\s*(`{3,}|~{3,})([^`]*)$/.exec(line);
    if (fence) {
      const marker = fence[1] ?? '```';
      const rawInfo = (fence[2] ?? '').trim();
      const body: string[] = [];
      const sourceLine = index + 2;
      index += 1;
      while (
        index < lines.length &&
        !new RegExp(`^\\s*${marker[0]}{${marker.length},}\\s*$`).test(lines[index] ?? '')
      ) {
        body.push(lines[index] ?? '');
        index += 1;
      }
      const code = body.join('\n').trimEnd();
      if (!code.trim()) continue;
      const exampleId = exampleIdsBySourceLine.get(sourceLine);
      if (!exampleId) throw new Error(`Code block at source line ${sourceLine} has no example`);
      append({
        id: releaseAstNodeId(version, 'codeBlock', exampleId),
        type: 'codeBlock',
        parentId: parentId(),
        childIds: [],
        sourceLine,
        endLine: index + 1,
        language: normalizeFenceLanguage(rawInfo) || 'text',
        meta: rawInfo.slice(rawInfo.split(/[\s#]/, 1)[0]?.length ?? 0).trim(),
        code,
        exampleId,
      });
      continue;
    }

    const directive = /\{%\s*(image|lazyVideo)\s+(.+?)\s*\/\s*%\}/i.exec(line);
    const iframe = /<iframe\b([^>]*)>/i.exec(line);
    if (!directive && !iframe) continue;
    const kind = directive?.[1] === 'lazyVideo' ? 'lazyVideo' : directive ? 'image' : 'iframe';
    const metadata = parseMetadata(directive?.[2] ?? iframe?.[1] ?? '');
    const sourceUrls =
      kind === 'lazyVideo'
        ? [metadata.src, metadata.poster].filter((value): value is string => Boolean(value))
        : [metadata.src].filter((value): value is string => Boolean(value));
    const assetIds = sourceUrls
      .map((url, assetIndex) =>
        releaseAstAssetId(
          version,
          kind === 'iframe'
            ? 'embed'
            : kind === 'lazyVideo' && assetIndex === 0
              ? 'video'
              : 'image',
          url
        )
      )
      .filter((id): id is ReleaseAssetId => id !== null);
    append({
      id: releaseAstNodeId(version, 'asset', `${kind}\u0000${sourceUrls.join('\u0000')}`),
      type: 'asset',
      parentId: parentId(),
      childIds: [],
      sourceLine: index + 1,
      endLine: index + 1,
      directive: kind,
      sourceUrls,
      assetIds,
      metadata,
    });
  }
  while (headingStack.length) headingStack.pop()!.endLine = lines.length;
  return { rootId, nodes };
}
