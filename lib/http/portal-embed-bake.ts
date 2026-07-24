// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/** Inject `<script type="application/json" id="…">` snapshot into portal HTML. */
export async function bakeJsonEmbed(
  htmlPath: string,
  jsonKey: string,
  // eslint-disable-next-line harness/no-unknown-function-param -- JSON snapshot payload at HTML bake boundary
  data: unknown
): Promise<void> {
  const embed = JSON.stringify(data).replace(/</g, '\\u003c');
  const tag = `<script type="application/json" id="${jsonKey}">${embed}</script>`;
  let html = await Bun.file(htmlPath).text();
  const escapedKey = jsonKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `<script type="application/json" id="${escapedKey}">[\\s\\S]*?</script>\\s*`,
    'g'
  );
  if (re.test(html)) {
    let replaced = false;
    html = html.replace(re, () => {
      if (replaced) return '';
      replaced = true;
      return `${tag}\n`;
    });
  } else {
    html = html.replace('</head>', `  ${tag}\n</head>`);
  }
  await Bun.write(htmlPath, html);
}
