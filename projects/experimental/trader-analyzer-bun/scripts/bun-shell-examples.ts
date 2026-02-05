/**
 * @fileoverview Bun Shell Examples
 * @description Comprehensive examples following Bun Shell documentation
 * @module scripts/bun-shell-examples
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-BUN-SHELL-EXAMPLES@0.1.0;instance-id=BUN-SHELL-EXAMPLES-001;version=0.1.0}]
 * [PROPERTIES:{examples={value:"bun-shell-examples";@root:"ROOT-DEV";@chain:["BP-BUN-SHELL","BP-EXAMPLES"];@version:"0.1.0"}}]
 * [CLASS:BunShellExamples][#REF:v-0.1.0.BP.BUN.SHELL.EXAMPLES.1.0.A.1.1.DEV.1.1]]
 */

import { $ } from "bun";

/**
 * Bun Shell examples following official documentation
 */
async function runExamples() {
  console.log("📚 Bun Shell Examples\n");

  // 1. Basic echo
  console.log("1. Basic echo:");
  await $`echo "Hello World!"`;

  // 2. Quiet output
  console.log("\n2. Quiet output:");
  await $`echo "Hello World!"`.quiet();

  // 3. Get output as text
  console.log("\n3. Get output as text:");
  const welcome = await $`echo "Hello World!"`.text();
  console.log(`Result: ${welcome.trim()}`);

  // 4. Get stdout/stderr as Buffers
  console.log("\n4. Get stdout/stderr as Buffers:");
  const { stdout, stderr } = await $`echo "Hello!"`.quiet();
  console.log(`Stdout: ${stdout.toString().trim()}`);
  console.log(`Stderr length: ${stderr.length}`);

  // 5. Error handling
  console.log("\n5. Error handling:");
  try {
    await $`command-that-does-not-exist`;
  } catch (err: any) {
    console.log(`Caught error: exitCode=${err.exitCode}`);
  }

  // 6. Nothrow
  console.log("\n6. Nothrow:");
  const { exitCode, stdout: stdout2 } = await $`ls /nonexistent`.nothrow().quiet();
  console.log(`Exit code: ${exitCode} (expected non-zero)`);

  // 7. Redirection to Buffer
  console.log("\n7. Redirection to Buffer:");
  const buffer = Buffer.alloc(100);
  await $`echo "Hello World!" > ${buffer}`;
  console.log(`Buffer content: ${buffer.toString().trim()}`);

  // 8. Redirection from Response
  console.log("\n8. Redirection from Response:");
  const response = await fetch("https://example.com");
  const charCount = await $`cat < ${response} | wc -c`.text();
  console.log(`Character count: ${charCount.trim()}`);

  // 9. Redirection to file
  console.log("\n9. Redirection to file:");
  await $`echo "bun!" > greeting.txt`;
  const content = await Bun.file("greeting.txt").text();
  console.log(`File content: ${content.trim()}`);
  await $`rm greeting.txt`.quiet();

  // 10. Redirection stderr to file
  console.log("\n10. Redirection stderr to file:");
  await $`bun run nonexistent.ts 2> errors.txt`.nothrow().quiet();
  const errors = await Bun.file("errors.txt").text();
  console.log(`Errors captured: ${errors.length > 0 ? "Yes" : "No"}`);
  await $`rm errors.txt`.quiet();

  // 11. Redirect stderr to stdout (using 2>&1)
  console.log("\n11. Redirect stderr to stdout:");
  // Bun Shell: redirect stderr to stdout
  const combined = await $`bun run scripts/test-bun-shell.ts 2>&1`.nothrow().text();
  console.log(`Combined output length: ${combined.length} chars`);

  // 12. Piping
  console.log("\n12. Piping:");
  const wordCount = await $`echo "Hello World!" | wc -w`.text();
  console.log(`Word count: ${wordCount.trim()}`);

  // 13. Piping with Response
  console.log("\n13. Piping with Response:");
  const response2 = new Response("hello i am a response body");
  const wordCount2 = await $`cat < ${response2} | wc -w`.text();
  console.log(`Word count from Response: ${wordCount2.trim()}`);

  // 14. Command substitution
  console.log("\n14. Command substitution:");
  await $`echo Hash of current commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'no-git')`;

  // 15. Command substitution in variable
  console.log("\n15. Command substitution in variable:");
  await $`
    REV=$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')
    echo "Current revision: $REV"
  `;

  // 16. Environment variables
  console.log("\n16. Environment variables:");
  await $`FOO=foo bun -e 'console.log(process.env.FOO)'`;

  // 17. Environment variables with interpolation
  console.log("\n17. Environment variables with interpolation:");
  const foo = "bar123";
  await $`FOO=${foo + "456"} bun -e 'console.log(process.env.FOO)'`;

  // 18. .env() method
  console.log("\n18. .env() method:");
  await $`echo $FOO`.env({ FOO: "bar" });

  // 19. Global environment
  console.log("\n19. Global environment:");
  $.env({ FOO: "bar" });
  await $`echo $FOO`;
  $.env(undefined); // Reset

  // 20. Working directory
  console.log("\n20. Working directory:");
  const pwd = await $`pwd`.cwd("/tmp").text();
  console.log(`PWD: ${pwd.trim()}`);

  // 21. Global working directory
  console.log("\n21. Global working directory:");
  $.cwd("/tmp");
  const pwd2 = await $`pwd`.text();
  console.log(`Global PWD: ${pwd2.trim()}`);
  $.cwd(undefined); // Reset

  // 22. Reading as JSON
  console.log("\n22. Reading as JSON:");
  const json = await $`echo '{"foo": "bar"}'`.json();
  console.log(`JSON: ${JSON.stringify(json)}`);

  // 23. Reading line-by-line
  console.log("\n23. Reading line-by-line:");
  for await (const line of $`echo -e "line1\nline2\nline3"`.lines()) {
    console.log(`  Line: ${line}`);
  }

  // 24. Reading as Blob
  console.log("\n24. Reading as Blob:");
  const blob = await $`echo "Hello World!"`.blob();
  console.log(`Blob size: ${blob.size}, type: ${blob.type}`);

  // 25. Builtin commands
  console.log("\n25. Builtin commands:");
  await $`cd /tmp && pwd`;
  await $`ls -la /tmp | head -3`;
  await $`echo "test" > /tmp/bun-test.txt && cat /tmp/bun-test.txt && rm /tmp/bun-test.txt`;

  // 26. Brace expansion
  console.log("\n26. Brace expansion:");
  const expanded = $.braces(`echo {1,2,3}`);
  console.log(`Expanded: ${JSON.stringify(expanded)}`);

  // 27. Escape strings
  console.log("\n27. Escape strings:");
  const escaped = $.escape('$(foo) `bar` "baz"');
  console.log(`Escaped: ${escaped}`);

  // 28. Raw strings (no escaping)
  console.log("\n28. Raw strings:");
  await $`echo ${{ raw: '$(echo hi)' }}`.nothrow();

  // 29. Security: Command injection prevention
  console.log("\n29. Security test:");
  const userInput = "my-file.txt; rm -rf /";
  // SAFE: treated as single quoted string
  await $`ls ${userInput}`.nothrow();

  // 30. Timeout with spawn
  console.log("\n30. Timeout example:");
  const proc = Bun.spawn(["sleep", "2"], {
    stdout: "pipe",
  });
  
  setTimeout(() => {
    proc.kill();
  }, 1000);
  
  await proc.exited;
  console.log("Process killed after timeout");

  console.log("\n✨ All examples completed!");
}

// Run examples
if (import.meta.main) {
  runExamples().catch((error) => {
    console.error("Error running examples:", error);
    process.exit(1);
  });
}
