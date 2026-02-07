import index from "./index-react.html";

Bun.serve({
  port: 3000,
  routes: {
    "/": index,
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log("Quantum Dashboard running at http://localhost:3000");
