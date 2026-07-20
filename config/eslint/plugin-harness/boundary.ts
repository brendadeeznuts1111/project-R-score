/**
 * Harness boundary rules (AST) — Ryan Lopopolo / harness-engineering:
 * - Ban decodeUnknownSync (and kin) outside the wire boundary
 * - Ban `unknown` as a function parameter outside the boundary
 *
 * Human SSOT (keep in lockstep with exported policy below):
 *   docs/WIRE_BOUNDARY.md
 *
 * @see https://github.com/lopopolo/harness-engineering
 * @see https://github.com/lopopolo/harness-engineering/blob/trunk/docs/domain-modeling/README.md
 * @see https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/
 */
import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/types';

/**
 * Policy constants — documented in docs/WIRE_BOUNDARY.md.
 * Export so tests and docs generators can assert the same allowlists.
 */
export const BOUNDARY_POLICY = {
  /** Human doc (repo-relative). */
  doc: 'docs/WIRE_BOUNDARY.md',
  /** Path fragments that own wire/unknown ingress. */
  pathGlobs: [
    'lib/types/branded/**',
    '**/boundary/**',
    '**/wire/**',
    '**/ingress/**',
    '**/adapters/in/**',
    '**/*boundary*.ts',
    '**/*wire*.ts',
    '**/*ingress*.ts',
    'lib/security/r2-credentials.ts',
  ],
  /** Function name prefixes / patterns that *are* the parse edge. */
  functionNameHints: [
    'parse*',
    'decode*',
    'assert*',
    'is*',
    'from*',
    'read*',
    'load*',
    'normalize*',
    'coerce*',
    '*FromUnknown',
    '*FromWire',
    '*FromJson',
    '*FromEnv',
    'parseBrandId',
    'tryBrandId',
    'makeId',
  ],
  /** Decode APIs banned outside the boundary. */
  decodeCallees: [
    'decodeUnknownSync',
    'decodeUnknown',
    'decodeUnknownEither',
    'decodeUnknownOption',
    'decodeUnknownResult',
    'decodeUnknownExit',
  ],
  /** Paths where unknown-param rule is error (not just warn). */
  unknownParamErrorGlobs: [
    'lib/types/**/*.ts',
    'lib/security/**/*.ts',
    'lib/core/**/*.ts',
    '**/boundary/**/*.ts',
    '**/wire/**/*.ts',
    '**/ingress/**/*.ts',
  ],
  eslintRules: {
    decode: 'harness/no-decode-unknown-outside-boundary',
    unknownParam: 'harness/no-unknown-function-param',
  },
} as const;

/** Path fragments that own wire/unknown ingress. */
export const BOUNDARY_PATH_RE =
  /(?:^|\/)(?:lib\/types\/branded|boundary|wire|ingress|adapters?\/in)(?:\/|$)|(?:^|\/)[^/]*(?:boundary|wire|ingress)[^/]*\.(?:ts|tsx)$|r2-credentials\.ts$/;

/** Function/method names that *are* the boundary (parse once, then trust). */
export const BOUNDARY_FN_NAME_RE =
  /^(?:parse|decode|assert|is|from|read|load|normalize|coerce)[A-Z_]|From(?:Unknown|Wire|Json|Env)$|^(?:parseBrandId|tryBrandId|makeId)$/;

/** Decode APIs that must not appear outside the boundary. */
export const DECODE_CALLEE_NAMES = new Set<string>(BOUNDARY_POLICY.decodeCallees);

export function isBoundaryFilename(filename: string): boolean {
  const f = filename.replace(/\\/g, '/');
  return BOUNDARY_PATH_RE.test(f);
}

export function isBoundaryFunctionName(name: string | null | undefined): boolean {
  if (!name) return false;
  return BOUNDARY_FN_NAME_RE.test(name);
}

function getCalleeName(node: TSESTree.CallExpression): string | null {
  const c = node.callee;
  if (c.type === 'Identifier') return c.name;
  if (c.type === 'MemberExpression' && !c.computed && c.property.type === 'Identifier') {
    return c.property.name;
  }
  if (
    c.type === 'ChainExpression' &&
    c.expression.type === 'MemberExpression' &&
    !c.expression.computed &&
    c.expression.property.type === 'Identifier'
  ) {
    return c.expression.property.name;
  }
  return null;
}

function isTsUnknown(node: TSESTree.TypeNode | undefined | null): boolean {
  return node?.type === 'TSUnknownKeyword';
}

function typeAnnotationIsUnknown(
  typeAnnotation: TSESTree.TSTypeAnnotation | undefined | null
): boolean {
  if (!typeAnnotation || typeAnnotation.type !== 'TSTypeAnnotation') return false;
  return isTsUnknown(typeAnnotation.typeAnnotation);
}

function paramHasUnknownType(param: TSESTree.Parameter): boolean {
  // Identifier: (x: unknown)
  if (param.type === 'Identifier') {
    return typeAnnotationIsUnknown(param.typeAnnotation ?? undefined);
  }
  // Optional/default: (x: unknown = …) / (x?: unknown)
  if (param.type === 'AssignmentPattern' && param.left.type === 'Identifier') {
    return typeAnnotationIsUnknown(param.left.typeAnnotation ?? undefined);
  }
  // Rest: (...args: unknown[])
  if (param.type === 'RestElement') {
    const ann = param.typeAnnotation;
    if (!ann || ann.type !== 'TSTypeAnnotation') return false;
    const t = ann.typeAnnotation;
    if (t.type === 'TSArrayType' && isTsUnknown(t.elementType)) return true;
    if (
      t.type === 'TSTypeReference' &&
      t.typeName.type === 'Identifier' &&
      t.typeName.name === 'Array' &&
      t.typeArguments?.params?.[0] &&
      isTsUnknown(t.typeArguments.params[0])
    ) {
      return true;
    }
    return isTsUnknown(t);
  }
  return false;
}

function enclosingFunctionName(
  node: TSESTree.Node | undefined
): string | null {
  let cur: TSESTree.Node | undefined = node;
  while (cur) {
    if (cur.type === 'FunctionDeclaration' && cur.id?.name) return cur.id.name;
    if (
      (cur.type === 'FunctionExpression' || cur.type === 'ArrowFunctionExpression') &&
      cur.parent?.type === 'VariableDeclarator' &&
      cur.parent.id.type === 'Identifier'
    ) {
      return cur.parent.id.name;
    }
    if (
      (cur.type === 'FunctionExpression' || cur.type === 'ArrowFunctionExpression') &&
      cur.parent?.type === 'Property' &&
      cur.parent.key.type === 'Identifier'
    ) {
      return cur.parent.key.name;
    }
    if (
      cur.type === 'MethodDefinition' ||
      cur.type === 'TSMethodSignature' ||
      // @ts-expect-error ESTree variant
      cur.type === 'PropertyDefinition'
    ) {
      const key = (cur as { key?: TSESTree.Node }).key;
      if (key?.type === 'Identifier') return key.name;
    }
    cur = cur.parent as TSESTree.Node | undefined;
  }
  return null;
}

function hasTypePredicateReturn(
  node:
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression
    | TSESTree.ArrowFunctionExpression
    | TSESTree.TSFunctionType
    | TSESTree.TSMethodSignature
): boolean {
  const rt = node.returnType;
  if (!rt || rt.type !== 'TSTypeAnnotation') return false;
  return rt.typeAnnotation.type === 'TSTypePredicate';
}

export const noDecodeUnknownOutsideBoundary: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Ban decodeUnknownSync / decodeUnknown* outside the wire boundary (harness-engineering).',
      url: 'https://github.com/lopopolo/harness-engineering',
    },
    schema: [],
    messages: {
      banDecode:
        'Call {{name}} only at the wire boundary (lib/types/branded, **/boundary/**, **/wire/**, or a parse*/decode* owner). ' +
        'Parse unknown once, then pass branded/domain types inward. ' +
        'See harness-engineering: ban decodeUnknownSync except at the boundary.',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename?.() ?? '';
    if (isBoundaryFilename(filename)) return {};

    return {
      CallExpression(node) {
        const name = getCalleeName(node as unknown as TSESTree.CallExpression);
        if (!name || !DECODE_CALLEE_NAMES.has(name)) return;

        // Allow when the call sits inside a parse*/decode* function body
        const owner = enclosingFunctionName(node as unknown as TSESTree.Node);
        if (isBoundaryFunctionName(owner)) return;

        context.report({
          node,
          messageId: 'banDecode',
          data: { name },
        });
      },
    };
  },
};

export const noUnknownFunctionParamOutsideBoundary: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Ban `unknown` as a function parameter type outside the wire boundary (harness-engineering).',
      url: 'https://github.com/lopopolo/harness-engineering',
    },
    schema: [],
    messages: {
      banUnknownParam:
        'Parameter typed as `unknown` is only allowed at the wire boundary ' +
        '(lib/types/branded, **/boundary/**, **/wire/**, or parse*/decode*/is* owners). ' +
        'Parse at the edge with parse*/Schema, then use domain types (brands) inward. ' +
        'Suppress intentional boundary: // eslint-disable-next-line harness/no-unknown-function-param',
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename?.() ?? '';
    const fileIsBoundary = isBoundaryFilename(filename);

    function checkFunction(
      node:
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression
        | TSESTree.ArrowFunctionExpression
        | TSESTree.TSFunctionType
        | TSESTree.TSMethodSignature
        | TSESTree.TSDeclareFunction,
      nameHint: string | null
    ) {
      if (fileIsBoundary) return;
      if (isBoundaryFunctionName(nameHint)) return;
      if (
        'returnType' in node &&
        node.returnType &&
        hasTypePredicateReturn(
          node as TSESTree.FunctionDeclaration | TSESTree.FunctionExpression
        )
      ) {
        // Type guards are boundary-shaped: (v: unknown) => v is T
        return;
      }

      for (const param of node.params) {
        if (paramHasUnknownType(param as TSESTree.Parameter)) {
          context.report({
            node: param as unknown as Rule.Node,
            messageId: 'banUnknownParam',
          });
        }
      }
    }

    return {
      FunctionDeclaration(node) {
        checkFunction(
          node as unknown as TSESTree.FunctionDeclaration,
          (node as { id?: { name?: string } }).id?.name ?? null
        );
      },
      FunctionExpression(node) {
        // Method bodies are handled via MethodDefinition (avoid double report)
        const parent = (node as { parent?: { type?: string } }).parent;
        if (parent?.type === 'MethodDefinition' || parent?.type === 'Property') return;
        checkFunction(
          node as unknown as TSESTree.FunctionExpression,
          enclosingFunctionName(node as unknown as TSESTree.Node)
        );
      },
      ArrowFunctionExpression(node) {
        const parent = (node as { parent?: { type?: string } }).parent;
        if (parent?.type === 'Property') return;
        checkFunction(
          node as unknown as TSESTree.ArrowFunctionExpression,
          enclosingFunctionName(node as unknown as TSESTree.Node)
        );
      },
      TSMethodSignature(node) {
        const key = (node as { key?: { type?: string; name?: string } }).key;
        const name = key?.type === 'Identifier' ? key.name ?? null : null;
        checkFunction(node as unknown as TSESTree.TSMethodSignature, name);
      },
      MethodDefinition(node) {
        const fn = (node as { value?: TSESTree.FunctionExpression }).value;
        if (!fn) return;
        const key = (node as { key?: { type?: string; name?: string } }).key;
        const name = key?.type === 'Identifier' ? key.name ?? null : null;
        checkFunction(fn, name);
      },
      Property(node) {
        // object method shorthand: { parse(u: unknown) {} } / { parse: (u: unknown) => {} }
        const n = node as {
          key?: { type?: string; name?: string };
          value?: TSESTree.Node;
          method?: boolean;
        };
        const name = n.key?.type === 'Identifier' ? n.key.name ?? null : null;
        const val = n.value;
        if (!val) return;
        if (
          val.type === 'FunctionExpression' ||
          val.type === 'ArrowFunctionExpression'
        ) {
          checkFunction(
            val as TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression,
            name
          );
        }
      },
      TSDeclareFunction(node) {
        checkFunction(
          node as unknown as TSESTree.TSDeclareFunction,
          (node as { id?: { name?: string } }).id?.name ?? null
        );
      },
    };
  },
};
