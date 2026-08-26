import type { ReleaseKnowledge } from './knowledge-types.ts';
import type { KnowledgeValidationFinding } from './knowledge-validation-types.ts';

function finding(
  rule: KnowledgeValidationFinding['rule'],
  path: string,
  message: string
): KnowledgeValidationFinding {
  return { rule, severity: 'error', path, message };
}

export function inspectKnowledgeAst(
  knowledge: ReleaseKnowledge,
  findings: KnowledgeValidationFinding[]
): void {
  if (knowledge.schemaVersion !== 2 || !knowledge.ast) return;
  const { ast } = knowledge;
  const byId = new Map(ast.nodes.map(node => [node.id, node]));
  if (byId.size !== ast.nodes.length) {
    findings.push(finding('schema', '$.ast.nodes', 'AST node IDs must be unique'));
  }
  const root = byId.get(ast.rootId);
  if (!root || root.type !== 'document' || root.parentId !== null) {
    findings.push(finding('schema', '$.ast.rootId', 'AST root must identify the document node'));
  }
  const referencedChildren = new Set<string>();
  ast.nodes.forEach((node, index) => {
    const path = `$.ast.nodes[${index}]`;
    if (node.endLine < node.sourceLine) {
      findings.push(finding('ordering', `${path}.endLine`, 'Node range must not be inverted'));
    }
    if (new Set(node.childIds).size !== node.childIds.length) {
      findings.push(finding('schema', `${path}.childIds`, 'Child IDs must be unique'));
    }
    if (node.parentId !== null && !byId.has(node.parentId)) {
      findings.push(finding('schema', `${path}.parentId`, 'Parent node does not exist'));
    }
    for (const childId of node.childIds) {
      const child = byId.get(childId);
      referencedChildren.add(childId);
      if (!child) {
        findings.push(
          finding('schema', `${path}.childIds`, `Child node ${childId} does not exist`)
        );
      } else if (child.parentId !== node.id) {
        findings.push(
          finding('schema', `${path}.childIds`, `Child node ${childId} has a different parent`)
        );
      }
    }
  });
  for (const node of ast.nodes) {
    if (node.id !== ast.rootId && !referencedChildren.has(node.id)) {
      findings.push(finding('schema', '$.ast.nodes', `AST node ${node.id} is orphaned`));
    }
  }

  const codeNodes = ast.nodes.filter(node => node.type === 'codeBlock');
  const exampleIds = new Set(knowledge.examples.map(example => example.id));
  const linkedExampleIds = codeNodes.map(node => node.exampleId);
  if (new Set(linkedExampleIds).size !== linkedExampleIds.length) {
    findings.push(finding('schema', '$.ast.nodes', 'Code block example IDs must be unique'));
  }
  for (const exampleId of exampleIds) {
    if (!linkedExampleIds.includes(exampleId)) {
      findings.push(
        finding('source-count', '$.ast.nodes', `Example ${exampleId} has no code-block node`)
      );
    }
  }
  for (const codeNode of codeNodes) {
    if (!exampleIds.has(codeNode.exampleId)) {
      findings.push(
        finding(
          'source-drift',
          '$.ast.nodes',
          `Code-block node links unknown example ${codeNode.exampleId}`
        )
      );
    }
  }
}
