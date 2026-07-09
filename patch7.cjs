const fs = require('fs');
let content = fs.readFileSync('src/components/HistoricalTab.tsx', 'utf8');

// Ensure barData is sorted by strike
content = content.replace(
  `    barData = currentSnapshot.rows.map(r => {`,
  `    barData = [...currentSnapshot.rows].sort((a, b) => a.Strike - b.Strike).map(r => {`
);

fs.writeFileSync('src/components/HistoricalTab.tsx', content);
console.log('Success');
