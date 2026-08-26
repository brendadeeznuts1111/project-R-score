// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/child-process — Bun.spawn

import { relativePath } from '../../lib/path-bun.ts';

export async function commandText(command: string[], cwd: string): Promise<string> {
  const process = Bun.spawn(command, { cwd, stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  if (exitCode) throw new Error(stderr.trim() || `${command.join(' ')} failed`);
  return stdout.trim();
}

export async function runCommand(command: string[], cwd: string): Promise<void> {
  const process = Bun.spawn(command, { cwd, stdout: 'inherit', stderr: 'inherit' });
  const exitCode = await process.exited;
  if (exitCode) throw new Error(`${command.join(' ')} failed with exit code ${exitCode}`);
}

export async function repositoryRoot(cwd: string): Promise<string> {
  return commandText(['git', 'rev-parse', '--show-toplevel'], cwd);
}

export async function assertRealPathInside(
  root: string,
  candidate: string,
  context: string
): Promise<void> {
  const [realRoot, realCandidate] = await Promise.all([
    commandText(['realpath', root], root),
    commandText(['realpath', candidate], root),
  ]);
  const path = relativePath(realRoot, realCandidate);
  if (path.startsWith('..') || path.startsWith('/'))
    throw new Error(`${context} resolves outside the repository: ${candidate}`);
}

export async function sha256File(file: string): Promise<string> {
  if (!(await Bun.file(file).exists())) throw new Error(`required file does not exist: ${file}`);
  return new Bun.CryptoHasher('sha256').update(await Bun.file(file).arrayBuffer()).digest('hex');
}

const sha256Bytes = (bytes: ArrayBuffer): string =>
  new Bun.CryptoHasher('sha256').update(bytes).digest('hex');

export async function tarballFiles(tarball: string, cwd: string): Promise<Set<string>> {
  const output = await commandText(['tar', '-tzf', tarball], cwd);
  return new Set(
    output
      .split('\n')
      .filter(file => file && !file.endsWith('/'))
      .map(file =>
        file
          .replace(/^\.\//, '')
          .replace(/^package\//, '')
          .replace(/\/$/, '')
      )
  );
}

export async function tarballEntryBytes(
  tarball: string,
  file: string,
  cwd: string
): Promise<ArrayBuffer> {
  const process = Bun.spawn(['tar', '-xOzf', tarball, `package/${file}`], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [bytes, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).arrayBuffer(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  if (exitCode) throw new Error(stderr.trim() || `could not read ${file} from tarball`);
  return bytes;
}

export async function assertPackedBytes(
  tarball: string,
  packageDirectory: string,
  files: string[],
  root: string
): Promise<void> {
  for (const file of files) {
    const working = await Bun.file(`${packageDirectory}/${file}`).arrayBuffer();
    const packed = await tarballEntryBytes(tarball, file, root);
    if (sha256Bytes(working) !== sha256Bytes(packed))
      throw new Error(`tarball content differs from working package file: ${file}`);
  }
}

export async function packageUntracked(
  root: string,
  packageDirectory: string
): Promise<Set<string>> {
  const found = new Set<string>();
  for (const command of [
    ['git', 'ls-files', '--others', '--exclude-standard', '--', packageDirectory],
    ['git', 'ls-files', '--others', '--ignored', '--exclude-standard', '--', packageDirectory],
  ]) {
    const output = await commandText(command, root);
    output
      .split('\n')
      .filter(Boolean)
      .forEach(path => found.add(path));
  }
  return found;
}
