# Test 5: Ctrl+B Backgrounding

## New in 2.1.0:
- Unified `Ctrl+B` to background **both** bash commands and agents
- Press `Ctrl+B` while something is running → it moves to background
- Can continue working while task runs in background

## Test:
1. Run a long command like: `sleep 30`
2. While it's running, press `Ctrl+B`
3. Task backgrounds, you get control back
4. Check status with `/tasks` or look for notification when done

## Expected result:
- Clean completion message when background task finishes
- Shows bullet point notification
- No noisy raw output

## Status: ⏳ Interactive test - run a long command and press Ctrl+B
