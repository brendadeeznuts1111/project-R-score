export async function prompt(message: string, sensitive = false): Promise<string> {
  process.stdout.write(message);

  for await (const line of console) {
    return line;
  }

  return '';
}
