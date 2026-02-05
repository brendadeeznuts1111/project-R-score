# Test 6: Wildcard Bash Permissions

## New in 2.1.0:
Can use `*` wildcards in permission rules for Bash tool.

## Examples:
- `Bash(npm *)` - allow all npm commands
- `Bash(* install)` - allow any `... install` command
- `Bash(git * main)` - allow git commands targeting main branch
- `Bash(ls *.txt)` - allow ls with specific glob patterns

## Add to `~/.claude/settings.json`:
```json
{
  "toolPermissions": {
    "Bash(npm *)": "allow",
    "Bash(git *)": "allow",
    "Bun(*)": "allow"
  }
}
```

## Test:
After adding the rule, try running `npm test` or `bun install` - should not prompt.

## Status: 📝 Edit settings.json to test
