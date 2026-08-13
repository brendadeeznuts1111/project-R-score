const pkg = (await Bun.file(new URL('../package.json', import.meta.url)).json()) as {
  name?: string;
  version?: string;
  publishConfig?: { tag?: string };
};

function required(value: string | undefined, field: string): string {
  const trimmed = value?.trim();
  if (!trimmed)
    throw new Error(`package.json ${field} must be a non-empty string after publishing.`);
  return trimmed;
}

console.log('Publish complete');
console.table({
  package: required(pkg.name, 'name'),
  version: required(pkg.version, 'version'),
  tag: required(pkg.publishConfig?.tag, 'publishConfig.tag'),
});
console.log(
  'Next: verify the registry release, then create the corresponding Factory artifact only if needed.'
);
