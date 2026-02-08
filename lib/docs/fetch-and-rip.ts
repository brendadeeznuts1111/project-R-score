// lib/docs/fetch-and-rip.ts
const docUrl = "https://bun.sh/docs/llms.txt";

const proc = Bun.spawn(["rg", "Bun.spawn"], {
  stdin: await fetch(docUrl), // Direct streaming from network to rg
  stdout: "pipe",
});

console.log(await proc.stdout.text());
