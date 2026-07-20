import type { ESLint, Linter, Rule } from 'eslint';
import { formatBunMessage } from '../../bun-dx-catalog.ts';

const preferImportMetaMain: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer import.meta.main guard for CLI entrypoints',
    },
    schema: [],
    messages: {
      preferMain: '{{message}}',
    },
  },
  create(context) {
    const filename = context.filename;
    const isScript =
      filename.includes('/scripts/') ||
      filename.includes('/tools/') ||
      filename.endsWith('-cli.ts') ||
      filename.includes('-cli/');

    if (!isScript) return {};

    let hasMainGuard = false;
    let hasTopLevelAwaitMain = false;

    return {
      IfStatement(node) {
        if (
          node.test.type === 'MemberExpression' &&
          node.test.object.type === 'MetaProperty' &&
          node.test.object.meta.name === 'import' &&
          node.test.object.property.name === 'meta' &&
          node.test.property.type === 'Identifier' &&
          node.test.property.name === 'main'
        ) {
          hasMainGuard = true;
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'main' &&
          !hasMainGuard
        ) {
          hasTopLevelAwaitMain = true;
        }
      },
      'Program:exit'(node) {
        if (hasMainGuard || !hasTopLevelAwaitMain) return;
        const source = context.sourceCode.getText(node);
        if (!source.includes('import.meta.main')) {
          context.report({
            node,
            messageId: 'preferMain',
            data: {
              message: formatBunMessage('cli.main', 'CLI scripts should guard entry with import.meta.main.'),
            },
          });
        }
      },
    };
  },
};

const preferBunEnv: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer Bun.env over process.env in Bun scripts',
    },
    schema: [],
    messages: {
      preferBunEnv: '{{message}}',
    },
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.object.type === 'MemberExpression' &&
          node.object.object.type === 'Identifier' &&
          node.object.object.name === 'process' &&
          node.object.property.type === 'Identifier' &&
          node.object.property.name === 'env'
        ) {
          context.report({
            node,
            messageId: 'preferBunEnv',
            data: {
              message: formatBunMessage('env.read', 'Use Bun.env instead of process.env.'),
            },
          });
        }
      },
    };
  },
};

const preferBunTest: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer bun:test over node:test',
    },
    schema: [],
    messages: {
      preferBunTest: '{{message}}',
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const src = node.source.value;
        if (typeof src === 'string' && (src === 'node:test' || src === 'jest')) {
          context.report({
            node,
            messageId: 'preferBunTest',
            data: { message: formatBunMessage('test.bun') },
          });
        }
      },
    };
  },
};

const preferBunSqlite: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer bun:sqlite over better-sqlite3',
    },
    schema: [],
    messages: {
      preferBunSqlite: '{{message}}',
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const src = node.source.value;
        if (typeof src === 'string' && src === 'better-sqlite3') {
          context.report({
            node,
            messageId: 'preferBunSqlite',
            data: { message: formatBunMessage('sqlite.bun') },
          });
        }
      },
    };
  },
};

const requireBunPrefix: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Suggest BUN_ prefix for exported Bun-related constants',
    },
    schema: [],
    messages: {
      missingBunPrefix:
        'Constants related to Bun features should start with BUN_ prefix. Found: {{name}}\nDocs: https://bun.sh/docs',
    },
  },
  create(context) {
    const bunKeywords = [
      'API', 'CATALOG', 'DOC', 'KEYWORD', 'ANNOTATION', 'CONFIG',
      'FORMAT', 'VERSION', 'COOKIE', 'R2', 'S3', 'CLIENT', 'ENDPOINT',
      'BUCKET', 'ACCOUNT', 'ACCESS', 'SECRET',
    ];

    function shouldHaveBunPrefix(name: string): boolean {
      if (name.startsWith('BUN_')) return false;
      const upperName = name.toUpperCase();
      return bunKeywords.some(keyword => upperName.includes(keyword));
    }

    return {
      VariableDeclaration(node) {
        if (node.kind !== 'const') return;
        for (const declaration of node.declarations) {
          if (declaration.id.type !== 'Identifier') continue;
          const name = declaration.id.name;
          const isExported =
            node.parent?.type === 'ExportNamedDeclaration' ||
            node.parent?.type === 'ExportDefaultDeclaration' ||
            (node.parent?.type === 'Program' && /^[A-Z][A-Z0-9_]*$/.test(name));

          if (isExported && shouldHaveBunPrefix(name)) {
            context.report({
              node: declaration.id,
              messageId: 'missingBunPrefix',
              data: { name },
            });
          }
        }
      },
    };
  },
};

const plugin: ESLint.Plugin = {
  meta: {
    name: 'eslint-plugin-bun',
    version: '1.0.0',
  },
  rules: {
    'prefer-import-meta-main': preferImportMetaMain,
    'prefer-bun-env': preferBunEnv,
    'prefer-bun-test': preferBunTest,
    'prefer-bun-sqlite': preferBunSqlite,
    'require-bun-prefix': requireBunPrefix,
  },
};

export default plugin;

export const bunPluginRules: Linter.RulesRecord = {
  'bun/prefer-import-meta-main': 'warn',
  'bun/prefer-bun-env': 'warn',
  'bun/prefer-bun-test': 'warn',
  'bun/prefer-bun-sqlite': 'warn',
  'bun/require-bun-prefix': 'off',
};

export const bunPluginStrictRules: Linter.RulesRecord = {
  'bun/prefer-import-meta-main': 'error',
  'bun/prefer-bun-env': 'warn',
  'bun/prefer-bun-test': 'warn',
  'bun/prefer-bun-sqlite': 'warn',
};
