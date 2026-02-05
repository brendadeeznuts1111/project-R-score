// Bun type definitions for TypeScript
declare global {
  var Bun: {
    main: string;
    version: string;
    env: Record<string, string | undefined>;
  };
}

export { };
