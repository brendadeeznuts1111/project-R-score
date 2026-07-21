// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
/**
 * Cyclomatic complexity for lib/harness functions (TypeScript AST).
 * Used by scripts/check-harness-complexity.ts and the complexity-floor tenant.
 *
 * @see ./complexity-baseline.json
 * @see ../../docs/harness/tenants/complexity-floor.md
 */
import ts from 'typescript';

export type ComplexityHit = {
  file: string;
  name: string;
  line: number;
  complexity: number;
};

function isNestedFunctionLike(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

/** McCabe-style: 1 + decision points in the function body (nested fns excluded). */
export function cyclomaticComplexity(node: ts.FunctionLikeDeclaration): number {
  let n = 1;
  const walk = (child: ts.Node) => {
    // Nested functions are measured separately — do not inflate the outer score
    if (child !== node && isNestedFunctionLike(child)) return;

    switch (child.kind) {
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.CaseClause:
      case ts.SyntaxKind.CatchClause:
      case ts.SyntaxKind.ConditionalExpression:
        n++;
        break;
      case ts.SyntaxKind.BinaryExpression: {
        const op = (child as ts.BinaryExpression).operatorToken.kind;
        if (
          op === ts.SyntaxKind.AmpersandAmpersandToken ||
          op === ts.SyntaxKind.BarBarToken ||
          op === ts.SyntaxKind.QuestionQuestionToken
        ) {
          n++;
        }
        break;
      }
      default:
        break;
    }
    ts.forEachChild(child, walk);
  };
  // Count decisions in this function only (start at body when present)
  const root: ts.Node = node.body ?? node;
  walk(root);
  return n;
}

function functionName(node: ts.FunctionLikeDeclaration, sf: ts.SourceFile): string {
  if (node.name && ts.isIdentifier(node.name)) return node.name.text;
  if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
    return node.parent.name.text;
  }
  if (ts.isPropertyAssignment(node.parent) && ts.isIdentifier(node.parent.name)) {
    return node.parent.name.text;
  }
  if (ts.isMethodDeclaration(node) && node.name) {
    return node.name.getText(sf);
  }
  return '<anonymous>';
}

function isFunctionLike(node: ts.Node): node is ts.FunctionLikeDeclaration {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

/** Collect complexity for each function-like in a source file (repo-relative path). */
export function analyzeFileComplexity(relPath: string, sourceText: string): ComplexityHit[] {
  const sf = ts.createSourceFile(
    relPath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const hits: ComplexityHit[] = [];

  const visit = (node: ts.Node) => {
    if (isFunctionLike(node) && node.body) {
      const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
      hits.push({
        file: relPath,
        name: functionName(node, sf),
        line: line + 1,
        complexity: cyclomaticComplexity(node),
      });
      // Still walk nested functions
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return hits;
}

export type ComplexityBaseline = {
  maxComplexity: number;
  scope: string;
};

export async function loadComplexityBaseline(root: string): Promise<ComplexityBaseline> {
  const path = `${root}/lib/harness/complexity-baseline.json`;
  const raw = (await Bun.file(path).json()) as ComplexityBaseline;
  if (typeof raw.maxComplexity !== 'number' || raw.maxComplexity < 1) {
    throw new Error(`invalid complexity baseline at ${path}`);
  }
  return raw;
}

export async function collectHarnessComplexity(root: string): Promise<ComplexityHit[]> {
  const hits: ComplexityHit[] = [];
  const cwd = `${root}/lib/harness`;
  for await (const rel of new Bun.Glob('**/*.ts').scan({ cwd, onlyFiles: true })) {
    if (rel.endsWith('.test.ts') || rel.endsWith('.d.ts')) continue;
    const abs = `${cwd}/${rel}`;
    const text = await Bun.file(abs).text();
    hits.push(...analyzeFileComplexity(`lib/harness/${rel}`, text));
  }
  return hits;
}

/** Failures when any function exceeds maxComplexity. */
export function assertComplexityFloor(hits: ComplexityHit[], maxComplexity: number): string[] {
  const failures: string[] = [];
  for (const h of hits) {
    if (h.complexity > maxComplexity) {
      failures.push(
        `${h.file}:${h.line} ${h.name} complexity ${h.complexity} > max ${maxComplexity}`
      );
    }
  }
  return failures;
}
