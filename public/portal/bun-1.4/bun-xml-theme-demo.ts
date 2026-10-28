// Demo: parse the full theme XML export with Bun.XML and emit themed CSS vars.
import themeDoc from '../theme-dark.xml';

const theme = (themeDoc as any).theme;
const colors = Array.isArray(theme.color) ? theme.color : [theme.color];

let css = ':root {\n';
for (const c of colors) {
  const name = c['@name'] ?? c['@group'] + '-' + c['@name'];
  const key = c['@group'] ? `${c['@group']}-${c['@name']}` : c['@name'];
  css += `  --fw-xml-${key}: ${c['@value']}; /* kind=${c['@kind']} */\n`;
}
css += '}\n';
console.log(css);
console.log('Parsed', colors.length, 'colors via Bun.XML (scheme=' + theme['@scheme'] + ')');
