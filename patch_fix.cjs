const fs = require('fs');
let content = fs.readFileSync('src/components/HistoricalTab.tsx', 'utf8');

const target = `  let top3Pe: number[] = [];
  let barData: any[] = [];

  if (currentSnapshot) {
    const sortedCe = [...currentSnapshot.rows].sort((a, b) => b.CE_OI - a.CE_OI).map(r => r.Strike);`;

const replacement = `  let top3Pe: number[] = [];
  let barData: any[] = [];
  let atmStrike = 0;

  if (currentSnapshot) {
    const underlying = currentSnapshot.rows[0]?.Underlying || 0;
    const sortedCe = [...currentSnapshot.rows].sort((a, b) => b.CE_OI - a.CE_OI).map(r => r.Strike);`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/HistoricalTab.tsx', content);
console.log('Success');
