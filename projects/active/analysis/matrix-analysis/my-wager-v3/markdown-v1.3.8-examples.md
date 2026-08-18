# Bun Markdown examples

These examples require Bun 1.3.8 or newer. See the official
[`Bun.markdown` documentation](https://bun.com/docs/runtime/markdown) and
[`Bun.markdown` API reference](https://bun.com/reference/bun/markdown).

Update Bun before running them:

```sh
bun upgrade
```

## Render HTML

```ts
const markdown = '# Report';
const html = Bun.markdown.html(markdown, {
  headings: { ids: true, autolink: true },
});
```

## Render with callbacks

```ts
const output = Bun.markdown.render('# Report with **results**', {
  heading: (children, { level }) =>
    `\u001b[1;34m${'#'.repeat(level)} ${children}\u001b[0m`,
  strong: children => `\u001b[1m${children}\u001b[22m`,
  paragraph: children => children,
});
```

## Render React elements

Use a `.tsx` file when providing JSX component overrides:

```tsx
function Heading({ children }: Bun.markdown.ChildrenProps) {
  return <h1 className="title">{children}</h1>;
}

function Paragraph({ children }: Bun.markdown.ChildrenProps) {
  return <p className="content">{children}</p>;
}

const element = Bun.markdown.react(
  '# Report',
  { h1: Heading, p: Paragraph },
  { headings: { ids: true } }
);
```
