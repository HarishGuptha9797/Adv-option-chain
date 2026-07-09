const fs = require('fs');
let content = fs.readFileSync('src/components/HistoricalTab.tsx', 'utf8');

content = content.replace(
  /let barData: any\[\] = \[\];\s*if \(currentSnapshot\) {\s*const sortedCe =/g,
  "let barData: any[] = [];\n  let atmStrike = 0;\n\n  if (currentSnapshot) {\n    const underlying = currentSnapshot.rows[0]?.Underlying || 0;\n    const sortedCe ="
);

fs.writeFileSync('src/components/HistoricalTab.tsx', content);
console.log('Success');
