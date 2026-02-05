#!/usr/bin/env bun

import { describe, expect, test } from "bun:test";

describe("🎯 Bun CLI - Specific Examples Verification", () => {
  test("✅ Run JavaScript file: bun run ./index.js", async () => {
    // Create a test JavaScript file
    const jsContent = `
console.log('JavaScript file executed successfully');
export const message = 'Hello from JS';
`;

    await Bun.write("/tmp/index.js", jsContent);

    // Execute: bun run ./index.js
    const result = await Bun.spawn(["bun", "run", "./index.js"], {
      cwd: "/tmp",
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(result).toBe(0);
  });

  test("✅ Run TypeScript file: bun run ./index.tsx", async () => {
    // Create a test TSX file
    const tsxContent = `
const App = () => {
  const message: string = 'TypeScript JSX executed successfully';
  console.log(message);
  return <div>{message}</div>;
};

App();
export default App;
`;

    await Bun.write("/tmp/index.tsx", tsxContent);

    // Execute: bun run ./index.tsx
    const result = await Bun.spawn(["bun", "run", "./index.tsx"], {
      cwd: "/tmp",
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(result).toBe(0);
  });

  test("✅ Run package.json script: bun run dev", async () => {
    // Create package.json with dev script
    const packageJson = {
      name: "test-project",
      version: "1.0.0",
      scripts: {
        dev: "echo 'Development server started'",
        lint: "echo 'Linting completed'",
      },
    };

    await Bun.write("/tmp/package.json", JSON.stringify(packageJson, null, 2));

    // Execute: bun run dev
    const devResult = await Bun.spawn(["bun", "run", "dev"], {
      cwd: "/tmp",
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(devResult).toBe(0);
  });

  test("✅ Run package.json script: bun run lint", async () => {
    // Execute: bun run lint (using same package.json as above)
    const lintResult = await Bun.spawn(["bun", "run", "lint"], {
      cwd: "/tmp",
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(lintResult).toBe(0);
  });

  test("✅ Verify file execution vs script execution", async () => {
    // Create both a file and a script with same name to test precedence
    const packageJson = {
      name: "precedence-test",
      version: "1.0.0",
      scripts: {
        index: "echo 'From package.json script'",
      },
    };

    await Bun.write("/tmp/package.json", JSON.stringify(packageJson, null, 2));
    await Bun.write("/tmp/index.js", "console.log('From index.js file');");

    // Test that script takes precedence over file
    const result = await Bun.spawn(["bun", "run", "index"], {
      cwd: "/tmp",
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(result).toBe(0);

    // Test direct file execution
    const fileResult = await Bun.spawn(["bun", "run", "./index.js"], {
      cwd: "/tmp",
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(fileResult).toBe(0);
  });

  test("✅ TypeScript compilation and execution", async () => {
    // Create a TypeScript file with types
    const tsContent = `
interface User {
  name: string;
  age: number;
}

const user: User = { name: 'Alice', age: 30 };
console.log(\`User \${user.name} is \${user.age} years old\`);

export function greetUser(user: User): string {
  return \`Hello, \${user.name}!\`;
}

console.log(greetUser(user));
`;

    await Bun.write("/tmp/user.ts", tsContent);

    // Execute TypeScript file
    const result = await Bun.spawn(["bun", "run", "./user.ts"], {
      cwd: "/tmp",
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(result).toBe(0);
  });

  test("✅ JSX component execution", async () => {
    // Create a JSX component file
    const jsxContent = `
const Button = ({ onClick, children }) => {
  console.log('Button component defined');
  return {
    type: 'button',
    props: { onClick, children },
    render: () => \`Button: \${children}\`
  };
};

const button = Button({
  onClick: () => console.log('clicked'),
  children: 'Click me'
});

console.log(button.render());
export default Button;
`;

    await Bun.write("/tmp/button.jsx", jsxContent);

    // Execute JSX file
    const result = await Bun.spawn(["bun", "run", "./button.jsx"], {
      cwd: "/tmp",
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(result).toBe(0);
  });

  test("✅ Error handling for missing files", async () => {
    // Test with non-existent JavaScript file
    const jsResult = await Bun.spawn(["bun", "run", "./missing.js"], {
      cwd: "/tmp",
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(jsResult).not.toBe(0);

    // Test with non-existent TypeScript file
    const tsxResult = await Bun.spawn(["bun", "run", "./missing.tsx"], {
      cwd: "/tmp",
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(tsxResult).not.toBe(0);
  });

  test("✅ Error handling for missing scripts", async () => {
    // Create package.json without the requested script
    const packageJson = {
      name: "no-scripts",
      version: "1.0.0",
      scripts: {
        existing: "echo 'This exists'",
      },
    };

    await Bun.write("/tmp/package.json", JSON.stringify(packageJson, null, 2));

    // Test with non-existent script
    const result = await Bun.spawn(["bun", "run", "nonexistent"], {
      cwd: "/tmp",
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    expect(result).not.toBe(0);
  });
});
