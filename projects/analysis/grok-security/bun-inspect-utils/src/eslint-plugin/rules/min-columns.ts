/**
 * [SECURITY][LINTING][RULE][META:{MIN_COLS:6}][#REF:ESLint,table]{BUN-NATIVE}
 * ESLint rule: bun-tables/min-columns
 * Enforces minimum meaningful columns in table calls
 */

import type { Rule } from "eslint";
import type { RuleModule } from "eslint";
import { GENERIC_COLUMNS } from "../../core/domain-models";

const rule: RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce minimum meaningful columns in Bun.inspect.table() calls",
      category: "Best Practices",
      recommended: true,
      url: "https://docs.bun.sh/api/inspect#table",
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          minColumns: {
            type: "number",
            default: 6,
          },
          genericColumns: {
            type: "array",
            items: { type: "string" },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  // @ts-expect-error: context is any here
  create(context: any) {
    const options = context.options[0] || {};
    const minColumns = options.minColumns ?? 6;
    const genericColumns: Set<string> = new Set(
      options.genericColumns ?? GENERIC_COLUMNS
    );

    return {
      CallExpression(node: any) {
        // Check for Bun.inspect.table() calls
        // Structure: CallExpression -> callee is MemberExpression with property "table"
        // and object is MemberExpression with object "Bun" and property "inspect"
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.property.name === "table" &&
          node.callee.object.type === "MemberExpression" &&
          node.callee.object.object.name === "Bun" &&
          node.callee.object.property.name === "inspect"
        ) {
          validateTableCall(node, context, minColumns, genericColumns);
        }

        // Check for table() wrapper function calls
        if (
          node.callee.type === "Identifier" &&
          (node.callee.name === "table" ||
            node.callee.name === "tableMarkdown" ||
            node.callee.name === "tableCsv")
        ) {
          validateTableCall(node, context, minColumns, genericColumns);
        }
      },
    };
  },
};

/**
 * Validate a table call
 */
function validateTableCall(
  node: any,
  context: any,
  minColumns: number,
  genericColumns: Set<string>
) {
  // Get properties argument (second argument)
  const propertiesArg = node.arguments[1];

  if (!propertiesArg) {
    // No properties specified - can't validate statically
    context.report({
      node,
      message: `Table call should explicitly specify properties array with at least ${minColumns} meaningful columns`,
      fix(fixer: any) {
        return fixer.insertTextAfter(
          node.arguments[0],
          `, /* TODO: add properties array with ${minColumns}+ columns */`
        );
      },
    });
    return;
  }

  // Check if it's an array literal
  if (propertiesArg.type !== "ArrayExpression") {
    return; // Can't validate non-literal arrays
  }

  // Count meaningful columns
  const columns = propertiesArg.elements
    .filter((el: any) => el?.type === "Literal" || el?.type === "StringLiteral")
    .map((el: any) => el.value);

  const meaningfulColumns = columns.filter(
    (col: string) => !genericColumns.has(col.toLowerCase())
  );

  if (meaningfulColumns.length < minColumns) {
    context.report({
      node: propertiesArg,
      message: `Table has only ${meaningfulColumns.length} meaningful columns (need ${minColumns}). Generic columns: ${Array.from(genericColumns).join(", ")}`,
      fix(fixer: any) {
        // Suggest adding more columns
        const suggestion = `/* TODO: add ${minColumns - meaningfulColumns.length} more meaningful columns */`;
        return fixer.insertTextAfter(propertiesArg, ` ${suggestion}`);
      },
    });
  }
}

export default rule;
