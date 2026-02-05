# Test 3: Vim Motions

## New in 2.1.0:

### Yank/Paste:
- `yy` or `Y` - yank (copy) current line
- `p` - paste after cursor
- `P` - paste before cursor
- `Ctrl+Y` - yank (like in readline/emacs mode)
- `Alt+Y` - cycle through kill-ring history

### Text Objects:
- `ci"` - change inside quotes
- `ci'` - change inside single quotes
- `ci(` / `ci)` - change inside parentheses
- `ci[` / `ci]` - change inside brackets
- `ci{` / `ci}` - change inside curly braces
- `ciw` - change inner word
- `caw` - change a word
- `di"`, `di'`, etc. - delete inside...

### Indent:
- `>>` - indent line right
- `<<` - indent line left

### Motions:
- `;` - repeat last f/F/t/T motion forward
- `,` - repeat last f/F/t/T motion backward
- `J` - join lines

## Test:
Type something, then try:
1. `Esc` to enter normal mode
2. `yy` to yank the line
3. Move down, `p` to paste
4. `>>` to indent, `<<` to unindent

## Status: ⏳ Interactive test - try the motions above
