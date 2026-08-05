/** Return true when a Bun version descriptor identifies a canary build. */
export function isCanaryBunBuild(descriptors: readonly (string | undefined)[]): boolean {
  return descriptors.some(descriptor => {
    if (!descriptor) return false;
    return /(?:^|[.+-])canary(?:$|[.+-]|\d)/i.test(descriptor.trim());
  });
}
