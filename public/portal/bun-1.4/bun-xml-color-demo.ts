// Demo: parse the theme color palette with Bun.XML and emit themed CSS vars.
import themeDoc from './theme-colors.xml';

const theme = (themeDoc as any).theme;
const colors = Array.isArray(theme.color) ? theme.color : [theme.color];

let css = ':root {\n';
for (const c of colors) {
  css += `  --fw-xml-${c['@name']}: ${c['@value']};\n`;
}
css += '}\n';
console.log(css);
console.log('Parsed', colors.length, 'colors via Bun.XML (scheme=' + theme['@scheme'] + ')');
