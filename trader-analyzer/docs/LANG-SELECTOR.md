# :lang() Selector

The `:lang()` pseudo-class selector allows you to target elements based on the language they're in, making it easy to apply language-specific styling. Modern CSS allows the `:lang()` selector to accept multiple language codes.

For browsers that don't support multiple arguments in the `:lang()` selector, Bun's CSS bundler converts this syntax to use the `:is()` selector to maintain the same behavior.

## Overview

The `:lang()` selector matches elements based on their language:
- Single language: `:lang(en)`
- Multiple languages: `:lang(en, fr, de)`

## Basic Usage

**Input:**
```css
/* Typography adjustments for CJK languages */
:lang(zh, ja, ko) {
  line-height: 1.8;
  font-size: 1.05em;
}

/* Different quote styles by language group */
blockquote:lang(fr, it, es, pt) {
  font-style: italic;
}

blockquote:lang(de, nl, da, sv) {
  font-weight: 500;
}
```

**Output (Converted by Bun):**
```css
/* Multiple languages grouped with :is() for better browser support */
:is(:lang(zh), :lang(ja), :lang(ko)) {
  line-height: 1.8;
  font-size: 1.05em;
}

blockquote:is(:lang(fr), :lang(it), :lang(es), :lang(pt)) {
  font-style: italic;
}

blockquote:is(:lang(de), :lang(nl), :lang(da), :lang(sv)) {
  font-weight: 500;
}
```

If needed, Bun can provide additional fallbacks for `:is()` as well.

## Examples

### Typography Adjustments

```css
/* CJK languages need more line height */
:lang(zh, ja, ko) {
  line-height: 1.8;
  letter-spacing: 0;
}

/* Arabic scripts */
:lang(ar, fa, ur) {
  font-family: "Noto Sans Arabic", sans-serif;
  direction: rtl;
}
```

### Quote Styles

```css
blockquote {
  :lang(en, fr, it, es, pt) & {
    quotes: """ """ "'" "'";
  }
  
  :lang(de, nl, da, sv) & {
    quotes: "" "" '' '';
  }
  
  :lang(zh, ja, ko) & {
    quotes: """ """ """ """;
  }
}
```

### Number Formatting

```css
.number {
  :lang(en, fr, de) & {
    /* Use comma as decimal separator */
  }
  
  :lang(fr, de) & {
    /* Use space as thousands separator */
  }
}
```

### Font Selection

```css
body {
  :lang(en) & {
    font-family: system-ui, sans-serif;
  }
  
  :lang(ja) & {
    font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif;
  }
  
  :lang(zh) & {
    font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  }
  
  :lang(ar, he, fa) & {
    font-family: "Noto Sans Arabic", "Arial", sans-serif;
  }
}
```

## Language Groups

### Western European

```css
:lang(en, fr, de, es, it, pt, nl) {
  font-family: system-ui, sans-serif;
  quotes: """ """ "'" "'";
}
```

### Scandinavian

```css
:lang(sv, da, no, fi) {
  font-weight: 500;
  letter-spacing: 0.01em;
}
```

### Slavic

```css
:lang(ru, pl, cs, sk, bg, hr, sr) {
  font-family: "Segoe UI", system-ui, sans-serif;
}
```

### CJK (Chinese, Japanese, Korean)

```css
:lang(zh, ja, ko) {
  line-height: 1.8;
  letter-spacing: 0;
  font-size: 1.05em;
}
```

### Arabic Scripts

```css
:lang(ar, he, fa, ur) {
  direction: rtl;
  text-align: right;
  font-family: "Noto Sans Arabic", sans-serif;
}
```

## Browser Support

- **Single argument**: All browsers
- **Multiple arguments**: Chrome 88+, Firefox 78+, Safari 14+, Edge 88+

Bun automatically converts multiple arguments to `:is()` for compatibility.

## Best Practices

1. **Group related languages** - Use multiple arguments for efficiency
2. **Test with target languages** - Verify styles render correctly
3. **Combine with :dir()** - For complete internationalization
4. **Use semantic HTML** - Set `lang` attribute properly

## Related

- [:dir() Selector](./DIR-SELECTOR.md) - Direction-aware selectors
- [Bun CSS Bundler](./BUN-CSS-BUNDLER.md) - Main CSS bundler documentation

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0
