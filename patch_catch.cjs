const fs = require('fs');

function patchFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /let data; try \{ data = await res\.json\(\); \} catch\(e\) \{ console\.error\("res\.json error in [^"]+", e\); throw e; \}/g,
    'let data; try { data = await res.json(); } catch(e) { console.error("res.json error in " + "' + file + '", e); return; }'
  );
  fs.writeFileSync(file, content);
}

patchFile('src/components/HistoricalTab.tsx');
patchFile('src/components/DatabaseManager.tsx');
