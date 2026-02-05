/**
 * Built-in Step Handlers v2.4.1 - Hardened Baseline
 * Core Step Handlers for Common Workflow Operations
 *
 * Architecture:
 * - Shell execution via Bun.spawn()
 * - HTTP requests via Bun.fetch()
 * - File operations via Bun.file()
 * - Git operations via Bun.spawn()
 *
 * Performance Characteristics:
 * - Shell: Native process spawning
 * - HTTP: Zero-overhead fetch
 * - File: Zero-copy I/O
 *
 * Powered by Bun 1.3.6 Native APIs
 */

import type { StepHandler, StepIO, WorkflowContext } from './types';

/**
 * Shell execution handler
 *
 * Inputs:
 * - command: string - Command to execute
 * - cwd?: string - Working directory
 * - env?: Record<string, string> - Environment variables
 * - timeout?: number - Timeout in milliseconds
 *
 * Outputs:
 * - stdout: string - Standard output
 * - stderr: string - Standard error
 * - exitCode: number - Exit code
 */
export const shellExecHandler: StepHandler = async (inputs, context) => {
  const command = inputs.command as string;
  const cwd = (inputs.cwd as string) ?? process.cwd();
  const env = (inputs.env as Record<string, string>) ?? {};
  const timeout = (inputs.timeout as number) ?? 60000;

  if (!command) {
    throw new Error('shell.exec requires a command input');
  }

  console.log(`🔧 Executing: ${command}`);

  const proc = Bun.spawn(['sh', '-c', command], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      ...env,
      WORKFLOW_ID: context.workflowId,
      EXECUTION_ID: context.executionId,
    },
  });

  // Set up timeout
  const timeoutId = setTimeout(() => {
    proc.kill();
  }, timeout);

  try {
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    clearTimeout(timeoutId);

    if (exitCode !== 0) {
      throw new Error(`Command failed with exit code ${exitCode}: ${stderr}`);
    }

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};

/**
 * HTTP request handler
 *
 * Inputs:
 * - url: string - Request URL
 * - method?: string - HTTP method (default: GET)
 * - headers?: Record<string, string> - Request headers
 * - body?: string | object - Request body
 * - timeout?: number - Timeout in milliseconds
 *
 * Outputs:
 * - status: number - Response status code
 * - statusText: string - Response status text
 * - headers: Record<string, string> - Response headers
 * - body: string - Response body
 * - json?: object - Parsed JSON body (if applicable)
 */
export const httpRequestHandler: StepHandler = async (inputs) => {
  const url = inputs.url as string;
  const method = (inputs.method as string) ?? 'GET';
  const headers = (inputs.headers as Record<string, string>) ?? {};
  const body = inputs.body;
  const timeout = (inputs.timeout as number) ?? 30000;

  if (!url) {
    throw new Error('http.request requires a url input');
  }

  console.log(`🌐 ${method} ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'User-Agent': 'Registry-Powered-MCP/2.4.1',
        ...headers,
      },
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseBody = await response.text();
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let json: unknown;
    try {
      json = JSON.parse(responseBody);
    } catch {
      // Not JSON, that's fine
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      json,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};

/**
 * File read handler
 *
 * Inputs:
 * - path: string - File path to read
 * - encoding?: string - File encoding (default: utf-8)
 *
 * Outputs:
 * - content: string - File contents
 * - size: number - File size in bytes
 * - exists: boolean - Whether file exists
 */
export const fileReadHandler: StepHandler = async (inputs) => {
  const path = inputs.path as string;

  if (!path) {
    throw new Error('file.read requires a path input');
  }

  console.log(`📄 Reading: ${path}`);

  const file = Bun.file(path);
  const exists = await file.exists();

  if (!exists) {
    return {
      content: '',
      size: 0,
      exists: false,
    };
  }

  const content = await file.text();

  return {
    content,
    size: file.size,
    exists: true,
  };
};

/**
 * File write handler
 *
 * Inputs:
 * - path: string - File path to write
 * - content: string - Content to write
 * - append?: boolean - Append to file instead of overwrite
 *
 * Outputs:
 * - path: string - Written file path
 * - size: number - Written bytes
 * - success: boolean - Whether write succeeded
 */
export const fileWriteHandler: StepHandler = async (inputs) => {
  const path = inputs.path as string;
  const content = inputs.content as string;
  const append = (inputs.append as boolean) ?? false;

  if (!path) {
    throw new Error('file.write requires a path input');
  }

  if (content === undefined) {
    throw new Error('file.write requires a content input');
  }

  console.log(`📝 Writing: ${path}`);

  let finalContent = content;

  if (append) {
    const file = Bun.file(path);
    if (await file.exists()) {
      const existing = await file.text();
      finalContent = existing + content;
    }
  }

  await Bun.write(path, finalContent);

  return {
    path,
    size: finalContent.length,
    success: true,
  };
};

/**
 * Git checkout handler
 *
 * Inputs:
 * - ref?: string - Git ref to checkout (branch, tag, commit)
 * - cwd?: string - Working directory
 *
 * Outputs:
 * - ref: string - Checked out ref
 * - commit: string - Current commit SHA
 */
export const gitCheckoutHandler: StepHandler = async (inputs) => {
  const ref = (inputs.ref as string) ?? 'HEAD';
  const cwd = (inputs.cwd as string) ?? process.cwd();

  console.log(`🔄 Git checkout: ${ref}`);

  // Checkout ref
  const checkoutProc = Bun.spawn(['git', 'checkout', ref], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const checkoutStderr = await new Response(checkoutProc.stderr).text();
  const checkoutExit = await checkoutProc.exited;

  if (checkoutExit !== 0) {
    throw new Error(`Git checkout failed: ${checkoutStderr}`);
  }

  // Get current commit
  const revParseProc = Bun.spawn(['git', 'rev-parse', 'HEAD'], {
    cwd,
    stdout: 'pipe',
  });

  const commit = (await new Response(revParseProc.stdout).text()).trim();

  return {
    ref,
    commit,
  };
};

/**
 * Git pull handler
 *
 * Inputs:
 * - remote?: string - Remote name (default: origin)
 * - branch?: string - Branch name
 * - cwd?: string - Working directory
 *
 * Outputs:
 * - success: boolean - Whether pull succeeded
 * - commit: string - Current commit SHA after pull
 */
export const gitPullHandler: StepHandler = async (inputs) => {
  const remote = (inputs.remote as string) ?? 'origin';
  const branch = inputs.branch as string;
  const cwd = (inputs.cwd as string) ?? process.cwd();

  const args = ['git', 'pull', remote];
  if (branch) {
    args.push(branch);
  }

  console.log(`⬇️  Git pull: ${args.join(' ')}`);

  const proc = Bun.spawn(args, {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`Git pull failed: ${stderr}`);
  }

  // Get current commit
  const revParseProc = Bun.spawn(['git', 'rev-parse', 'HEAD'], {
    cwd,
    stdout: 'pipe',
  });

  const commit = (await new Response(revParseProc.stdout).text()).trim();

  return {
    success: true,
    commit,
  };
};

/**
 * Delay/sleep handler
 *
 * Inputs:
 * - duration: number - Duration in milliseconds
 *
 * Outputs:
 * - slept: number - Actual sleep duration
 */
export const delayHandler: StepHandler = async (inputs) => {
  const duration = inputs.duration as number;

  if (!duration || duration <= 0) {
    throw new Error('delay requires a positive duration input');
  }

  console.log(`⏳ Sleeping for ${duration}ms`);

  const start = performance.now();
  await Bun.sleep(duration);
  const actual = performance.now() - start;

  return {
    slept: Math.round(actual),
  };
};

/**
 * Log/echo handler
 *
 * Inputs:
 * - message: string - Message to log
 * - level?: string - Log level (info, warn, error, debug)
 *
 * Outputs:
 * - logged: boolean - Whether message was logged
 * - message: string - Logged message
 */
export const logHandler: StepHandler = async (inputs) => {
  const message = inputs.message as string;
  const level = (inputs.level as string) ?? 'info';

  if (!message) {
    throw new Error('log requires a message input');
  }

  switch (level) {
    case 'warn':
      console.warn(`⚠️  ${message}`);
      break;
    case 'error':
      console.error(`❌ ${message}`);
      break;
    case 'debug':
      console.debug(`🔍 ${message}`);
      break;
    default:
      console.log(`ℹ️  ${message}`);
  }

  return {
    logged: true,
    message,
  };
};

/**
 * Condition check handler
 *
 * Inputs:
 * - condition: string - Condition to evaluate
 * - trueValue?: unknown - Value if condition is true
 * - falseValue?: unknown - Value if condition is false
 *
 * Outputs:
 * - result: boolean - Condition result
 * - value: unknown - Selected value based on condition
 */
export const conditionHandler: StepHandler = async (inputs, context) => {
  const condition = inputs.condition as string;
  const trueValue = inputs.trueValue;
  const falseValue = inputs.falseValue;

  if (!condition) {
    throw new Error('condition requires a condition input');
  }

  // Simple condition evaluation
  // In production, you'd want a proper expression parser
  let result = false;

  // Check for simple variable references
  if (condition.startsWith('inputs.')) {
    const key = condition.slice(7);
    result = Boolean(context.inputs[key]);
  } else if (condition.startsWith('vars.')) {
    const key = condition.slice(5);
    result = Boolean(context.variables.get(key));
  } else {
    // Treat as boolean string
    result = condition === 'true' || condition === '1';
  }

  return {
    result,
    value: result ? trueValue : falseValue,
  };
};

/**
 * Set variable handler
 *
 * Inputs:
 * - name: string - Variable name
 * - value: unknown - Variable value
 *
 * Outputs:
 * - name: string - Set variable name
 * - value: unknown - Set variable value
 */
export const setVariableHandler: StepHandler = async (inputs, context) => {
  const name = inputs.name as string;
  const value = inputs.value;

  if (!name) {
    throw new Error('setVariable requires a name input');
  }

  context.variables.set(name, value);

  return {
    name,
    value,
  };
};

/**
 * Parallel execution handler (for sub-workflows)
 *
 * Inputs:
 * - tasks: Array<{ command: string }> - Tasks to run in parallel
 *
 * Outputs:
 * - results: Array<unknown> - Results from each task
 * - allSucceeded: boolean - Whether all tasks succeeded
 */
export const parallelHandler: StepHandler = async (inputs) => {
  const tasks = inputs.tasks as Array<{ command: string }>;

  if (!tasks || !Array.isArray(tasks)) {
    throw new Error('parallel requires a tasks array input');
  }

  console.log(`🔀 Running ${tasks.length} tasks in parallel`);

  const results = await Promise.allSettled(
    tasks.map(async (task) => {
      const proc = Bun.spawn(['sh', '-c', task.command], {
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      return {
        command: task.command,
        stdout: stdout.trim(),
        exitCode,
        success: exitCode === 0,
      };
    })
  );

  const processedResults = results.map((r) =>
    r.status === 'fulfilled' ? r.value : { error: r.reason }
  );

  const allSucceeded = results.every(
    (r) => r.status === 'fulfilled' && r.value.success
  );

  return {
    results: processedResults,
    allSucceeded,
  };
};

/**
 * All built-in handlers
 */
export const builtinHandlers: Record<string, StepHandler> = {
  'shell.exec': shellExecHandler,
  'http.request': httpRequestHandler,
  'file.read': fileReadHandler,
  'file.write': fileWriteHandler,
  'git.checkout': gitCheckoutHandler,
  'git.pull': gitPullHandler,
  'delay': delayHandler,
  'log': logHandler,
  'condition': conditionHandler,
  'setVariable': setVariableHandler,
  'parallel': parallelHandler,
};

/**
 * Get all built-in handler types
 */
export function getBuiltinHandlerTypes(): readonly string[] {
  return Object.keys(builtinHandlers);
}
