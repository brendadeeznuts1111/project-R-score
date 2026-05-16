# Test 1: Skill Hot-Reload

## What to test:
1. Run `/hello` - should greet you
2. Edit `~/.claude/skills/hello.ts` (change the message)
3. Run `/hello` again - should show updated message immediately

## Instructions:
```bash
# In a separate terminal, edit the skill:
code ~/.claude/skills/hello.ts
# or
nano ~/.claude/skills/hello.ts

# Change "Initial version" to something else, save, then run /hello here
```

## Expected result:
- No restart needed
- Changes appear instantly

## Status: ⏳ Ready to test - run `/hello` to begin
