const fs = require('fs');
let content = fs.readFileSync('src/components/HistoricalTab.tsx', 'utf8');

const target = '      let ceOiChg = r.CE_OI_Chg;\n      let peOiChg = r.PE_OI_Chg;';
const replacement = '      let ceOiChg = timeIndex === 0 ? 0 : r.CE_OI_Chg;\n      let peOiChg = timeIndex === 0 ? 0 : r.PE_OI_Chg;';

content = content.replace(target, replacement);

const target2 = '      if (compareSnapshot) {\n        const compRow = compareSnapshot.rows.find(cr => cr.Strike === r.Strike);\n        if (compRow) {\n          ceOiChg = r.CE_OI - compRow.CE_OI;\n          peOiChg = r.PE_OI - compRow.PE_OI;\n        }\n      }';
const replacement2 = '      if (timeIndex > 0 && compareSnapshot) {\n        const compRow = compareSnapshot.rows.find(cr => cr.Strike === r.Strike);\n        if (compRow) {\n          ceOiChg = r.CE_OI - compRow.CE_OI;\n          peOiChg = r.PE_OI - compRow.PE_OI;\n        }\n      }';

content = content.replace(target2, replacement2);

fs.writeFileSync('src/components/HistoricalTab.tsx', content);
console.log('Success');
