function parseSeed(args: string[]): number {
  const found = args.find(a => a.startsWith('--seed='));
  const seed = found ? Number(found.slice('--seed='.length)) : 210;
  if (!Number.isFinite(seed) || seed < 0 || seed > 360) {
    throw new Error('seed must be a number between 0 and 360');
  }
  return seed;
}

function main(): void {
  const seed = parseSeed(process.argv.slice(2));
  const markdown = `# Brand Seed ${seed}\n\nThis is the grounded default profile for UI color generation.\n\n- Primary hue: ${seed}\n- Saturation: 90\n- Lightness: 60\n`;

  const html = Bun.markdown.render(markdown);
  const reactNode = Bun.markdown.react(markdown);

  console.log(
    JSON.stringify(
      {
        seed,
        htmlBytes: html.length,
        reactNodeType: typeof reactNode,
        hasReactNode: Boolean(reactNode),
      },
      null,
      2
    )
  );
}

if (import.meta.main) {
  main();
}
