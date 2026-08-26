const target = process.argv[2];
if (!target) throw new Error('expected fixture URL');

const started = Bun.nanoseconds();
const response = await fetch(target, { redirect: 'error' });
const body = await response.text();
const firstRequestMs = Number(Bun.nanoseconds() - started) / 1_000_000;
console.log(JSON.stringify({ status: response.status, body, firstRequestMs }));
