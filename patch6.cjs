const fs = require('fs');
let content = fs.readFileSync('src/components/HistoricalTab.tsx', 'utf8');

const findAtmCode = `  let top3Pe: number[] = [];
  let barData: any[] = [];
  
  let atmStrike = 0;

  if (currentSnapshot) {
    const underlying = currentSnapshot.rows[0]?.Underlying || 0;
    
    const sortedCe = [...currentSnapshot.rows].sort((a, b) => b.CE_OI - a.CE_OI).map(r => r.Strike);
`;

content = content.replace(
  `  let top3Pe: number[] = [];\n  let barData: any[] = [];\n\n  if (currentSnapshot) {\n    const sortedCe = [...currentSnapshot.rows].sort((a, b) => b.CE_OI - a.CE_OI).map(r => r.Strike);`,
  findAtmCode
);

const assignAtmCode = `    barData = currentSnapshot.rows.map(r => {
      let ceOiChg = r.CE_OI_Chg;
      let peOiChg = r.PE_OI_Chg;
      
      const diff = Math.abs(r.Strike - underlying);
      if (!atmStrike || diff < Math.abs(atmStrike - underlying)) {
        atmStrike = r.Strike;
      }
`;

content = content.replace(
  `    barData = currentSnapshot.rows.map(r => {\n      let ceOiChg = r.CE_OI_Chg;\n      let peOiChg = r.PE_OI_Chg;`,
  assignAtmCode
);

const refLine1 = `<ReferenceLine x={atmStrike} stroke="#fbbf24" strokeDasharray="3 3" opacity={0.8} />\n                      <Bar dataKey="peOi"`;
content = content.replace(`<Bar dataKey="peOi"`, refLine1);

const refLine2 = `<ReferenceLine x={atmStrike} stroke="#fbbf24" strokeDasharray="3 3" opacity={0.8} />\n                      <Bar dataKey="peOiChg"`;
content = content.replace(`<Bar dataKey="peOiChg"`, refLine2);

fs.writeFileSync('src/components/HistoricalTab.tsx', content);
console.log('Success');
