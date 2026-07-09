const fs = require('fs');
let content = fs.readFileSync('src/components/HistoricalTab.tsx', 'utf8');

const mappingCode = `
      let ceOiChg = 0;
      let peOiChg = 0;

      if (timeIndex > 0) {
        if (compareSnapshot) {
          const compRow = compareSnapshot.rows.find(cr => cr.Strike === r.Strike);
          if (compRow) {
            ceOiChg = r.CE_OI - compRow.CE_OI;
            peOiChg = r.PE_OI - compRow.PE_OI;
          }
        }
      }
`;

content = content.replace(
  /      let ceOiChg = r\.CE_OI_Chg;\n      let peOiChg = r\.PE_OI_Chg;\n\n      const diff = Math\.abs\(r\.Strike - underlying\);\n      if \(!atmStrike \|\| diff < Math\.abs\(atmStrike - underlying\)\) {\n        atmStrike = r\.Strike;\n      }\n\n      if \(compareSnapshot\) {\n        const compRow = compareSnapshot\.rows\.find\(cr => cr\.Strike === r\.Strike\);\n        if \(compRow\) {\n          ceOiChg = r\.CE_OI - compRow\.CE_OI;\n          peOiChg = r\.PE_OI - compRow\.PE_OI;\n        }\n      }/,
  `      const diff = Math.abs(r.Strike - underlying);
      if (!atmStrike || diff < Math.abs(atmStrike - underlying)) {
        atmStrike = r.Strike;
      }
${mappingCode}`
);

fs.writeFileSync('src/components/HistoricalTab.tsx', content);
console.log('Success');
