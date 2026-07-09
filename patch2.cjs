const fs = require('fs');
let content = fs.readFileSync('src/components/HistoricalTab.tsx', 'utf8');

// Always use compareSnapshot for OI change calculation
content = content.replace(
  "if (compareSnapshot && compareWindow !== 'day') {",
  "if (compareSnapshot) {"
);

// Format Positions in Cr
content = content.replace(
  "tickFormatter={(val) => (val/100000).toFixed(1) + 'L'}",
  "tickFormatter={(val) => (val/10000000).toFixed(2) + 'Cr'}"
);

// Format OI Change in L
content = content.replace(
  "tickFormatter={(val) => (val/1000).toFixed(0) + 'k'}",
  "tickFormatter={(val) => (val/100000).toFixed(1) + 'L'}"
);

fs.writeFileSync('src/components/HistoricalTab.tsx', content);
console.log('Success');
