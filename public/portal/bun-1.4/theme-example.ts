// Example: consume the FactoryWager theme tokens in a Bun script.
import themeDoc from '../theme-dark.xml';
const theme = (themeDoc as any).theme;
const colors = Array.isArray(theme.color) ? theme.color : [theme.color];
console.log('Theme:', theme['@name'], theme['@scheme']);
for (const c of colors.slice(0, 5)) {
  console.log(`  ${c['@name']}: ${c['@value']} (kind=${c['@kind']})`);
}
// Use Bun.color to validate
console.log('bg as number:', Bun.color(colors[0]['@value'], 'number'));
