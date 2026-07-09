const fs = require('fs');

function patchFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /const data = await res\.json\(\);/g,
    'let data; try { data = await res.json(); } catch(e) { console.error("res.json error in ' + file + '", e); throw e; }'
  );
  fs.writeFileSync(file, content);
}

patchFile('src/components/HistoricalTab.tsx');
patchFile('src/components/DatabaseManager.tsx');
