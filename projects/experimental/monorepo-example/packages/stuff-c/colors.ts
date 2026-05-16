const noColor = !!process.env.NO_COLOR;
let stripColors = noColor;

export function setStripColors(val: boolean): void {
  stripColors = val;
}

function wrapColor(color: string, text: string): string {
  if (stripColors) return text;
  const ansi = Bun.color(color, "ansi-16m");
  if (!ansi) return text;
  return `${ansi}${text}\x1b[0m`;
}

function wrapAttr(code: string, text: string): string {
  if (stripColors) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

export const green = (text: string) => wrapColor('green', text);
export const red = (text: string) => wrapColor('red', text);
export const yellow = (text: string) => wrapColor('yellow', text);
export const cyan = (text: string) => wrapColor('cyan', text);
export const bold = (text: string) => wrapAttr('1', text);
export const dim = (text: string) => wrapAttr('2', text);
