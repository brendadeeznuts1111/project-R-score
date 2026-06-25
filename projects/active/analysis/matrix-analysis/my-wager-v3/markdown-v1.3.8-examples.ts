
// Upgrade to Bun v1.3.8 to use these features:

// 1. Install/Update Bun
bun upgrade

// 2. Use in your MCP server
app.post('/report', (req) => {
  const markdown = generateReport(req.body);
  const html = Bun.markdown.html(markdown, {
    headingIds: true,
    autolinkHeadings: true
  });
  return html;
});

// 3. Create custom CLI output
const output = Bun.markdown.render(data, {
  heading: (c) => `[1;34m${c}[0m`,
  strong: (c) => `[1m${c}[22m`,
  table: (c) => `[36m${c}[0m`
});

// 4. Generate React components
const MarkdownComponent = ({ content }) =>
  Bun.markdown.react(content, {
    h1: ({ children }) => <h1 className="title">{children}</h1>,
    p: ({ children }) => <p className="content">{children}</p>
  });
