const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'const { chain, vix } = await chainRes.json();',
  'let chain, vix;\ntry {\n  const data = await chainRes.json();\n  chain = data.chain;\n  vix = data.vix;\n} catch(e) {\n  const txt = await chainRes.text();\n  console.error("chainRes json error:", e, "Text:", txt.substring(0, 100));\n  throw e;\n}'
);

content = content.replace(
  'const recentData = await recentRes.json();',
  'let recentData;\ntry {\n  recentData = await recentRes.json();\n} catch(e) {\n  const txt = await recentRes.text();\n  console.error("recentRes json error:", e, "Text:", txt.substring(0, 100));\n  throw e;\n}'
);

content = content.replace(
  'const { expiries } = await expRes.json();',
  'let expiries;\ntry {\n  const data = await expRes.json();\n  expiries = data.expiries;\n} catch(e) {\n  const txt = await expRes.text();\n  console.error("expRes json error:", e, "Text:", txt.substring(0, 100));\n  throw e;\n}'
);

fs.writeFileSync('src/App.tsx', content);
