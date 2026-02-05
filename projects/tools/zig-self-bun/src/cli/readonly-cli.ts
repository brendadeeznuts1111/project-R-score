// src/env/readonly-cli.ts
//! CLI tool to read and export readonly environment variables
//! Usage: bun run src/env/readonly-cli.ts [get|export|list] [var-name]

import { getReadonlyEnv, getAllReadonlyEnv, exportAsShellScript, exportAsDotEnv, ENV_VARS, isReadonlyEnv } from "./readonly";

const [,, command, ...args] = Bun.argv;

async function main() {
  switch (command) {
    case "get": {
      const varName = args[0];
      if (!varName) {
        console.error("Usage: bun run src/env/readonly-cli.ts get <VAR_NAME>");
        process.exit(1);
      }
      
      const value = await getReadonlyEnv(varName);
      if (value === undefined) {
        console.error(`Unknown readonly variable: ${varName}`);
        console.error(`Available variables: ${Object.values(ENV_VARS).join(", ")}`);
        process.exit(1);
      }
      
      console.log(value);
      break;
    }
    
    case "list": {
      const all = await getAllReadonlyEnv();
      for (const [key, value] of Object.entries(all)) {
        console.log(`${key}=${value}`);
      }
      break;
    }
    
    case "export": {
      const format = args[0] || "shell";
      
      if (format === "shell" || format === "sh") {
        console.log(await exportAsShellScript());
      } else if (format === "env" || format === "dotenv") {
        console.log(await exportAsDotEnv());
      } else {
        console.error(`Unknown format: ${format}. Use 'shell' or 'env'`);
        process.exit(1);
      }
      break;
    }
    
    case "check": {
      const varName = args[0];
      if (!varName) {
        console.error("Usage: bun run src/env/readonly-cli.ts check <VAR_NAME>");
        process.exit(1);
      }
      
      const isReadonly = isReadonlyEnv(varName);
      console.log(isReadonly ? "yes" : "no");
      process.exit(isReadonly ? 0 : 1);
      break;
    }
    
    default: {
      console.log(`Usage: bun run src/env/readonly-cli.ts <command> [args]

Commands:
  get <VAR_NAME>     Get value of readonly environment variable
  list               List all readonly environment variables
  export [format]   Export as shell script (default) or .env format
  check <VAR_NAME>   Check if variable is readonly

Examples:
  bun run src/env/readonly-cli.ts get BUN_CONFIG_VERSION
  bun run src/env/readonly-cli.ts list
  bun run src/env/readonly-cli.ts export shell > config.sh
  bun run src/env/readonly-cli.ts export env > .env.readonly
  bun run src/env/readonly-cli.ts check BUN_CONFIG_VERSION

Available readonly variables:
  ${Object.values(ENV_VARS).join("\n  ")}
`);
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

