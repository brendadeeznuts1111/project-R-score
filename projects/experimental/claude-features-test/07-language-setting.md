# Test 7: Language Setting

## New in 2.1.0:
Configure Claude's response language via `settings.json`.

## Add to `~/.claude/settings.json`:
```json
{
  "language": "spanish"
}
```

## Supported languages:
Any language name (english, spanish, french, japanese, chinese, etc.)

## Test:
1. Add `"language": "spanish"` to settings
2. Restart Claude
3. Ask any question - responses will be in Spanish

## To reset:
Remove the `language` key or set to `"english"`

## Status: 📝 Edit settings.json to test
