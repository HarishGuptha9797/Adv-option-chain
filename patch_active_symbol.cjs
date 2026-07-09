const fs = require('fs');
let content = fs.readFileSync('src/components/HistoricalTab.tsx', 'utf8');

content = content.replace(/activeSymbol \|\| 'NIFTY'/g, "currentSnapshot.rows[0]?.Symbol || 'NIFTY'");

fs.writeFileSync('src/components/HistoricalTab.tsx', content);
console.log('Success');
