# Test 4: Tab Autocomplete Anywhere

## New in 2.1.0:
Previously, Tab autocomplete only worked when `/` was at the **beginning** of input.
Now it works when `/` appears **anywhere** in the input.

## Test:
1. Type: `let me check the /co` and press `Tab`
2. Should show: `/config`, `/context`, `/continue`, etc.

3. Type: `run /te` and press `Tab`
4. Should show: `/test`, `/teleport`, `/theme`, etc.

## Expected result:
- Slash command suggestions appear even when `/` is mid-line
- Can tab to select, Enter to insert

## Status: ⏳ Interactive test - try typing /commands mid-line
