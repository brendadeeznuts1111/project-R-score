
// TypeScript loader - strips types, no typechecking
interface User {
  name: string;
  age: number;
}

export function createUser(name: string, age: number): User {
  return { name, age };
}

export const user: User = { name: "Alice", age: 30 };
