const fs = require('fs');
let content = fs.readFileSync('src/lib/parser.ts', 'utf8');

content = content.replace(
  'function extractUnderlying(raw: any): number {\n  const paths = [',
  'function extractUnderlying(raw: any): number {\n  if (!raw) return 0;\n  const paths = ['
);

content = content.replace(
  'function extractTimestamp(raw: any): string {\n  const paths = [',
  'function extractTimestamp(raw: any): string {\n  if (!raw) return "";\n  const paths = ['
);

fs.writeFileSync('src/lib/parser.ts', content);
