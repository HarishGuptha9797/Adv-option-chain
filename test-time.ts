import { nseClient } from './src/lib/nse.js';
import { parseChain } from './src/lib/parser.js';

async function main() {
  const exps = await nseClient.getExpiries('NIFTY');
  const chainData = await nseClient.getChain('NIFTY', exps[0]);
  const parsed = parseChain('NIFTY', chainData, exps[0], 12, 0);
  console.log("Timestamp raw from API:", parsed.timestamp);
}
main();
