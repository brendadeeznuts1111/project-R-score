import { peek } from "bun";

const promise = Promise.resolve("hi");

// no await!
const result = peek(promise);
console.log(result); // "hi"

// Let's also demonstrate a few more cases:
console.log("\n--- More Examples ---");

// Non-promise value
const nonPromise = peek(42);
console.log("Non-promise:", nonPromise); // 42

// Pending promise
const pending = new Promise(() => {});
const pendingResult = peek(pending);
console.log("Pending promise:", pendingResult === pending); // true

// Another resolved promise
const anotherPromise = Promise.resolve({ message: "hello world" });
const anotherResult = peek(anotherPromise);
console.log("Object result:", anotherResult); // { message: "hello world" }
