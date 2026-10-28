// Parse theme.jsonc via Bun.JSONC (comments + trailing commas).
export async function parseTheme(path: string): Promise<any> {
  const raw = await Bun.file(path).text();
  return Bun.JSONC.parse(raw);
}
