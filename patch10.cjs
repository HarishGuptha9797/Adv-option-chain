const fs = require('fs');
let content = fs.readFileSync('src/components/HistoricalTab.tsx', 'utf8');

const target = `      let ceOiChg = r.CE_OI_Chg;
      let peOiChg = r.PE_OI_Chg;
      
      const diff = Math.abs(r.Strike - underlying);
      if (!atmStrike || diff < Math.abs(atmStrike - underlying)) {
        atmStrike = r.Strike;
      }
      
      if (compareSnapshot) {
        const compRow = compareSnapshot.rows.find(cr => cr.Strike === r.Strike);
        if (compRow) {
          ceOiChg = r.CE_OI - compRow.CE_OI;
          peOiChg = r.PE_OI - compRow.PE_OI;
        }
      }`;

const replacement = `      let ceOiChg = 0;
      let peOiChg = 0;
      
      const diff = Math.abs(r.Strike - underlying);
      if (!atmStrike || diff < Math.abs(atmStrike - underlying)) {
        atmStrike = r.Strike;
      }
      
      if (timeIndex > 0 && compareSnapshot) {
        const compRow = compareSnapshot.rows.find(cr => cr.Strike === r.Strike);
        if (compRow) {
          ceOiChg = r.CE_OI - compRow.CE_OI;
          peOiChg = r.PE_OI - compRow.PE_OI;
        }
      }`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/HistoricalTab.tsx', content);
  console.log('Success');
} else {
  console.log('Target not found');
}
