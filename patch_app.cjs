const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /throw e;/g,
  '// throw e removed'
);

fs.writeFileSync('src/App.tsx', content);
