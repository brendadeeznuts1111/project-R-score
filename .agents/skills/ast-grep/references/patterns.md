# Pattern language, diagnostics, and safe recipes

Use this reference after the workflow in [`SKILL.md`](../SKILL.md) identifies a
syntax-shaped question. ast-grep patterns are valid source code with AST
metavariables; they are not regular expressions.

## Metavariables

| Syntax    | Matches                    | Captured?      |
| --------- | -------------------------- | -------------- |
| `$NODE`   | one named AST node         | yes            |
| `$_`      | one named AST node         | no             |
| `$$NODE`  | one named or unnamed node  | yes            |
| `$$$`     | zero or more sibling nodes | no             |
| `$$$ARGS` | zero or more sibling nodes | yes, as a list |

Names after `$` use uppercase letters, digits, and underscores. A name cannot
start with a digit. Reusing a captured name requires the matched source to be
identical:

```ts
$VALUE === $VALUE;
```

Use distinct names when the two nodes may differ. A multi-node metavariable is
greedy and does not backtrack; prefer `$ARG` when exactly one node is required.

## Patterns must parse

The pattern must be valid code in the selected language. Validate it before
interpreting a zero-result search:

```bash
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py validate 'console.log($$$ARGS)' --lang ts
```

For a fragment that cannot parse by itself, give a YAML rule enough context and
select the intended subtree:

```yaml
rule:
  pattern:
    context: 'class Example { $FIELD = $VALUE }'
    selector: field_definition
```

Do not put regex syntax such as `.*`, `\w+`, or alternation into a pattern. Use
separate searches, an `any` YAML rule, or `rg` when the question is text-shaped.

## Rule composition

Atomic rules (`pattern`, `kind`, and `regex`) match the target node. Relational
rules describe surrounding nodes:

```yaml
rule:
  pattern: await $PROMISE
  inside:
    any:
      - kind: for_statement
      - kind: while_statement
    stopBy: end
```

`inside`, `has`, `follows`, and `precedes` inspect only immediate neighbors by
default. Add `stopBy: end` when the search must traverse ancestors, descendants,
or siblings. `all` and `any` combine constraints on the same target node; they
do not independently select different children.

Pair `regex` with `kind` or `pattern` so it does not inspect every node:

```yaml
rule:
  all:
    - kind: comment
    - regex: '^//\s*TODO'
```

Tree-sitter kind names are language-specific. Inspect a known-good sample or use
the official playground instead of guessing a kind.

## Search recipes

These examples are intentionally read-only. Narrow `--path` before expanding a
search.

```bash
# Calls with any number of arguments
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py search 'Bun.spawn($$$ARGS)' --path scripts --lang ts

# One-argument calls only
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py search 'Bun.file($PATH)' --path lib --lang ts

# Type assertions
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py search '$VALUE as any' --path src --lang ts

# Python print calls
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py search 'print($$$ARGS)' --path src --lang py

# Go error branches
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py search 'if err != nil { $$$BODY }' --path . --lang go

# Rust unwrap calls
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py search '$VALUE.unwrap()' --path src --lang rust
```

## Rewrite safety

The helper previews replacements unless `--apply` is present:

```bash
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py replace 'oldCall($ARG)' 'newCall($ARG)' --path src --lang ts
```

Before applying a rewrite:

1. Validate the pattern.
2. Restrict the path and language.
3. Review every previewed match.
4. Add `--apply` only for a context-free mechanical transformation.
5. Run the owning formatter, type check, and focused tests.

Do not automate transformations that require import synthesis, async control
flow, variable-scope reasoning, type resolution, ownership inference, or data
flow. ast-grep is structural; use the compiler, LSP, or a purpose-built codemod
for those semantics.

The low-level CLI does not combine machine-readable JSON preview with mutation
reliably. The helper performs separate preview and apply passes; prefer it over
hand-written `sg run --update-all` scripts.

## Bun 1.4 migration and contract proof

Keep discovery aligned to what each tool can prove:

- Use the bundled AST rules for removed call shapes such as
  `response.writeHeader()` and recursive `fs.rmdir()`, and for test assertions
  that cannot fail.
- Use `rg` for source headings, prose, comments, URL fragments, and
  error-message text. In particular, the Bun 1.4 breaking-change tracker's
  **Under consideration** section is not shipped behavior.
- Use the TypeScript compiler or a focused runtime contract when the finding
  depends on a resolved type. CString values returned by Bun FFI are the key
  example: a property access on an arbitrary variable is too broad for a safe
  AST rule.

The recursive-rmdir audit intentionally also reports a call inside
`tests/bun-1.4.0-breaking-changes-contract.test.ts`. That contract invokes the
removed shape to prove it throws. Keep that reviewed finding; a syntax rule
cannot safely infer expected-failure intent from arbitrary callback structure.

Inspect the catalog from the repository root, then run the fail-closed audit
from the owning package:

```bash
python3 .agents/skills/ast-grep/scripts/ast_grep_helper.py bun patterns --bundle bun-1.4-migration
cd .agents/skills/ast-grep
bun run bun:1.4:migration:check
```

Use `bun run bun:1.4:migration:check -- --json` for machine-readable evidence.
The expected-finding contract lives beside the scanner in
`scripts/bun-1.4-migration-audit.ts`; changing it requires review and its unit
test. Never promote a newly discovered violation into that list merely to make
the gate pass.

Then inspect FFI-bearing files and prove the expected string shape with the
focused Bun release-contract tests:

```bash
rg -n 'bun:ffi|CString|FFIType\.cstring' lib tools tests
bun test tests/bun-1.4.0-breaking-changes-contract.test.ts
```

The canonical evidence boundary is
[`BUN_1_4_MIGRATION.md`](../../../../docs/BUN_1_4_MIGRATION.md): the release
blog owns announced release facts, the merged tracker owns reconciled breaking
behavior, and repository tests own local executable claims. A clean syntax scan
does not substitute for any of those layers.

## Diagnose a miss

1. Confirm the language and path.
2. Run `validate` on the pattern.
3. Replace a multi-node metavariable with a single-node one if arity matters.
4. Use object-style `context` plus `selector` for ambiguous fragments.
5. Inspect the tree-sitter kind in the playground.
6. Switch to `rg` if the requirement concerns comments, strings, filenames, or
   substrings.

For raw CLI diagnostics, use the repository wrapper so the pinned binary stays
authoritative:

```bash
.agents/skills/ast-grep/scripts/sg.sh run -p 'console.log($MSG)' --lang ts --debug-query=ast
```

## Official references

- [Pattern syntax](https://ast-grep.github.io/guide/pattern-syntax.html)
- [Rule cheat sheet](https://ast-grep.github.io/cheatsheet/rule.html)
- [Relational rules](https://ast-grep.github.io/guide/rule-config/relational-rule.html)
- [Playground](https://ast-grep.github.io/playground.html)
