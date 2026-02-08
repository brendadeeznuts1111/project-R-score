const noColor = !!process.env.NO_COLOR;
let stripColors = noColor;

export function setStripColors(val: boolean): void {
  stripColors = val;
}

function wrap(code: string, text: string): string {
  if (stripColors) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

export const green = (text: string) => wrap('32', text);
export const red = (text: string) => wrap('31', text);
export const yellow = (text: string) => wrap('33', text);
export const cyan = (text: string) => wrap('36', text);
export const bold = (text: string) => wrap('1', text);
export const dim = (text: string) => wrap('2', text);
