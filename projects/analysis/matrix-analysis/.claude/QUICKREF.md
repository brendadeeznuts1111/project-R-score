# Quick Reference

## Keyboard Shortcuts

```
Ctrl+C    Cancel current operation
Ctrl+L    Clear screen
Up/Down   Navigate command history
Tab       Trigger completion
```

## Modes (Type to activate)

```
shell mode      → Shell scripting help
architect mode  → Design & planning (16K thinking)
review mode     → Code review
debug mode      → Troubleshooting
minimal mode    → Concise responses
learn mode      → Teaching mode
```

## Slash Commands

```
/shell      Shell scripting mode
/explain    Explain code
/refactor   Refactor code
/test       Generate tests
/docs       Add documentation
/commit     Git commit message
/fix        Fix bugs
/optimize   Performance optimize
/types      Add TypeScript types
/secure     Security review
/rename     Better naming
/error      Explain error
/api        Design API
/sql        Optimize SQL
/regex      Regex help
/i18n       Internationalize
/pr         PR description
/todo       Create todo list
/review     Review code
/workflow   Show workflows
```

## Shell Aliases

### Git
```bash
gs    git status
ga    git add
gc    git commit
gp    git push
gl    git log --oneline -10
gd    git diff
gco   git checkout
gcb   git checkout -b
```

### Bun
```bash
buni  bun install
buns  bun start
bunb  bun run build
bunt  bun test
bunr  bun run
```

### Utilities
```bash
json      python3 -m json.tool
uuid      Generate UUID
myip      Get public IP
bigfiles  Find large files
findf     Find files by name
findd     Find directories
grepr     Grep recursively
size      Show directory size
path      Show PATH entries
envs      Show sorted env vars
```

### Scripts
```bash
backup    Backup settings
setup     Initialize new project
clean     Clean repo artifacts
update    Update all dependencies
ctx       Load project context
```

## Snippets (Type prefix + Tab)

```
clg    console.log()
cle    console.error()
af     Arrow function
asyncfn Async function
tryc   Try-catch block
desc   describe() test
it     it() test
us     useState()
ue     useEffect()
ucb    useCallback()
expd   export default
exp    export const
imp    import { } from ''
iface  interface {}
type   type alias
```

## Templates

```bash
# Templates in ~/.claude/templates/

component.tsx   React component
test.ts         Test file
hook.ts         Custom hook
util.ts         Utility function
api-route.ts    Next.js API route
middleware.ts   Next.js middleware
schema.prisma   Prisma schema
```

## Workflows

```bash
# Defined in ~/.claude/workflows.json

pr-review    Review a pull request
new-feature  Develop new feature
bug-fix      Fix a bug
refactor     Refactor code
release      Prepare release
```

## Providers

```bash
# Configured in ~/.claude/providers.json

kimi      Moonshot AI (default)
openai    OpenAI GPT
anthropic Anthropic Claude
```

## MCP Servers

```bash
# Configured in ~/.claude/mcp.json

bun         Bun runtime tools
context7    Documentation lookup
filesystem  File operations
github      GitHub integration
postgres    Database access
```

## Useful Commands

```bash
# Backup settings
backup

# Setup new project
setup my-project

# Clean repository
clean

# Update dependencies
update

# Load context
ctx

# View documentation
cat ~/.claude/SETTINGS.md
cat ~/.claude/QUICKREF.md

# Edit settings
nano ~/.claude/settings.json
nano ~/.config/kimi/config.json
```
