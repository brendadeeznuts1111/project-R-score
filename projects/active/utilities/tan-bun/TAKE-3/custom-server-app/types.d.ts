// Type declaration for the built TanStack Start server
declare module './.output/server/index.mjs' {
  function fetch(request: Request): Response | Promise<Response>;
  export = fetch;
}
