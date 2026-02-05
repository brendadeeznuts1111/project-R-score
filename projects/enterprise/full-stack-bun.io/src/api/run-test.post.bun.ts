import { spawn } from "bun";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";

export default async function handler(request: Request): Promise<Response> {
  try {
    const { code, entry } = await request.json();

    if (!code || !entry) {
      return Response.json({ error: "Missing code or entry parameter" }, { status: 400 });
    }

    // Create temporary test file
    const tempDir = join(process.cwd(), '.temp-tests');
    const testFile = join(tempDir, entry);

    // Ensure temp directory exists
    await spawn({ cmd: ["mkdir", "-p", tempDir] }).exited;

    // Write the test code to file
    await writeFile(testFile, code);

    // Run the test with bun test
    const proc = spawn({
      cmd: ["bun", "test", testFile],
      stdout: "pipe",
      stderr: "pipe",
      cwd: process.cwd()
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text()
    ]);

    const exitCode = await proc.exited;

    // Clean up temp file
    await unlink(testFile).catch(() => {});

    return Response.json({
      out: stdout,
      err: stderr,
      exitCode
    });

  } catch (error) {
    return Response.json({
      error: error.message,
      out: "",
      err: error.message
    }, { status: 500 });
  }
}
